import { formatCompact } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/types";
import type {
  SocialProfile,
  SocialAnalysis,
  Deal,
} from "@/types";

// ============================================================
// Types
// ============================================================

export interface BriefItem {
  category: string;
  headline: string;
  body: string;
}

// ============================================================
// Analysis result extraction
// ============================================================

export function getResult(
  analysis: SocialAnalysis | null | undefined,
): Record<string, unknown> | null {
  if (!analysis?.result) return null;
  return analysis.result as Record<string, unknown>;
}

// ============================================================
// Brief Extraction Helpers
// ============================================================

export function extractGrowthBrief(
  data: Record<string, unknown> | null,
  _profile: SocialProfile | null,
): BriefItem | null {
  if (!data) return null;
  const tips = (data.tips ?? []) as Array<{
    title: string;
    description: string;
    priority: string;
    estimatedImpact?: string;
  }>;
  const tip = tips.find((t) => t.priority === "high") ?? tips[0];
  if (!tip) return null;
  return {
    category: "GROWTH ALERT",
    headline: tip.title,
    body:
      tip.description +
      (tip.estimatedImpact ? ` Estimated impact: +${tip.estimatedImpact}.` : ""),
  };
}

export function extractEngagementBrief(
  data: Record<string, unknown> | null,
): BriefItem | null {
  if (!data) return null;
  const insights = (data.insights ?? []) as Array<{
    title: string;
    insight: string;
    priority: string;
  }>;
  const insight =
    insights.find(
      (i) => i.priority === "critical" || i.priority === "important",
    ) ?? insights[0];
  if (!insight) return null;
  return {
    category: "ENGAGEMENT INSIGHT",
    headline: insight.title,
    body: insight.insight,
  };
}

export function extractRevenueBrief(
  data: Record<string, unknown> | null,
): BriefItem | null {
  if (!data) return null;
  const forecast = (data.forecast ?? data) as Record<string, unknown>;
  const summaryStats = forecast.summaryStats as
    | { estMonthly: number; estMonthlyLabel?: string }
    | undefined;
  const scenarios = (forecast.scenarios ?? []) as Array<{
    scenario: string;
    monthlyEarnings: number;
  }>;
  const optimistic = scenarios.find((s) =>
    s.scenario.toLowerCase().includes("optimistic"),
  );

  if (summaryStats) {
    return {
      category: "REVENUE OPPORTUNITY",
      headline: `$${summaryStats.estMonthly.toLocaleString()} Month Achievable`,
      body: optimistic
        ? `Current monthly estimate with potential to reach $${optimistic.monthlyEarnings.toLocaleString()}/mo in the optimistic scenario.`
        : summaryStats.estMonthlyLabel ??
          "Based on current performance and market rates.",
    };
  }

  const currentEstimate = forecast.currentEstimate as number | undefined;
  if (currentEstimate) {
    return {
      category: "REVENUE OPPORTUNITY",
      headline: `$${currentEstimate.toLocaleString()}/mo Estimated`,
      body: "Based on current follower count, engagement rate, and industry benchmarks.",
    };
  }

  return null;
}

export function extractAudienceBrief(
  data: Record<string, unknown> | null,
): BriefItem | null {
  if (!data) return null;
  const audience = (data.audience ?? data) as Record<string, unknown>;
  const qualityScore = audience.qualityScore as
    | { overall: number; categoryNote?: string }
    | undefined;
  const legacyQuality = audience.audienceQuality as
    | { score: number; explanation: string }
    | undefined;
  const score = qualityScore?.overall ?? legacyQuality?.score;
  if (!score) return null;

  const growthQuality = audience.growthQuality as
    | { organic: number }
    | undefined;
  const organicPct = growthQuality?.organic;

  return {
    category: "AUDIENCE QUALITY",
    headline: `${score}/100 Audience Score${score >= 80 ? " \u2014 Top Tier" : ""}`,
    body: organicPct
      ? `${organicPct}% authentic followers with organic growth.${qualityScore?.categoryNote ? " " + qualityScore.categoryNote : ""}`
      : legacyQuality?.explanation ??
        "Based on follower authenticity, engagement patterns, and growth quality.",
  };
}

export function extractSMOBrief(
  data: Record<string, unknown> | null,
): BriefItem | null {
  if (!data) return null;
  const smo = (data.smo ?? data) as Record<string, unknown>;
  const overallScore = (smo.overallScore as number) ?? 0;
  const factors = (smo.factors ?? []) as Array<{
    factor: string;
    score: number;
    maxScore: number;
    recommendation: string;
  }>;
  if (!overallScore) return null;

  const weakest =
    factors.length > 0
      ? factors.reduce((min, f) =>
          f.score / f.maxScore < min.score / min.maxScore ? f : min,
        )
      : null;

  return {
    category: "SMO ALERT",
    headline: `SMO Score ${overallScore}/100${weakest ? ` \u2014 ${weakest.factor} Needs Work` : ""}`,
    body:
      weakest?.recommendation ??
      "Review your Social Media Optimization score factors for improvement areas.",
  };
}

