/**
 * Go Virall AI Provider — Multi-provider with fallback + circuit breaker.
 * Priority: DeepSeek > OpenAI > Anthropic > Gemini.
 * Reads keys from platform_api_configs DB table, falls back to env vars.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAPICall } from "@/lib/api/api-logger";

interface AIResponse {
  text: string;
  provider: string;
  tokensUsed?: number;
  costCents?: number;
}

interface AIConfig {
  provider: string;
  api_key: string;
  base_url: string | null;
  config: Record<string, unknown> | null;
}

interface AICallResult {
  text: string | null;
  prompt_tokens: number;
  completion_tokens: number;
}

// Cost per 1K tokens (USD)
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  deepseek: { input: 0.00014, output: 0.00028 },
  openai: { input: 0.00015, output: 0.0006 },
  anthropic: { input: 0.0008, output: 0.004 },
  gemini: { input: 0.0, output: 0.0 },
};

// Cache configs for 60s
let cachedConfig: { configs: AIConfig[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000;

// Circuit breaker: skip providers that failed recently (5 min cooldown)
const failedProviders = new Map<string, number>();
const CIRCUIT_BREAKER_TTL = 5 * 60_000;

function markProviderFailed(provider: string) {
  failedProviders.set(provider, Date.now());
}

function isProviderAvailable(provider: string): boolean {
  const failedAt = failedProviders.get(provider);
  if (!failedAt) return true;
  if (Date.now() - failedAt > CIRCUIT_BREAKER_TTL) {
    failedProviders.delete(provider);
    return true;
  }
  return false;
}

// Env var key mapping
const ENV_KEY_MAP: Record<string, string> = {
  deepseek: "DEEPSEEK_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

async function getAIConfigs(): Promise<AIConfig[]> {
  if (cachedConfig && Date.now() - cachedConfig.timestamp < CACHE_TTL) {
    return cachedConfig.configs;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_api_configs")
      .select("provider, api_key, base_url, config")
      .in("provider", ["deepseek", "gemini", "openai", "anthropic"])
      .eq("is_active", true);

    const dbConfigs = (data ?? []) as AIConfig[];

    // Merge env var keys for providers with no DB key
    for (const config of dbConfigs) {
      if (!config.api_key) {
        const envKey = ENV_KEY_MAP[config.provider];
        if (envKey && process.env[envKey]) {
          config.api_key = process.env[envKey]!;
        }
      }
    }

    // Add any providers from env vars that aren't in DB
    for (const [provider, envKey] of Object.entries(ENV_KEY_MAP)) {
      if (!dbConfigs.find((c) => c.provider === provider) && process.env[envKey]) {
        dbConfigs.push({
          provider,
          api_key: process.env[envKey]!,
          base_url: null,
          config: null,
        });
      }
    }

    const configs = dbConfigs.filter((c) => c.api_key);
    cachedConfig = { configs, timestamp: Date.now() };
    return configs;
  } catch {
    // Fallback to env vars only
    const configs: AIConfig[] = [];
    for (const [provider, envKey] of Object.entries(ENV_KEY_MAP)) {
      if (process.env[envKey]) {
        configs.push({
          provider,
          api_key: process.env[envKey]!,
          base_url: null,
          config: null,
        });
      }
    }
    return configs;
  }
}

const PROVIDER_ORDER = ["deepseek", "openai", "anthropic", "gemini"] as const;

/**
 * Send a chat completion using a specific BYOK (Bring Your Own Key) config.
 * Falls back to system providers if the BYOK call fails.
 */
