import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { scrapeProfile, calcEngagement } from '@govirall/core';
import { recomputeSmo } from '@/lib/recompute-smo';
import { z } from 'zod';

const RefreshInput = z.object({
  platformAccountId: z.string().uuid(),
});

/**
 * POST /api/platforms/refresh
 * Re-scrape a single platform account and update all metrics.
 */
export const POST = handleRoute(async ({ req, userId }) => {
  const { platformAccountId } = await parseBody(req, RefreshInput);
  const admin = createAdminClient();

  const { data: account } = await admin
    .from('platform_accounts')
    .select('id, platform, platform_username, platform_user_id, sync_status')
    .eq('id', platformAccountId)
    .eq('user_id', userId)
    .neq('sync_status', 'disconnected')
    .single();

  if (!account) throw ApiError.notFound('Account not found or disconnected');

  const handle = account.platform_username || account.platform_user_id;
  const profile = await Promise.race([
    scrapeProfile(account.platform, handle),
    new Promise<null>((r) => setTimeout(() => r(null), 20_000)),
  ]);

  if (!profile) {
    await admin.from('platform_accounts').update({
      sync_status: 'error',
      sync_error: 'Scrape failed or timed out',
      updated_at: new Date().toISOString(),
    }).eq('id', platformAccountId);
    throw ApiError.badRequest(`Could not scrape @${handle} on ${account.platform}. Try again later.`);
  }

  const engagement = calcEngagement(profile.recentPosts, profile.followersCount);
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = {
    follower_count: profile.followersCount ?? null,
    following_count: profile.followingCount ?? null,
    post_count: profile.postsCount ?? null,
    platform_display_name: profile.displayName,
    avatar_url: profile.avatarUrl || null,
    platform_bio: profile.bio || null,
    verified: profile.verified,
    engagement_rate: engagement.engagementRate ?? null,
    sync_status: 'healthy',
    sync_error: null,
    last_synced_at: now,
    updated_at: now,
  };

  let { data: updated, error: updateErr } = await admin
    .from('platform_accounts')
    .update(fields)
    .eq('id', platformAccountId)
    .select('id, platform, platform_username, platform_display_name, avatar_url, follower_count, following_count, post_count, verified, sync_status')
    .single();

  if (updateErr) {
    delete fields.engagement_rate;
    ({ data: updated, error: updateErr } = await admin
      .from('platform_accounts')
      .update(fields)
      .eq('id', platformAccountId)
      .select('id, platform, platform_username, platform_display_name, avatar_url, follower_count, following_count, post_count, verified, sync_status')
      .single());
  }

  if (updateErr) throw ApiError.badRequest(updateErr.message);

  // Audience snapshot for today (delete-then-insert to handle daily uniqueness)
  const today = now.split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await admin.from('audience_snapshots').delete()
    .eq('platform_account_id', platformAccountId)
    .gte('captured_at', today + 'T00:00:00Z')
    .lt('captured_at', tomorrow + 'T00:00:00Z');

  await admin.from('audience_snapshots').insert({
    user_id: userId,
    platform_account_id: platformAccountId,
    follower_count: profile.followersCount ?? 0,
    following_count: profile.followingCount ?? 0,
    post_count: profile.postsCount ?? 0,
    engagement_rate: engagement.engagementRate ?? null,
  });

  // Recompute SMO score in background
  recomputeSmo(userId, platformAccountId, admin).catch(() => {});

  return {
    account: updated,
    engagementRate: engagement.engagementRate,
    syncedAt: now,
  };
});