export function extractContentBrief(
  data: Record<string, unknown> | null,
): BriefItem | null {
  if (!data) return null;
  const strategy = (data.strategy ?? data) as Record<string, unknown>;
  const proTips = (strategy.proTips ?? []) as string[];
  const contentPillars = (strategy.contentPillars ?? []) as Array<
    string | Record<string, unknown>
  >;
  const postingFrequency = strategy.postingFrequency as
    | { headline: string }
    | undefined;

  const headline =
    postingFrequency?.headline ??
    (contentPillars.length > 0
      ? `${contentPillars.length} Content Pillars Identified`
      : "Content Strategy Available");

  const body =
    proTips[0] ??
    (contentPillars.length > 0
      ? `Focus on: ${contentPillars
          .slice(0, 3)
          .map((p) =>
            typeof p === "string"
              ? p
              : ((p as Record<string, unknown>).name as string) ?? "",
          )
          .join(", ")}`
      : "Review your content strategy for detailed recommendations.");

  return {
    category: "CONTENT TIP",
    headline,
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

export function extractHashtagBrief(
  data: Record<string, unknown> | null,
): BriefItem | null {
  if (!data) return null;
  const hashtags = (data.hashtags ?? []) as Array<{
    tag: string;
    estimatedReach: string;
  }>;
  if (hashtags.length === 0) return null;

  const highReach = hashtags.filter((h) => h.estimatedReach === "high");

  return {
    category: "HASHTAG INSIGHT",
    headline: `${hashtags.length} Optimized Hashtags${highReach.length > 0 ? ` \u2014 ${highReach.length} High-Reach` : ""}`,
    body: `Top hashtags: ${hashtags
      .slice(0, 5)
      .map((h) => h.tag)
      .join(", ")}`,
  };
}

export function extractBrandBrief(
  data: Record<string, unknown> | null,
  deals: Deal[],
): BriefItem | null {
  if (data) {
    const network = (data.network ?? data) as Record<string, unknown>;
    const brandOpps = (network.brandOpportunities ?? []) as Array<{
      brandName: string;
      matchPercentage: number;
    }>;
    if (brandOpps.length > 0) {
      return {
        category: "BRAND ALERT",
        headline: `${brandOpps.length} Brand Partnership Opportunities`,
        body: `Top matches: ${brandOpps
          .slice(0, 3)
          .map((b) => `${b.brandName} (${b.matchPercentage}%)`)
          .join(", ")}`,
      };
    }
  }

  const active = deals.filter(
    (d) => d.status === "active" || d.status === "negotiation",
  );
  if (active.length > 0) {
    return {
      category: "BRAND ALERT",
      headline: `${active.length} Active Deal${active.length > 1 ? "s" : ""} in Progress`,
      body: `Working with: ${active
        .slice(0, 3)
        .map((d) => d.brand_name)
        .join(", ")}`,
    };
  }

  return null;
}

export function extractMultiPlatformBrief(
  profiles: SocialProfile[],
): BriefItem | null {
  if (profiles.length < 2) return null;

  const totalFollowers = profiles.reduce(
    (sum, p) => sum + (p.followers_count || 0),
    0,
  );
  const largest = profiles.reduce((max, p) =>
    p.followers_count > max.followers_count ? p : max,
  );

  return {
    category: "MULTI-PLATFORM",
    headline: `${formatCompact(totalFollowers)} Combined Reach Across ${profiles.length} Profiles`,
    body: `Your largest audience is on ${PLATFORM_CONFIG[largest.platform]?.label ?? largest.platform} with @${largest.handle} at ${formatCompact(largest.followers_count)} followers. Also active on ${profiles
      .filter((p) => p.id !== largest.id)
      .map((p) => PLATFORM_CONFIG[p.platform]?.label ?? p.platform)
      .join(" and ")}.`,
  };
}

// ============================================================
// Heatmap Helpers
// ============================================================

export function formatHour(h: number) {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

export function activityLabel(v: number) {
  if (v > 70) return "Peak Activity";
  if (v > 50) return "High Activity";
  if (v > 30) return "Moderate";
  return "Low Activity";
}

export function activityColor(v: number) {
  if (v > 60) return "var(--color-editorial-red, #c0392b)";
  if (v > 30) return "var(--color-editorial-gold, #b8860b)";
  return "var(--color-ink-muted, #999)";
}

export function engBoost(v: number) {
  if (v > 60) return `+${Math.round((v / 100 - 0.3) * 40)}%`;
  if (v > 30) return `+${Math.round((v / 100 - 0.1) * 20)}%`;
  return "Low";
}

export function bestFormat(di: number, h: number) {
  const formats = ["Reels", "Carousels", "Stories", "Single Posts", "Live"];
  return formats[((di * 137 + (h + 7) * 311 + 42) % 100) % formats.length];
}
