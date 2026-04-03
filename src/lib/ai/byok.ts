/**
 * BYOK (Bring Your Own Key) utilities — server-only, never exposed as server actions.
 * These functions return decrypted API keys and must NOT be in a "use server" file.
 */

import { createClient } from "@/lib/supabase/server";
import type { AIProvider } from "@/types";

const OBFUSCATION_KEY = process.env.API_KEY_ENCRYPTION_SECRET || "go-virall-byok-2026";

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

  const row = data[0];
  return {
    provider: row.provider as AIProvider,
    apiKey: deobfuscate(row.api_key_encrypted),
    model: row.model_preference,
  };
}
