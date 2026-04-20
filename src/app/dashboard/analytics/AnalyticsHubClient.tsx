"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HubTabBar } from "@/components/dashboard/HubTabBar";
import { AnalyticsClient } from "./AnalyticsClient";
import { GroupedAnalysisPage, type TabDef } from "@/components/dashboard/GroupedAnalysisPage";
import { SmoScoreClient } from "@/app/dashboard/smo-score/SmoScoreClient";
import { TrustScorePage } from "@/components/dashboard/TrustScorePage";
import { RecommendationsClient } from "@/components/dashboard/RecommendationsClient";
import { trackEvent } from "@/lib/analytics/track";
import type { SocialProfile, TrustScore, TrustScoreHistory } from "@/types";
import type { PostPerformance, PlatformGrowthComparison } from "@/lib/dal/analytics";
import type { getAnalysisStatus } from "@/lib/dal/analyses";

/* ─── Hub-level tab definitions ─── */

const TABS = [
  { key: "metrics", label: "Metrics" },
  { key: "strategy", label: "Strategy" },
  { key: "intelligence", label: "Intelligence" },
  { key: "smo-score", label: "SMO Score" },
  { key: "trust-score", label: "Trust Score" },
  { key: "recommendations", label: "Recommendations" },
];

/* ─── Strategy sub-tabs (rendered via GroupedAnalysisPage) ─── */

const STRATEGY_TABS: TabDef[] = [
  {
    key: "growth",
    label: "Growth",
    analysisType: "growth",
    title: "Growth Tips",
    description:
      "Click 'Generate Growth Tips' to get personalized growth recommendations for your profile.",
    buttonLabel: "Generate Growth Tips",
  },
  {
    key: "content-strategy",
    label: "Content Strategy",
    analysisType: "content_strategy",
    title: "Content Strategy",
    description:
      "Click 'Run Content Strategy' to get personalized posting schedules, content mix recommendations, and a weekly content calendar.",
    buttonLabel: "Run Content Strategy",
  },
  {
    key: "30-day-plan",
    label: "30-Day Plan",
    analysisType: "thirty_day_plan",
    title: "30-Day Plan",
    description:
      "Click 'Generate Plan' to get a day-by-day action plan with weekly milestones, content calendar, and growth targets.",
    buttonLabel: "Generate Plan",
  },
  {
    key: "hashtags",
    label: "Hashtags",
    analysisType: "hashtags",
    title: "Hashtags",
    description:
      "Click 'Generate Hashtags' to get optimized hashtag sets organized by niche, growth, community, and trending categories.",
    buttonLabel: "Generate Hashtags",
  },
];

/* ─── Intelligence sub-tabs ─── */

const INTELLIGENCE_TABS: TabDef[] = [
  {
    key: "audience",
    label: "Audience",
    analysisType: "audience",
    title: "Audience",
    description:
      "Click 'Analyze Audience' to get estimated demographics, audience quality score, interests, and growth potential analysis.",
    buttonLabel: "Analyze Audience",
  },
  {
    key: "competitors",
    label: "Competitors",
    analysisType: "competitors",
    title: "Competitors",
    description:
      "Click 'Analyze Competitors' to get competitive analysis with strengths, weaknesses, opportunities, and industry benchmarks.",
    buttonLabel: "Analyze Competitors",
  },
  {
    key: "network",
    label: "Network",
    analysisType: "network",
    title: "Network",
    description:
      "Click 'Analyze Network' to discover collaboration opportunities, ideal partners, and networking strategies.",
    buttonLabel: "Analyze Network",
  },
];

/* ─── Props (only active tab data provided) ─── */

interface AnalyticsHubClientProps {
  activeTab: string;
  profiles: SocialProfile[];
  featureGrowth?: boolean;
  featureRevenue?: boolean;
  // Metrics tab
  posts?: PostPerformance[];
  platformGrowth?: PlatformGrowthComparison[];
  earningsResults?: Record<string, Record<string, unknown>>;
  competitorResults?: Record<string, Record<string, unknown>>;
  // Strategy tab
  strategyCache?: Record<string, Record<string, Record<string, unknown>>>;
  // Intelligence tab
  intelligenceCache?: Record<string, Record<string, Record<string, unknown>>>;
  // SMO Score tab
  smoCache?: Record<string, Record<string, unknown>>;
  // Trust Score tab
  trustScore?: TrustScore | null;
  trustHistory?: TrustScoreHistory[];
  // Recommendations tab
  recommendationsCache?: Record<string, Record<string, unknown>>;
  analysisStatus?: Record<string, Awaited<ReturnType<typeof getAnalysisStatus>>>;
}

/* ─── Component ─── */

export function AnalyticsHubClient({
  activeTab,
  profiles,
  featureGrowth,
  featureRevenue,
  posts,
  platformGrowth,
  earningsResults,
  competitorResults,
  strategyCache,
  intelligenceCache,
  smoCache,
  trustScore,
  trustHistory,
  recommendationsCache,
  analysisStatus,
}: AnalyticsHubClientProps) {
  const router = useRouter();

  useEffect(() => {
    trackEvent("page_view", "analytics-hub");
  }, []);

  function switchTab(key: string) {
    router.push(`/dashboard/analytics?tab=${key}`, { scroll: false });
  }

  return (
    <div>
      <HubTabBar tabs={TABS} activeKey={activeTab} onSwitch={switchTab} />

      {activeTab === "metrics" && (
        <AnalyticsClient
          profiles={profiles}
          posts={posts ?? []}
          platformGrowth={platformGrowth ?? []}
          earningsResults={earningsResults ?? {}}
          competitorResults={competitorResults ?? {}}
          featureGrowth={featureGrowth}
          featureRevenue={featureRevenue}
        />
      )}
      {activeTab === "strategy" && (
        <GroupedAnalysisPage
          profiles={profiles}
          tabs={STRATEGY_TABS}
          cachedResultsByTab={strategyCache ?? {}}
          defaultTab="growth"
          paramName="stab"
        />
      )}
      {activeTab === "intelligence" && (
        <GroupedAnalysisPage
          profiles={profiles}
          tabs={INTELLIGENCE_TABS}
          cachedResultsByTab={intelligenceCache ?? {}}
          defaultTab="audience"
          paramName="itab"
        />
      )}
      {activeTab === "smo-score" && (
        <SmoScoreClient
          profiles={profiles}
          cachedResults={smoCache ?? {}}
        />
      )}
      {activeTab === "trust-score" && (
        <TrustScorePage
          trustScore={trustScore ?? null}
          history={trustHistory ?? []}
          basePath="/dashboard"
        />
      )}
      {activeTab === "recommendations" && (
        <RecommendationsClient
          profiles={profiles}
          cachedResults={recommendationsCache ?? {}}
          analysisStatus={analysisStatus ?? {}}
        />
      )}
    </div>
  );
}
