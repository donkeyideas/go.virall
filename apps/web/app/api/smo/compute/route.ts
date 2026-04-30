import { handleRoute } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { computeSmoScore, type SmoInput } from '@govirall/core';

/**
 * POST /api/smo/compute
 * Computes and stores the user's SMO score based on current platform data.
 */
export const POST = handleRoute(async ({ userId }) => {
  const admin = createAdminClient();

  // Fetch all user data needed for SMO computation
  const [profileRes, platformsRes, postsRes, dealsRes, invoicesRes, mediaKitRes] =
    await Promise.all([
      admin.from('users').select('display_name, bio, avatar_url, mission, created_at').eq('id', userId).single(),
      admin.from('platform_accounts_safe').select('id, platform, follower_count, following_count, post_count, sync_status').eq('user_id', userId),
      admin.from('posts').select('id, status, published_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      admin.from('deals').select('id, stage, amount_cents, value').eq('user_id', userId),
      admin.from('invoices').select('id, status').eq('user_id', userId),
      admin.from('media_kits').select('id').eq('user_id', userId).single(),
    ]);

  const profile = profileRes.data;
  const platforms = (platformsRes.data ?? []).filter((p) => p.sync_status === 'healthy');
  const posts = postsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  const totalFollowers = platforms.reduce((s, p) => s + (p.follower_count ?? 0), 0);
  const totalFollowing = platforms.reduce((s, p) => s + (p.following_count ?? 0), 0);

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
    postCount: platforms.reduce((s, p) => s + (p.post_count ?? 0), 0) || posts.length,
    draftCount: posts.filter((p) => p.status === 'draft').length,
    scheduledCount: posts.filter((p) => p.status === 'scheduled').length,
    totalFollowers,
    totalFollowing,
    avgEngagementRate: 0,
    dealCount: deals.length,
    wonDealCount: wonDeals.length,
    totalRevenueCents,
    hasMediaKit: !!mediaKitRes.data,
    invoiceCount: invoices.length,
    daysSinceLastPost,
    accountAgeDays,
  };

  const result = computeSmoScore(input);

  // Delete any existing score for this user today, then insert fresh
  // (The unique index is functional: (user_id, computed_at::date) — can't use upsert)
  await admin
    .from('smo_scores')
    .delete()
    .eq('user_id', userId)
    .gte('computed_at', new Date().toISOString().split('T')[0] + 'T00:00:00Z')
    .lt('computed_at', new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00Z');

  const { data, error } = await admin
    .from('smo_scores')
    .insert({
      user_id: userId,
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
    // If insert still fails, return the computed result without storage
    return { ...result, stored: null, error: error.message };
  }

  return { ...result, stored: data };
});
