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

function deobfuscate(encoded: string): string {
  const decoded = Buffer.from(encoded, "base64").toString();
  let result = "";
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(
      decoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length),
    );
  }
  return result;
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

/**
 * Get the decrypted API key for a specific user + provider.
 * Server-only — never expose to the client.
 */
export async function getDecryptedApiKey(
  userId: string,
  provider: AIProvider,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key_encrypted")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  if (!data?.api_key_encrypted) return null;
  return deobfuscate(data.api_key_encrypted);
}

/**
 * Get the user's active BYOK config (first active key found in priority order).
 * Returns provider + decrypted key + model preference, or null if no BYOK.
 */
export async function getUserBYOKConfig(
  userId: string,
): Promise<{ provider: AIProvider; apiKey: string; model: string | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_api_keys")
    .select("provider, api_key_encrypted, model_preference")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (!data?.length) return null;

  // Return the first active key
  const row = data[0];
  return {
    provider: row.provider as AIProvider,
    apiKey: deobfuscate(row.api_key_encrypted),
    model: row.model_preference,
  };
}
