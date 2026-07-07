import { handleRoute } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { syncPlatformAccount } from '@/lib/sync-account';

export const maxDuration = 300;

/**
 * POST /api/platforms/sync
 * Re-scrape ALL of the current user's connected accounts and refresh their
 * metrics. This is what the dashboard "sync" button triggers — previously the
 * button only called router.refresh() and never actually re-synced anything.
 */
export const POST = handleRoute(async ({ userId }) => {
  const admin = createAdminClient();

  const { data: accounts } = await admin
    .from('platform_accounts')
    .select('id, user_id, platform, platform_username, platform_user_id')
    .eq('user_id', userId)
    .neq('sync_status', 'disconnected');

  if (!accounts || accounts.length === 0) {
    return { synced: 0, failed: 0, total: 0 };
  }

  let synced = 0;
  let failed = 0;

  // Batch of 5 concurrent scrapes at a time to stay within the function timeout.
  for (let i = 0; i < accounts.length; i += 5) {
    const batch = accounts.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((a) => syncPlatformAccount(a, admin)),
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) synced++;
      else failed++;
    }
  }

  return { synced, failed, total: accounts.length };
});
