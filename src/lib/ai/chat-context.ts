/**
 * Chat Context Builder
 *
 * Builds a rich system prompt by injecting the user's real data:
 * profile metrics, top posts, audience, competitors, goals, earnings,
 * and platform algorithm intelligence.
 *
 * This is the moat — ChatGPT doesn't have their data.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getAlgorithmContext } from "./platform-algorithms";
import type {
  SocialProfile,
  SocialMetrics,
  SocialCompetitor,
  SocialGoal,
  AnalysisType,
} from "@/types";

interface ChatContext {
  systemPrompt: string;
  profileSummary: string;
}

/**
 * Build full chat context for a user, combining all their data
 * into a system prompt the AI can reference naturally.
 */
export async function buildChatContext(
  userId: string,
  organizationId: string,
  userName: string | null,
): Promise<ChatContext> {
  const admin = createAdminClient();

  // Fetch all user's social profiles
  const { data: profiles } = await admin
    .from("social_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("followers_count", { ascending: false });

  const socialProfiles = (profiles ?? []) as SocialProfile[];

  if (socialProfiles.length === 0) {
    return {
      systemPrompt: buildBasePrompt(userName),
      profileSummary: "No social profiles connected yet.",
    };
  }

  // Fetch metrics for top profile (last 30 days)
  const topProfile = socialProfiles[0];
  const { data: metricsData } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", topProfile.id)
    .order("date", { ascending: false })
    .limit(30);

  const metrics = (metricsData ?? []) as SocialMetrics[];

  // Fetch competitors for top profile
  const { data: competitorData } = await admin
    .from("social_competitors")
    .select("*")
    .eq("social_profile_id", topProfile.id)
    .order("followers_count", { ascending: false })
    .limit(5);

  const competitors = (competitorData ?? []) as SocialCompetitor[];

  // Fetch active goal
  const { data: goalData } = await admin
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", topProfile.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const goal = goalData as SocialGoal | null;

  // Fetch latest key analyses
  const analysisTypes: AnalysisType[] = [
    "audience",
    "earnings_forecast",
    "smo_score",
    "content_strategy",
  ];

  const { data: analysesData } = await admin
    .from("social_analyses")
    .select("analysis_type, result, created_at")
    .eq("social_profile_id", topProfile.id)
    .in("analysis_type", analysisTypes)
    .order("created_at", { ascending: false });

  const analyses = (analysesData ?? []) as Array<{
    analysis_type: string;
    result: Record<string, unknown>;
  }>;

  // Deduplicate — keep latest per type
  const latestAnalyses: Record<string, Record<string, unknown>> = {};
  for (const a of analyses) {
    if (!latestAnalyses[a.analysis_type]) {
      latestAnalyses[a.analysis_type] = a.result;
    }
  }

  // Build profile summary
  const profileSummary = buildProfileSummary(
    socialProfiles,
    topProfile,
    metrics,
    competitors,
    goal,
    latestAnalyses,
  );

  const systemPrompt = `${buildBasePrompt(userName)}

${profileSummary}`;

  return { systemPrompt, profileSummary };
}

function buildBasePrompt(userName: string | null): string {
  return `You are the user's personal social media strategist on Go Virall. Your name is Virall AI.

PERSONALITY:
- You're a sharp, experienced social media strategist who has managed accounts with millions of followers
- Be direct, confident, and data-driven. No fluff, no generic advice
- When you have the user's data, ALWAYS reference their actual numbers — this is what makes you different from ChatGPT
- Use their real metrics when making recommendations ("Your engagement rate of 3.2% is above average for your niche")
- Be encouraging but honest — if something isn't working, say so constructively

RULES:
- NEVER hallucinate or make up metrics you don't have. If data is missing, say "I don't have enough data on that yet — try syncing your profile first"
- When asked about posting times, reference their actual audience activity data if available
- When asked about content, reference their actual top-performing posts
- Format responses with clear structure: use numbered lists for steps, bold for key points
- Keep responses concise but actionable — creators are busy
- When discussing platform strategy, use the 2026 algorithm intelligence provided below

The user's name is ${userName || "there"}.`;
}

function buildProfileSummary(
  allProfiles: SocialProfile[],
  topProfile: SocialProfile,
  metrics: SocialMetrics[],
  competitors: SocialCompetitor[],
  goal: SocialGoal | null,
  analyses: Record<string, Record<string, unknown>>,
): string {
  const parts: string[] = [];

  // Connected platforms overview
  parts.push("--- USER'S CONNECTED PLATFORMS ---");
  for (const p of allProfiles) {
    const er = p.engagement_rate ? `${p.engagement_rate.toFixed(2)}%` : "N/A";
    parts.push(
      `${p.platform.toUpperCase()}: @${p.handle} | ${formatNumber(p.followers_count)} followers | ${er} engagement | ${p.posts_count} posts`,
    );
  }

  // Primary profile deep dive
  parts.push(`\n--- PRIMARY PROFILE: @${topProfile.handle} (${topProfile.platform}) ---`);
  if (topProfile.bio) parts.push(`Bio: ${topProfile.bio}`);
  if (topProfile.niche) parts.push(`Niche: ${topProfile.niche}`);
  parts.push(`Followers: ${formatNumber(topProfile.followers_count)}`);
  parts.push(`Following: ${formatNumber(topProfile.following_count)}`);
  parts.push(`Posts: ${topProfile.posts_count}`);
  if (topProfile.engagement_rate) {
    parts.push(`Engagement Rate: ${topProfile.engagement_rate.toFixed(2)}%`);
  }
  if (topProfile.verified) parts.push("Verified: Yes");

  // Growth trend from metrics
  if (metrics.length >= 2) {
    const latest = metrics[0];
    const oldest = metrics[metrics.length - 1];
    if (latest.followers && oldest.followers) {
      const growth = latest.followers - oldest.followers;
      const growthPct =
        oldest.followers > 0
          ? ((growth / oldest.followers) * 100).toFixed(1)
          : "N/A";
      parts.push(
        `\n30-Day Growth: ${growth > 0 ? "+" : ""}${formatNumber(growth)} followers (${growthPct}%)`,
      );
    }
    if (latest.engagement_rate && oldest.engagement_rate) {
      const erChange = latest.engagement_rate - oldest.engagement_rate;
      parts.push(
        `Engagement Trend: ${erChange > 0 ? "+" : ""}${erChange.toFixed(2)}% over 30 days`,
      );
    }
  }

  // Top posts
  if (topProfile.recent_posts?.length) {
    parts.push("\n--- TOP RECENT POSTS ---");
    const sorted = [...topProfile.recent_posts]
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, 5);
    for (let i = 0; i < sorted.length; i++) {
      const post = sorted[i];
      const caption = post.caption
        ? post.caption.slice(0, 80) + (post.caption.length > 80 ? "..." : "")
        : "(no caption)";
      parts.push(
        `${i + 1}. ${post.isVideo ? "VIDEO" : "IMAGE"} — ${formatNumber(post.likesCount)} likes, ${formatNumber(post.commentsCount)} comments — "${caption}"`,
      );
    }
  }

  // Competitors
  if (competitors.length > 0) {
    parts.push("\n--- COMPETITORS ---");
    for (const c of competitors) {
      const er = c.engagement_rate ? `${c.engagement_rate.toFixed(2)}%` : "N/A";
      parts.push(
        `@${c.handle} (${c.platform}) — ${formatNumber(c.followers_count ?? 0)} followers | ${er} engagement`,
      );
    }
  }

  // Active goal
  if (goal) {
    parts.push("\n--- ACTIVE GOAL ---");
    if (goal.primary_objective) parts.push(`Objective: ${goal.primary_objective}`);
    if (goal.target_value) parts.push(`Target: ${goal.target_value}`);
    if (goal.target_days) parts.push(`Timeline: ${goal.target_days} days`);
    if (goal.content_niche) parts.push(`Content Niche: ${goal.content_niche}`);
    if (goal.monetization_goal) parts.push(`Monetization Goal: ${goal.monetization_goal}`);
  }

  // Audience insights
  const audience = analyses.audience;
  if (audience) {
    const result = extractNestedResult(audience);
    parts.push("\n--- AUDIENCE INSIGHTS ---");
    if (result.quality_score) parts.push(`Quality Score: ${result.quality_score}/100`);
    if (result.demographics) {
      const demo = result.demographics as Record<string, unknown>;
      if (demo.age_groups)
        parts.push(`Top Age Groups: ${JSON.stringify(demo.age_groups)}`);
      if (demo.top_countries)
        parts.push(`Top Countries: ${JSON.stringify(demo.top_countries)}`);
    }
    if (result.interests)
      parts.push(`Interests: ${JSON.stringify(result.interests)}`);
  }

  // Earnings forecast
  const earnings = analyses.earnings_forecast;
  if (earnings) {
    const result = extractNestedResult(earnings);
    parts.push("\n--- EARNINGS DATA ---");
    if (result.scenarios) {
      const scenarios = result.scenarios as Array<Record<string, unknown>>;
      for (const s of scenarios) {
        if (s.name && s.monthly)
          parts.push(`${s.name}: $${s.monthly}/month`);
      }
    }
    if (result.revenue_sources)
      parts.push(
        `Revenue Sources: ${JSON.stringify(result.revenue_sources)}`,
      );
  }

  // SMO Score
  const smo = analyses.smo_score;
  if (smo) {
    const result = extractNestedResult(smo);
    if (result.overall_score) {
      parts.push(`\nSMO Score: ${result.overall_score}/100`);
    }
  }

  // Platform algorithm intelligence
  parts.push("\n" + getAlgorithmContext(topProfile.platform));

  return parts.join("\n");
}

/**
 * Analyses can be stored as { result: { raw: "..." } } or direct JSON.
 * This handles both formats.
 */
function extractNestedResult(
  result: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof result.raw === "string") {
    try {
      return JSON.parse(result.raw);
    } catch {
      return result;
    }
  }
  if (result.result && typeof result.result === "object") {
    return result.result as Record<string, unknown>;
  }
  return result;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
