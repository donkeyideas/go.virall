"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { HubTabBar } from "@/components/dashboard/HubTabBar";
import PublishClient from "@/app/dashboard/publish/PublishClient";
import { AiStudioClient } from "@/app/dashboard/ai-studio/AiStudioClient";
import { HashtagsClient } from "@/app/dashboard/hashtags/HashtagsClient";
import { trackEvent } from "@/lib/analytics/track";
import type { ScheduledPost, SocialProfile, TrendingTopic } from "@/types";
import type { DealEvent } from "@/components/dashboard/ContentCalendar";

/* ─── Props (only active tab data provided) ─── */

interface ContentHubClientProps {
  activeTab: string;
  currentUserId?: string;
  // Publish
  posts?: ScheduledPost[];
  publishProfiles?: SocialProfile[];
  publishStats?: { total: number; scheduled: number; published: number; drafts: number };
  dealEvents?: DealEvent[];
  // AI Studio
  profiles?: SocialProfile[];
  cachedInsights?: Record<string, Record<string, unknown>>;
  cachedContent?: Record<string, Record<string, Record<string, unknown>>>;
  // Hashtags
  initialTopics?: TrendingTopic[];
  // Feature flags
  featurePublish?: boolean;
  featureHashtags?: boolean;
}

export function ContentHubClient({
  activeTab,
  currentUserId,
  posts,
  publishProfiles,
  publishStats,
  dealEvents,
  profiles,
  cachedInsights,
  cachedContent,
  initialTopics,
  featurePublish = false,
  featureHashtags = false,
}: ContentHubClientProps) {
  const router = useRouter();

  const tabs = useMemo(() => {
    const t = [{ key: "ai-studio", label: "Studio" }];
    if (featurePublish) t.push({ key: "publish", label: "Publish" });
    if (featureHashtags) t.push({ key: "hashtags", label: "Hashtags" });
    return t;
  }, [featurePublish, featureHashtags]);

  useEffect(() => {
    trackEvent("page_view", "content");
  }, []);

  function switchTab(key: string) {
    router.push(`/dashboard/content?tab=${key}`, { scroll: false });
  }

  return (
    <div>
      <HubTabBar tabs={tabs} activeKey={activeTab} onSwitch={switchTab} />

      {activeTab === "publish" && (
        <PublishClient
          posts={posts ?? []}
          profiles={publishProfiles ?? []}
          stats={publishStats ?? { total: 0, scheduled: 0, published: 0, drafts: 0 }}
          dealEvents={dealEvents ?? []}
          currentUserId={currentUserId}
        />
      )}
      {activeTab === "ai-studio" && profiles && (
        <AiStudioClient
          profiles={profiles}
          cachedInsights={cachedInsights ?? {}}
          cachedContent={cachedContent ?? {}}
        />
      )}
      {activeTab === "hashtags" && <HashtagsClient initialTopics={initialTopics ?? []} />}
    </div>
  );
}
