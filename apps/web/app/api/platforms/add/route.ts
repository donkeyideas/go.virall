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

  const admin = createAdminClient();

  // Check account limit based on subscription tier
  const [{ count: currentCount }, { data: userRow }] = await Promise.all([
    admin.from('platform_accounts').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('sync_status', 'disconnected'),
    admin.from('users').select('subscription_tier').eq('id', userId).single(),
  ]);
  const tier = userRow?.subscription_tier ?? 'free';
  const { data: planRow } = await admin.from('subscription_plans').select('max_platforms').eq('tier', tier).single();
  const maxAccounts = planRow?.max_platforms ?? 3;
  if (maxAccounts !== -1 && (currentCount ?? 0) >= maxAccounts) {
    throw ApiError.badRequest(`Your ${tier} plan allows up to ${maxAccounts} accounts. Upgrade to add more.`);
  }

  // Scrape public profile
  const profile = await scrapeProfile(platform, username);
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
    platformCount: platforms.length,
    postCount: platforms.reduce((s: number, pl: { post_count: number | null }) => s + (pl.post_count ?? 0), 0) || posts.length,
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
