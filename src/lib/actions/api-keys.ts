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

// NOTE: getDecryptedApiKey and getUserBYOKConfig have been moved to
// src/lib/ai/byok.ts — they return plaintext API keys and MUST NOT
// be in a "use server" file (which exposes all exports as callable from client).
