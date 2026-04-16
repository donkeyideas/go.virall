"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { setCachedPosts } from "@/lib/cache/posts-cache";
import { seedGoalFromPrimary } from "@/lib/goals/seed";
import type { SocialPlatform } from "@/types";

interface RecentPost {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
}

/**
 * Normalized scrape result from any platform.
 */
interface ScrapedProfile {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  verified?: boolean;
  recentPosts?: RecentPost[];
  platformData?: Record<string, unknown>;
}

/**
 * Scrape a social profile from any supported platform.
 * Returns partial data — non-blocking, never throws.
 */
export async function scrapeProfile(
  platform: string,
  handle: string,
): Promise<ScrapedProfile> {
  try {
    switch (platform) {
      case "instagram": {
        const { scrapeInstagramProfile } = await import("@/lib/social/instagram");
        const d = await scrapeInstagramProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: d.recentPosts || [] };
        break;
      }
      case "tiktok": {
        const { scrapeTikTokProfile } = await import("@/lib/social/tiktok");
        const d = await scrapeTikTokProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: d.recentPosts || [], platformData: { hearts: d.hearts } };
        break;
      }
      case "youtube": {
        const { scrapeYouTubeProfile } = await import("@/lib/social/youtube");
        const d = await scrapeYouTubeProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: d.recentPosts || [], platformData: { totalViews: d.totalViews, channelId: d.channelId } };
        break;
      }
      case "twitter": {
        const { scrapeTwitterProfile } = await import("@/lib/social/twitter");
        const d = await scrapeTwitterProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: d.recentPosts || [] };
        break;
      }
      case "linkedin": {
        const { scrapeLinkedInProfile } = await import("@/lib/social/linkedin");
        const d = await scrapeLinkedInProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: d.recentPosts || [], platformData: { profileType: d.profileType, jobTitle: d.jobTitle } };
        break;
      }
      case "threads": {
        const { scrapeThreadsProfile } = await import("@/lib/social/threads");
        const d = await scrapeThreadsProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: d.recentPosts || [] };
        break;
      }
      case "pinterest": {
        const { scrapePinterestProfile } = await import("@/lib/social/pinterest");
        const d = await scrapePinterestProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: [] };
        break;
      }
      case "twitch": {
        const { scrapeTwitchProfile } = await import("@/lib/social/twitch");
        const d = await scrapeTwitchProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, recentPosts: [], platformData: { isLive: d.isLive, totalViews: d.totalViews } };
        break;
      }
    }
  } catch (err) {
    console.error(`[scrapeProfile] ${platform}/@${handle} failed:`, err);
  }
  return {};
}

/**
 * Calculate engagement rate from recent posts and follower count.
 * Formula: ((avg_likes + avg_comments) / followers) * 100
 */
function calcEngagement(posts: RecentPost[], followers: number) {
  if (!posts.length || !followers || followers <= 0) {
    return { engagementRate: null, avgLikes: null, avgComments: null };
  }
  const totalLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentsCount || 0), 0);
  const avgLikes = Math.round(totalLikes / posts.length);
  const avgComments = Math.round(totalComments / posts.length);
  const engagementRate =
    Math.round(((avgLikes + avgComments) / followers) * 100 * 100) / 100; // 2 decimal places
  return { engagementRate, avgLikes, avgComments };
}

/**
 * Extract a handle from a URL or raw input.
 * e.g. "https://www.instagram.com/hbomax/?hl=en" → "hbomax"
 *      "@hbomax" → "hbomax"
 *      "hbomax" → "hbomax"
 */
function extractHandle(raw: string): string {
  const trimmed = raw.trim().replace(/^@/, "");
  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    const hostPatterns: Record<string, RegExp> = {
      instagram: /instagram\.com/,
      tiktok: /tiktok\.com/,
      youtube: /youtube\.com|youtu\.be/,
      twitter: /twitter\.com|x\.com/,
      linkedin: /linkedin\.com/,
      threads: /threads\.net/,
      pinterest: /pinterest\.com/,
      twitch: /twitch\.tv/,
    };
    const matchesPlatform = Object.values(hostPatterns).some((r) =>
      r.test(url.hostname),
    );
    if (matchesPlatform) {
      const segments = url.pathname.split("/").filter(Boolean);
      const skipPrefixes = ["in", "channel", "c", "user", "pin", "videos"];
      const handleSegment = segments.find(
        (s) => !skipPrefixes.includes(s.toLowerCase()),
      );
      if (handleSegment) return handleSegment.replace(/^@/, "");
    }
  } catch {
    // Not a URL
  }
  return trimmed;
}

