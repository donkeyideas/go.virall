import { createAdminClient } from '@govirall/db/admin';
import { createServerClient } from '@govirall/db/server';
import { redirect } from 'next/navigation';
import { SmoScoreClient } from './smo-score-client';

export default async function SmoScorePage({ searchParams }: { searchParams: Promise<{ platformAccountId?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const admin = createAdminClient();
  const { platformAccountId } = await searchParams;

  let smoQuery = admin
    .from('smo_scores')
    .select('score, factor_profile, factor_content, factor_consistency, factor_engagement, factor_growth, factor_monetization, computed_at')
    .eq('user_id', user.id)
    .order('computed_at', { ascending: false })
    .limit(1);

  if (platformAccountId) {
    smoQuery = smoQuery.eq('platform_account_id', platformAccountId);
  }

  const [profileRes, smoRes, platformsRes] = await Promise.all([
    admin.from('users').select('theme').eq('id', user.id).single(),
    smoQuery.single(),
    admin
      .from('platform_accounts_safe')
      .select('id, platform, platform_username, follower_count, following_count, post_count, sync_status')
      .eq('user_id', user.id),
  ]);

  const theme = profileRes.data?.theme ?? 'glassmorphic';
  const connectedCount = (platformsRes.data ?? []).filter((p: { sync_status: string }) => p.sync_status === 'healthy').length;
  const smo = smoRes.data;
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

  return (
    <SmoScoreClient
      theme={theme}
      score={smo?.score ?? null}
      factors={factors}
      computedAt={smo?.computed_at ?? null}
      connectedCount={connectedCount}
      platforms={platformsRes.data ?? []}
      selectedPlatformAccountId={platformAccountId ?? null}
    />
  );
}
