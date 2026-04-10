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
  const { profileId, analysisType } = body;

  if (!profileId || !analysisType) {
    return NextResponse.json(
      { error: "profileId and analysisType are required" },
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
    .limit(30);

  // Get competitors (for relevant analysis types)
  let competitors: unknown[] = [];
  if (
    ["growth", "competitors", "insights", "network"].includes(analysisType)
  ) {
    const { data: comps } = await supabaseAdmin
      .from("social_competitors")
      .select("*")
      .eq("social_profile_id", profileId);
    competitors = comps ?? [];
  }

  // Get goals (for relevant analysis types)
  let goals = null;
  if (
    [
      "growth",
      "content_strategy",
      "insights",
      "earnings_forecast",
      "thirty_day_plan",
    ].includes(analysisType)
  ) {
    const { data: goal } = await supabaseAdmin
      .from("social_goals")
      .select("*")
      .eq("social_profile_id", profileId)
      .eq("is_active", true)
      .limit(1)
      .single();
    goals = goal;
  }

  try {
    const { analyzeSocialProfile } = await import("@/lib/ai/social-analysis");

    const result = await analyzeSocialProfile({
      profile: socialProfile,
      metrics: metrics ?? [],
      competitors,
      goals,
      analysisType,
      userId: user.id,
    });

    // Store the result (non-blocking)
    supabaseAdmin
      .from("social_analyses")
      .insert({
        social_profile_id: profileId,
        analysis_type: analysisType,
        result: result.data,
        ai_provider: result.provider,
        tokens_used: result.tokensUsed ?? 0,
        cost_cents: result.costCents ?? 0,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error("[analyses/route] DB insert failed:", error.message);
      });

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
