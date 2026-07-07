import { scrapeProfile, calcEngagement } from '@govirall/core';
import { recomputeSmo } from './recompute-smo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

export interface SyncableAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_username: string | null;
  platform_user_id: string | null;
}

/**
 * Re-scrape a single platform account and refresh all metrics: follower/post
 * counts, engagement, bio/avatar, today's audience snapshot, and SMO score.
 *
 * Shared by the dashboard sync button (/api/platforms/sync) and the daily cron
 * (/api/cron/sync-accounts). Returns true on success, false if the scrape timed
 * out / failed or the row couldn't be updated. Never throws.
 */
export async function syncPlatformAccount(
  acct: SyncableAccount,
  admin: Admin,
  timeoutMs = 15_000,
): Promise<boolean> {
  const handle = acct.platform_username || acct.platform_user_id;
  if (!handle) return false;

  const profile = await Promise.race([
    scrapeProfile(acct.platform, handle),
    new Promise<null>((r) => setTimeout(() => r(null), timeoutMs)),
  ]);

  const now = new Date().toISOString();

  if (!profile) {
    await admin
      .from('platform_accounts')
      .update({ sync_error: 'Scrape failed or timed out', updated_at: now })
      .eq('id', acct.id);
    return false;
  }

  const engagement = calcEngagement(profile.recentPosts, profile.followersCount);

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

  // Retry without engagement_rate in case that column doesn't exist yet.
  let { error } = await admin.from('platform_accounts').update(fields).eq('id', acct.id);
  if (error) {
    delete fields.engagement_rate;
    ({ error } = await admin.from('platform_accounts').update(fields).eq('id', acct.id));
    if (error) return false;
  }

  // Today's audience snapshot (delete-then-insert to satisfy daily uniqueness).
  const today = now.split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await admin
    .from('audience_snapshots')
    .delete()
    .eq('platform_account_id', acct.id)
    .gte('captured_at', today + 'T00:00:00Z')
    .lt('captured_at', tomorrow + 'T00:00:00Z');

  await admin.from('audience_snapshots').insert({
    user_id: acct.user_id,
    platform_account_id: acct.id,
    follower_count: profile.followersCount ?? 0,
    following_count: profile.followingCount ?? 0,
    post_count: profile.postsCount ?? 0,
    engagement_rate: engagement.engagementRate ?? null,
  });

  await recomputeSmo(acct.user_id, acct.id, admin).catch(() => {});
  return true;
}
