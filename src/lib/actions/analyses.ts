"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { AnalysisType } from "@/types";

export async function runAnalysis(profileId: string, analysisType: AnalysisType) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Use admin client for all DB reads/writes to bypass RLS
  // (tables like social_metrics, social_competitors, social_goals, and
  // social_analyses chain through social_profile_id, not organization_id,
  // so RLS policies fail with the user-scoped client)
  const admin = createAdminClient();

  // Get the social profile
  const { data: socialProfile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!socialProfile) {
    return { error: "Social profile not found." };
  }

  // Get latest metrics
  const { data: metrics } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: false })
    .limit(30);

  // Get competitors (for relevant analysis types)
  let competitors: unknown[] = [];
  if (["growth", "competitors", "insights", "network"].includes(analysisType)) {
    const { data: comps } = await admin
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
    const { data: goal } = await admin
      .from("social_goals")
      .select("*")
      .eq("social_profile_id", profileId)
      .eq("is_active", true)
      .limit(1)
      .single();
    goals = goal;
  }

  try {
    // Import AI analysis function dynamically
    const { analyzeSocialProfile } = await import("@/lib/ai/social-analysis");

    const result = await analyzeSocialProfile({
      profile: socialProfile,
      metrics: metrics ?? [],
      competitors,
      goals,
      analysisType,
      userId: user.id,
    });

    // Store the result (admin client bypasses RLS on social_analyses)
    const { error: insertError } = await admin
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
      });

    if (insertError) {
      return { error: "Failed to save analysis result." };
    }

    revalidatePath("/dashboard", "layout");
    return { success: true, data: result.data as Record<string, unknown> };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return { error: message };
  }
}

export async function runRecommendations(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const admin = createAdminClient();

  const { data: socialProfile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!socialProfile) {
    return { error: "Social profile not found." };
  }

  const { data: metrics } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: false })
    .limit(30);

  const { data: goal } = await admin
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .eq("is_active", true)
    .limit(1)
    .single();

  // Fetch ALL existing analyses for this profile
  const { data: allAnalyses } = await admin
    .from("social_analyses")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("created_at", { ascending: false });

  // Group by type — keep latest per type
  const inputTypes = [
    "growth", "content_strategy", "hashtags", "competitors", "insights",
    "earnings_forecast", "thirty_day_plan", "smo_score", "audience",
    "network", "campaign_ideas", "content_generator", "recommendations",
  ] as const;
  const analysesRecord: Record<string, unknown> = {};
  for (const type of inputTypes) {
    analysesRecord[type] =
      (allAnalyses ?? []).find(
        (a: Record<string, unknown>) => a.analysis_type === type,
      ) ?? null;
  }

  try {
    const { generateRecommendations } = await import(
      "@/lib/ai/recommendations"
    );

    const result = await generateRecommendations({
      profile: socialProfile,
      metrics: metrics ?? [],
      goals: goal,
      analyses: analysesRecord as never,
    });

    const { error: insertError } = await admin.from("social_analyses").insert({
      social_profile_id: profileId,
      analysis_type: "recommendations",
      result: result.data,
      ai_provider: result.provider,
      tokens_used: 0,
      cost_cents: 0,
      expires_at: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    if (insertError) {
      console.error("[runRecommendations] DB insert failed:", insertError.message);
    }

    revalidatePath("/dashboard", "layout");
    return { success: true, data: result.data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Recommendations generation failed.";
    return { error: message };
  }
}

export async function runAllAnalyses(profileId: string) {
  const coreTypes: AnalysisType[] = [
    "growth",
    "content_strategy",
    "hashtags",
    "competitors",
    "insights",
    "earnings_forecast",
    "thirty_day_plan",
    "smo_score",
    "audience",
    "network",
    "campaign_ideas",
  ];

  const results: { type: AnalysisType; success: boolean; error?: string }[] = [];

  // ── Phase 1: Run core analyses (batches of 5) + content generator (3 at a time) IN PARALLEL ──
  const corePromise = (async () => {
    for (let i = 0; i < coreTypes.length; i += 5) {
      const batch = coreTypes.slice(i, i + 5);
      const batchResults = await Promise.allSettled(
        batch.map((type) => runAnalysis(profileId, type)),
      );
      for (let j = 0; j < batch.length; j++) {
        const r = batchResults[j];
        if (r.status === "fulfilled" && r.value.success) {
          results.push({ type: batch[j], success: true });
        } else {
          const error = r.status === "fulfilled" ? r.value.error : r.reason?.message;
          results.push({ type: batch[j], success: false, error });
        }
      }
    }
  })();

  const contentPromise = (async () => {
    try {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("social_profiles")
        .select("platform, niche, display_name, handle")
        .eq("id", profileId)
        .single();

      const niche = (profile?.niche as string) || (profile?.display_name as string) || "general";
      const { generateContentAI } = await import("@/lib/ai/content-generator");

      const { data: metrics } = await admin
        .from("social_metrics")
        .select("*")
        .eq("social_profile_id", profileId)
        .order("date", { ascending: false })
        .limit(10);

      // Only generate post_ideas in Run All — other types generated on-demand from AI Studio
      const cgResult = await generateContentAI({
        profile: profile as Record<string, unknown>,
        metrics: (metrics ?? []) as Record<string, unknown>[],
        contentType: "post_ideas",
        topic: niche,
        tone: "Professional",
        count: 5,
      });
      const resultData = { contentType: "post_ideas", topic: niche, tone: "Professional", ...cgResult.data };
      const { error: cgInsertError } = await admin.from("social_analyses").insert({
        social_profile_id: profileId,
        analysis_type: "content_generator",
        result: resultData,
        ai_provider: cgResult.provider,
        tokens_used: 0,
        cost_cents: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (cgInsertError) {
        console.error("[runAllAnalyses] content_generator DB insert failed:", cgInsertError.message);
      }
      results.push({ type: "content_generator", success: true });
    } catch (err) {
      results.push({
        type: "content_generator",
        success: false,
        error: err instanceof Error ? err.message : "Content generation failed",
      });
    }
  })();

  // Wait for both core analyses and content generation to finish
  await Promise.all([corePromise, contentPromise]);

  // Recommendations excluded from Run All — too heavy (reads all analyses, 3-min AI timeout).
  // Users can run it manually from the Recommendations page after all other analyses are done.

  revalidatePath("/dashboard", "layout");
  return {
    success: results.every((r) => r.success),
    results,
    completed: results.filter((r) => r.success).length,
    total: results.length,
  };
}
