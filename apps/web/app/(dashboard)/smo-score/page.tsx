import { createAdminClient } from '@govirall/db/admin';
import { createServerClient } from '@govirall/db/server';
import { redirect } from 'next/navigation';
import { computeSmoScore, type SmoInput } from '@govirall/core';
import { SmoScoreClient } from './smo-score-client';

export default async function SmoScorePage({ searchParams }: { searchParams: Promise<{ platformAccountId?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const admin = createAdminClient();
  const { platformAccountId } = await searchParams;

  const [profileRes, smoRes, platformsRes, postsRes, dealsRes, invoicesRes, mediaKitRes] = await Promise.all([
    admin.from('users').select('theme, display_name, bio, avatar_url, mission, created_at').eq('id', user.id).single(),
    admin
      .from('smo_scores')
      .select('score, factor_profile, factor_content, factor_consistency, factor_engagement, factor_growth, factor_monetization, computed_at')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(1)
      .single(),
    admin
      .from('platform_accounts_safe')
      .select('id, platform, platform_username, follower_count, following_count, post_count, sync_status')
      .eq('user_id', user.id),
    admin.from('posts').select('id, status, published_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
    admin.from('deals').select('id, stage, amount_cents, value').eq('user_id', user.id),
    admin.from('invoices').select('id, status').eq('user_id', user.id),
    admin.from('media_kits').select('id').eq('user_id', user.id).single(),
  ]);

  const theme = profileRes.data?.theme ?? 'glassmorphic';
  const profile = profileRes.data;
  const allPlatforms = (platformsRes.data ?? []).filter((p: { sync_status: string }) => p.sync_status === 'healthy');
  const connectedCount = allPlatforms.length;
  const posts = postsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  // If a specific account is selected, recompute on-the-fly for just that account
  if (platformAccountId) {
    const selectedAccount = allPlatforms.find((p: { id: string }) => p.id === platformAccountId);
    if (selectedAccount) {
      const accountAgeDays = profile?.created_at
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
        : 0;

      const publishedPosts = posts.filter((p: { published_at: string | null }) => p.published_at);
      const lastPublished = publishedPosts[0]?.published_at;
      const daysSinceLastPost = lastPublished
        ? Math.floor((Date.now() - new Date(lastPublished).getTime()) / 86400000)
        : null;

      const wonDeals = deals.filter((d: { stage: string }) => d.stage === 'done' || d.stage === 'paid');
      const totalRevenueCents = wonDeals.reduce((s: number, d: { amount_cents?: number; value?: number }) => s + (d.amount_cents ?? d.value ?? 0), 0);

      const input: SmoInput = {
        hasDisplayName: !!profile?.display_name,
        hasBio: !!profile?.bio,
        hasAvatar: !!profile?.avatar_url,
        hasMission: !!profile?.mission,
        platformCount: 1,
        postCount: (selectedAccount.post_count ?? 0) || posts.length,
        draftCount: posts.filter((p: { status: string }) => p.status === 'draft').length,
        scheduledCount: posts.filter((p: { status: string }) => p.status === 'scheduled').length,
        totalFollowers: selectedAccount.follower_count ?? 0,
        totalFollowing: selectedAccount.following_count ?? 0,
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
      const factors = [
        { label: 'Profile', value: result.factor_profile, tip: 'Bio, avatar, links, and consistency across platforms' },
        { label: 'Content', value: result.factor_content, tip: 'Post quality, variety, and hook strength' },
        { label: 'Consistency', value: result.factor_consistency, tip: 'Posting frequency and schedule adherence' },
        { label: 'Engagement', value: result.factor_engagement, tip: 'Likes, comments, shares relative to reach' },
        { label: 'Growth', value: result.factor_growth, tip: 'Follower velocity and audience expansion rate' },
        { label: 'Monetization', value: result.factor_monetization, tip: 'Revenue, deals, and brand partnership readiness' },
      ];

      return (
        <SmoScoreClient
          theme={theme}
          score={result.score}
          factors={factors}
          computedAt={null}
          connectedCount={connectedCount}
          platforms={platformsRes.data ?? []}
          selectedPlatformAccountId={platformAccountId}
        />
      );
    }
  }

  // Default: show stored aggregate score
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
      selectedPlatformAccountId={null}
    />
  );
}
