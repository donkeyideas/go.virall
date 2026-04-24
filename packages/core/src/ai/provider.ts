/**
 * Go Virall AI Provider — Multi-provider with fallback + circuit breaker.
 * Priority: DeepSeek > OpenAI > Anthropic > Gemini.
 * Reads keys from env vars.
 */

interface AIResponse {
  text: string;
  provider: string;
  tokensUsed?: number;
  costCents?: number;
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
  deepseek: 'DEEPSEEK_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
};

const PROVIDER_ORDER = ['deepseek', 'openai', 'anthropic', 'gemini'] as const;

function getAvailableProviders(): Array<{ provider: string; apiKey: string }> {
  const providers: Array<{ provider: string; apiKey: string }> = [];
  for (const p of PROVIDER_ORDER) {
    const envKey = ENV_KEY_MAP[p];
    const apiKey = envKey ? process.env[envKey] : undefined;
    if (apiKey && isProviderAvailable(p)) {
      providers.push({ provider: p, apiKey });
    }
  }
  return providers;
}

async function callOpenAICompatible(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  jsonMode: boolean,
): Promise<AICallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    };
    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      text: choice?.message?.content ?? null,
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callAnthropic(
  apiKey: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
): Promise<AICallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? null;
    return {
      text,
      prompt_tokens: data.usage?.input_tokens ?? 0,
      completion_tokens: data.usage?.output_tokens ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(
  apiKey: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number,
  jsonMode: boolean,
): Promise<AICallResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return {
      text,
      prompt_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

function calculateCost(provider: string, promptTokens: number, completionTokens: number): number {
  const rates = COST_PER_1K[provider];
  if (!rates) return 0;
  return Math.round(((promptTokens / 1000) * rates.input + (completionTokens / 1000) * rates.output) * 100);
}

export async function aiChat(
  prompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    jsonMode?: boolean;
  } = {},
): Promise<AIResponse | null> {
  const { temperature = 0.7, maxTokens = 4096, timeout = 120000, jsonMode = false } = options;
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    console.error('[AI Provider] No API keys configured. Set DEEPSEEK_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.');
    return null;
  }

  for (const { provider, apiKey } of providers) {
    try {
      let result: AICallResult;

      if (provider === 'deepseek') {
        result = await callOpenAICompatible(apiKey, 'https://api.deepseek.com/v1', 'deepseek-chat', prompt, temperature, maxTokens, timeout, jsonMode);
      } else if (provider === 'openai') {
        result = await callOpenAICompatible(apiKey, 'https://api.openai.com/v1', 'gpt-4o-mini', prompt, temperature, maxTokens, timeout, jsonMode);
      } else if (provider === 'anthropic') {
        result = await callAnthropic(apiKey, prompt, temperature, maxTokens, timeout);
      } else if (provider === 'gemini') {
        result = await callGemini(apiKey, prompt, temperature, maxTokens, timeout, jsonMode);
      } else {
        continue;
      }

      if (!result.text) {
        markProviderFailed(provider);
        continue;
      }

      const tokensUsed = result.prompt_tokens + result.completion_tokens;
      const costCents = calculateCost(provider, result.prompt_tokens, result.completion_tokens);

      return {
        text: result.text,
        provider,
        tokensUsed,
        costCents,
      };
    } catch (err) {
      console.error(`[AI Provider] ${provider} failed:`, err instanceof Error ? err.message : err);
      markProviderFailed(provider);
    }
  }

  return null;
}
