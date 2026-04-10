"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { MessageThread, DirectMessage } from "@/types";

// ---------------------------------------------------------------------------
// getOrCreateThread — find existing DM thread or create a new one
// ---------------------------------------------------------------------------

export async function getOrCreateThread(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };
  if (user.id === otherUserId) return { error: "Cannot message yourself." };

  // Normalize participant order: smaller UUID = participant_1
  const [p1, p2] =
    user.id < otherUserId
      ? [user.id, otherUserId]
      : [otherUserId, user.id];

  // Check for existing thread
  const { data: existing } = await supabase
    .from("message_threads")
    .select("*")
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .maybeSingle();

  if (existing) {
    return { success: true, thread: existing as MessageThread };
  }

  // Create new thread
  const { data: newThread, error } = await supabase
    .from("message_threads")
    .insert({
      participant_1: p1,
      participant_2: p2,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: "Failed to create thread." };

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/inbox");
  return { success: true, thread: newThread as MessageThread };
}

// ---------------------------------------------------------------------------
// sendMessage — insert message & update thread metadata
// ---------------------------------------------------------------------------

export async function sendMessage(
  threadId: string,
  content: string,
  messageType: "text" | "proposal" | "file" | "system" = "text",
) {
  if (!content.trim()) return { error: "Message cannot be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Verify user is a participant of this thread
  const { data: thread } = await supabase
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!thread) return { error: "Thread not found." };

  const typedThread = thread as MessageThread;
  if (
    typedThread.participant_1 !== user.id &&
    typedThread.participant_2 !== user.id
  ) {
    return { error: "Not a participant of this thread." };
  }

  // Insert the message
  const { data: message, error: msgError } = await supabase
    .from("direct_messages")
    .insert({
      thread_id: threadId,
      sender_id: user.id,
      content: content.trim(),
      message_type: messageType,
      metadata: {},
      is_read: false,
    })
    .select()
    .single();

  if (msgError) return { error: "Failed to send message." };

  // Determine which unread counter to increment
  const isP1 = typedThread.participant_1 === user.id;
  const unreadField = isP1 ? "unread_count_2" : "unread_count_1";
  const currentUnread = isP1
    ? typedThread.unread_count_2
    : typedThread.unread_count_1;

  // Update thread metadata
  const { error: threadError } = await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.trim().slice(0, 120),
      [unreadField]: (currentUnread ?? 0) + 1,
    })
    .eq("id", threadId);

  if (threadError) {
    console.error("[sendMessage] Failed to update thread:", threadError);
  }

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/inbox");
  return { success: true, message: message as DirectMessage };
}

// ---------------------------------------------------------------------------
// getThreads — all threads for the current user, joined with other profile
// ---------------------------------------------------------------------------

export async function getThreads(): Promise<MessageThread[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get threads where user is participant_1 or participant_2
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

  // Collect other user IDs and fetch their profiles
  const otherUserIds = allThreads.map((t) =>
    t.participant_1 === user.id ? t.participant_2 : t.participant_1,
  );

  if (otherUserIds.length === 0) return [];

  // Use admin client to bypass RLS and fetch other users' profiles
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
          // Ensure display name and avatar: use brand_logo_url as fallback
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
// getMessages — paginated messages in a thread (user must be participant)
// ---------------------------------------------------------------------------

export async function getMessages(
  threadId: string,
  limit = 50,
  before?: string,
): Promise<DirectMessage[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Verify participation
  const { data: thread } = await supabase
    .from("message_threads")
    .select("participant_1, participant_2")
    .eq("id", threadId)
    .single();

  if (!thread) return [];
  if (thread.participant_1 !== user.id && thread.participant_2 !== user.id) {
    return [];
  }

  let query = supabase
    .from("direct_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data } = await query;
  return (data ?? []) as DirectMessage[];
}

// ---------------------------------------------------------------------------
// markThreadRead — reset unread count for current user, mark messages read
// ---------------------------------------------------------------------------

export async function markThreadRead(threadId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Get thread
  const { data: thread } = await supabase
    .from("message_threads")
    .select("participant_1, participant_2")
    .eq("id", threadId)
    .single();

  if (!thread) return { error: "Thread not found." };
  if (thread.participant_1 !== user.id && thread.participant_2 !== user.id) {
    return { error: "Not a participant." };
  }

  // Reset the correct unread count
  const isP1 = thread.participant_1 === user.id;
  const unreadField = isP1 ? "unread_count_1" : "unread_count_2";

  const { error: updateError } = await supabase
    .from("message_threads")
    .update({ [unreadField]: 0 })
    .eq("id", threadId);

  if (updateError) {
    console.error("[markThreadRead] Failed to reset unread:", updateError);
  }

  // Mark all messages from the OTHER user as read
  const otherUserId = isP1 ? thread.participant_2 : thread.participant_1;

  const { error: readError } = await supabase
    .from("direct_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("sender_id", otherUserId)
    .eq("is_read", false);

  if (readError) {
    console.error("[markThreadRead] Failed to mark messages read:", readError);
  }

  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard/inbox");
  return { success: true };
}

// ---------------------------------------------------------------------------
// getUnreadMessageCount — total unread messages across all threads
// ---------------------------------------------------------------------------

export async function getUnreadMessageCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  // Sum unread_count_1 where user is participant_1
  const { data: asP1 } = await supabase
    .from("message_threads")
    .select("unread_count_1")
    .eq("participant_1", user.id);

  // Sum unread_count_2 where user is participant_2
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

// ---------------------------------------------------------------------------
// searchUsers — search profiles by name for starting a new conversation
// ---------------------------------------------------------------------------

export async function searchUsers(query: string) {
  if (!query.trim() || query.trim().length < 2) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, account_type, company_name")
    .neq("id", user.id)
    .ilike("full_name", `%${query.trim()}%`)
    .limit(10);

  return (data ?? []) as Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    account_type: string;
    company_name: string | null;
  }>;
}
