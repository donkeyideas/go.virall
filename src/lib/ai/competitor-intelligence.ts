"use server";

/**
 * Go Virall Competitor Intelligence Engine
 * Generates AI-powered competitive insights by comparing a creator's performance
 * against their tracked competitors.
 */

import { aiChat } from "./provider";
import { profileSummary } from "./social-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CompetitorInsight, SocialCompetitor } from "@/types";

// ── Helpers ──

function parseJSON(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text.trim());
    if (v && typeof v === "object") return v as Record<string, unknown>;
  } catch {
    /* continue */
  }

  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try {
      const v = JSON.parse(braceMatch[1].trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch {
      /* continue */
    }
  }

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

function buildCompetitorContext(competitors: SocialCompetitor[]): string {
  if (!competitors.length) return "No competitors tracked.";
  return competitors
    .map(
      (c) =>
        `- @${c.handle} (${c.platform}): ${c.followers_count ?? "?"} followers, ${c.engagement_rate ?? "?"}% engagement, niche: ${c.niche || "unknown"}, display: ${c.display_name || c.handle}`,
    )
    .join("\n");
}

// ── generateCompetitorInsights ──

export async function generateCompetitorInsights(
  socialProfileId: string,
): Promise<{ success: true; data: CompetitorInsight[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();

  // 1. Fetch user's social profile
  const { data: profile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", socialProfileId)
    .single();

  if (!profile) {
    return { success: false, error: "Social profile not found." };
  }

  // 2. Fetch all competitors
  const { data: competitorsRaw } = await admin
    .from("social_competitors")
    .select("*")
    .eq("social_profile_id", socialProfileId);

  const competitors = (competitorsRaw ?? []) as SocialCompetitor[];

  if (competitors.length === 0) {
    return {
      success: false,
      error: "No competitors tracked. Add competitors to your profile to get AI-powered insights.",
    };
  }

  // 3. Fetch user's recent metrics for context
  const { data: metricsRaw } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", socialProfileId)
    .order("date", { ascending: false })
    .limit(14);

  const metrics = metricsRaw ?? [];
  const avgEngagement = metrics.length > 0
    ? metrics.reduce((sum: number, m: Record<string, unknown>) => sum + (Number(m.engagement_rate) || 0), 0) / metrics.length
    : Number(profile.engagement_rate) || 0;

  // 4. Build the AI prompt
  const competitorIds = competitors.map((c) => c.id);
  const competitorHandleMap = Object.fromEntries(competitors.map((c) => [c.handle, c.id]));

  const prompt = `You are a competitive intelligence analyst for social media creators. Compare this creator's performance against their tracked competitors and generate actionable insights.

CREATOR PROFILE:
${profileSummary(profile as Record<string, unknown>)}

CREATOR'S RECENT PERFORMANCE:
- Average Engagement Rate (14d): ${avgEngagement.toFixed(2)}%
- Followers: ${profile.followers_count}
- Posts: ${profile.posts_count}

TRACKED COMPETITORS:
${buildCompetitorContext(competitors)}

COMPETITOR HANDLES AND IDS (use these exact IDs in your response):
${competitors.map((c) => `@${c.handle} => competitor_id: "${c.id}"`).join("\n")}

For EACH competitor, generate 1-2 insights analyzing:
- What they are doing differently (content strategy, posting frequency, engagement tactics)
- Content strategies that appear to be working for them
- Opportunities the creator is missing
- Specific actionable tips to compete more effectively

Return this exact JSON structure:
{
  "insights": [
    {
      "competitor_id": string (MUST be one of the competitor IDs listed above),
      "competitor_handle": string (the @handle for reference),
      "insight_type": "weekly_summary" | "trend_alert" | "strategy_change" | "viral_content",
      "title": string (concise, descriptive title),
      "description": string (2-4 sentence detailed analysis),
      "actionable_tips": string[] (3-5 specific, actionable recommendations),
      "priority": "critical" | "high" | "medium" | "info",
      "data_snapshot": {
        "competitor_followers": number | null,
        "competitor_engagement": number | null,
        "user_followers": ${profile.followers_count},
        "user_engagement": ${avgEngagement.toFixed(2)},
        "gap_analysis": string (brief comparison summary)
      }
    }
  ]
}

Generate ${Math.min(competitors.length * 2, 8)} insights total, spread across all competitors. Prioritize the most impactful findings. Assign insight_type based on the nature of the finding:
- "weekly_summary" for general performance comparison
- "trend_alert" for emerging trends the competitor is leveraging
- "strategy_change" for notable shifts in their approach
- "viral_content" for content strategies that are producing outsized results

IMPORTANT: Use ONLY the actual competitor_id values provided above. Respond ONLY with valid, complete JSON. No markdown, no explanation.`;

  // 5. Call AI
  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 120000,
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

  // Extract insights array
  const rawInsights = Array.isArray(parsed.insights)
    ? (parsed.insights as Record<string, unknown>[])
    : [];

  if (rawInsights.length === 0) {
    return { success: false, error: "AI did not return any insights." };
  }

  // 6. Save each insight to competitor_insights table
  const savedInsights: CompetitorInsight[] = [];

  for (const raw of rawInsights) {
    // Validate competitor_id is one of the actual competitor IDs
    let competitorId = String(raw.competitor_id || "");
    if (!competitorIds.includes(competitorId)) {
      // Try to resolve from handle
      const handle = String(raw.competitor_handle || "").replace("@", "");
      competitorId = competitorHandleMap[handle] || competitorIds[0];
    }

    const insightType = ["weekly_summary", "trend_alert", "strategy_change", "viral_content"].includes(
      String(raw.insight_type),
    )
      ? (String(raw.insight_type) as CompetitorInsight["insight_type"])
      : "weekly_summary";

    const priority = ["critical", "high", "medium", "info"].includes(String(raw.priority))
      ? (String(raw.priority) as CompetitorInsight["priority"])
      : "medium";

    const actionableTips = Array.isArray(raw.actionable_tips)
      ? (raw.actionable_tips as string[]).filter((t) => typeof t === "string")
      : [];

    const dataSnapshot = (raw.data_snapshot as Record<string, unknown>) ?? {};

    const { data: inserted, error: insertError } = await admin
      .from("competitor_insights")
      .insert({
        social_profile_id: socialProfileId,
        competitor_id: competitorId,
        insight_type: insightType,
        title: String(raw.title || "Competitor Insight"),
        description: String(raw.description || ""),
        actionable_tips: actionableTips,
        data_snapshot: dataSnapshot,
        priority,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[generateCompetitorInsights] DB insert error:", insertError.message);
      // Still include the data even if DB fails
      savedInsights.push({
        id: "temp-" + Date.now() + "-" + savedInsights.length,
        social_profile_id: socialProfileId,
        competitor_id: competitorId,
        insight_type: insightType,
        title: String(raw.title || "Competitor Insight"),
        description: String(raw.description || ""),
        actionable_tips: actionableTips,
        data_snapshot: dataSnapshot,
        priority,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } else {
      savedInsights.push(inserted as CompetitorInsight);
    }
  }

  return { success: true, data: savedInsights };
}

// ── getCompetitorInsights ──

export async function getCompetitorInsights(
  socialProfileId: string,
  unreadOnly: boolean = false,
): Promise<CompetitorInsight[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Verify the user owns this social profile via organization
  const { data: sp } = await admin
    .from("social_profiles")
    .select("organization_id")
    .eq("id", socialProfileId)
    .single();
  if (!sp) return [];

  const { data: userProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!userProfile || userProfile.organization_id !== sp.organization_id) return [];

  let query = admin
    .from("competitor_insights")
    .select("*")
    .eq("social_profile_id", socialProfileId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data } = await query;
  return (data ?? []) as CompetitorInsight[];
}

// ── markInsightRead ──

export async function markInsightRead(
  insightId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();

  // Verify ownership: insight → social_profile → org matches user's org
  const { data: insight } = await admin
    .from("competitor_insights")
    .select("social_profile_id")
    .eq("id", insightId)
    .single();
  if (!insight) return { success: false, error: "Insight not found." };

  const { data: sp } = await admin
    .from("social_profiles")
    .select("organization_id")
    .eq("id", insight.social_profile_id)
    .single();
  const { data: userProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!sp || !userProfile || sp.organization_id !== userProfile.organization_id) {
    return { success: false, error: "Insight not found." };
  }

  const { error } = await admin
    .from("competitor_insights")
    .update({ is_read: true })
    .eq("id", insightId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
