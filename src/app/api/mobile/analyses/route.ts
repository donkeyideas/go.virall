import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin,
  getAuthContext,
  getMonthlyUsage,
  logUsageEvent,
  planLimitResponse,
  isWithinLimit,
} from "../_shared/auth";

export async function POST(req: NextRequest) {
  const result = await getAuthContext(req);
  if ("error" in result) return result.error;
  const { ctx } = result;

  const body = await req.json();
  const { profileId, analysisType } = body;

  if (!profileId || !analysisType) {
    return NextResponse.json(
      { error: "profileId and analysisType are required" },
      { status: 400 },
    );
  }

  // B6: Enforce ai_insights_per_month limit (superadmins bypass)
  if (!ctx.isSuperadmin) {
    const usage = await getMonthlyUsage(ctx.orgId, "ai_insight_generated");
    if (!isWithinLimit(usage, ctx.limits.ai_insights_per_month)) {
      return planLimitResponse(
        "ai_insights_per_month",
        ctx.plan,
        usage,
        ctx.limits.ai_insights_per_month,
      );
    }
  }

  // Get the social profile — scoped to user's org
  const { data: socialProfile } = await supabaseAdmin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("organization_id", ctx.orgId)
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

    const analysis = await analyzeSocialProfile({
      profile: socialProfile,
      metrics: metrics ?? [],
      competitors,
      goals,
      analysisType,
      userId: ctx.user.id,
    });

    // Store the result (non-blocking)
    supabaseAdmin
      .from("social_analyses")
      .insert({
        social_profile_id: profileId,
        analysis_type: analysisType,
        result: analysis.data,
        ai_provider: analysis.provider,
        tokens_used: analysis.tokensUsed ?? 0,
        cost_cents: analysis.costCents ?? 0,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error("[analyses/route] DB insert failed:", error.message);
      });

    // Log usage event for plan-limit tracking
    if (!ctx.isSuperadmin) {
      await logUsageEvent(ctx.orgId, ctx.user.id, "ai_insight_generated", {
        analysis_type: analysisType,
        profile_id: profileId,
      });
    }

    return NextResponse.json({ success: true, data: analysis.data });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
