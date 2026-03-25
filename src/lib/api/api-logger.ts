/**
 * API Call Logger — tracks all external API calls for cost/usage monitoring.
 * Fire-and-forget — errors are silently caught to never block the main flow.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface LogAPICallParams {
  provider: string;
  endpoint: string;
  method?: string;
  status_code?: number;
  response_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  is_success?: boolean;
  error_message?: string;
  user_id?: string;
}

export async function logAPICall(params: LogAPICallParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("api_call_log").insert({
      provider: params.provider,
      endpoint: params.endpoint,
      method: params.method ?? "POST",
      status_code: params.status_code ?? null,
      response_time_ms: params.response_time_ms ?? null,
      tokens_used: params.tokens_used ?? 0,
      cost_usd: params.cost_usd ?? 0,
      is_success: params.is_success ?? true,
      error_message: params.error_message ?? null,
      user_id: params.user_id ?? null,
    });
  } catch {
    // Silent fail — logging should never break the main flow
  }
}
