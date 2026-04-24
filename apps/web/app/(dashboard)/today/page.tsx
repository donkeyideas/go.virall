import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import {
  generateTodayActions,
  getDoNow,
  getCompounds,
  getWins,
  type UserState,
} from '@govirall/core';
import { TodayClient } from './today-client';

export default async function TodayPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user!.id;
  const admin = createAdminClient();

  // Fetch data in parallel (admin client bypasses RLS)
  const [profileRes, platformsRes, postsRes, dealsRes, invoicesRes, mediaKitRes, smoRes, snapshotsRes, chatRes] =
    await Promise.all([
      admin.from('users').select('display_name, bio, avatar_url, handle, mission, theme').eq('id', userId).single(),
      admin.from('platform_accounts_safe').select('id, platform, platform_username, follower_count, following_count, post_count, sync_status').eq('user_id', userId),
      admin.from('posts').select('id, hook, caption, platform, format, status, published_at, views, likes, comments, shares, saves, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      admin.from('deals').select('id, stage, amount_cents, value').eq('user_id', userId),
      admin.from('invoices').select('id, status').eq('user_id', userId),
      admin.from('media_kits').select('id').eq('user_id', userId).single(),
      admin.from('smo_scores').select('score, factor_profile, factor_content, factor_consistency, factor_engagement, factor_growth, factor_monetization').eq('user_id', userId).order('computed_at', { ascending: false }).limit(1).single(),
      admin.from('audience_snapshots').select('follower_count, engagement_rate, captured_at').eq('user_id', userId).order('captured_at', { ascending: true }).limit(30),
      admin.from('chat_messages').select('role, content, created_at').eq('user_id', userId).order('created_at', { ascending: true }).limit(50),
    ]);

  const profile = profileRes.data;
  const platforms = platformsRes.data ?? [];
  const posts = postsRes.data ?? [];
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const displayName = profile?.display_name ?? 'there';
  const theme = profile?.theme ?? 'glassmorphic';

  // Compute pulse metrics
  const connectedPlatforms = platforms.filter((p) => p.sync_status === 'healthy');
  const totalFollowers = connectedPlatforms.reduce((sum, p) => sum + (p.follower_count ?? 0), 0);
  const totalFollowing = connectedPlatforms.reduce((sum, p) => sum + (p.following_count ?? 0), 0);
  const activeDealValue = deals
    .filter((d) => !['done', 'lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.amount_cents ?? d.value ?? 0), 0);
  const wonDealValue = deals
    .filter((d) => d.stage === 'done' || d.stage === 'paid')
    .reduce((sum, d) => sum + (d.amount_cents ?? d.value ?? 0), 0);

  // Days since last post
  const publishedPosts = posts.filter((p) => p.published_at);
  const lastPublished = publishedPosts[0]?.published_at;
  const daysSinceLastPost = lastPublished
    ? Math.floor((Date.now() - new Date(lastPublished).getTime()) / 86400000)
    : null;

  // Engagement rate (follower/following ratio as proxy when no real engagement data)
  const engagementRate = totalFollowers > 0 && totalFollowing > 0
    ? Math.round((totalFollowers / totalFollowing) * 100) / 100
    : 0;

  // Build user state for opinionation engine
  const userState: UserState = {
    hasPlatformConnected: connectedPlatforms.length > 0,
    hasDraft: posts.some((p) => p.status === 'draft'),
    hasScheduledPost: posts.some((p) => p.status === 'scheduled'),
    hasCompletedProfile: !!(profile?.display_name && profile?.bio && profile?.avatar_url),
    hasMediaKit: !!mediaKitRes.data,
    hasDeal: deals.length > 0,
    hasInvoice: invoices.length > 0,
    postCount: posts.length,
    lastSyncAt: null,
    daysSinceLastPost,
    followerCount: totalFollowers,
  };

  const allActions = generateTodayActions(userState);
  const doNow = getDoNow(allActions);
  const compounds = getCompounds(allActions);
  const wins = getWins(allActions);

  // SMO Score data
  const smo = smoRes.data;
  const smoScore = smo?.score ?? null;
  const smoFactors = smo
    ? [
        { label: 'Profile', value: smo.factor_profile },
        { label: 'Content', value: smo.factor_content },
        { label: 'Consistency', value: smo.factor_consistency },
        { label: 'Engagement', value: smo.factor_engagement },
        { label: 'Growth', value: smo.factor_growth },
        { label: 'Monetization', value: smo.factor_monetization },
      ]
    : null;

  // Next scheduled post
  const hasNextPost = posts.some((p) => p.status === 'scheduled');

  // Platform share percentages
  const platformsWithShare = connectedPlatforms.map((p) => ({
    id: p.id,
    platform: p.platform,
    handle: p.platform_username as string | null,
    follower_count: p.follower_count,
    share: totalFollowers > 0 ? Math.round(((p.follower_count ?? 0) / totalFollowers) * 100) : 0,
  }));

  // Top content: published posts sorted by total engagement
  const topPosts = publishedPosts
    .map((p) => ({
      id: p.id,
      hook: p.hook ?? p.caption?.slice(0, 60) ?? 'Untitled',
      platform: p.platform,
      format: p.format,
      views: p.views ?? 0,
      likes: p.likes ?? 0,
      comments: p.comments ?? 0,
      shares: p.shares ?? 0,
      saves: p.saves ?? 0,
      published_at: p.published_at,
      total: (p.views ?? 0) + (p.likes ?? 0) * 5 + (p.comments ?? 0) * 10 + (p.shares ?? 0) * 15 + (p.saves ?? 0) * 8,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  // Chat history
  const chatMessages = (chatRes.data ?? []).map((m: { role: string; content: string }) => ({
    role: m.role as 'ai' | 'user',
    text: m.content,
  }));

  // Growth chart data from audience snapshots
  const snapshots = snapshotsRes.data ?? [];
  const growthData = snapshots.map((s) => ({
    date: s.captured_at,
    followers: s.follower_count ?? 0,
    engagement: Math.round((s.engagement_rate ?? 0) * 10000) / 100, // scale 0-1 → 0-100
    revenue: 0, // revenue doesn't come from snapshots
  }));

  return (
    <TodayClient
      theme={theme}
      displayName={displayName}
      totalFollowers={totalFollowers}
      postCount={posts.length}
      wonDealValue={wonDealValue}
      activeDealValue={activeDealValue}
      connectedPlatformCount={connectedPlatforms.length}
      smoScore={smoScore}
      smoFactors={smoFactors}
      doNow={doNow}
      compounds={compounds}
      wins={wins}
      platforms={platformsWithShare}
      hasNextPost={hasNextPost}
      topPosts={topPosts}
      growthData={growthData}
      engagementRate={engagementRate}
      chatHistory={chatMessages}
    />
  );
}
