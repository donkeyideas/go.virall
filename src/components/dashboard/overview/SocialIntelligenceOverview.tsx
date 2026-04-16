"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { cn, formatCompact } from "@/lib/utils";
import type {
  SocialProfile,
  SocialAnalysis,
  AnalysisType,
  SocialCompetitor,
  Deal,
  Campaign,
  Notification,
  SocialMetrics,
  RecentPost,
  TrustScore,
  PrimaryGoal,
} from "@/types";
import type { RevenueStats } from "@/lib/dal/revenue";
import type { GoalProgress } from "@/lib/dal/goals";
import { PLATFORM_CONFIG } from "@/types";
import { TrustScoreDetail } from "@/components/deals/TrustScoreDetail";
import { MissionBadge } from "./MissionBadge";
import { GoalProgressCard } from "./GoalProgressCard";

// ============================================================
// Types
// ============================================================

interface OverviewProps {
  profiles: SocialProfile[];
  analysisMap: Record<string, Record<AnalysisType, SocialAnalysis | null>>;
  competitorsMap: Record<string, SocialCompetitor[]>;
  deals: Deal[];
  campaigns: Campaign[];
  notifications: Notification[];
  metricsMap: Record<string, SocialMetrics[]>;
  trustScore: TrustScore | null;
  revenueStats: RevenueStats | null;
  primaryGoal: PrimaryGoal | null;
  goalProgress: GoalProgress[];
}

interface BriefItem {
  category: string;
  headline: string;
  body: string;
}

// ============================================================
// Brief Extraction Helpers
// ============================================================

function getResult(
  analysis: SocialAnalysis | null | undefined,
): Record<string, unknown> | null {
  if (!analysis?.result) return null;
  return analysis.result as Record<string, unknown>;
}

