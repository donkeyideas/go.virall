import { createAdminClient } from '@govirall/db/admin';
import { BillingClient } from './billing-client';

export default async function AdminBillingPage() {
  const admin = createAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [subsRes, stripeEventsRes, churnRes] = await Promise.all([
    admin
      .from('subscriptions')
      .select(
        'id, user_id, tier, status, amount_cents, interval, current_period_start, current_period_end, canceled_at, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('stripe_events')
      .select('id, type, processed, error, received_at')
      .order('received_at', { ascending: false })
      .limit(50),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('canceled_at', thirtyDaysAgo),
  ]);

  // Join user handles/emails
  const userIds = [...new Set((subsRes.data ?? []).map((s) => s.user_id))];
  const { data: userRows } =
    userIds.length > 0
      ? await admin
          .from('users')
          .select('id, handle, email')
          .in('id', userIds)
      : { data: [] };

  const userMap: Record<string, { handle: string; email: string }> = {};
  for (const u of userRows ?? []) {
    userMap[u.id] = { handle: u.handle ?? 'unknown', email: u.email ?? '' };
  }

  // Compute MRR from active subscriptions
  const activeSubs = (subsRes.data ?? []).filter((s) => s.status === 'active');
  const mrr = activeSubs.reduce((sum, s) => sum + (s.amount_cents ?? 0), 0) / 100;

  // Revenue by tier breakdown
  const revenueByTier: Record<string, number> = {};
  for (const s of activeSubs) {
    const tier = s.tier ?? 'unknown';
    revenueByTier[tier] = (revenueByTier[tier] ?? 0) + (s.amount_cents ?? 0) / 100;
  }

  // Map subscriptions to client shape
  const subscriptions = (subsRes.data ?? []).map((s) => ({
    id: s.id as string,
    userId: s.user_id as string,
    handle: userMap[s.user_id]?.handle ?? 'unknown',
    email: userMap[s.user_id]?.email ?? '',
    tier: (s.tier ?? 'unknown') as string,
    status: (s.status ?? 'unknown') as string,
    amountCents: (s.amount_cents ?? 0) as number,
    currentPeriodStart: (s.current_period_start as string | null) ?? null,
    currentPeriodEnd: (s.current_period_end as string | null) ?? null,
    canceledAt: (s.canceled_at as string | null) ?? null,
  }));

  // Map stripe events to client shape
  const stripeEvents = (stripeEventsRes.data ?? []).map((e) => ({
    id: e.id as string,
    eventType: (e.type ?? '') as string,
    processed: (e.processed ?? false) as boolean,
    error: (e.error as string | null) ?? null,
    createdAt: (e.received_at ?? '') as string,
  }));

  return (
    <BillingClient
      subscriptions={subscriptions}
      stripeEvents={stripeEvents}
      mrr={mrr}
      activeSubs={activeSubs.length}
      churned30d={churnRes.count ?? 0}
      revenueByTier={revenueByTier}
    />
  );
}
