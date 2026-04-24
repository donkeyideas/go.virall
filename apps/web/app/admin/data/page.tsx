import { createAdminClient } from '@govirall/db/admin';
import { DataClient } from './data-client';

export default async function AdminDataPage() {
  const admin = createAdminClient();

  const [smoRes, eventsRes, usersRes] = await Promise.all([
    admin.from('smo_scores').select('score').limit(500),
    admin
      .from('user_events')
      .select('event_name')
      .order('created_at', { ascending: false })
      .limit(2000),
    admin.from('users').select('id, subscription_tier'),
  ]);

  /* -- SMO score distribution (buckets of 10) -- */
  const smoBucketMap: Record<string, number> = {};
  for (let i = 0; i < 10; i++) {
    smoBucketMap[`${i * 10}-${i * 10 + 9}`] = 0;
  }
  smoBucketMap['90-100'] = 0;
  for (const s of smoRes.data ?? []) {
    const score = s.score as number;
    if (score >= 90) {
      smoBucketMap['90-100'] = (smoBucketMap['90-100'] ?? 0) + 1;
    } else {
      const bucket = Math.floor(score / 10);
      const key = `${bucket * 10}-${bucket * 10 + 9}`;
      smoBucketMap[key] = (smoBucketMap[key] ?? 0) + 1;
    }
  }
  const smoBuckets = Object.entries(smoBucketMap).map(([range, count]) => ({ range, count }));

  /* -- Tier distribution -- */
  const tierCounts: Record<string, number> = {};
  for (const u of usersRes.data ?? []) {
    const tier = (u.subscription_tier as string) ?? 'free';
    tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
  }

  /* -- Top events aggregated server-side -- */
  const eventAgg: Record<string, number> = {};
  for (const e of eventsRes.data ?? []) {
    eventAgg[e.event_name] = (eventAgg[e.event_name] ?? 0) + 1;
  }
  const topEvents = Object.entries(eventAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([name, count]) => ({ name, count }));

  return (
    <DataClient
      smoBuckets={smoBuckets}
      tierCounts={tierCounts}
      topEvents={topEvents}
    />
  );
}