/**
 * Ensure the current auth user has an organization + profile row.
 * Auto-provisions if missing (handles users who signed up before migration).
 */
async function ensureOrgAndProfile(userId: string, email?: string) {
  const admin = createAdminClient();

  // Check if profile exists
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (existingProfile?.organization_id) {
    return existingProfile.organization_id as string;
  }

  // Create org
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const slug = (email?.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 30);

  const { data: org } = await admin
    .from("organizations")
    .insert({
      name: "My Dashboard",
      slug: `${slug}-${Date.now().toString(36)}`,
      plan: "free",
      max_social_profiles: 1,
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select("id")
    .single();

  if (!org) return null;

  // Upsert profile (insert or update if row exists without org)
  if (existingProfile) {
    await admin
      .from("profiles")
      .update({ organization_id: org.id })
      .eq("id", userId);
  } else {
    await admin.from("profiles").insert({
      id: userId,
      organization_id: org.id,
      role: "owner",
    });
  }

  return org.id as string;
}

export async function addSocialProfile(formData: FormData) {
  const platform = formData.get("platform") as SocialPlatform;
  const handle = formData.get("handle") as string;

  if (!platform || !handle) {
    return { error: "Platform and handle are required." };
  }

  const cleanHandle = extractHandle(handle);
  if (!cleanHandle) {
    return { error: "Please enter a valid handle." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Ensure org + profile exist (auto-provision if needed)
  const orgId = await ensureOrgAndProfile(user.id, user.email);
  if (!orgId) {
    return { error: "Failed to set up your account. Please try again." };
  }

  // Check user role (superadmins bypass plan limits)
  const admin = createAdminClient();
  const { data: userProfile } = await admin
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();
  const isSuperadmin =
    userProfile?.system_role === "superadmin" ||
    userProfile?.system_role === "admin";

  // Check plan limits (skip for admins/superadmins)
  if (!isSuperadmin) {
    const { data: org } = await admin
      .from("organizations")
      .select("max_social_profiles")
      .eq("id", orgId)
      .single();

    const { count } = await admin
      .from("social_profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);

    if (org && (count ?? 0) >= org.max_social_profiles) {
      return {
        error: `Your current plan allows ${org.max_social_profiles} connected profile${org.max_social_profiles === 1 ? "" : "s"}. Upgrade your plan to connect more accounts.`,
        planLimitReached: true,
      };
    }
  }

  // Check for duplicate
  const { data: existing } = await admin
    .from("social_profiles")
    .select("id")
    .eq("organization_id", orgId)
    .eq("platform", platform)
    .eq("handle", cleanHandle)
    .single();

  if (existing) {
    return { error: `@${cleanHandle} on ${platform} is already added.` };
  }

  if (!isSuperadmin) {
    const { data: verifiedElsewhere } = await admin
      .from("social_profiles")
      .select("id")
      .eq("platform", platform)
      .eq("handle", cleanHandle)
      .eq("ownership_verified", true)
      .neq("organization_id", orgId)
      .limit(1);

    if (verifiedElsewhere && verifiedElsewhere.length > 0) {
      return {
        error: `@${cleanHandle} on ${platform} has been verified by another account. If this is your profile, contact support.`,
        verifiedElsewhere: true,
      };
    }
  }

  // Try to scrape live data from the platform
  const scraped = await scrapeProfile(platform, cleanHandle);

  // Calculate engagement rate from recent posts
  const { engagementRate } = calcEngagement(
    scraped.recentPosts || [],
    scraped.followersCount || 0,
  );

  // Insert the profile with scraped data
  const insertData: Record<string, unknown> = {
    organization_id: orgId,
    platform,
    handle: cleanHandle,
    display_name: scraped.displayName || cleanHandle,
    bio: scraped.bio || null,
    avatar_url: scraped.avatarUrl || null,
    followers_count: scraped.followersCount || 0,
    following_count: scraped.followingCount || 0,
    posts_count: scraped.postsCount || 0,
    engagement_rate: engagementRate,
    verified: scraped.verified || false,
    last_synced_at: new Date().toISOString(),
  };

  // Save platform-specific data (TikTok hearts, YouTube totalViews, etc.)
  if (scraped.platformData && Object.keys(scraped.platformData).length > 0) {
    insertData.platform_data = scraped.platformData;
  }

  // Save recent posts to DB (JSONB column — pass array directly, Supabase auto-serializes)
  if (scraped.recentPosts && scraped.recentPosts.length > 0) {
    insertData.recent_posts = scraped.recentPosts;
  }

  const { data: newProfile, error: insertError } = await admin
    .from("social_profiles")
    .insert(insertData)
    .select("id")
    .single();

  if (insertError) {
    // Retry without recent_posts if column doesn't exist
    if (insertError.message?.includes("recent_posts")) {
      delete insertData.recent_posts;
      const { data: retry, error: retryErr } = await admin
        .from("social_profiles")
        .insert(insertData)
        .select("id")
        .single();
      if (retryErr) return { error: "Failed to add profile. " + retryErr.message };
      // Save to in-memory cache instead
      if (scraped.recentPosts && scraped.recentPosts.length > 0) {
        setCachedPosts(retry.id, scraped.recentPosts);
      }
      // Auto-seed a social_goal from the user's primary_goal (Phase 2)
      await seedGoalFromPrimary(user.id, retry.id, scraped.followersCount || 0);
      revalidatePath("/dashboard");
      return { success: true, profileId: retry.id };
    }
    return { error: "Failed to add profile. " + insertError.message };
  }

  // Also save to in-memory cache for immediate availability
  if (scraped.recentPosts && scraped.recentPosts.length > 0) {
    setCachedPosts(newProfile.id, scraped.recentPosts);
  }

  // Auto-seed a social_goal from the user's primary_goal (Phase 2)
  await seedGoalFromPrimary(user.id, newProfile.id, scraped.followersCount || 0);

  revalidatePath("/dashboard");
  return { success: true, profileId: newProfile.id };
}

export async function syncSocialProfile(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const admin = createAdminClient();
  const { data: socialProfile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!socialProfile) {
    return { error: "Profile not found." };
  }

  // Scrape fresh data from the platform
  const scraped = await scrapeProfile(
    socialProfile.platform,
    socialProfile.handle,
  );

  // Calculate engagement rate from recent posts
  const followers = scraped.followersCount ?? socialProfile.followers_count ?? 0;
  const { engagementRate, avgLikes, avgComments } = calcEngagement(
    scraped.recentPosts || [],
    followers,
  );

  const updateData: Record<string, unknown> = {
    last_synced_at: new Date().toISOString(),
  };

  if (scraped.displayName !== undefined)
    updateData.display_name = scraped.displayName;
  if (scraped.bio !== undefined) updateData.bio = scraped.bio;
  if (scraped.avatarUrl !== undefined) updateData.avatar_url = scraped.avatarUrl;
  if (scraped.followersCount !== undefined)
    updateData.followers_count = scraped.followersCount;
  if (scraped.followingCount !== undefined)
    updateData.following_count = scraped.followingCount;
  if (scraped.postsCount !== undefined) updateData.posts_count = scraped.postsCount;
  if (scraped.verified !== undefined) updateData.verified = scraped.verified;
  if (engagementRate !== null) updateData.engagement_rate = engagementRate;

  // Save platform-specific data (TikTok hearts, YouTube totalViews, etc.)
  if (scraped.platformData && Object.keys(scraped.platformData).length > 0) {
    updateData.platform_data = scraped.platformData;
  }

  // Save recent posts to DB (JSONB column — pass array directly)
  if (scraped.recentPosts && scraped.recentPosts.length > 0) {
    updateData.recent_posts = scraped.recentPosts;
  }

  const { error: updateError } = await admin
    .from("social_profiles")
    .update(updateData)
    .eq("id", profileId);

  // If update failed because of recent_posts column, retry without it
  if (updateError?.message?.includes("recent_posts")) {
    delete updateData.recent_posts;
    await admin
      .from("social_profiles")
      .update(updateData)
      .eq("id", profileId);
  }

  // Always save to in-memory cache
  if (scraped.recentPosts && scraped.recentPosts.length > 0) {
    setCachedPosts(profileId, scraped.recentPosts);
  }

  // Save daily metrics snapshot with engagement data
  if (scraped.followersCount && scraped.followersCount > 0) {
    const metricsData: Record<string, unknown> = {
      social_profile_id: profileId,
      date: new Date().toISOString().split("T")[0],
      followers: scraped.followersCount,
      following: scraped.followingCount || 0,
      posts_count: scraped.postsCount || 0,
    };
    if (avgLikes !== null) metricsData.avg_likes = avgLikes;
    if (avgComments !== null) metricsData.avg_comments = avgComments;
    if (engagementRate !== null) metricsData.engagement_rate = engagementRate;

    await admin.from("social_metrics").upsert(metricsData, {
      onConflict: "social_profile_id,date",
    });
  }

  revalidatePath("/dashboard");
  const postsCount = scraped.recentPosts?.length ?? 0;
  return { success: true, postsCount };
}

// Keep old name as alias
export const lookupSocialProfile = syncSocialProfile;

export async function deleteSocialProfile(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("social_profiles")
    .delete()
    .eq("id", profileId);

  if (error) {
    return { error: "Failed to delete profile." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
