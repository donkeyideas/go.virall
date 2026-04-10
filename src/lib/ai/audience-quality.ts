"use server";

/**
 * Go Virall AQS (Audience Quality Score) Engine
 * Calculates a multi-dimensional quality score for a social profile's audience.
 * Dimensions: engagement quality, follower authenticity, growth health, content consistency.
 */

import { aiChat } from "./provider";
import { profileSummary, metricsSummary } from "./social-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AudienceQualityScore, AQSGrade } from "@/types";

// ── Helpers ──

function parseJSON(text: string): Record<string, unknown> {
  // Strategy 1: direct parse
  try {
    const v = JSON.parse(text.trim());
    if (v && typeof v === "object") return v as Record<string, unknown>;
  } catch {
    /* continue */
  }

  // Strategy 2: extract {...}
  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try {
      const v = JSON.parse(braceMatch[1].trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch {
      /* continue */
    }
  }

  // Strategy 3: code block extraction
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    try {
      const v = JSON.parse(codeMatch[1].trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch {
      /* continue */
    }
  }

  throw new Error("Could not parse AI response as JSON");
}

function scoreToGrade(score: number): AQSGrade {
  if (score >= 97) return "A+";
  if (score >= 93) return "A";
  if (score >= 90) return "A-";
  if (score >= 87) return "B+";
  if (score >= 83) return "B";
  if (score >= 80) return "B-";
  if (score >= 77) return "C+";
  if (score >= 73) return "C";
  if (score >= 70) return "C-";
  if (score >= 67) return "D+";
  if (score >= 63) return "D";
  return "D-";
}

// ── Main: calculateAQS ──

export async function calculateAQS(
  socialProfileId: string,
): Promise<{ success: true; data: AudienceQualityScore } | { success: false; error: string }> {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();

  // 1. Fetch social profile
  const { data: profile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", socialProfileId)
    .single();

  if (!profile) {
    return { success: false, error: "Social profile not found." };
  }

  // 2. Fetch metrics history (last 30 days)
  const { data: metricsRaw } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", socialProfileId)
    .order("date", { ascending: false })
    .limit(30);

  const metrics = (metricsRaw ?? []) as Record<string, unknown>[];

  // 3. Build the AI prompt
  const prompt = `You are an audience quality analyst for social media creators. Analyze this creator's audience and provide a comprehensive quality score.

PROFILE:
${profileSummary(profile as Record<string, unknown>)}

RECENT METRICS (last 30 days):
${metricsSummary(metrics)}

Analyze and score (0-100) each of these four dimensions:

1. **engagement_quality**: Is the engagement rate healthy for this follower count tier? Are likes/comments proportional? Is there meaningful comment activity vs just likes? Consider industry benchmarks for ${profile.platform} in the ${profile.niche || "general"} niche.

2. **follower_authenticity**: Based on the follower count, engagement rate patterns, and growth data, estimate how organic/authentic the audience appears. Look for signs of: purchased followers (high followers, low engagement), engagement pods, or bot activity. Score higher for healthy follower-to-engagement ratios.

3. **growth_health**: Is the account growing steadily? Look at the metrics history for follower trends. Steady organic growth scores high. Stagnation, decline, or suspicious spikes score lower.

4. **content_consistency**: How regular and consistent is the posting pattern? Look at posts_count relative to account age, and if metrics show regular posting cadence. Consistent posting schedules score higher.

Return this exact JSON structure:
{
  "overall_score": number (0-100, weighted average: engagement_quality 30%, follower_authenticity 30%, growth_health 20%, content_consistency 20%),
  "engagement_quality": number (0-100),
  "follower_authenticity": number (0-100),
  "growth_health": number (0-100),
  "content_consistency": number (0-100),
  "grade": string (letter grade A+ through D- based on overall_score),
  "risk_flags": string[] (array of specific risk flags found, e.g. "Low engagement-to-follower ratio", "Irregular posting schedule", "Suspicious follower spike detected". Empty array if no risks),
  "breakdown": {
    "engagement_analysis": string (2-3 sentence analysis of engagement quality),
    "authenticity_analysis": string (2-3 sentence analysis of follower authenticity),
    "growth_analysis": string (2-3 sentence analysis of growth health),
    "consistency_analysis": string (2-3 sentence analysis of content consistency),
    "overall_summary": string (2-3 sentence overall assessment),
    "top_recommendation": string (single most impactful action to improve the score)
  },
  "audience_demographics": {
    "estimated_real_followers_pct": number (0-100, estimated percentage of real/active followers),
    "estimated_bot_pct": number (0-100, estimated bot percentage),
    "engagement_tier": string (e.g. "Above Average", "Average", "Below Average" for their follower bracket)
  }
}

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`;

  // 4. Call AI
  const response = await aiChat(prompt, {
    temperature: 0.6,
    maxTokens: 2048,
    timeout: 90000,
    jsonMode: true,
  });

  if (!response) {
    return { success: false, error: "All AI providers failed. Check your API keys in Settings." };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJSON(response.text);
  } catch {
    return { success: false, error: "Failed to parse AI response." };
  }

  // Normalize scores
  const overallScore = Math.round(Number(parsed.overall_score) || 0);
  const engagementQuality = Math.round(Number(parsed.engagement_quality) || 0);
  const followerAuthenticity = Math.round(Number(parsed.follower_authenticity) || 0);
  const growthHealth = Math.round(Number(parsed.growth_health) || 0);
  const contentConsistency = Math.round(Number(parsed.content_consistency) || 0);
  const grade = scoreToGrade(overallScore);
  const riskFlags = Array.isArray(parsed.risk_flags)
    ? (parsed.risk_flags as string[]).filter((f) => typeof f === "string")
    : [];
  const breakdown = (parsed.breakdown as Record<string, unknown>) ?? {};
  const audienceDemographics = (parsed.audience_demographics as Record<string, unknown>) ?? {};

  // 5. Save to audience_quality_scores table
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 day expiry

  const { data: inserted, error: insertError } = await admin
    .from("audience_quality_scores")
    .insert({
      social_profile_id: socialProfileId,
      overall_score: overallScore,
      engagement_quality: engagementQuality,
      follower_authenticity: followerAuthenticity,
      growth_health: growthHealth,
      content_consistency: contentConsistency,
      grade,
      risk_flags: riskFlags,
      breakdown,
      audience_demographics: audienceDemographics,
      calculated_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[calculateAQS] DB insert error:", insertError.message);
    // Return the computed data even if DB save fails
    return {
      success: true,
      data: {
        id: "temp-" + Date.now(),
        social_profile_id: socialProfileId,
        overall_score: overallScore,
        engagement_quality: engagementQuality,
        follower_authenticity: followerAuthenticity,
        growth_health: growthHealth,
        content_consistency: contentConsistency,
        grade,
        risk_flags: riskFlags,
        breakdown,
        audience_demographics: audienceDemographics,
        calculated_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
    };
  }

  return { success: true, data: inserted as AudienceQualityScore };
}

// ── getLatestAQS ──

export async function getLatestAQS(
  socialProfileId: string,
): Promise<AudienceQualityScore | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Use admin client since audience_quality_scores may not have RLS policies set up
  const admin = createAdminClient();
  const { data } = await admin
    .from("audience_quality_scores")
    .select("*")
    .eq("social_profile_id", socialProfileId)
    .gte("expires_at", new Date().toISOString())
    .order("calculated_at", { ascending: false })
    .limit(1)
    .single();

  return (data as AudienceQualityScore) ?? null;
}
