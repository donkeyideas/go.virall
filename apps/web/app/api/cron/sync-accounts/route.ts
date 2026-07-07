import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@govirall/db/admin';
import { syncPlatformAccount } from '@/lib/sync-account';

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
    const results = await Promise.allSettled(batch.map((acct) => syncPlatformAccount(acct, admin)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) synced++;
      else failed++;
    }
  }

  return NextResponse.json({ synced, failed, total: accounts.length });
}
