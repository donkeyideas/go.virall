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
  const { profileId, contentType, topic, tone, count } = body;

  if (!profileId || !contentType || !topic) {
    return NextResponse.json(
      { error: "profileId, contentType, and topic are required" },
      { status: 400 },
    );
  }

  // B6: Enforce ai_content_per_month limit (superadmins bypass)
  if (!ctx.isSuperadmin) {
    const usage = await getMonthlyUsage(ctx.orgId, "ai_content_generated");
    if (!isWithinLimit(usage, ctx.limits.ai_content_per_month)) {
      return planLimitResponse(
        "ai_content_per_month",
        ctx.plan,
        usage,
        ctx.limits.ai_content_per_month,
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
    .limit(10);

  // User-level ambition — tunes content hook/CTA/format choices
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("primary_goal")
    .eq("id", ctx.user.id)
    .single();
  const primaryGoal = userProfile?.primary_goal ?? null;

  try {
    const { generateContentAI } = await import("@/lib/ai/content-generator");

    const generated = await generateContentAI({
      profile: socialProfile,
      metrics: metrics ?? [],
      contentType,
      topic,
      tone: tone || "Professional",
      count: count || 5,
      primaryGoal,
    });

    const resultData = { contentType, topic, tone, ...generated.data };

    // Save to DB (non-blocking)
    supabaseAdmin
      .from("social_analyses")
      .insert({
        social_profile_id: profileId,
        analysis_type: "content_generator",
        result: resultData,
        ai_provider: generated.provider,
        tokens_used: 0,
        cost_cents: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error("[content/route] DB insert failed:", error.message);
      });

    // Log usage event for plan-limit tracking
    if (!ctx.isSuperadmin) {
      await logUsageEvent(ctx.orgId, ctx.user.id, "ai_content_generated", {
        content_type: contentType,
        profile_id: profileId,
      });
    }

    return NextResponse.json({ success: true, data: resultData });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Content generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
