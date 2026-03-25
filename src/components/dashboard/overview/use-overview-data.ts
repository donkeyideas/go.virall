import { useState, useRef, useEffect, useCallback } from "react";
import { formatCompact } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/types";
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
} from "@/types";
import {
  getResult,
  extractGrowthBrief,
  extractEngagementBrief,
  extractRevenueBrief,
  extractAudienceBrief,
  extractMultiPlatformBrief,
  extractSMOBrief,
  extractBrandBrief,
  extractContentBrief,
  extractHashtagBrief,
  type BriefItem,
} from "./overview-helpers";

// ============================================================
// Props shared by both overview components
// ============================================================

export interface OverviewProps {
  profiles: SocialProfile[];
  analysisMap: Record<string, Record<AnalysisType, SocialAnalysis | null>>;
  competitorsMap: Record<string, SocialCompetitor[]>;
  deals: Deal[];
  campaigns: Campaign[];
  notifications: Notification[];
  metricsMap: Record<string, SocialMetrics[]>;
}

// ============================================================
// Hook
// ============================================================

export function useOverviewData({
  profiles,
  analysisMap,
  competitorsMap,
  deals,
  campaigns,
  notifications,
  metricsMap,
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
  const avgEngagement =
    profiles.length > 0
      ? profiles.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) /
        profiles.length
      : 0;
  const totalPosts = profiles.reduce(
    (sum, p) => sum + (p.posts_count || 0),
    0,
  );

  const profileForData = selectedProfile ?? profiles[0] ?? null;
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

  // Content Mix
  const contentMixData = (() => {
    if (!contentData) return {} as Record<string, number>;
    const strategy = (contentData.strategy ?? contentData) as Record<
      string,
      unknown
    >;
    return (strategy.contentMix ?? {}) as Record<string, number>;
  })();
  const contentMixEntries = Object.entries(contentMixData);

  // Revenue by Source
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

  // Industry Benchmarks
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

  // Intelligence Brief Items
  const briefItems: BriefItem[] = [];

  const gb = extractGrowthBrief(growthData, profileForData);
  if (gb) briefItems.push(gb);

  const eb = extractEngagementBrief(insightsData);
  if (eb) briefItems.push(eb);

  const rb = extractRevenueBrief(earningsData);
  if (rb) briefItems.push(rb);

  const ab = extractAudienceBrief(audienceData);
  if (ab) briefItems.push(ab);

  const mp = extractMultiPlatformBrief(profiles);
  if (mp) briefItems.push(mp);

  const sb = extractSMOBrief(smoData);
  if (sb) briefItems.push(sb);

  const bb = extractBrandBrief(networkData, deals);
  if (bb) briefItems.push(bb);

  const cb = extractContentBrief(contentData);
  if (cb) briefItems.push(cb);

  const hb = extractHashtagBrief(hashtagData);
  if (hb) briefItems.push(hb);

  // Strategic Analysis
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
    const eng = profileForData.engagement_rate;
    return `With ${followers} followers${eng ? ` and ${eng}% engagement` : ""}, @${profileForData.handle} has growth potential. Run AI analyses in the AI Studio tab for detailed strategic insights.`;
  })();

  // Competitors for sidebar
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

  // SMO factors
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

  // KPI change indicators (compare first half vs second half of metrics period)
  const followerChange = (() => {
    if (metrics.length < 2) return null;
    const sorted = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0]?.followers;
    const last = sorted[sorted.length - 1]?.followers;
    if (first == null || last == null || first === 0) return null;
    return last - first;
  })();

  const engagementChange = (() => {
    if (metrics.length < 2) return null;
    const sorted = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0]?.engagement_rate;
    const last = sorted[sorted.length - 1]?.engagement_rate;
    if (first == null || last == null) return null;
    return +(last - first).toFixed(2);
  })();

  const postsChange = (() => {
    if (metrics.length < 2) return null;
    const sorted = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const first = sorted[0]?.posts_count;
    const last = sorted[sorted.length - 1]?.posts_count;
    if (first == null || last == null) return null;
    return last - first;
  })();

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

  return {
    // State
    selectedProfileId,
    setSelectedProfileId,
    selectedCell,
    setSelectedCell,
    tooltipPos,
    heatmapRef,
    handleCellClick,

    // Computed
    selectedProfile,
    isAllProfiles,
    totalFollowers,
    avgEngagement,
    totalPosts,
    profileForData,
    pid,

    // Analysis results
    growthData,
    insightsData,
    earningsData,
    audienceData,
    smoData,
    contentData,
    hashtagData,
    networkData,

    // Derived
    smoScore,
    audienceQualityScore,
    qualityScore,
    heatmap,
    influenceScore,
    summaryStats,
    contentMixEntries,
    revenueBySources,
    ageDistribution,
    genderEntries,
    topHashtags,
    industryBenchmarks,
    kpiInfluencerScore,
    topContent,
    engagementTrendData,
    followerGrowthData,
    briefItems,
    strategicHeadline,
    strategicSummary,
    competitorProfiles,
    smoFactors,
    upcomingDeadlines,
    lastSynced,
    profileCreated,
    followerChange,
    engagementChange,
    postsChange,

    // Pass-through
    profiles,
    deals,
    campaigns,
    notifications,
  };
}
