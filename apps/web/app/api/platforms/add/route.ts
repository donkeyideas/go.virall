import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { scrapeProfile, calcEngagement } from '@govirall/core';
import { recomputeSmo } from '@/lib/recompute-smo';
import { z } from 'zod';

const AddPlatformInput = z.object({
  platform: z.enum(['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook', 'twitch']),
  username: z.string().min(1).max(200),
});

/**
 * POST /api/platforms/add
 * Add a platform by username — scrapes public profile data.
 */
export const POST = handleRoute(async ({ req, userId }) => {
  const { platform, username } = await parseBody(req, AddPlatformInput);

  const admin = createAdminClient();

  // Check account limit based on subscription tier
  const [{ count: currentCount }, { data: userRow }] = await Promise.all([
    admin.from('platform_accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('sync_status', 'disconnected'),
    admin.from('users').select('subscription_tier, free_platform_override').eq('id', userId).single(),
  ]);
  const tier = userRow?.subscription_tier ?? 'free';
  const { data: planRow } = await admin.from('subscription_plans').select('max_platforms').eq('tier', tier).single();
  let maxAccounts = planRow?.max_platforms ?? 1;
  if (tier === 'free' && userRow?.free_platform_override != null) {
    maxAccounts = Math.max(maxAccounts, userRow.free_platform_override);
  }
  if (maxAccounts !== -1 && (currentCount ?? 0) >= maxAccounts) {
    throw ApiError.badRequest(`Your ${tier} plan allows up to ${maxAccounts} account${maxAccounts === 1 ? '' : 's'}. Upgrade to add more.`);
  }

  // Scrape public profile (20s hard cap)
  const profile = await Promise.race([
    scrapeProfile(platform, username),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 20_000)),
  ]);
  if (!profile) {
    // Show cleaned handle in error, not the raw URL
    const cleanHandle = username.replace(/^@/, '').replace(/^https?:\/\/[^/]+\//, '').replace(/\/$/, '') || username;
    throw ApiError.badRequest(
      `Could not find @${cleanHandle} on ${platform}. Check the username and try again.`,
    );
  }

  // Calculate engagement from scraped posts
  const engagement = calcEngagement(profile.recentPosts, profile.followersCount);

  // Check if this account already exists (avoids ON CONFLICT issues)
  const { data: existing } = await admin
    .from('platform_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('platform_user_id', profile.handle)
    .maybeSingle();

  const fields = {
    platform_username: profile.handle,
    platform_display_name: profile.displayName,
    avatar_url: profile.avatarUrl || null,
    platform_bio: profile.bio || null,
    follower_count: profile.followersCount ?? null,
    following_count: profile.followingCount ?? null,
    post_count: profile.postsCount ?? null,
    verified: profile.verified,
    engagement_rate: engagement.engagementRate ?? null,
    sync_status: 'healthy' as const,
    disconnected_at: null,
    updated_at: new Date().toISOString(),
  };

  let data, error;
  if (existing) {
    // Update existing account
    ({ data, error } = await admin
      .from('platform_accounts')
      .update(fields)
      .eq('id', existing.id)
      .select('id, platform, platform_username, platform_display_name, avatar_url, platform_bio, follower_count, post_count, sync_status')
      .single());
  } else {
    // Insert new account
    ({ data, error } = await admin
      .from('platform_accounts')
      .insert({
        user_id: userId,
        platform,
        platform_user_id: profile.handle,
        access_token: '__scraped__',
        scopes: [],
        connected_at: new Date().toISOString(),
        ...fields,
      })
      .select('id, platform, platform_username, platform_display_name, avatar_url, platform_bio, follower_count, post_count, sync_status')
      .single());
  }

  if (error) throw ApiError.badRequest(error.message);

  // Compute SMO score for this account in background (don't block the response)
  recomputeSmo(userId, data!.id, admin).catch(() => {});

  return {
    account: data,
    profile: {
      displayName: profile.displayName,
      bio: profile.bio,
      followersCount: profile.followersCount,
      followingCount: profile.followingCount,
      postsCount: profile.postsCount,
      verified: profile.verified,
      engagementRate: engagement.engagementRate,
      recentPostsCount: profile.recentPosts.length,
    },
  };
});

