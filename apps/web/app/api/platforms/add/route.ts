import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { scrapeProfile, calcEngagement, computeSmoScore, type SmoInput } from '@govirall/core';
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

  // Check if already connected
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('platform_accounts')
    .select('id, sync_status')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single();

  if (existing && existing.sync_status !== 'disconnected') {
    throw ApiError.badRequest(`${platform} is already connected.`);
  }

  // Scrape public profile
  const profile = await scrapeProfile(platform, username);
  if (!profile) {
    throw ApiError.badRequest(
      `Could not find @${username} on ${platform}. Check the username and try again.`,
    );
  }

  // Calculate engagement from scraped posts
  const engagement = calcEngagement(profile.recentPosts, profile.followersCount);

  // Upsert platform account
  const { data, error } = await admin
    .from('platform_accounts')
    .upsert(
      {
        user_id: userId,
        platform,
        platform_user_id: profile.handle,
        platform_username: profile.handle,
        platform_display_name: profile.displayName,
        avatar_url: profile.avatarUrl || null,
        access_token: '__scraped__',
        scopes: [],
        follower_count: profile.followersCount || null,
        following_count: profile.followingCount || null,
        post_count: profile.postsCount || null,
        verified: profile.verified,
        sync_status: 'healthy',
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' },
    )
    .select('id, platform, platform_username, platform_display_name, avatar_url, follower_count, sync_status')
    .single();

  if (error) throw ApiError.badRequest(error.message);

  // Compute SMO score in background (don't block the response)
  computeSmoAfterAdd(userId, admin).catch(() => {});

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function computeSmoAfterAdd(userId: string, admin: any) {
  const [profileRes, platformsRes, postsRes, dealsRes, invoicesRes, mediaKitRes] =
    await Promise.all([
      admin.from('users').select('display_name, bio, avatar_url, mission, created_at').eq('id', userId).single(),
      admin.from('platform_accounts_safe').select('follower_count, following_count, post_count, sync_status').eq('user_id', userId),
      admin.from('posts').select('id, status, published_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      admin.from('deals').select('id, stage, amount_cents, value').eq('user_id', userId),
      admin.from('invoices').select('id, status').eq('user_id', userId),
      admin.from('media_kits').select('id').eq('user_id', userId).single(),
    ]);

  const p = profileRes.data;
  const platforms = (platformsRes.data ?? []).filter((pl: { sync_status: string }) => pl.sync_status === 'healthy');
  const posts = postsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const totalFollowers = platforms.reduce((s: number, pl: { follower_count: number | null }) => s + (pl.follower_count ?? 0), 0);
  const totalFollowing = platforms.reduce((s: number, pl: { following_count: number | null }) => s + (pl.following_count ?? 0), 0);
  const published = posts.filter((x: { published_at: string | null }) => x.published_at);
  const last = published[0]?.published_at;
  const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
  const ageDays = p?.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
  const wonDeals = deals.filter((d: { stage: string }) => d.stage === 'done' || d.stage === 'paid');

  const input: SmoInput = {
    hasDisplayName: !!p?.display_name, hasBio: !!p?.bio, hasAvatar: !!p?.avatar_url, hasMission: !!p?.mission,
    platformCount: platforms.length, postCount: posts.length,
    draftCount: posts.filter((x: { status: string }) => x.status === 'draft').length,
    scheduledCount: posts.filter((x: { status: string }) => x.status === 'scheduled').length,
    totalFollowers, totalFollowing, avgEngagementRate: 0,
    dealCount: deals.length, wonDealCount: wonDeals.length,
    totalRevenueCents: wonDeals.reduce((s: number, d: { amount_cents?: number; value?: number }) => s + (d.amount_cents ?? d.value ?? 0), 0),
    hasMediaKit: !!mediaKitRes.data, invoiceCount: invoices.length,
    daysSinceLastPost: daysSince, accountAgeDays: ageDays,
  };

  const result = computeSmoScore(input);

  // Delete any existing score for today, then insert fresh
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await admin.from('smo_scores').delete()
    .eq('user_id', userId)
    .gte('computed_at', today + 'T00:00:00Z')
    .lt('computed_at', tomorrow + 'T00:00:00Z');

  await admin.from('smo_scores').insert({
    user_id: userId,
    score: result.score,
    factor_profile: result.factor_profile,
    factor_content: result.factor_content,
    factor_consistency: result.factor_consistency,
    factor_engagement: result.factor_engagement,
    factor_growth: result.factor_growth,
    factor_monetization: result.factor_monetization,
  });
}
