"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminClient();

/**
 * Server-side push notification sender.
 *
 * Uses Expo's Push API, which routes to FCM (Android) and APNs (iOS) using the
 * credentials configured in EAS / Firebase. Tokens are expected to be Expo push
 * tokens as returned by expo-notifications on the client.
 *
 * Expired / invalid tokens are removed from the push_tokens table.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushPayload {
  title: string;
  body: string;
  /** Extra payload delivered to the client — used for deep-linking.
   *  e.g. { route: "/(tabs)/alerts" } or { threadId: "abc-123" } */
  data?: Record<string, unknown>;
  /** ios badge count */
  badge?: number;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoTicket | ExpoTicket[];
  errors?: Array<{ code: string; message: string }>;
}

/**
 * Send a push notification to every registered token for the given user.
 * No-ops if the user has no registered tokens.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; invalid: number }> {
  const { data: rows } = await supabaseAdmin
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  const tokens = (rows ?? []).map((r: { token: string }) => r.token).filter(Boolean);
  if (tokens.length === 0) return { sent: 0, invalid: 0 };

  const messages = tokens.map((token: string) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default",
    badge: payload.badge,
    priority: "high" as const,
  }));

  let res: Response;
  try {
    res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error("[push-notifications] Network error:", e);
    return { sent: 0, invalid: 0 };
  }

  if (!res.ok) {
    console.error("[push-notifications] Expo push API error:", res.status, await res.text());
    return { sent: 0, invalid: 0 };
  }

  const json = (await res.json()) as ExpoPushResponse;
  const tickets = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];

  // Remove tokens for DeviceNotRegistered errors (user uninstalled app, etc.)
  const invalidTokens: string[] = [];
  tickets.forEach((ticket, idx) => {
    if (
      ticket.status === "error" &&
      ticket.details?.error === "DeviceNotRegistered"
    ) {
      invalidTokens.push(tokens[idx]);
    }
  });
  if (invalidTokens.length > 0) {
    await supabaseAdmin
      .from("push_tokens")
      .delete()
      .in("token", invalidTokens);
  }

  const sent = tickets.filter((t) => t.status === "ok").length;
  return { sent, invalid: invalidTokens.length };
}

/**
 * Broadcast to multiple users in one call.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; invalid: number }> {
  let sent = 0;
  let invalid = 0;
  for (const userId of userIds) {
    const r = await sendPushToUser(userId, payload);
    sent += r.sent;
    invalid += r.invalid;
  }
  return { sent, invalid };
}
