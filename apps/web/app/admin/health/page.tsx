import { createAdminClient } from '@govirall/db/admin';
import { HealthClient } from './health-client';

export default async function AdminHealthPage() {
  const admin = createAdminClient();

  const [dbCheckRes, stuckEventsRes, syncErrorsRes, activeUsersRes] =
    await Promise.all([
      admin.from('users').select('id', { count: 'exact', head: true }),
      admin
        .from('stripe_events')
        .select('id, type, error, received_at')
        .eq('processed', false)
        .order('received_at', { ascending: false })
        .limit(20),
      admin
        .from('platform_accounts')
        .select('id, platform, handle, last_error, last_synced_at')
        .not('last_error', 'is', null)
        .order('last_synced_at', { ascending: false })
        .limit(20),
      admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(Date.now() - 3600000).toISOString()),
    ]);

  const dbHealthy = dbCheckRes.error === null;

  return (
    <HealthClient
      dbHealthy={dbHealthy}
      stuckEvents={(stuckEventsRes.data ?? []).map((e) => ({
        id: e.id,
        eventType: e.type,
        error: e.error,
        receivedAt: e.received_at,
      }))}
      syncErrors={(syncErrorsRes.data ?? []).map((s) => ({
        id: s.id,
        platform: s.platform,
        handle: s.handle ?? '',
        error: s.last_error ?? 'Unknown error',
        lastSyncedAt: s.last_synced_at,
      }))}
      activeUsersHr={activeUsersRes.count ?? 0}
    />
  );
}
