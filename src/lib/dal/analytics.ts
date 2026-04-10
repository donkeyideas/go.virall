"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedPosts } from "@/lib/cache/posts-cache";
import type { SocialProfile, SocialMetrics, SocialCompetitor, RecentPost } from "@/types";

// --- Performance Analytics ---

export interface PostPerformance {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
  engagementRate: number;
  platform: string;
  handle: string;
}

export async function getPostsPerformance(
  profileIds?: string[],
): Promise<PostPerformance[]> {
  const supabase = await createClient();

  let query = supabase
    .from("social_profiles")
    .select("id, platform, handle, recent_posts, followers_count");

  if (profileIds?.length) {
    query = query.in("id", profileIds);
  }

  const { data } = await query.order("followers_count", { ascending: false });
  const profiles = (data ?? []) as Array<
    SocialProfile & { recent_posts: RecentPost[] | null }
  >;

  const posts: PostPerformance[] = [];
  for (const profile of profiles) {
    // Use DB column first, fall back to in-memory cache
    const recentPosts = profile.recent_posts ?? getCachedPosts(profile.id);
    if (!recentPosts || recentPosts.length === 0) continue;
    for (const post of recentPosts) {
      const engagement =
        profile.followers_count > 0
          ? ((post.likesCount + post.commentsCount) / profile.followers_count) * 100
          : 0;
      posts.push({
        ...post,
        engagementRate: Math.round(engagement * 100) / 100,
        platform: profile.platform,
        handle: profile.handle,
      });
    }
  }

  return posts.sort((a, b) => b.likesCount - a.likesCount);
}

// --- Growth Analytics ---

export interface GrowthDataPoint {
  date: string;
  followers: number;
  engagement_rate: number | null;
  posts_count: number | null;
}

export async function getGrowthTimeline(
  profileId: string,
  days = 30,
): Promise<GrowthDataPoint[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_metrics")
    .select("date, followers, engagement_rate, posts_count")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: true })
    .limit(days);

  return (data ?? []) as GrowthDataPoint[];
}

export interface PlatformGrowthComparison {
  platform: string;
  handle: string;
  profileId: string;
  currentFollowers: number;
  previousFollowers: number;
  growth: number;
  growthPct: number;
}

export async function getPlatformGrowthComparison(): Promise<
  PlatformGrowthComparison[]
> {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("social_profiles")
    .select("id, platform, handle, followers_count")
    .order("followers_count", { ascending: false });

  if (!profiles?.length) return [];

  // Fetch metrics for ALL profiles in parallel (instead of N+1 sequential queries)
  const metricsResults = await Promise.all(
    profiles.map((profile) =>
      supabase
        .from("social_metrics")
        .select("social_profile_id, followers")
        .eq("social_profile_id", profile.id)
        .order("date", { ascending: false })
        .limit(30)
    )
  );

  // Build a map of profileId → metrics array
  const metricsMap = new Map<string, Array<{ followers: number | null }>>();
  for (let i = 0; i < profiles.length; i++) {
    const metrics = (metricsResults[i].data ?? []) as Array<{
      social_profile_id: string;
      followers: number | null;
    }>;
    metricsMap.set(profiles[i].id, metrics);
  }

  return profiles.map((profile) => {
    const metricsList = metricsMap.get(profile.id) ?? [];
    const current = metricsList[0]?.followers ?? profile.followers_count;
    const previous = metricsList[metricsList.length - 1]?.followers ?? current;
    const growth = current - previous;
    const growthPct = previous > 0 ? (growth / previous) * 100 : 0;

    return {
      platform: profile.platform,
      handle: profile.handle,
      profileId: profile.id,
      currentFollowers: current,
      previousFollowers: previous,
      growth,
      growthPct: Math.round(growthPct * 10) / 10,
    };
  });
}

// --- Milestone Projection ---

export interface MilestoneProjection {
  currentFollowers: number;
  dailyGrowthRate: number;
  milestones: Array<{
    target: number;
    label: string;
    estimatedDate: string | null;
    daysAway: number | null;
  }>;
}

export async function getMilestoneProjection(
  profileId: string,
): Promise<MilestoneProjection | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("social_profiles")
    .select("followers_count")
    .eq("id", profileId)
    .single();

  if (!profile) return null;

  const { data: metrics } = await supabase
    .from("social_metrics")
    .select("date, followers")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: false })
    .limit(30);

  const metricsList = (metrics ?? []) as Array<{ date: string; followers: number | null }>;

  if (metricsList.length < 2) {
    return {
      currentFollowers: profile.followers_count,
      dailyGrowthRate: 0,
      milestones: [],
    };
  }

  const latest = metricsList[0].followers ?? profile.followers_count;
  const oldest = metricsList[metricsList.length - 1].followers ?? latest;
  const daySpan = metricsList.length;
  const dailyGrowth = daySpan > 0 ? (latest - oldest) / daySpan : 0;

  const targets = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  const milestones = targets
    .filter((t) => t > latest)
    .slice(0, 3)
    .map((target) => {
      const daysNeeded = dailyGrowth > 0 ? Math.ceil((target - latest) / dailyGrowth) : null;
      const estDate = daysNeeded
        ? new Date(Date.now() + daysNeeded * 86400000).toISOString().split("T")[0]
        : null;
      return {
        target,
        label: formatMilestone(target),
        estimatedDate: estDate,
        daysAway: daysNeeded,
      };
    });

  return {
    currentFollowers: latest,
    dailyGrowthRate: Math.round(dailyGrowth * 10) / 10,
    milestones,
  };
}

function formatMilestone(n: number): string {
  if (n >= 1000000) return `${n / 1000000}M`;
  if (n >= 1000) return `${n / 1000}K`;
  return String(n);
}

// --- Competitive Analytics ---

export interface CompetitorComparison {
  handle: string;
  platform: string;
  followers: number;
  engagementRate: number | null;
  yourFollowers: number;
  yourEngagement: number | null;
  followerGap: number;
  engagementGap: number | null;
}

export async function getCompetitorComparisons(
  profileId: string,
): Promise<CompetitorComparison[]> {
  const supabase = await createClient();

  const [{ data: profile }, { data: competitors }] = await Promise.all([
    supabase
      .from("social_profiles")
      .select("followers_count, engagement_rate")
      .eq("id", profileId)
      .single(),
    supabase
      .from("social_competitors")
      .select("*")
      .eq("social_profile_id", profileId)
      .order("followers_count", { ascending: false }),
  ]);

  if (!profile || !competitors?.length) return [];

  return (competitors as SocialCompetitor[]).map((c) => ({
    handle: c.handle,
    platform: c.platform,
    followers: c.followers_count ?? 0,
    engagementRate: c.engagement_rate,
    yourFollowers: profile.followers_count,
    yourEngagement: profile.engagement_rate,
    followerGap: (c.followers_count ?? 0) - profile.followers_count,
    engagementGap:
      c.engagement_rate != null && profile.engagement_rate != null
        ? c.engagement_rate - profile.engagement_rate
        : null,
  }));
}
