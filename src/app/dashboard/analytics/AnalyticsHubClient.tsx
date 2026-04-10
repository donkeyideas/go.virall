"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HubTabBar } from "@/components/dashboard/HubTabBar";
import { AnalyticsClient } from "./AnalyticsClient";
import { GroupedAnalysisPage, type TabDef } from "@/components/dashboard/GroupedAnalysisPage";
import { trackEvent } from "@/lib/analytics/track";
import type { SocialProfile } from "@/types";
import type { PostPerformance, PlatformGrowthComparison } from "@/lib/dal/analytics";

/* ─── Hub-level tab definitions ─── */

const TABS = [
  { key: "analytics", label: "Analytics" },
  { key: "strategy", label: "Strategy" },
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

/* ─── Props (only active tab data provided) ─── */

interface AnalyticsHubClientProps {
  activeTab: string;
  profiles: SocialProfile[];
  // Analytics tab
  posts?: PostPerformance[];
  platformGrowth?: PlatformGrowthComparison[];
  earningsResults?: Record<string, Record<string, unknown>>;
  competitorResults?: Record<string, Record<string, unknown>>;
  // Strategy tab
  strategyCache?: Record<string, Record<string, Record<string, unknown>>>;
}

/* ─── Component ─── */

export function AnalyticsHubClient({
  activeTab,
  profiles,
  posts,
  platformGrowth,
  earningsResults,
  competitorResults,
  strategyCache,
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

      {activeTab === "analytics" && (
        <AnalyticsClient
          profiles={profiles}
          posts={posts ?? []}
          platformGrowth={platformGrowth ?? []}
          earningsResults={earningsResults ?? {}}
          competitorResults={competitorResults ?? {}}
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
    </div>
  );
}
