import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  return { user };
}

/** GET — List threads or messages for a thread */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;

  const url = new URL(req.url);
  const threadId = url.searchParams.get("threadId");

  if (threadId) {
    // Verify user is participant
    const { data: thread } = await supabaseAdmin
      .from("message_threads")
      .select("participant_1, participant_2")
      .eq("id", threadId)
      .single();

    if (!thread || (thread.participant_1 !== userId && thread.participant_2 !== userId)) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const limit = parseInt(url.searchParams.get("limit") || "50");
    const { data: messages } = await supabaseAdmin
      .from("direct_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(limit);

    return NextResponse.json({ data: messages ?? [] });
  }

  // List threads
  const [{ data: asP1 }, { data: asP2 }] = await Promise.all([
    supabaseAdmin
      .from("message_threads")
      .select("*")
      .eq("participant_1", userId)
      .eq("is_archived_1", false),
    supabaseAdmin
      .from("message_threads")
      .select("*")
      .eq("participant_2", userId)
      .eq("is_archived_2", false),
  ]);

  const threads = [...(asP1 ?? []), ...(asP2 ?? [])].sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );

  // Enrich with other-user profiles
  const otherIds = threads.map((t) =>
    t.participant_1 === userId ? t.participant_2 : t.participant_1,
  );
  const uniqueIds = [...new Set(otherIds)];

  let profileMap = new Map<string, any>();
  if (uniqueIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, avatar_url, account_type, company_name, brand_logo_url",
      )
      .in("id", uniqueIds);
    profileMap = new Map(
      (profiles ?? []).map((p: any) => [
        p.id,
        {
          ...p,
          avatar_url: p.avatar_url || p.brand_logo_url || null,
          display_name:
            p.full_name ||
            p.company_name ||
            (p.account_type === "brand" ? "Brand Partner" : "Creator"),
        },
      ]),
    );
  }

  const enriched = threads.map((t: any) => {
    const otherId = t.participant_1 === userId ? t.participant_2 : t.participant_1;
    const unreadCount = t.participant_1 === userId ? t.unread_count_1 : t.unread_count_2;
    return {
      ...t,
      other_user:
        profileMap.get(otherId) ?? {
          id: otherId,
          full_name: null,
          avatar_url: null,
          account_type: "creator",
          company_name: null,
          display_name: "Brand Partner",
        },
      unread_count: unreadCount,
    };
  });

  return NextResponse.json({ data: enriched });
}

/** POST — Send a message */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { threadId, content, messageType } = body;

  if (!threadId || !content?.trim()) {
    return NextResponse.json({ error: "threadId and content are required" }, { status: 400 });
  }

  const userId = auth.user.id;

  // Verify participation
  const { data: thread } = await supabaseAdmin
    .from("message_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (!thread || (thread.participant_1 !== userId && thread.participant_2 !== userId)) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Insert message
  const { data: message, error } = await supabaseAdmin
    .from("direct_messages")
    .insert({
      thread_id: threadId,
      sender_id: userId,
      content: content.trim(),
      message_type: messageType || "text",
      is_read: false,
      metadata: {},
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to send message" }, { status: 500 });

  // Update thread metadata
  const isP1 = thread.participant_1 === userId;
  const unreadField = isP1 ? "unread_count_2" : "unread_count_1";
  const currentUnread = isP1 ? (thread.unread_count_2 || 0) : (thread.unread_count_1 || 0);

  await supabaseAdmin
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.trim().slice(0, 120),
      [unreadField]: currentUnread + 1,
    })
    .eq("id", threadId);

  return NextResponse.json({ success: true, message });
}

/** PUT — Mark thread as read */
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { threadId } = body;
  if (!threadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 });

  const userId = auth.user.id;
  const { data: thread } = await supabaseAdmin
    .from("message_threads")
    .select("participant_1, participant_2")
    .eq("id", threadId)
    .single();

  if (!thread || (thread.participant_1 !== userId && thread.participant_2 !== userId)) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const isP1 = thread.participant_1 === userId;
  const unreadField = isP1 ? "unread_count_1" : "unread_count_2";
  const otherUserId = isP1 ? thread.participant_2 : thread.participant_1;

  await Promise.all([
    supabaseAdmin.from("message_threads").update({ [unreadField]: 0 }).eq("id", threadId),
    supabaseAdmin
      .from("direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .eq("sender_id", otherUserId)
      .eq("is_read", false),
  ]);

  return NextResponse.json({ success: true });
}

/** PATCH — Get or create thread with another user */
export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { otherUserId } = body;
  if (!otherUserId) return NextResponse.json({ error: "otherUserId is required" }, { status: 400 });

  const userId = auth.user.id;
  const [p1, p2] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

  const { data: existing } = await supabaseAdmin
    .from("message_threads")
    .select("*")
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .single();

  if (existing) return NextResponse.json({ success: true, thread: existing });

  const { data: created, error } = await supabaseAdmin
    .from("message_threads")
    .insert({ participant_1: p1, participant_2: p2, last_message_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });

  return NextResponse.json({ success: true, thread: created });
}
