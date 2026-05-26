import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@govirall/db/admin';
import { scrapeProfile, calcEngagement } from '@govirall/core';
import { recomputeSmo } from '@/lib/recompute-smo';

export const maxDuration = 300;

/**
 * GET /api/cron/sync-accounts
 * Re-scrapes all platform accounts that haven't been synced in 24h.
 * Protected by CRON_SECRET. Triggered daily by Vercel Cron or external scheduler.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: accounts } = await admin
    .from('platform_accounts')
    .select('id, user_id, platform, platform_username, platform_user_id')
    .eq('sync_status', 'healthy')
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .limit(20);

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ synced: 0, failed: 0, message: 'All accounts up to date' });
  }

  let synced = 0;
  let failed = 0;

  // Process in batches of 5 to stay within function timeout
  for (let i = 0; i < accounts.length; i += 5) {
    const batch = accounts.slice(i, i + 5);
    const results = await Promise.allSettled(batch.map((acct) => syncOne(acct, admin)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) synced++;
      else failed++;
    }
  }

  return NextResponse.json({ synced, failed, total: accounts.length });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncOne(acct: any, admin: any): Promise<boolean> {
  const handle = acct.platform_username || acct.platform_user_id;

  const profile = await Promise.race([
    scrapeProfile(acct.platform, handle),
    new Promise<null>((r) => setTimeout(() => r(null), 15_000)),
  ]);

  if (!profile) {
    await admin.from('platform_accounts').update({
      sync_error: 'Cron scrape failed',
      updated_at: new Date().toISOString(),
    }).eq('id', acct.id);
    return false;
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

  let { error } = await admin.from('platform_accounts').update(fields).eq('id', acct.id);
  if (error) {
    delete fields.engagement_rate;
    ({ error } = await admin.from('platform_accounts').update(fields).eq('id', acct.id));
    if (error) return false;
  }

  // Audience snapshot
  const today = now.split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await admin.from('audience_snapshots').delete()
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

  // Recompute SMO
  await recomputeSmo(acct.user_id, acct.id, admin).catch(() => {});
  return true;
}
