import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiChat, aiChatWithBYOK } from "@/lib/ai/provider";
import { buildChatContext } from "@/lib/ai/chat-context";
import {
  getAuthContext,
  getDailyUsage,
  logUsageEvent,
  planLimitResponse,
  isWithinLimit,
} from "../_shared/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const authResult = await getAuthContext(req);
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const user = ctx.user;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message, conversationId, context } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 10000) {
    return NextResponse.json({ error: "Message too long (max 10,000 characters)" }, { status: 400 });
  }

  // B6: Enforce chat_messages_per_day (superadmins bypass)
  if (!ctx.isSuperadmin) {
    const dailyUsage = await getDailyUsage(user.id, "chat_message_sent");
    if (!isWithinLimit(dailyUsage, ctx.limits.chat_messages_per_day)) {
      return planLimitResponse(
        "chat_messages_per_day",
        ctx.plan,
        dailyUsage,
        ctx.limits.chat_messages_per_day,
      );
    }
  }

  // Resolve or create conversation
  let activeConversationId = conversationId;
  if (!activeConversationId) {
    // B6: Enforce max_conversations on new conversation creation
    if (!ctx.isSuperadmin && ctx.limits.max_conversations !== -1) {
      const { count: convCount } = await supabaseAdmin
        .from("chat_conversations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.orgId)
        .eq("user_id", user.id);

      if (!isWithinLimit(convCount ?? 0, ctx.limits.max_conversations)) {
        return planLimitResponse(
          "max_conversations",
          ctx.plan,
          convCount ?? 0,
          ctx.limits.max_conversations,
        );
      }
    }

    const title = message.slice(0, 80) + (message.length > 80 ? "..." : "");
    const { data: newConv, error: convError } = await supabaseAdmin
      .from("chat_conversations")
      .insert({
        organization_id: ctx.orgId,
        user_id: user.id,
        title,
      })
      .select("id")
      .single();

    if (convError || !newConv) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 },
      );
    }
    activeConversationId = newConv.id;
  }

  // Save user message
  await supabaseAdmin.from("chat_messages").insert({
    conversation_id: activeConversationId,
    role: "user",
    content: message,
  });

  // Update conversation timestamp (non-blocking)
  supabaseAdmin
    .from("chat_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", activeConversationId)
    .then(({ error }) => {
      if (error) console.error("[chat/route] Conversation update failed:", error.message);
    });

  // Build rich context from user's data
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const chatContext = await buildChatContext(
    user.id,
    ctx.orgId,
    userProfile?.full_name ?? null,
  );

  // Get conversation history (last 20 messages)
  const { data: historyData } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", activeConversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  const history = (historyData ?? []).reverse();

  // Build prompt with system context + conversation history
  const conversationBlock = history
    .map((m: { role: string; content: string }) =>
      `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
    )
    .join("\n\n");

  const fullPrompt = [
    chatContext.systemPrompt,
    context ? `\nAdditional context: ${context}` : "",
    "\n--- CONVERSATION ---",
    conversationBlock,
    "\nAssistant:",
  ]
    .filter(Boolean)
    .join("\n");

  // Check for BYOK (user's own API key)
  const { data: byokData } = await supabaseAdmin
    .from("user_api_keys")
    .select("provider, api_key_encrypted, model_preference")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  let response;

  try {
    if (byokData?.api_key_encrypted) {
      // Decrypt the BYOK key using same logic as api-keys.ts deobfuscate()
      const obfKey = process.env.API_KEY_ENCRYPTION_SECRET || "go-virall-byok-2026";
      const decoded = Buffer.from(byokData.api_key_encrypted, "base64").toString();
      let decrypted = "";
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(
          decoded.charCodeAt(i) ^ obfKey.charCodeAt(i % obfKey.length),
        );
      }

      response = await aiChatWithBYOK(fullPrompt, {
        provider: byokData.provider,
        apiKey: decrypted,
        model: byokData.model_preference,
      }, { temperature: 0.7, maxTokens: 2048, timeout: 60000 });
    } else {
      response = await aiChat(fullPrompt, {
        temperature: 0.7,
        maxTokens: 2048,
        timeout: 60000,
      });
    }
  } catch (err: any) {
    console.error("[chat/route] AI call failed:", err?.message);
    return NextResponse.json(
      { error: "AI service error. Please try again." },
      { status: 502 },
    );
  }

  if (!response) {
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 503 },
    );
  }

  // Save assistant response
  await supabaseAdmin.from("chat_messages").insert({
    conversation_id: activeConversationId,
    role: "assistant",
    content: response.text,
    metadata: { provider: response.provider },
  });

  // Log the interaction (non-blocking)
  supabaseAdmin
    .from("ai_interactions")
    .insert({
      organization_id: ctx.orgId,
      user_id: user.id,
      feature: "chat",
      sub_type: "conversation",
      prompt_text: message,
      response_text: response.text,
      provider: response.provider,
      total_tokens: response.tokensUsed ?? 0,
      cost_usd: response.costCents ? response.costCents / 100 : 0,
      is_success: true,
    })
    .then(({ error }) => {
      if (error) console.error("[chat/route] AI interaction log failed:", error.message);
    });

  // B6: Log chat message for daily-limit tracking (non-blocking)
  if (!ctx.isSuperadmin) {
    logUsageEvent(ctx.orgId, user.id, "chat_message_sent", {
      conversation_id: activeConversationId,
    }).catch((err) =>
      console.error("[chat/route] Usage event log failed:", err),
    );
  }

  return NextResponse.json({
    text: response.text,
    provider: response.provider,
    conversationId: activeConversationId,
  });
}

/**
 * GET — List conversations or get messages for a conversation.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const convId = searchParams.get("conversationId");

  if (convId) {
    // Verify the user owns this conversation before returning messages
    const { data: conv } = await supabaseAdmin
      .from("chat_conversations")
      .select("user_id")
      .eq("id", convId)
      .single();

    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: messages } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, metadata, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(100);

    return NextResponse.json({ messages: messages ?? [] });
  }

  // List conversations
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ conversations: [] });
  }

  const { data: conversations } = await supabaseAdmin
    .from("chat_conversations")
    .select("id, title, created_at, updated_at")
    .eq("organization_id", profile.organization_id)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ conversations: conversations ?? [] });
}

/**
 * DELETE — Delete a conversation and its messages.
 */
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { conversationId } = body;

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  // Verify ownership
  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("user_id")
    .eq("id", conversationId)
    .single();

  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Messages cascade-delete via FK constraint
  await supabaseAdmin
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId);

  return NextResponse.json({ success: true });
}
