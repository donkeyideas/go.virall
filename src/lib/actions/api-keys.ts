"use server";

import { createClient } from "@/lib/supabase/server";
import type { AIProvider, UserApiKey } from "@/types";

// Simple XOR-based obfuscation for API keys at rest.
// For production, consider using Supabase Vault or a KMS.
const OBFUSCATION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || "go-virall-byok-2026";

function obfuscate(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length),
    );
  }
  return Buffer.from(result).toString("base64");
}


export async function getUserApiKeys(): Promise<
  Omit<UserApiKey, "api_key_encrypted">[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_api_keys")
    .select("id, user_id, provider, model_preference, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data ?? []) as Omit<UserApiKey, "api_key_encrypted">[];
}

export async function saveUserApiKey(
  provider: AIProvider,
  apiKey: string,
  modelPreference?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  if (!apiKey || apiKey.length < 10) {
    return { success: false, error: "Invalid API key" };
  }

  const encrypted = obfuscate(apiKey);

  const { error } = await supabase.from("user_api_keys").upsert(
    {
      user_id: user.id,
      provider,
      api_key_encrypted: encrypted,
      model_preference: modelPreference || null,
      is_active: true,
    },
    { onConflict: "user_id,provider" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteUserApiKey(
  provider: AIProvider,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function toggleUserApiKey(
  provider: AIProvider,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("user_api_keys")
    .update({ is_active: isActive })
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── API Key Verification ─────────────────────────────────────
// Makes a lightweight test call to each provider to verify the key works.

export async function verifyApiKey(
  provider: AIProvider,
  apiKey: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case "openai": {
        // List models — lightweight GET, no tokens consumed
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        if (res.status === 401) return { valid: false, error: "Invalid API key" };
        if (res.status === 429) return { valid: true }; // rate-limited but key is valid
        if (!res.ok) return { valid: false, error: `OpenAI returned ${res.status}` };
        return { valid: true };
      }

      case "anthropic": {
        // Send a minimal message — costs ~1 token
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.status === 401) return { valid: false, error: "Invalid API key" };
        if (res.status === 429) return { valid: true };
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = (body as Record<string, Record<string, string>>)?.error?.message || `Anthropic returned ${res.status}`;
          return { valid: false, error: msg };
        }
        return { valid: true };
      }

      case "google": {
        // List models — no tokens consumed
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
          { signal: AbortSignal.timeout(10000) },
        );
        if (res.status === 400 || res.status === 403) return { valid: false, error: "Invalid API key" };
        if (res.status === 429) return { valid: true };
        if (!res.ok) return { valid: false, error: `Google returned ${res.status}` };
        return { valid: true };
      }

      case "deepseek": {
        // OpenAI-compatible — list models
        const res = await fetch("https://api.deepseek.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });
        if (res.status === 401) return { valid: false, error: "Invalid API key" };
        if (res.status === 429) return { valid: true };
        if (!res.ok) return { valid: false, error: `DeepSeek returned ${res.status}` };
        return { valid: true };
      }

      default:
        return { valid: false, error: "Unknown provider" };
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return { valid: false, error: "Request timed out — check your key and try again" };
    }
    return { valid: false, error: err instanceof Error ? err.message : "Verification failed" };
  }
}

// NOTE: getDecryptedApiKey and getUserBYOKConfig have been moved to
// src/lib/ai/byok.ts — they return plaintext API keys and MUST NOT
// be in a "use server" file (which exposes all exports as callable from client).
