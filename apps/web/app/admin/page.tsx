import { createAdminClient } from '@govirall/db/admin';
import { OverviewClient } from './overview-client';

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Parallel data fetches
  const [
    totalUsersRes,
    newUsers7dRes,
    newUsers30dRes,
    activeSubsRes,
    mrrRes,
    totalPostsRes,
    totalPlatformsRes,
    aiUsageRes,
    recentSignupsRes,
    subsByTierRes,
    dailyUsersRes,
    openNotificationsRes,
  ] = await Promise.all([
    // Total users
    admin.from('users').select('id', { count: 'exact', head: true }),

    // New users last 7d
    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),

    // New users last 30d
    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),

    // Active subscriptions
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // MRR (sum of amount_cents for active subscriptions)
    admin
      .from('subscriptions')
      .select('amount_cents')
      .eq('status', 'active'),

    // Total posts
    admin.from('posts').select('id', { count: 'exact', head: true }),

    // Total connected platforms
    admin.from('platform_accounts').select('id', { count: 'exact', head: true }),

    // AI usage totals (tokens + cost)
    admin.from('content_generations').select('tokens_used, cost_cents'),

    // Recent signups (last 5)
    admin
      .from('users')
      .select('id, display_name, email, created_at, subscription_tier')
      .order('created_at', { ascending: false })
      .limit(5),

    // Subscriptions by tier (active only)
    admin
      .from('subscriptions')
      .select('tier')
      .eq('status', 'active'),

    // Daily new users for last 30 days
    admin
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true }),

    // Open notifications count (unread)
    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
  ]);

  // Compute MRR from active subscription amount_cents
  const mrrCents = (mrrRes.data ?? []).reduce(
    (sum: number, s: { amount_cents: number | null }) => sum + (s.amount_cents ?? 0),
    0,
  );

  // Compute AI totals
  const aiRows = aiUsageRes.data ?? [];
  const totalTokens = aiRows.reduce(
    (sum: number, r: { tokens_used: number | null }) => sum + (r.tokens_used ?? 0),
    0,
  );
  const totalAiCostCents = aiRows.reduce(
    (sum: number, r: { cost_cents: number | null }) => sum + (Number(r.cost_cents) || 0),
    0,
  );

  // Tier distribution: count per tier
  const tierCounts: Record<string, number> = { free: 0, creator: 0, pro: 0, agency: 0 };
  for (const s of subsByTierRes.data ?? []) {
    const t = (s as { tier: string }).tier;
    tierCounts[t] = (tierCounts[t] ?? 0) + 1;
  }

  // Build daily new-user counts for last 30 days
  // Create a map of date -> count from raw rows
  const dayCounts = new Map<string, number>();
  for (const row of dailyUsersRes.data ?? []) {
    const dateStr = new Date((row as { created_at: string }).created_at)
      .toISOString()
      .slice(0, 10);
    dayCounts.set(dateStr, (dayCounts.get(dateStr) ?? 0) + 1);
  }

  // Fill in all 30 days (including zero-count days)
  const dailyUsers: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    dailyUsers.push({ date: key, count: dayCounts.get(key) ?? 0 });
  }

  // Map recent signups to the expected shape
  const recentSignups = (recentSignupsRes.data ?? []).map((u) => ({
    id: u.id as string,
    displayName: (u.display_name ?? '') as string,
    email: (u.email ?? '') as string,
    createdAt: u.created_at as string,
    tier: (u.subscription_tier ?? 'free') as string,
  }));

  return (
    <OverviewClient
      totalUsers={totalUsersRes.count ?? 0}
      newUsers7d={newUsers7dRes.count ?? 0}
      newUsers30d={newUsers30dRes.count ?? 0}
      activeSubs={activeSubsRes.count ?? 0}
      mrr={mrrCents / 100}
      totalPosts={totalPostsRes.count ?? 0}
      aiTokens={totalTokens}
      aiCost={totalAiCostCents / 100}
      connectedPlatforms={totalPlatformsRes.count ?? 0}
      recentSignups={recentSignups}
      dailyUsers={dailyUsers}
      tierDistribution={tierCounts}
    />
  );
}
