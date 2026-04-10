"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  SocialProfile,
  AudienceQualityScore,
  Deal,
  CreatorMarketplaceProfile,
  RecentPost,
  Profile,
} from "@/types";

// ── Derived types ──

export interface MediaKitSocialStats {
  platform: string;
  handle: string;
  followers: number;
  engagementRate: number | null;
  verified: boolean;
  avatarUrl: string | null;
}

export interface MediaKitAQS {
  overallScore: number;
  grade: string | null;
  engagementQuality: number | null;
  followerAuthenticity: number | null;
  growthHealth: number | null;
  contentConsistency: number | null;
  audienceDemographics: Record<string, unknown>;
  riskFlags: string[];
}

export interface MediaKitTopPost {
  id: string;
  platform: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
  engagementScore: number; // computed: likes + comments * 2
}

export interface MediaKitBrandCollab {
  id: string;
  brandName: string;
  dealValue: number;
  status: string;
  createdAt: string;
}

export interface MediaKitRateCard {
  [key: string]: number;
}

export interface MediaKitData {
  profile: Profile | null;
  socialStats: MediaKitSocialStats[];
  totalFollowers: number;
  avgEngagementRate: number;
  aqs: MediaKitAQS | null;
  topPosts: MediaKitTopPost[];
  brandCollabs: MediaKitBrandCollab[];
  rateCard: MediaKitRateCard | null;
  marketplaceProfile: {
    categories: string[];
    contentTypes: string[];
    languages: string[];
    minimumBudget: number | null;
    pastBrands: string[];
    isVerified: boolean;
  } | null;
}

// ── Helper ──

async function getOrgIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  return profile?.organization_id ?? null;
}

// ── Get aggregated media kit data ──

export async function getMediaKitData(userId: string): Promise<MediaKitData> {
  const supabase = await createClient();

  // Get profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const profile = (profileData as Profile) ?? null;
  const orgId = profile?.organization_id ?? null;

  // Get social profiles
  const { data: socialProfiles } = orgId
    ? await supabase
        .from("social_profiles")
        .select("*")
        .eq("organization_id", orgId)
        .order("followers_count", { ascending: false })
    : { data: [] };

  const profiles = (socialProfiles ?? []) as SocialProfile[];

  // Social stats
  const socialStats: MediaKitSocialStats[] = profiles.map((p) => ({
    platform: p.platform,
    handle: p.handle,
    followers: p.followers_count,
    engagementRate: p.engagement_rate,
    verified: p.verified,
    avatarUrl: p.avatar_url,
  }));

  const totalFollowers = profiles.reduce((sum, p) => sum + p.followers_count, 0);
  const engagementRates = profiles
    .map((p) => p.engagement_rate)
    .filter((r): r is number => r !== null);
  const avgEngagementRate =
    engagementRates.length > 0
      ? engagementRates.reduce((sum, r) => sum + r, 0) / engagementRates.length
      : 0;

  // Get AQS — take the best one if multiple exist
  let aqs: MediaKitAQS | null = null;
  if (profiles.length > 0) {
    const profileIds = profiles.map((p) => p.id);
    const { data: aqsData } = await supabase
      .from("audience_quality_scores")
      .select("*")
      .in("social_profile_id", profileIds)
      .order("overall_score", { ascending: false })
      .limit(1);

    if (aqsData && aqsData.length > 0) {
      const best = aqsData[0] as AudienceQualityScore;
      aqs = {
        overallScore: best.overall_score,
        grade: best.grade,
        engagementQuality: best.engagement_quality,
        followerAuthenticity: best.follower_authenticity,
        growthHealth: best.growth_health,
        contentConsistency: best.content_consistency,
        audienceDemographics: best.audience_demographics ?? {},
        riskFlags: best.risk_flags ?? [],
      };
    }
  }

  // Get top posts
  const topPosts = getTopPostsFromProfiles(profiles, 6);

  // Get brand collaborations (completed deals)
  let brandCollabs: MediaKitBrandCollab[] = [];
  if (orgId) {
    const { data: deals } = await supabase
      .from("deals")
      .select("*")
      .eq("organization_id", orgId)
      .in("status", ["completed", "active"])
      .order("created_at", { ascending: false })
      .limit(10);

    brandCollabs = ((deals ?? []) as Deal[]).map((d) => ({
      id: d.id,
      brandName: d.brand_name,
      dealValue: d.total_value ?? 0,
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  // Get marketplace profile with rate card
  let rateCard: MediaKitRateCard | null = null;
  let marketplaceProfile: MediaKitData["marketplaceProfile"] = null;

  if (profile?.id) {
    const { data: mp } = await supabase
      .from("creator_marketplace_profiles")
      .select("*")
      .eq("profile_id", profile.id)
      .single();

    if (mp) {
      const marketplace = mp as CreatorMarketplaceProfile;
      rateCard = marketplace.rate_card ?? null;
      marketplaceProfile = {
        categories: marketplace.categories ?? [],
        contentTypes: marketplace.content_types ?? [],
        languages: marketplace.languages ?? [],
        minimumBudget: marketplace.minimum_budget,
        pastBrands: marketplace.past_brands ?? [],
        isVerified: marketplace.is_verified,
      };
    }
  }

  return {
    profile,
    socialStats,
    totalFollowers,
    avgEngagementRate,
    aqs,
    topPosts,
    brandCollabs,
    rateCard,
    marketplaceProfile,
  };
}

// ── Get top posts across profiles ──

function getTopPostsFromProfiles(
  profiles: SocialProfile[],
  limit: number
): MediaKitTopPost[] {
  const allPosts: MediaKitTopPost[] = [];

  for (const profile of profiles) {
    const posts = profile.recent_posts;
    if (!posts || !Array.isArray(posts)) continue;

    for (const post of posts as RecentPost[]) {
      allPosts.push({
        id: post.id,
        platform: profile.platform,
        imageUrl: post.imageUrl,
        caption: post.caption,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        timestamp: post.timestamp,
        isVideo: post.isVideo,
        engagementScore: post.likesCount + post.commentsCount * 2,
      });
    }
  }

  // Sort by engagement score (highest first)
  allPosts.sort((a, b) => b.engagementScore - a.engagementScore);

  return allPosts.slice(0, limit);
}

export async function getTopPosts(orgId: string, limit = 6): Promise<MediaKitTopPost[]> {
  const supabase = await createClient();

  const { data: socialProfiles } = await supabase
    .from("social_profiles")
    .select("*")
    .eq("organization_id", orgId)
    .order("followers_count", { ascending: false });

  const profiles = (socialProfiles ?? []) as SocialProfile[];
  return getTopPostsFromProfiles(profiles, limit);
}
