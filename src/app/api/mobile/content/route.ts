import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
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
  const { profileId, contentType, topic, tone, count } = body;

  if (!profileId || !contentType || !topic) {
    return NextResponse.json(
      { error: "profileId, contentType, and topic are required" },
      { status: 400 },
    );
  }

  // Verify profile belongs to the user's organization
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userProfile?.organization_id) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  // Get the social profile — scoped to user's org
  const { data: socialProfile } = await supabaseAdmin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("organization_id", userProfile.organization_id)
    .single();

  if (!socialProfile) {
    return NextResponse.json(
      { error: "Social profile not found" },
      { status: 404 },
    );
  }

  // Get latest metrics
  const { data: metrics } = await supabaseAdmin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: false })
    .limit(10);

  try {
    const { generateContentAI } = await import("@/lib/ai/content-generator");

    const result = await generateContentAI({
      profile: socialProfile,
      metrics: metrics ?? [],
      contentType,
      topic,
      tone: tone || "Professional",
      count: count || 5,
    });

    const resultData = { contentType, topic, tone, ...result.data };

    // Save to DB (non-blocking)
    supabaseAdmin
      .from("social_analyses")
      .insert({
        social_profile_id: profileId,
        analysis_type: "content_generator",
        result: resultData,
        ai_provider: result.provider,
        tokens_used: 0,
        cost_cents: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error("[content/route] DB insert failed:", error.message);
      });

    return NextResponse.json({ success: true, data: resultData });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