export async function aiChatWithBYOK(
  prompt: string,
  byok: { provider: string; apiKey: string; model: string | null },
  options: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  } = {},
): Promise<AIResponse | null> {
  const { temperature = 0.7, maxTokens = 2048, timeout = 60000 } = options;
  const start = Date.now();

  try {
    let callResult: AICallResult;
    const providerName = byok.provider;

    if (providerName === "gemini" || providerName === "google") {
      callResult = await callGemini(byok.apiKey, prompt, temperature, maxTokens, timeout, false);
    } else if (providerName === "anthropic") {
      callResult = await callAnthropic(byok.apiKey, prompt, temperature, maxTokens, timeout);
    } else {
      const baseUrl = providerName === "deepseek"
        ? "https://api.deepseek.com"
        : "https://api.openai.com/v1";
      const model = byok.model || (providerName === "deepseek" ? "deepseek-chat" : "gpt-4o");
      callResult = await callOpenAICompatible(baseUrl, byok.apiKey, model, prompt, temperature, maxTokens, timeout, false);
    }

    logAPICall({
      provider: `byok_${providerName}`,
      endpoint: "/chat/completions",
      status_code: 200,
      response_time_ms: Date.now() - start,
      tokens_used: callResult.prompt_tokens + callResult.completion_tokens,
      is_success: true,
    });

    if (callResult.text) {
      const cleaned = callResult.text
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/^\uFEFF/, "")
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .trim();
      const totalTokens = callResult.prompt_tokens + callResult.completion_tokens;
      return {
        text: cleaned,
        provider: `byok_${providerName}`,
        tokensUsed: totalTokens,
        costCents: 0,
      };
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[aiChatWithBYOK] ${byok.provider} failed: ${errMsg}, falling back to system providers`);
    logAPICall({
      provider: `byok_${byok.provider}`,
      endpoint: "/chat/completions",
      status_code: 500,
      response_time_ms: Date.now() - start,
      is_success: false,
      error_message: errMsg,
    });
  }

  // Fallback to system providers
  return aiChat(prompt, { temperature, maxTokens, timeout });
}

/**
 * Send a chat completion to the best available AI provider.
 */
export async function aiChat(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    jsonMode?: boolean;
  } = {},
): Promise<AIResponse | null> {
  const { temperature = 0.7, maxTokens = 2048, timeout = 60000, jsonMode = false } = options;

  const configs = await getAIConfigs();
  const availableProviders = PROVIDER_ORDER.filter((p) => {
    const c = configs.find((cfg) => cfg.provider === p);
    return c?.api_key && isProviderAvailable(p);
  });

  if (availableProviders.length === 0) {
    console.error("[aiChat] No AI providers available. Check API keys in env vars or platform_api_configs table.");
    return null;
  }

  console.log(`[aiChat] Available providers: ${availableProviders.join(", ")} | timeout: ${timeout}ms | maxTokens: ${maxTokens}`);

  for (const providerName of availableProviders) {
    const config = configs.find((c) => c.provider === providerName)!;

    // Try up to 2 attempts per provider (retry once on timeout with 50% more time)
    const attempts = [timeout, Math.round(timeout * 1.5)];

    for (let attempt = 0; attempt < attempts.length; attempt++) {
      const attemptTimeout = attempts[attempt];
      const start = Date.now();

      try {
        let callResult: AICallResult;

        if (providerName === "gemini") {
          callResult = await callGemini(config.api_key, prompt, temperature, maxTokens, attemptTimeout, jsonMode);
        } else if (providerName === "anthropic") {
          callResult = await callAnthropic(config.api_key, prompt, temperature, maxTokens, attemptTimeout);
        } else {
          const baseUrl =
            providerName === "deepseek"
              ? config.base_url || "https://api.deepseek.com"
              : config.base_url || "https://api.openai.com/v1";
          const model =
            providerName === "deepseek"
              ? (config.config as Record<string, string>)?.model || "deepseek-chat"
              : (config.config as Record<string, string>)?.model || "gpt-4o-mini";
          callResult = await callOpenAICompatible(baseUrl, config.api_key, model, prompt, temperature, maxTokens, attemptTimeout, jsonMode);
        }

        const costs = COST_PER_1K[providerName] ?? { input: 0, output: 0 };
        const costUsd =
          (callResult.prompt_tokens * costs.input +
            callResult.completion_tokens * costs.output) /
          1000;

        logAPICall({
          provider: providerName,
          endpoint: "/chat/completions",
          status_code: 200,
          response_time_ms: Date.now() - start,
          tokens_used: callResult.prompt_tokens + callResult.completion_tokens,
          cost_usd: costUsd,
          is_success: true,
        });

        if (callResult.text) {
          // Clean AI response: strip think tags, BOM, zero-width chars, control chars
          const cleaned = callResult.text
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/^\uFEFF/, "")
            .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
            .trim();
          const totalTokens = callResult.prompt_tokens + callResult.completion_tokens;
          return {
            text: cleaned,
            provider: providerName,
            tokensUsed: totalTokens,
            costCents: parseFloat((costUsd * 100).toFixed(6)),
          };
        }
        break; // Got a response (even if empty text), don't retry
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isTimeout = errMsg.includes("timeout") || errMsg.includes("aborted");

        logAPICall({
          provider: providerName,
          endpoint: "/chat/completions",
          status_code: isTimeout ? 408 : 500,
          response_time_ms: Date.now() - start,
          is_success: false,
          error_message: errMsg,
        });

        if (isTimeout && attempt === 0) {
          console.warn(`[aiChat] ${providerName} timed out (${attemptTimeout}ms), retrying with ${attempts[1]}ms...`);
          continue; // Retry with longer timeout
        }

        console.error(`[aiChat] ${providerName} error (attempt ${attempt + 1}):`, errMsg);
        // Only circuit-break on auth/server errors, not timeouts
        if (!isTimeout) {
          markProviderFailed(providerName);
        }
        break; // Move to next provider
      }
    }
  }

  return null;
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  jsonMode: boolean = false,
): Promise<AICallResult> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data?.choices?.[0]?.message?.content ?? null,
    prompt_tokens: data?.usage?.prompt_tokens ?? 0,
    completion_tokens: data?.usage?.completion_tokens ?? 0,
  };
}

async function callGemini(
  apiKey: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  jsonMode: boolean = false,
): Promise<AICallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const genConfig: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens };
  if (jsonMode) {
    genConfig.responseMimeType = "application/json";
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: genConfig,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null,
    prompt_tokens: data?.usageMetadata?.promptTokenCount ?? 0,
    completion_tokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
): Promise<AICallResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data?.content?.[0]?.text ?? null,
    prompt_tokens: data?.usage?.input_tokens ?? 0,
    completion_tokens: data?.usage?.output_tokens ?? 0,
  };
}