function extractGrowthBrief(
  data: Record<string, unknown> | null,
  profile: SocialProfile | null,
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

function extractEngagementBrief(
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

function extractRevenueBrief(
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
      headline: `$${(summaryStats.estMonthly ?? 0).toLocaleString()} Month Achievable`,
      body: optimistic
        ? `Current monthly estimate with potential to reach $${(optimistic.monthlyEarnings ?? 0).toLocaleString()}/mo in the optimistic scenario.`
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

function extractAudienceBrief(
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

function extractSMOBrief(
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

function extractContentBrief(
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

function extractHashtagBrief(
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

function extractBrandBrief(
  data: Record<string, unknown> | null,
  deals: Deal[],
): BriefItem | null {
  if (data) {
    const network = (data.network ?? data) as Record<string, unknown>;

    // New format: brandCategories
    const brandCats = (network.brandCategories ?? []) as Array<{
      category: string;
      matchPercentage: number;
    }>;
    if (brandCats.length > 0) {
      return {
        category: "BRAND INSIGHT",
        headline: `${brandCats.length} Brand Categories Match Your Niche`,
        body: `Top categories: ${brandCats
          .slice(0, 3)
          .map((b) => `${b.category} (${b.matchPercentage}%)`)
          .join(", ")}`,
      };
    }

    // Legacy format: brandOpportunities (old cached results)
    const brandOpps = (network.brandOpportunities ?? []) as Array<{
      brandName: string;
      matchPercentage: number;
    }>;
    if (brandOpps.length > 0) {
      return {
        category: "BRAND INSIGHT",
        headline: `${brandOpps.length} Brand Categories Identified`,
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

function extractMultiPlatformBrief(
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
// Heatmap Helpers (preserved from existing codebase)
// ============================================================

function formatHour(h: number) {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

function activityLabel(v: number) {
  if (v > 70) return "Peak Activity";
  if (v > 50) return "High Activity";
  if (v > 30) return "Moderate";
  return "Low Activity";
}

function activityColor(v: number) {
  if (v > 60) return "var(--color-editorial-red, #c0392b)";
  if (v > 30) return "var(--color-editorial-gold, #b8860b)";
  return "var(--color-ink-muted, #999)";
}

function engBoost(v: number) {
  if (v > 60) return `+${Math.round((v / 100 - 0.3) * 40)}%`;
  if (v > 30) return `+${Math.round((v / 100 - 0.1) * 20)}%`;
  return "Low";
}

function bestFormat(di: number, h: number) {
  const formats = ["Reels", "Carousels", "Stories", "Single Posts", "Live"];
  return formats[((di * 137 + (h + 7) * 311 + 42) % 100) % formats.length];
}

// ============================================================
// Main Component
// ============================================================

export function SocialIntelligenceOverview({
  profiles,
  analysisMap,
  competitorsMap,
  deals,
  campaigns,
  notifications,
  metricsMap,
  trustScore,
  revenueStats,
  primaryGoal,
  goalProgress,
}: OverviewProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    profiles[0]?.id ?? null,
  );

  // Heatmap state
  const [selectedCell, setSelectedCell] = useState<{
    dayIdx: number;
    hourIdx: number;
    day: string;
    value: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ left: 0, top: 0 });
  const heatmapRef = useRef<HTMLDivElement>(null);

  const handleCellClick = useCallback(
    (
      e: React.MouseEvent<HTMLDivElement>,
      dayIdx: number,
      hourIdx: number,
      day: string,
      value: number,
    ) => {
      e.stopPropagation();
      if (
        selectedCell?.dayIdx === dayIdx &&
        selectedCell?.hourIdx === hourIdx
      ) {
        setSelectedCell(null);
        return;
      }
      setSelectedCell({ dayIdx, hourIdx, day, value });
      const grid = heatmapRef.current?.querySelector(
        "[data-heatmap-grid]",
      ) as HTMLElement;
      if (grid) {
        const gridRect = grid.getBoundingClientRect();
        const cellRect = e.currentTarget.getBoundingClientRect();
        let left = cellRect.left - gridRect.left + cellRect.width + 8;
        let top = cellRect.top - gridRect.top - 20;
        if (left + 240 > gridRect.width)
          left = cellRect.left - gridRect.left - 240;
        if (top < 0) top = 0;
        setTooltipPos({ left, top });
      }
    },
    [selectedCell],
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-heatmap-cell]") &&
        !target.closest("[data-heatmap-tooltip]")
      ) {
        setSelectedCell(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    setSelectedCell(null);
  }, [selectedProfileId]);

  // ──── Computed Data ────

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) ?? null;
  const isAllProfiles = selectedProfileId === null;

  const totalFollowers = profiles.reduce(
    (sum, p) => sum + (p.followers_count || 0),
    0,
  );
  // Avg Likes/Post across all profiles
  const avgLikesPerPost = (() => {
    let totalLikes = 0;
    let totalPostCount = 0;
    for (const p of profiles) {
      const posts = (p as unknown as { recent_posts?: RecentPost[] }).recent_posts;
      if (posts?.length) {
        totalLikes += posts.reduce((s, post) => s + (post.likesCount || 0), 0);
        totalPostCount += posts.length;
      }
    }
    return totalPostCount > 0 ? Math.round(totalLikes / totalPostCount) : 0;
  })();
  const totalPosts = profiles.reduce(
    (sum, p) => sum + (p.posts_count || 0),
    0,
  );

  const profileForData = selectedProfile ?? profiles[0] ?? null;

  // Avg Likes/Post for the selected profile
  const profileAvgLikes = (() => {
    if (!profileForData) return 0;
    const posts = (profileForData as unknown as { recent_posts?: RecentPost[] }).recent_posts;
    if (!posts?.length) return 0;
    const totalLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
    return Math.round(totalLikes / posts.length);
  })();

  const pid = profileForData?.id ?? "";
  const analyses =
    analysisMap[pid] ?? ({} as Record<AnalysisType, SocialAnalysis | null>);
  const competitors = competitorsMap[pid] ?? [];
  const metrics = metricsMap[pid] ?? [];

  // Extract analysis results
  const growthData = getResult(analyses.growth);
  const insightsData = getResult(analyses.insights);
  const earningsData = getResult(analyses.earnings_forecast);
  const audienceData = getResult(analyses.audience);
  const smoData = getResult(analyses.smo_score);
  const contentData = getResult(analyses.content_strategy);
  const hashtagData = getResult(analyses.hashtags);
  const networkData = getResult(analyses.network);
  const competitorsAnalysis = getResult(analyses.competitors);

  // SMO Score
  const smoResult = smoData
    ? ((smoData.smo ?? smoData) as Record<string, unknown>)
    : null;
  const smoScore = smoResult ? ((smoResult.overallScore as number) ?? 0) : 0;

  // Audience data
  const audienceResult = audienceData
    ? ((audienceData.audience ?? audienceData) as Record<string, unknown>)
    : null;
  const qualityScore = audienceResult?.qualityScore as
    | {
        overall: number;
        categoryNote?: string;
        factors: Array<{ name: string; score: number }>;
      }
    | undefined;
  const audienceQualityScore =
    qualityScore?.overall ??
    (audienceResult?.audienceQuality as { score: number } | undefined)?.score ??
    0;

  // Heatmap
  const heatmap = audienceResult?.activityHeatmap as
    | {
        data: Array<{ day: string; hours: number[] }>;
        peakTimes: string[];
      }
    | undefined;

  // Network / Influence
  const networkResult = networkData
    ? ((networkData.network ?? networkData) as Record<string, unknown>)
    : null;
  const influenceScoreObj = networkResult?.influenceScore as
    | Record<string, unknown>
    | number
    | undefined;
  const influenceScore =
    typeof influenceScoreObj === "object" && influenceScoreObj !== null
      ? ((influenceScoreObj as Record<string, unknown>).overall as number)
      : typeof influenceScoreObj === "number"
        ? influenceScoreObj
        : undefined;

  // Earnings
  const earningsResult = earningsData
    ? ((earningsData.forecast ?? earningsData) as Record<string, unknown>)
    : null;
  const summaryStats = earningsResult?.summaryStats as
    | {
        estMonthly: number;
        activeDeals: number;
        ytdRevenue: number;
        ytdDealsCompleted?: number;
      }
    | undefined;

  // Content Mix (from content_strategy)
  const contentMixData = (() => {
    if (!contentData) return {} as Record<string, number>;
    const strategy = (contentData.strategy ?? contentData) as Record<
      string,
      unknown
    >;
    return (strategy.contentMix ?? {}) as Record<string, number>;
  })();
  const contentMixEntries = Object.entries(contentMixData);

  // Revenue by Source (from earnings_forecast)
  const revenueBySources = (() => {
    if (!earningsResult) return [];
    return (earningsResult.revenueBySources ?? []) as Array<{
      source: string;
      percentage: number;
      monthlyAmount: number;
    }>;
  })();

  // Audience Demographics
  const ageDistribution = audienceResult
    ? ((audienceResult.ageDistribution ?? []) as Array<{
        range: string;
        percentage: number;
      }>)
    : [];
  const genderDistribution = audienceResult
    ? ((audienceResult.genderDistribution ?? {}) as Record<string, number>)
    : {};
  const genderEntries = Object.entries(genderDistribution);

  // Top hashtags
  const topHashtags = (() => {
    if (!hashtagData) return [];
    return (
      (hashtagData.hashtags ?? []) as Array<{
        tag: string;
        category: string;
        estimatedReach: string;
      }>
    ).slice(0, 10);
  })();

  // Industry Benchmarks (from network)
  const industryBenchmarks = networkResult
    ? ((networkResult.industryBenchmarks ?? []) as Array<{
        metric: string;
        yourValue: number;
        average: number;
        unit: string;
        delta: number;
      }>)
    : [];

  // KPI influencer score
  const kpiInfluencerScore =
    influenceScore ?? smoScore ?? audienceQualityScore ?? 0;

  // Recent posts
  const recentPosts: RecentPost[] = (() => {
    if (!profileForData?.recent_posts) return [];
    const posts = profileForData.recent_posts;
    if (Array.isArray(posts)) return posts as RecentPost[];
    if (typeof posts === "string") {
      try {
        return JSON.parse(posts) as RecentPost[];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const topContent = [...recentPosts]
    .sort(
      (a, b) =>
        b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount),
    )
    .slice(0, 5);

  // Metrics for charts
  const chartMetrics = [...metrics].reverse();

  const engagementTrendData = chartMetrics
    .filter((m) => m.engagement_rate != null)
    .map((m) => ({
      date: new Date(m.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      rate: m.engagement_rate,
    }));

  const followerGrowthData = chartMetrics
    .filter((m) => m.followers != null)
    .map((m) => ({
      date: new Date(m.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      followers: m.followers,
    }));

  // ──── Intelligence Brief Items ────

  const briefItems: BriefItem[] = [];

  const gb = extractGrowthBrief(growthData, profileForData);
  if (gb) briefItems.push(gb);

  const eb = extractEngagementBrief(insightsData);
  if (eb) briefItems.push(eb);

  const rb = extractRevenueBrief(earningsData);
  if (rb) briefItems.push(rb);

  const ab = extractAudienceBrief(audienceData);
  if (ab) briefItems.push(ab);

  if (isAllProfiles) {
    const mp = extractMultiPlatformBrief(profiles);
    if (mp) briefItems.push(mp);
  }

  const sb = extractSMOBrief(smoData);
  if (sb) briefItems.push(sb);

  const bb = extractBrandBrief(networkData, deals);
  if (bb) briefItems.push(bb);

  const cb = extractContentBrief(contentData);
  if (cb) briefItems.push(cb);

  const hb = extractHashtagBrief(hashtagData);
  if (hb) briefItems.push(hb);

  // ──── Strategic Analysis ────

  const strategicHeadline = (() => {
    if (!profileForData) return null;
    const handle = profileForData.handle;
    if (insightsData) {
      const insights = (insightsData.insights ?? []) as Array<{
        title: string;
      }>;
      if (insights.length > 0) {
        return `Strategic Analysis: @${handle} \u2014 ${insights[0].title}`;
      }
    }
    const platform =
      PLATFORM_CONFIG[profileForData.platform]?.label ??
      profileForData.platform;
    const niche = profileForData.niche;
    return `Strategic Analysis: @${handle} on ${platform}${niche ? ` in ${niche}` : ""}`;
  })();

  const strategicSummary = (() => {
    if (!profileForData) return "";
    if (insightsData) {
      const insights = (insightsData.insights ?? []) as Array<{
        insight: string;
      }>;
      if (insights.length > 0) return insights[0].insight;
    }
    const followers = formatCompact(profileForData.followers_count);
    const likes = profileAvgLikes;
    return `With ${followers} followers${likes ? ` and ${formatCompact(likes)} avg likes/post` : ""}, @${profileForData.handle} has growth potential. Run analyses in the Intelligence tab for detailed strategic insights.`;
  })();

  // ──── Competitors for sidebar ────

  const competitorProfiles = (() => {
    if (competitorsAnalysis) {
      const analysis = (competitorsAnalysis.analysis ??
        competitorsAnalysis) as Record<string, unknown>;
      const cp = (analysis.competitorProfiles ?? []) as Array<{
        handle: string;
        followersCount: number;
      }>;
      if (cp.length > 0) return cp;
    }
    return competitors.map((c) => ({
      handle: c.handle,
      followersCount: c.followers_count ?? 0,
    }));
  })();

  // SMO factors for sidebar
  const smoFactors = smoResult
    ? ((smoResult.factors ?? []) as Array<{
        factor: string;
        score: number;
        maxScore: number;
      }>)
    : [];

  // Upcoming deadlines
  const upcomingDeadlines = deals
    .filter((d) => d.status === "active" || d.status === "negotiation")
    .slice(0, 4);

  // Timestamps
  const lastSynced = profileForData?.last_synced_at
    ? new Date(profileForData.last_synced_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const profileCreated = profileForData?.created_at
    ? new Date(profileForData.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  // ============================================================
  // RENDER
  // ============================================================

  if (profiles.length === 0) {
    return (
      <div>
        <MissionBadge primaryGoal={primaryGoal} variant="editorial" />
        <div className="py-20 text-center">
          <h2 className="font-serif text-2xl font-bold text-ink">
            Welcome to <span className="text-editorial-accent">Go</span>Virall
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-secondary">
            Connect your first social media profile in the Profiles tab to unlock
            analytics, growth strategies, and content intelligence.
          </p>
          <a
            href="/dashboard/guide"
            className="mt-5 inline-block bg-editorial-gold px-6 py-2.5 font-sans text-[12px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
          >
            Getting Started Guide
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <MissionBadge primaryGoal={primaryGoal} variant="editorial" />
      <GoalProgressCard goalProgress={goalProgress} variant="editorial" />
      {/* ──── Profile Tabs ──── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setSelectedProfileId(null)}
          className={cn(
            "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors",
            isAllProfiles
              ? "border-2 border-editorial-red text-editorial-red bg-surface-card"
              : "border border-rule text-ink-secondary hover:border-ink-muted",
          )}
        >
          All Profiles
        </button>
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => setSelectedProfileId(profile.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors",
              selectedProfileId === profile.id
                ? "border-2 border-editorial-red text-ink bg-surface-card"
                : "border border-rule text-ink-secondary hover:border-ink-muted",
            )}
          >
            <PlatformIcon platform={profile.platform} size={12} />
            @{profile.handle}
            {profile.platform !== "instagram" && (
              <span className="text-ink-muted normal-case">
                ({PLATFORM_CONFIG[profile.platform]?.label})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ──── KPI Bar ──── */}
      <div className="grid grid-cols-2 border border-rule bg-surface-card sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: "Profiles",
            value: isAllProfiles ? profiles.length : 1,
          },
          {
            label: "Total Followers",
            value: isAllProfiles
              ? totalFollowers > 0
                ? formatCompact(totalFollowers)
                : "---"
              : selectedProfile
                ? formatCompact(selectedProfile.followers_count)
                : "---",
          },
          {
            label: "Avg Likes/Post",
            value: isAllProfiles
              ? avgLikesPerPost > 0
                ? formatCompact(avgLikesPerPost)
                : "---"
              : profileAvgLikes > 0
                ? formatCompact(profileAvgLikes)
                : "---",
          },
          {
            label: "Trust Score",
            value: trustScore?.overall_score != null
              ? `${trustScore.overall_score}/100`
              : "---",
          },
          {
            label: "Revenue (Month)",
            value: revenueStats?.thisMonth != null && revenueStats.thisMonth > 0
              ? `$${formatCompact(revenueStats.thisMonth)}`
              : "---",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border-b border-r border-rule px-4 py-4 last:border-r-0"
          >
            <p className="editorial-overline">{stat.label}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-ink">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ──── Last Synced ──── */}
      {(() => {
        const latest = profiles.reduce<string | null>((best, p) => {
          if (!p.last_synced_at) return best;
          if (!best) return p.last_synced_at;
          return new Date(p.last_synced_at) > new Date(best) ? p.last_synced_at : best;
        }, null);
        return latest ? (
          <p className="mt-2 text-right text-[10px] text-ink-muted">
            Last synced: {new Date(latest).toLocaleString()}
          </p>
        ) : null;
      })()}

      {/* ──── Three-Column Newspaper Layout ──── */}
      <div className="mt-6 border-t-4 border-double border-rule-dark pt-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_2.5fr_1.3fr]">
          {/* ════ LEFT COLUMN: Trust Score + Intelligence Brief ════ */}
          <div className="border-r-0 lg:border-r lg:border-rule lg:pr-6">
            {/* Trust Score Detail — top of left column */}
            {trustScore && (
              <a href="/dashboard/trust-score" className="block mb-5">
                <TrustScoreDetail trustScore={trustScore} />
              </a>
            )}

            <h2 className="font-serif text-lg font-bold text-ink">
              Social Intelligence Brief
            </h2>
            <p className="editorial-overline mt-0.5">
              Today&apos;s Top Findings
            </p>

            <div className="mt-4 space-y-5">
              {briefItems.length > 0 ? (
                briefItems.map((item, i) => (
                  <div
                    key={i}
                    className="border-b border-rule pb-4 last:border-0"
                  >
                    <p className="editorial-label">{item.category}</p>
                    <h3 className="mt-1 font-serif text-sm font-bold leading-snug text-ink">
                      {item.headline}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
                      {item.body}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-ink-muted">
                    Run analyses in the Intelligence tab to see intelligence
                    briefs here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ════ CENTER COLUMN: Main Content ════ */}
          <div className="space-y-6">
            {/* Strategic Analysis */}
            {strategicHeadline && (
              <div>
                <h2 className="font-serif text-xl font-bold leading-tight text-ink lg:text-2xl">
                  {strategicHeadline}
                </h2>
                {strategicSummary && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary italic">
                    {strategicSummary}
                  </p>
                )}
              </div>
            )}

            {/* Profile Performance */}
            {profileForData && (
              <div className="border border-rule bg-surface-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <p className="editorial-label">Profile Performance</p>
                  <span className="text-[10px] text-ink-muted">
                    @{profileForData.handle} &mdash;{" "}
                    {PLATFORM_CONFIG[profileForData.platform]?.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="editorial-overline">Followers</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-ink">
                      {formatCompact(profileForData.followers_count)}
                    </p>
                  </div>
                  <div>
                    <p className="editorial-overline">Avg Likes/Post</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-ink">
                      {profileAvgLikes > 0
                        ? formatCompact(profileAvgLikes)
                        : "---"}
                    </p>
                  </div>
                  <div>
                    <p className="editorial-overline">Est. Earnings</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-ink">
                      {summaryStats?.estMonthly != null
                        ? `$${summaryStats.estMonthly.toLocaleString()}`
                        : "---"}
                    </p>
                    {summaryStats && (
                      <p className="text-[9px] text-ink-muted">per month</p>
                    )}
                  </div>
                  <div>
                    <p className="editorial-overline">Total Posts</p>
                    <p className="mt-1 font-serif text-2xl font-bold text-ink">
                      {formatCompact(profileForData.posts_count)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ──── Business Dashboard ──── */}
            <div className="border border-rule bg-surface-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-serif text-sm font-bold text-ink">
                    Business Dashboard
                  </h3>
                  <p className="editorial-overline">Revenue &amp; Deals</p>
                </div>
                <a
                  href="/dashboard/business"
                  className="text-[10px] font-semibold text-editorial-red hover:underline"
                >
                  View Full Dashboard &rarr;
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="border border-rule bg-surface-raised px-3 py-2">
                  <p className="editorial-overline">Pipeline Value</p>
                  <p className="mt-1 font-serif text-lg font-bold text-ink">
                    {revenueStats?.pipelineValue != null
                      ? `$${formatCompact(revenueStats.pipelineValue)}`
                      : "---"}
                  </p>
                </div>
                <div className="border border-rule bg-surface-raised px-3 py-2">
                  <p className="editorial-overline">Active Deals</p>
                  <p className="mt-1 font-serif text-lg font-bold text-ink">
                    {deals.filter(
                      (d) =>
                        d.status === "active" ||
                        d.status === "negotiation" ||
                        d.status === "inquiry",
                    ).length}
                  </p>
                </div>
                <div className="border border-rule bg-surface-raised px-3 py-2">
                  <p className="editorial-overline">This Month</p>
                  <p className="mt-1 font-serif text-lg font-bold text-editorial-green">
                    {revenueStats?.thisMonth != null
                      ? `$${formatCompact(revenueStats.thisMonth)}`
                      : "---"}
                  </p>
                  {revenueStats?.thisMonthChange != null &&
                    revenueStats.thisMonthChange !== 0 && (
                      <p
                        className={cn(
                          "text-[9px] font-semibold",
                          revenueStats.thisMonthChange > 0
                            ? "text-editorial-green"
                            : "text-editorial-red",
                        )}
                      >
                        {revenueStats.thisMonthChange > 0 ? "+" : ""}
                        {revenueStats.thisMonthChange.toFixed(0)}% vs last month
                      </p>
                    )}
                </div>
                <div className="border border-rule bg-surface-raised px-3 py-2">
                  <p className="editorial-overline">Pending</p>
                  <p className="mt-1 font-serif text-lg font-bold text-ink">
                    {revenueStats?.pendingPayments != null
                      ? `$${formatCompact(revenueStats.pendingPayments)}`
                      : "---"}
                  </p>
                </div>
              </div>
            </div>

            {/* ──── Follower Activity Heatmap ──── */}
            {heatmap && heatmap.data && heatmap.data.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Follower Activity Heatmap
                </h3>
                <p className="text-[10px] text-ink-muted mb-3">
                  Best times to post &mdash; click a cell for details
                </p>
                <div ref={heatmapRef} className="relative">
                  <div
                    data-heatmap-grid
                    className="grid"
                    style={{
                      gridTemplateColumns: "40px repeat(24, 1fr)",
                      gap: "2px",
                      fontSize: "9px",
                    }}
                  >
                    <div />
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="text-center font-mono text-[8px] text-ink-muted"
                      >
                        {i % 3 === 0
                          ? i === 0
                            ? "12a"
                            : i < 12
                              ? `${i}a`
                              : i === 12
                                ? "12p"
                                : `${i - 12}p`
                          : ""}
                      </div>
                    ))}
                    {heatmap.data.map((row, ri) => {
                      const hours = row.hours ?? [];
                      return (
                        <Fragment key={ri}>
                          <div className="flex items-center font-mono text-[9px] font-semibold uppercase text-ink-muted">
                            {row.day}
                          </div>
                          {hours.map((val, ci) => {
                            const nv = val / 100;
                            const r = Math.round(192 * nv);
                            const g = Math.round(57 * nv);
                            const b = Math.round(43 * nv);
                            const isSelected =
                              selectedCell?.dayIdx === ri &&
                              selectedCell?.hourIdx === ci;
                            return (
                              <div
                                key={ci}
                                data-heatmap-cell
                                className="cursor-pointer"
                                style={{
                                  aspectRatio: "1",
                                  minHeight: "12px",
                                  backgroundColor: `rgba(${r},${g},${b},${0.15 + nv * 0.85})`,
                                  transition:
                                    "transform 0.15s, box-shadow 0.15s",
                                  transform: isSelected
                                    ? "scale(1.3)"
                                    : undefined,
                                  zIndex: isSelected ? 2 : undefined,
                                  boxShadow: isSelected
                                    ? "0 0 0 2px var(--color-surface-cream, #f5f2ed), 0 0 0 3px var(--color-editorial-red, #c0392b)"
                                    : undefined,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.transform =
                                      "scale(1.3)";
                                    e.currentTarget.style.zIndex = "2";
                                    e.currentTarget.style.boxShadow =
                                      "0 0 0 2px var(--color-surface-cream, #f5f2ed), 0 0 0 3px var(--color-editorial-red, #c0392b)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.transform = "";
                                    e.currentTarget.style.zIndex = "";
                                    e.currentTarget.style.boxShadow = "";
                                  }
                                }}
                                onClick={(e) =>
                                  handleCellClick(e, ri, ci, row.day, val)
                                }
                              />
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </div>
                  {/* Tooltip */}
                  {selectedCell && (
                    <div
                      data-heatmap-tooltip
                      className="absolute z-[100] border border-rule bg-surface-card shadow-lg"
                      style={{
                        left: tooltipPos.left,
                        top: tooltipPos.top,
                        padding: "12px 16px",
                        minWidth: "220px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                      }}
                    >
                      <div className="font-serif text-sm font-bold text-ink mb-2">
                        {selectedCell.day} {formatHour(selectedCell.hourIdx)}
                      </div>
                      <div className="flex items-center justify-between py-0.5">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                          Activity Level
                        </span>
                        <span
                          className="font-mono text-xs font-bold"
                          style={{
                            color: activityColor(selectedCell.value),
                          }}
                        >
                          {selectedCell.value}% &mdash;{" "}
                          {activityLabel(selectedCell.value)}
                        </span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden bg-surface-raised">
                        <div
                          className="h-full"
                          style={{
                            width: `${selectedCell.value}%`,
                            backgroundColor: activityColor(selectedCell.value),
                          }}
                        />
                      </div>
                      <div className="mt-2" />
                      <div className="flex items-center justify-between py-0.5">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                          Eng. Boost
                        </span>
                        <span className="font-mono text-xs font-bold text-editorial-green">
                          {engBoost(selectedCell.value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-0.5">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                          Best Format
                        </span>
                        <span className="font-mono text-xs font-bold text-ink">
                          {bestFormat(
                            selectedCell.dayIdx,
                            selectedCell.hourIdx,
                          )}
                        </span>
                      </div>
                      {selectedCell.value > 60 && (
                        <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-editorial-gold">
                          Recommended posting time
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {heatmap.peakTimes && heatmap.peakTimes.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-ink-muted">
                      Peak times:
                    </span>
                    {heatmap.peakTimes.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold uppercase tracking-wider text-editorial-red"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──── Top Performing Content ──── */}
            {topContent.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink mb-1">
                  Top Performing Content
                </h3>
                <p className="editorial-overline mb-3">By Engagement</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-rule">
                        <th className="pb-2 pr-3 text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                          Content
                        </th>
                        <th className="pb-2 pr-3 text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                          Type
                        </th>
                        <th className="pb-2 pr-3 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                          Likes
                        </th>
                        <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
                          Comments
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topContent.map((post) => (
                        <tr
                          key={post.id}
                          className="border-b border-rule/50 last:border-0"
                        >
                          <td className="max-w-[200px] truncate py-2.5 pr-3 text-xs text-ink">
                            {post.caption || "No caption"}
                          </td>
                          <td className="py-2.5 pr-3">
                            <span className="bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                              {post.isVideo ? "Reel" : "Post"}
                            </span>
                          </td>
                          <td className="py-2.5 pr-3 text-right font-mono text-xs font-bold text-ink">
                            {formatCompact(post.likesCount)}
                          </td>
                          <td className="py-2.5 text-right font-mono text-xs text-ink-secondary">
                            {formatCompact(post.commentsCount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ──── Engagement Rate Trend ──── */}
            {engagementTrendData.length > 2 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Engagement Rate Trend
                </h3>
                <p className="editorial-overline mb-3">30-Day Average</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={engagementTrendData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="engGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4B9CD3"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4B9CD3"
                          stopOpacity={0.03}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(var(--accent-rgb),0.08)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(var(--accent-rgb),0.15)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#112240",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#E8F0FA",
                      }}
                      formatter={(value) => [
                        `${value}%`,
                        "Engagement",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#4B9CD3"
                      strokeWidth={2}
                      fill="url(#engGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ──── Follower Growth Trend ──── */}
            {followerGrowthData.length > 2 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Follower Growth Trend
                </h3>
                <p className="editorial-overline mb-3">30-Day Performance</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={followerGrowthData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="followGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-editorial-red)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-editorial-red)"
                          stopOpacity={0.03}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(var(--accent-rgb),0.08)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(var(--accent-rgb),0.15)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#112240",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#E8F0FA",
                      }}
                      formatter={(value) => [
                        formatCompact(Number(value)),
                        "Followers",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="followers"
                      stroke="var(--color-editorial-red)"
                      strokeWidth={2}
                      fill="url(#followGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ──── Content Mix Distribution ──── */}
            {contentMixEntries.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Content Mix Distribution
                </h3>
                <p className="editorial-overline mb-3">
                  Recommended Content Types
                </p>
                <div className="space-y-3">
                  {contentMixEntries.map(([type, pct]) => {
                    const maxPct = Math.max(
                      ...contentMixEntries.map(([, v]) => v),
                    );
                    return (
                      <div key={type}>
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="text-xs font-medium capitalize text-ink">
                            {type.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono text-sm font-bold text-ink">
                            {pct}%
                          </span>
                        </div>
                        <div className="h-3 w-full overflow-hidden bg-surface-raised">
                          <div
                            className="h-full bg-editorial-red/80"
                            style={{
                              width: `${(pct / maxPct) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ──── Revenue by Source ──── */}
            {revenueBySources.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Revenue by Source
                </h3>
                <p className="editorial-overline mb-3">Monthly Breakdown</p>
                <div className="space-y-3">
                  {revenueBySources.map((src, i) => (
                    <div key={i}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-ink">
                          {src.source}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-ink-muted">
                            {src.percentage}%
                          </span>
                          <span className="w-24 text-right font-mono text-xs font-bold text-ink">
                            ${(src.monthlyAmount ?? 0).toLocaleString()}/mo
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden bg-surface-raised">
                        <div
                          className="h-full bg-editorial-green"
                          style={{
                            width: `${src.percentage}%`,
                            opacity: 1 - i * 0.15,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ════ RIGHT COLUMN: Sidebar ════ */}
          <div className="space-y-5 border-l-0 lg:border-l lg:border-rule lg:pl-6">
            {/* Social Health / Audience Quality */}
            {audienceQualityScore > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Social Health
                </h3>
                <p className="editorial-overline">Overall Assessment</p>
                <div className="mt-3 flex flex-col items-center">
                  <span className="font-serif text-5xl font-bold text-ink">
                    {audienceQualityScore}
                  </span>
                  <span className="mt-0.5 text-[9px] uppercase tracking-wider text-ink-muted">
                    out of 100
                  </span>
                </div>
                {qualityScore?.factors && qualityScore.factors.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {qualityScore.factors.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-[80px] shrink-0 text-[10px] text-ink-secondary">
                          {f.name}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden bg-surface-raised">
                          <div
                            className={cn(
                              "h-full",
                              f.score >= 80
                                ? "bg-editorial-green"
                                : f.score >= 60
                                  ? "bg-editorial-gold"
                                  : "bg-editorial-red",
                            )}
                            style={{ width: `${f.score}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-[10px] font-bold text-ink">
                          {f.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Competitor Watch */}
            {competitorProfiles.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Competitor Watch
                </h3>
                <p className="editorial-overline">Follower Rankings</p>
                <div className="mt-3 space-y-2">
                  {competitorProfiles.slice(0, 5).map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 font-mono text-[10px] text-ink-muted">
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium text-ink">
                          @{c.handle?.replace(/^@/, "")}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-ink">
                        {formatCompact(c.followersCount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SMO Score */}
            {smoScore > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  SMO Score
                </h3>
                <p className="editorial-overline">Profile Optimization</p>
                <div className="mt-3 flex flex-col items-center">
                  <span className="font-serif text-4xl font-bold text-ink">
                    {smoScore}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-ink-muted">
                    /100
                  </span>
                </div>
                {smoFactors.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {smoFactors.slice(0, 6).map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-[70px] shrink-0 truncate text-[10px] text-ink-secondary">
                          {f.factor}
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden bg-surface-raised">
                          <div
                            className={cn(
                              "h-full",
                              (f.score / f.maxScore) * 100 >= 80
                                ? "bg-editorial-green"
                                : (f.score / f.maxScore) * 100 >= 60
                                  ? "bg-editorial-gold"
                                  : "bg-editorial-red",
                            )}
                            style={{
                              width: `${(f.score / f.maxScore) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-6 text-right font-mono text-[9px] text-ink-muted">
                          {f.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Upcoming Deadlines */}
            {upcomingDeadlines.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Upcoming Deadlines
                </h3>
                <p className="editorial-overline">Brand Deals &amp; Campaigns</p>
                <div className="mt-3 space-y-2.5">
                  {upcomingDeadlines.map((deal) => (
                    <div
                      key={deal.id}
                      className="border-b border-rule/50 pb-2 last:border-0"
                    >
                      <p className="text-xs font-bold text-ink">
                        {deal.brand_name}
                      </p>
                      <p className="text-[10px] capitalize text-ink-muted">
                        {deal.status}
                      </p>
                      {deal.total_value != null && (
                        <p className="font-mono text-[10px] text-editorial-green">
                          ${deal.total_value.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Influencer Hub */}
            <div className="border border-rule bg-surface-card p-4">
              <h3 className="font-serif text-sm font-bold text-ink">
                Influencer Hub
              </h3>
              <p className="editorial-overline">Quick Access</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Business",
                    count: deals.length,
                    href: "/dashboard/business",
                  },
                  {
                    label: "Deals",
                    count: deals.filter(
                      (d) => d.status === "active" || d.status === "negotiation",
                    ).length,
                    href: "/dashboard/deals",
                  },
                  {
                    label: "Revenue",
                    count: revenueStats?.totalEarnings ? 1 : 0,
                    href: "/dashboard/revenue",
                  },
                  {
                    label: "Inbox",
                    count: notifications.length,
                    href: "/dashboard/inbox",
                  },
                  {
                    label: "Publish",
                    count: 0,
                    href: "/dashboard/publish",
                  },
                  {
                    label: "AI Studio",
                    count: 0,
                    href: "/dashboard/ai-studio",
                  },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="border border-rule bg-surface-raised px-2 py-2 transition-colors hover:border-ink-muted"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink">
                      {item.label}
                    </p>
                    <div className="flex items-center justify-between">
                      {item.count > 0 && (
                        <p className="text-[9px] text-ink-muted">
                          {item.count} item{item.count !== 1 ? "s" : ""}
                        </p>
                      )}
                      <span className="text-[9px] font-semibold text-ink-muted">
                        View &rarr;
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Audience Demographics */}
            {(ageDistribution.length > 0 || genderEntries.length > 0) && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Audience Demographics
                </h3>
                <p className="editorial-overline">Who Follows You</p>

                {/* Gender bar */}
                {genderEntries.length > 0 && (
                  <div className="mt-3">
                    <div className="flex h-4 w-full overflow-hidden">
                      {genderEntries.map(([gender, pct]) => (
                        <div
                          key={gender}
                          className={cn(
                            "flex items-center justify-center text-[8px] font-bold text-white",
                            gender === "female"
                              ? "bg-editorial-red"
                              : gender === "male"
                                ? "bg-editorial-blue"
                                : "bg-ink-muted",
                          )}
                          style={{ width: `${pct}%` }}
                        >
                          {pct >= 15 && `${pct}%`}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3">
                      {genderEntries.map(([gender, pct]) => (
                        <div key={gender} className="flex items-center gap-1">
                          <div
                            className={cn(
                              "h-2 w-2",
                              gender === "female"
                                ? "bg-editorial-red"
                                : gender === "male"
                                  ? "bg-editorial-blue"
                                  : "bg-ink-muted",
                            )}
                          />
                          <span className="text-[9px] capitalize text-ink-secondary">
                            {gender} {pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Age distribution */}
                {ageDistribution.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {ageDistribution.map((a, i) => {
                      const maxPct = Math.max(
                        ...ageDistribution.map((d) => d.percentage),
                      );
                      const isTop = a.percentage === maxPct;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-10 shrink-0 text-[10px]",
                              isTop
                                ? "font-bold text-editorial-red"
                                : "text-ink-secondary",
                            )}
                          >
                            {a.range}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden bg-surface-raised">
                            <div
                              className={cn(
                                "h-full",
                                isTop
                                  ? "bg-editorial-red"
                                  : "bg-editorial-red/50",
                              )}
                              style={{
                                width: `${(a.percentage / maxPct) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-8 text-right font-mono text-[9px] font-bold text-ink">
                            {a.percentage}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Top Hashtags */}
            {topHashtags.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Top Hashtags
                </h3>
                <p className="editorial-overline">Optimized Tags</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {topHashtags.map((h, i) => (
                    <span
                      key={i}
                      className={cn(
                        "border px-2 py-0.5 font-mono text-[10px]",
                        h.estimatedReach === "high"
                          ? "border-editorial-red text-editorial-red"
                          : "border-rule text-ink-secondary",
                      )}
                    >
                      {h.tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Industry Benchmarks */}
            {industryBenchmarks.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Industry Benchmarks
                </h3>
                <p className="editorial-overline">You vs. Average</p>
                <div className="mt-3 space-y-2.5">
                  {industryBenchmarks.slice(0, 5).map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-rule/50 pb-2 last:border-0"
                    >
                      <span className="text-[10px] text-ink-secondary">
                        {b.metric}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-ink">
                          {b.yourValue}
                          {b.unit}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[9px] font-bold",
                            b.delta > 0
                              ? "text-editorial-green"
                              : b.delta < 0
                                ? "text-editorial-red"
                                : "text-ink-muted",
                          )}
                        >
                          {b.delta > 0 ? "+" : ""}
                          {b.delta}
                          {b.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {notifications.length > 0 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="font-serif text-sm font-bold text-ink">
                  Recent Activity
                </h3>
                <p className="editorial-overline">Last 7 Days</p>
                <div className="mt-3 space-y-2">
                  {notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      className="border-b border-rule/50 pb-2 last:border-0"
                    >
                      <p className="text-xs text-ink">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-muted">
                          {n.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──── Earnings Projection Hub (Bottom) ──── */}
      {(revenueStats || summaryStats) && (
        <div className="mt-8 border-t-4 border-double border-rule-dark pt-4">
          <h3 className="font-serif text-base font-bold text-ink">
            {revenueStats ? "Revenue Overview" : "Earnings Projection Hub"}
          </h3>
          <p className="editorial-overline">
            {revenueStats
              ? "Actual Revenue &middot; Pipeline"
              : "Revenue Attribution &middot; Sponsorship Rates"}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="border border-rule bg-surface-card px-4 py-3">
              <p className="editorial-overline">
                {revenueStats ? "This Month" : "Est. Monthly"}
              </p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">
                $
                {revenueStats
                  ? (revenueStats.thisMonth ?? 0).toLocaleString()
                  : (summaryStats?.estMonthly ?? 0).toLocaleString()}
              </p>
              {revenueStats?.thisMonthChange != null &&
                revenueStats.thisMonthChange !== 0 && (
                  <p
                    className={cn(
                      "text-[9px] font-semibold",
                      revenueStats.thisMonthChange > 0
                        ? "text-editorial-green"
                        : "text-editorial-red",
                    )}
                  >
                    {revenueStats.thisMonthChange > 0 ? "+" : ""}
                    {revenueStats.thisMonthChange.toFixed(0)}%
                  </p>
                )}
            </div>
            <div className="border border-rule bg-surface-card px-4 py-3">
              <p className="editorial-overline">
                {revenueStats ? "Pipeline Value" : "Active Deals"}
              </p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">
                {revenueStats
                  ? `$${(revenueStats.pipelineValue ?? 0).toLocaleString()}`
                  : (summaryStats?.activeDeals ?? 0)}
              </p>
            </div>
            <div className="border border-rule bg-surface-card px-4 py-3">
              <p className="editorial-overline">
                {revenueStats ? "Total Earnings" : "YTD Revenue"}
              </p>
              <p className="mt-1 font-serif text-2xl font-bold text-editorial-green">
                $
                {revenueStats
                  ? (revenueStats.totalEarnings ?? 0).toLocaleString()
                  : (summaryStats?.ytdRevenue ?? 0).toLocaleString()}
              </p>
              {!revenueStats && summaryStats?.ytdDealsCompleted != null && (
                <p className="text-[9px] text-ink-muted">
                  {summaryStats.ytdDealsCompleted} deals completed
                </p>
              )}
            </div>
            <div className="border border-rule bg-surface-card px-4 py-3">
              <p className="editorial-overline">
                {revenueStats ? "Pending" : "Profiles"}
              </p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">
                {revenueStats
                  ? `$${(revenueStats.pendingPayments ?? 0).toLocaleString()}`
                  : profiles.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ──── Disclaimer ──── */}
      <div className="mt-6 border-t border-rule pt-3">
        <p className="text-[9px] leading-relaxed text-ink-muted">
          <span className="font-bold">Disclaimer:</span> All metrics, earnings
          projections, and growth estimates are generated based on industry
          benchmarks and publicly available data. They are not guaranteed and
          should be used for strategic planning purposes only.
        </p>
        {(profileCreated || lastSynced) && (
          <p className="mt-1 text-[9px] text-ink-muted">
            {profileCreated && <>Profile added {profileCreated}. </>}
            {lastSynced && <>Last synced {lastSynced}.</>}
          </p>
        )}
      </div>
    </div>
  );
}
