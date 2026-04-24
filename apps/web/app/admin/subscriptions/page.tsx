import { createAdminClient } from '@govirall/db/admin';
import { SubscriptionsClient } from './subscriptions-client';

export default async function AdminSubscriptionsPage() {
  const admin = createAdminClient();

  /* Fetch plans from DB */
  const { data: plansData } = await admin
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true });

  const plans = (plansData ?? []).map((p: Record<string, unknown>) => ({
    tier: p.tier as string,
    name: p.name as string,
    priceMonthly: p.price_monthly as number,
    priceYearly: p.price_yearly as number,
    tagline: p.tagline as string,
    features: p.features as string[],
    maxPlatforms: p.max_platforms as number,
    maxAnalyses: p.max_analyses as number,
    maxContentGens: p.max_content_gens as number,
    maxAiMessages: p.max_ai_messages as number,
    isActive: p.is_active as boolean,
    sortOrder: p.sort_order as number,
  }));

  /* Fetch subscriptions */
  const { data: subsData } = await admin
    .from('subscriptions')
    .select(
      'id, user_id, tier, status, amount_cents, interval, stripe_subscription_id, stripe_price_id, current_period_start, current_period_end, cancel_at_period_end, created_at',
    )
    .order('created_at', { ascending: false });

  /* Resolve user info for each subscription */
  const userIds = [...new Set((subsData ?? []).map((s) => s.user_id))];
  const { data: userRows } =
    userIds.length > 0
      ? await admin.from('users').select('id, handle, display_name, email').in('id', userIds)
      : { data: [] };

  const userMap: Record<string, { handle: string; email: string }> = {};
  for (const u of userRows ?? []) {
    userMap[u.id] = { handle: u.handle ?? 'unknown', email: u.email ?? '' };
  }

  /* Tier counts (active subs only) */
  const tierCounts: Record<string, number> = {};
  for (const p of plans) tierCounts[p.tier] = 0;
  for (const s of (subsData ?? []).filter((s) => s.status === 'active')) {
    tierCounts[s.tier] = (tierCounts[s.tier] ?? 0) + 1;
  }

  /* Map subscriptions */
  const subscriptions = (subsData ?? []).map((s) => {
    const user = userMap[s.user_id] ?? { handle: 'unknown', email: '' };
    return {
      id: s.id,
      handle: user.handle,
      email: user.email,
      tier: s.tier,
      status: s.status,
      amountCents: s.amount_cents ?? 0,
      createdAt: s.created_at,
    };
  });

  return (
    <SubscriptionsClient
      plans={plans}
      tierCounts={tierCounts}
      subscriptions={subscriptions}
    />
  );
}
