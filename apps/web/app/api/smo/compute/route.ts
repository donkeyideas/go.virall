import { handleRoute, ApiError } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { computeSmoScore, type SmoInput } from '@govirall/core';

/**
 * POST /api/smo/compute
 * Body: { platformAccountId?: string }
 *
 * Computes and stores the SMO score for a specific platform account.
 * If no platformAccountId is given, computes an aggregate across all accounts (legacy behavior).
 */
export const POST = handleRoute(async ({ req, userId }) => {
  const admin = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const platformAccountId: string | undefined = body.platformAccountId;

  const profileRes = await admin
    .from('users')
    .select('display_name, bio, avatar_url, mission, created_at')
    .eq('id', userId)
    .single();

  const profile = profileRes.data;

  // Fetch platform accounts — try with engagement_rate, fall back without
  async function fetchPlatforms() {
    let q = admin
      .from('platform_accounts')
      .select('id, platform, follower_count, following_count, post_count, engagement_rate, verified, sync_status')
      .eq('user_id', userId);
    if (platformAccountId) q = q.eq('id', platformAccountId);
    const res = await q;
    if (!res.error) return res.data ?? [];
    // engagement_rate column may not exist yet — retry without it
    let q2 = admin
      .from('platform_accounts')
      .select('id, platform, follower_count, following_count, post_count, verified, sync_status')
      .eq('user_id', userId);
    if (platformAccountId) q2 = q2.eq('id', platformAccountId);
    const res2 = await q2;
    return (res2.data ?? []).map((p: any) => ({ ...p, engagement_rate: null }));
  }

  const allPlatforms = await fetchPlatforms();
  const platforms = allPlatforms.filter((p: any) => p.sync_status === 'healthy');

  if (platformAccountId && platforms.length === 0) {
    throw ApiError.notFound('Platform account not found or not healthy');
  }

  let postsQuery = admin
    .from('posts')
    .select('id, status, published_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (platformAccountId) {
    postsQuery = postsQuery.eq('platform_account_id', platformAccountId);
  }

  const [postsRes, dealsRes, invoicesRes, mediaKitRes] = await Promise.all([
    postsQuery,
    admin.from('deals').select('id, stage, amount_cents, value').eq('user_id', userId),
    admin.from('invoices').select('id, status').eq('user_id', userId),
    admin.from('media_kits').select('id').eq('user_id', userId).single(),
  ]);

  const posts = postsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  const totalFollowers = platforms.reduce((s: number, p: any) => s + (p.follower_count ?? 0), 0);
  const totalFollowing = platforms.reduce((s: number, p: any) => s + (p.following_count ?? 0), 0);

  const ratesWithValues = platforms.filter((p: any) => p.engagement_rate != null);
  const avgEngagementRate = ratesWithValues.length > 0
    ? ratesWithValues.reduce((s: number, p: any) => s + Number(p.engagement_rate), 0) / ratesWithValues.length / 100
    : 0;

  const publishedPosts = posts.filter((p) => p.published_at);
  const lastPublished = publishedPosts[0]?.published_at;
  const daysSinceLastPost = lastPublished
    ? Math.floor((Date.now() - new Date(lastPublished).getTime()) / 86400000)
    : null;

  const accountAgeDays = profile?.created_at
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
    : 0;

  const wonDeals = deals.filter((d) => d.stage === 'done' || d.stage === 'paid');
  const totalRevenueCents = wonDeals.reduce((s, d) => s + (d.amount_cents ?? d.value ?? 0), 0);

  const input: SmoInput = {
    hasDisplayName: !!profile?.display_name,
    hasBio: !!profile?.bio,
    hasAvatar: !!profile?.avatar_url,
    hasMission: !!profile?.mission,
    platformCount: platforms.length,
    verified: platforms.some((p: any) => p.verified),
    postCount: platforms.reduce((s: number, p: any) => s + (p.post_count ?? 0), 0) || posts.length,
    draftCount: posts.filter((p) => p.status === 'draft').length,
    scheduledCount: posts.filter((p) => p.status === 'scheduled').length,
    totalFollowers,
    totalFollowing,
    avgEngagementRate,
    dealCount: deals.length,
    wonDealCount: wonDeals.length,
    totalRevenueCents,
    hasMediaKit: !!mediaKitRes.data,
    invoiceCount: invoices.length,
    daysSinceLastPost,
    accountAgeDays,
  };

  const result = computeSmoScore(input);

  const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
  const tomorrowStart = new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00Z';

  let deleteQuery = admin
    .from('smo_scores')
    .delete()
    .eq('user_id', userId)
    .gte('computed_at', todayStart)
    .lt('computed_at', tomorrowStart);

  if (platformAccountId) {
    deleteQuery = deleteQuery.eq('platform_account_id', platformAccountId);
  } else {
    deleteQuery = deleteQuery.is('platform_account_id', null);
  }

  await deleteQuery;

  const { data, error } = await admin
    .from('smo_scores')
    .insert({
      user_id: userId,
      platform_account_id: platformAccountId ?? null,
      score: result.score,
      factor_profile: result.factor_profile,
      factor_content: result.factor_content,
      factor_consistency: result.factor_consistency,
      factor_engagement: result.factor_engagement,
      factor_growth: result.factor_growth,
      factor_monetization: result.factor_monetization,
    })
    .select('id, score, computed_at')
    .single();

  if (error) {
    return { ...result, stored: null, error: error.message };
  }

  return { ...result, stored: data };
});
