"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessageThread } from "@/types";

// ---------------------------------------------------------------------------
// getThreadsForUser — Returns MessageThread[] with other user info joined
// ---------------------------------------------------------------------------

export async function getThreadsForUser(): Promise<MessageThread[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Fetch all threads where the user is a participant
  const { data: threadsAsP1 } = await supabase
    .from("message_threads")
    .select("*")
    .eq("participant_1", user.id)
    .eq("is_archived_1", false)
    .order("last_message_at", { ascending: false });

  const { data: threadsAsP2 } = await supabase
    .from("message_threads")
    .select("*")
    .eq("participant_2", user.id)
    .eq("is_archived_2", false)
    .order("last_message_at", { ascending: false });

  const allThreads = [
    ...((threadsAsP1 ?? []) as MessageThread[]),
    ...((threadsAsP2 ?? []) as MessageThread[]),
  ].sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime(),
  );

  if (allThreads.length === 0) return [];

  // Collect other user IDs
  const otherUserIds = allThreads.map((t) =>
    t.participant_1 === user.id ? t.participant_2 : t.participant_1,
  );

  // Use admin client to bypass RLS for cross-user profile lookup
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, account_type, company_name, brand_logo_url")
    .in("id", otherUserIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return allThreads.map((t) => {
    const otherId =
      t.participant_1 === user.id ? t.participant_2 : t.participant_1;
    return {
      ...t,
      other_user: (() => {
        const profile = profileMap.get(otherId);
        if (profile) {
          return {
            ...profile,
            avatar_url: profile.avatar_url || profile.brand_logo_url || null,
            full_name: profile.full_name || profile.company_name || "Unknown User",
          };
        }
        return {
          id: otherId,
          full_name: "Unknown User",
          avatar_url: null,
          account_type: "creator" as const,
          company_name: null,
        };
      })(),
    };
  });
}

// ---------------------------------------------------------------------------
// getMessageCount — total unread count across all threads
// ---------------------------------------------------------------------------

export async function getMessageCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data: asP1 } = await supabase
    .from("message_threads")
    .select("unread_count_1")
    .eq("participant_1", user.id);

  const { data: asP2 } = await supabase
    .from("message_threads")
    .select("unread_count_2")
    .eq("participant_2", user.id);

  const countP1 = (asP1 ?? []).reduce(
    (sum, t) => sum + (t.unread_count_1 ?? 0),
    0,
  );
  const countP2 = (asP2 ?? []).reduce(
    (sum, t) => sum + (t.unread_count_2 ?? 0),
    0,
  );

  return countP1 + countP2;
}
