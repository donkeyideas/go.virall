import { computeSmoScore, type SmoInput } from '@govirall/core';

/**
 * Recompute and store the SMO score for a single platform account.
 * Shared between platforms/add, platforms/refresh, and cron/sync-accounts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recomputeSmo(userId: string, platformAccountId: string, admin: any) {
  const [profileRes, platformRes, postsRes, dealsRes, invoicesRes, mediaKitRes] =
    await Promise.all([
      admin.from('users').select('display_name, bio, avatar_url, mission, created_at').eq('id', userId).single(),
      admin.from('platform_accounts').select('follower_count, following_count, post_count, engagement_rate, verified, sync_status').eq('id', platformAccountId).single().then((r: any) =>
        r.error ? admin.from('platform_accounts').select('follower_count, following_count, post_count, verified, sync_status').eq('id', platformAccountId).single() : r
      ),
      admin.from('posts').select('id, status, published_at').eq('user_id', userId).eq('platform_account_id', platformAccountId).order('created_at', { ascending: false }).limit(100),
      admin.from('deals').select('id, stage, amount_cents, value').eq('user_id', userId),
      admin.from('invoices').select('id, status').eq('user_id', userId),
      admin.from('media_kits').select('id').eq('user_id', userId).single(),
    ]);

  const p = profileRes.data;
  const account = platformRes.data;
  if (!account || account.sync_status !== 'healthy') return null;

  const posts = postsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const published = posts.filter((x: { published_at: string | null }) => x.published_at);
  const last = published[0]?.published_at;
  const daysSince = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
  const ageDays = p?.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0;
  const wonDeals = deals.filter((d: { stage: string }) => d.stage === 'done' || d.stage === 'paid');

  const input: SmoInput = {
    hasDisplayName: !!p?.display_name,
    hasBio: !!p?.bio,
    hasAvatar: !!p?.avatar_url,
    hasMission: !!p?.mission,
    platformCount: 1,
    verified: !!account.verified,
    postCount: (account.post_count ?? 0) || posts.length,
    draftCount: posts.filter((x: { status: string }) => x.status === 'draft').length,
    scheduledCount: posts.filter((x: { status: string }) => x.status === 'scheduled').length,
    totalFollowers: account.follower_count ?? 0,
    totalFollowing: account.following_count ?? 0,
    avgEngagementRate: account.engagement_rate ? Number(account.engagement_rate) / 100 : 0,
    dealCount: deals.length,
    wonDealCount: wonDeals.length,
    totalRevenueCents: wonDeals.reduce((s: number, d: { amount_cents?: number; value?: number }) => s + (d.amount_cents ?? d.value ?? 0), 0),
    hasMediaKit: !!mediaKitRes.data,
    invoiceCount: invoices.length,
    daysSinceLastPost: daysSince,
    accountAgeDays: ageDays,
  };

  const result = computeSmoScore(input);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  await admin.from('smo_scores').delete()
    .eq('user_id', userId)
    .eq('platform_account_id', platformAccountId)
    .gte('computed_at', today + 'T00:00:00Z')
    .lt('computed_at', tomorrow + 'T00:00:00Z');

  await admin.from('smo_scores').insert({
    user_id: userId,
    platform_account_id: platformAccountId,
    score: result.score,
    factor_profile: result.factor_profile,
    factor_content: result.factor_content,
    factor_consistency: result.factor_consistency,
    factor_engagement: result.factor_engagement,
    factor_growth: result.factor_growth,
    factor_monetization: result.factor_monetization,
  });

  return result;
}
