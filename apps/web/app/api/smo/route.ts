import { handleRoute, ApiError } from '../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';

/**
 * GET /api/smo — returns latest SMO score + factor breakdown + connected platform count
 */
export const GET = handleRoute(async ({ userId }) => {
  const admin = createAdminClient();

  const [smoRes, platformsRes] = await Promise.all([
    admin
      .from('smo_scores')
      .select('score, factor_profile, factor_content, factor_consistency, factor_engagement, factor_growth, factor_monetization, computed_at')
      .eq('user_id', userId)
      .order('computed_at', { ascending: false })
      .limit(1)
      .single(),
    admin
      .from('platform_accounts_safe')
      .select('id, sync_status')
      .eq('user_id', userId),
  ]);

  const smo = smoRes.data;
  const connectedCount = (platformsRes.data ?? []).filter((p: { sync_status: string }) => p.sync_status === 'healthy').length;

  const factors = smo
    ? [
        { label: 'Profile', value: smo.factor_profile ?? 0, tip: 'Bio, avatar, links, and consistency across platforms' },
        { label: 'Content', value: smo.factor_content ?? 0, tip: 'Post quality, variety, and hook strength' },
        { label: 'Consistency', value: smo.factor_consistency ?? 0, tip: 'Posting frequency and schedule adherence' },
        { label: 'Engagement', value: smo.factor_engagement ?? 0, tip: 'Likes, comments, shares relative to reach' },
        { label: 'Growth', value: smo.factor_growth ?? 0, tip: 'Follower velocity and audience expansion rate' },
        { label: 'Monetization', value: smo.factor_monetization ?? 0, tip: 'Revenue, deals, and brand partnership readiness' },
      ]
    : null;

  return {
    score: smo?.score ?? null,
    factors,
    computedAt: smo?.computed_at ?? null,
    connectedCount,
  };
});
