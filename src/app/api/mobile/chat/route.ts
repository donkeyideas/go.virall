import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { aiChat } from "@/lib/ai/provider";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  // Authenticate via Bearer token (Supabase JWT)
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
  const { message, context } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Get user profile for personalization
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, organization_id")
    .eq("id", user.id)
    .single();

  const systemPrompt = `You are Go Virall AI, a social media intelligence assistant for content creators and influencers. You help with content strategy, posting schedules, growth tips, audience analysis, and monetization advice. Be concise, actionable, and data-driven. The user's name is ${profile?.full_name || "there"}.${context ? `\n\nContext: ${context}` : ""}`;

  const response = await aiChat(
    `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`,
    { temperature: 0.7, maxTokens: 1024 },
  );

  if (!response) {
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 503 },
    );
  }

  // Log the interaction
  if (profile?.organization_id) {
    await supabaseAdmin.from("ai_interactions").insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      feature: "mobile_chat",
      sub_type: "conversation",
      prompt_text: message,
      response_text: response.text,
      provider: response.provider,
      is_success: true,
    });
  }

  return NextResponse.json({ text: response.text, provider: response.provider });
}
