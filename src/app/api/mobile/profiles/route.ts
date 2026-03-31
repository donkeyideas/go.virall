import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Authenticate via Bearer token — returns user or error response */
async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  return { user };
}

/** Get user's organization ID, auto-provision if needed */
async function getOrgId(userId: string, email?: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (profile?.organization_id) return profile.organization_id;

  // Auto-provision org + profile
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const slug = (email?.split("@")[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 30);

  const { data: org } = await supabaseAdmin
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

  if (profile) {
    await supabaseAdmin.from("profiles").update({ organization_id: org.id }).eq("id", userId);
  } else {
    await supabaseAdmin.from("profiles").insert({ id: userId, organization_id: org.id, role: "owner" });
  }
  return org.id;
}

/** Extract handle from URL or raw input */
function extractHandle(raw: string): string {
  const trimmed = raw.trim().replace(/^@/, "");
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
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
    const matchesPlatform = Object.values(hostPatterns).some((r) => r.test(url.hostname));
    if (matchesPlatform) {
      const segments = url.pathname.split("/").filter(Boolean);
      const skipPrefixes = ["in", "channel", "c", "user", "pin", "videos"];
      const handleSegment = segments.find((s) => !skipPrefixes.includes(s.toLowerCase()));
      if (handleSegment) return handleSegment.replace(/^@/, "");
    }
  } catch {
    // Not a URL
  }
  return trimmed;
}

interface ScrapedProfile {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  verified?: boolean;
  recentPosts?: { likesCount: number; commentsCount: number }[];
  platformData?: Record<string, unknown>;
}

/** Scrape a social profile — non-blocking, never throws */
async function scrapeProfile(platform: string, handle: string): Promise<ScrapedProfile> {
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
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified };
        break;
      }
      case "twitch": {
        const { scrapeTwitchProfile } = await import("@/lib/social/twitch");
        const d = await scrapeTwitchProfile(handle);
        if (d) return { displayName: d.displayName, bio: d.bio, avatarUrl: d.avatarUrl, followersCount: d.followersCount, followingCount: d.followingCount, postsCount: d.postsCount, verified: d.verified, platformData: { isLive: d.isLive, totalViews: d.totalViews } };
        break;
      }
    }
  } catch (err) {
    console.error(`[scrapeProfile] ${platform}/@${handle} failed:`, err);
  }
  return {};
}

function calcEngagement(posts: { likesCount: number; commentsCount: number }[], followers: number) {
  if (!posts.length || !followers || followers <= 0) return null;
  const totalLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentsCount || 0), 0);
  const avgLikes = Math.round(totalLikes / posts.length);
  const avgComments = Math.round(totalComments / posts.length);
  return Math.round(((avgLikes + avgComments) / followers) * 100 * 100) / 100;
}

const VALID_PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "linkedin", "threads", "pinterest", "twitch"];

/** POST — Add a new social profile */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { platform, handle } = body;

  if (!platform || !handle || typeof handle !== "string") {
    return NextResponse.json({ error: "Platform and handle are required." }, { status: 400 });
  }
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
  }

  const cleanHandle = extractHandle(handle);
  if (!cleanHandle) {
    return NextResponse.json({ error: "Please enter a valid handle." }, { status: 400 });
  }

  const orgId = await getOrgId(auth.user.id, auth.user.email);
  if (!orgId) {
    return NextResponse.json({ error: "Failed to set up your account." }, { status: 500 });
  }

  // Check plan limits
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("max_social_profiles")
    .eq("id", orgId)
    .single();

  const { count } = await supabaseAdmin
    .from("social_profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (org && (count ?? 0) >= org.max_social_profiles) {
    return NextResponse.json({
      error: `Your plan allows ${org.max_social_profiles} profile${org.max_social_profiles === 1 ? "" : "s"}. Upgrade to connect more.`,
      planLimitReached: true,
    }, { status: 403 });
  }

  // Check duplicate
  const { data: existing } = await supabaseAdmin
    .from("social_profiles")
    .select("id")
    .eq("organization_id", orgId)
    .eq("platform", platform)
    .eq("handle", cleanHandle)
    .single();

  if (existing) {
    return NextResponse.json({ error: `@${cleanHandle} on ${platform} is already connected.` }, { status: 409 });
  }

  // Scrape
  const scraped = await scrapeProfile(platform, cleanHandle);
  const engagementRate = calcEngagement(scraped.recentPosts || [], scraped.followersCount || 0);

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

  if (scraped.platformData && Object.keys(scraped.platformData).length > 0) {
    insertData.platform_data = scraped.platformData;
  }

  const { data: newProfile, error: insertError } = await supabaseAdmin
    .from("social_profiles")
    .insert(insertData)
    .select("id, platform, handle, display_name, avatar_url, followers_count, engagement_rate")
    .single();

  if (insertError) {
    return NextResponse.json({ error: "Failed to add profile. " + insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: newProfile });
}

/** PUT — Sync/refresh an existing profile */
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { profileId } = body;

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }

  const { data: sp } = await supabaseAdmin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!sp) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const scraped = await scrapeProfile(sp.platform, sp.handle);
  const followers = scraped.followersCount ?? sp.followers_count ?? 0;
  const engagementRate = calcEngagement(scraped.recentPosts || [], followers);

  const updateData: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
  if (scraped.displayName !== undefined) updateData.display_name = scraped.displayName;
  if (scraped.bio !== undefined) updateData.bio = scraped.bio;
  if (scraped.avatarUrl !== undefined) updateData.avatar_url = scraped.avatarUrl;
  if (scraped.followersCount !== undefined) updateData.followers_count = scraped.followersCount;
  if (scraped.followingCount !== undefined) updateData.following_count = scraped.followingCount;
  if (scraped.postsCount !== undefined) updateData.posts_count = scraped.postsCount;
  if (scraped.verified !== undefined) updateData.verified = scraped.verified;
  if (engagementRate !== null) updateData.engagement_rate = engagementRate;
  if (scraped.platformData && Object.keys(scraped.platformData).length > 0) {
    updateData.platform_data = scraped.platformData;
  }

  await supabaseAdmin.from("social_profiles").update(updateData).eq("id", profileId);

  // Save daily metrics
  if (scraped.followersCount && scraped.followersCount > 0) {
    await supabaseAdmin.from("social_metrics").upsert({
      social_profile_id: profileId,
      date: new Date().toISOString().split("T")[0],
      followers: scraped.followersCount,
      following: scraped.followingCount || 0,
      posts_count: scraped.postsCount || 0,
      engagement_rate: engagementRate,
    }, { onConflict: "social_profile_id,date" });
  }

  return NextResponse.json({ success: true });
}

/** DELETE — Remove a social profile */
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { profileId } = body;

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }

  // Verify the profile belongs to the user's org
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("social_profiles")
    .delete()
    .eq("id", profileId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete profile." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
