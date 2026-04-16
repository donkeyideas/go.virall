"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { AnalysisType, PrimaryGoal } from "@/types";

/** Fetch the current user's primary_goal (user-level ambition fallback). */
async function fetchPrimaryGoal(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<PrimaryGoal | null> {
  const { data } = await admin
    .from("profiles")
    .select("primary_goal")
    .eq("id", userId)
    .single();
  return (data?.primary_goal as PrimaryGoal | null) ?? null;
}

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

  // Get goals (per-profile active goal)
  const { data: goal } = await admin
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  const goals = goal;

  // User-level ambition fallback — used by prompts when no per-profile goal
  const primaryGoal = await fetchPrimaryGoal(admin, user.id);

  try {
    // Import AI analysis function dynamically
    const { analyzeSocialProfile } = await import("@/lib/ai/social-analysis");

    const result = await analyzeSocialProfile({
      profile: socialProfile,
      metrics: metrics ?? [],
      competitors,
      goals,
      primaryGoal,
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
    .maybeSingle();

  // User-level ambition fallback
  const primaryGoal = await fetchPrimaryGoal(admin, user.id);

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
      primaryGoal,
      analyses: analysesRecord as never,
    });

    const { error: insertError } = await admin.from("social_analyses").insert({
      social_profile_id: profileId,
      analysis_type: "recommendations",
      result: result.data,
      ai_provider: result.provider,
      tokens_used: result.tokensUsed ?? 0,
      cost_cents: result.costCents ?? 0,
      expires_at: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    if (insertError) {
      console.error("[runRecommendations] DB insert failed:", insertError.message);
      // Return data so user sees results, but flag the save failure
      return {
        success: true,
        data: result.data,
        warning: `Results generated but failed to save: ${insertError.message}. They will disappear on page refresh.`,
      };
    }

    revalidatePath("/dashboard/recommendations");
    revalidatePath("/dashboard", "layout");
    return { success: true, data: result.data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Recommendations generation failed.";
    return { error: message };
  }
}

export async function runAllAnalyses(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated.", results: [], completed: 0, total: 0, success: false };
  }

  const admin = createAdminClient();

  // ── Hoist all shared reads ONCE (instead of 12x inside each runAnalysis call) ──
  const [profileRes, metricsRes, competitorsRes, goalRes, primaryGoal] = await Promise.all([
    admin.from("social_profiles").select("*").eq("id", profileId).single(),
    admin
      .from("social_metrics")
      .select("*")
      .eq("social_profile_id", profileId)
      .order("date", { ascending: false })
      .limit(30),
    admin.from("social_competitors").select("*").eq("social_profile_id", profileId),
    admin
      .from("social_goals")
      .select("*")
      .eq("social_profile_id", profileId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    fetchPrimaryGoal(admin, user.id),
  ]);

  const socialProfile = profileRes.data;
  if (!socialProfile) {
    return { error: "Social profile not found.", results: [], completed: 0, total: 0, success: false };
  }

  const metrics = metricsRes.data ?? [];
  const competitors = competitorsRes.data ?? [];
  const goal = goalRes.data ?? null;

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

  // ── Run ALL analyses fully in parallel with a single Promise.allSettled ──
  const { analyzeSocialProfile } = await import("@/lib/ai/social-analysis");
  const { generateContentAI } = await import("@/lib/ai/content-generator");

  const nicheTopic =
    (socialProfile.niche as string) ||
    (socialProfile.display_name as string) ||
    "general";

  const coreTasks = coreTypes.map(async (analysisType) => {
    try {
      const result = await analyzeSocialProfile({
        profile: socialProfile,
        metrics,
        competitors,
        goals: goal,
        primaryGoal,
        analysisType,
        userId: user.id,
      });
      const { error: insertError } = await admin.from("social_analyses").insert({
        social_profile_id: profileId,
        analysis_type: analysisType,
        result: result.data,
        ai_provider: result.provider,
        tokens_used: result.tokensUsed ?? 0,
        cost_cents: result.costCents ?? 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (insertError) {
        return { type: analysisType, success: false, error: insertError.message };
      }
      return { type: analysisType, success: true };
    } catch (err) {
      return {
        type: analysisType,
        success: false,
        error: err instanceof Error ? err.message : "Analysis failed",
      };
    }
  });

  const contentTask = (async () => {
    try {
      const cgResult = await generateContentAI({
        profile: socialProfile as Record<string, unknown>,
        metrics: metrics as Record<string, unknown>[],
        contentType: "post_ideas",
        topic: nicheTopic,
        tone: "Professional",
        count: 5,
        primaryGoal,
      });
      const resultData = {
        contentType: "post_ideas",
        topic: nicheTopic,
        tone: "Professional",
        ...cgResult.data,
      };
      const { error: cgInsertError } = await admin.from("social_analyses").insert({
        social_profile_id: profileId,
        analysis_type: "content_generator",
        result: resultData,
        ai_provider: cgResult.provider,
        tokens_used: cgResult.tokensUsed ?? 0,
        cost_cents: cgResult.costCents ?? 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (cgInsertError) {
        return {
          type: "content_generator" as AnalysisType,
          success: false,
          error: cgInsertError.message,
        };
      }
      return { type: "content_generator" as AnalysisType, success: true };
    } catch (err) {
      return {
        type: "content_generator" as AnalysisType,
        success: false,
        error: err instanceof Error ? err.message : "Content generation failed",
      };
    }
  })();

  const settled = await Promise.allSettled([...coreTasks, contentTask]);
  const results: { type: AnalysisType; success: boolean; error?: string }[] = settled.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { type: "growth", success: false, error: r.reason?.message ?? "Task crashed" },
  );

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
