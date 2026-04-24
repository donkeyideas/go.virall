import { createAdminClient } from '@govirall/db/admin';
import { AnalyticsClient } from './analytics-client';

type PlatformStats = {
  platform: string;
  connected: number;
  followers: number;
  posts30d: number;
};

const ALL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook', 'twitch'];

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [platformsRes, postsRes] = await Promise.all([
    admin
      .from('platform_accounts')
      .select('platform, follower_count'),
    admin
      .from('posts')
      .select('platform, likes, comments')
      .gte('created_at', thirtyDaysAgo),
  ]);

  // Build a map for every platform, even those with 0 data
  const statsMap: Record<string, { connected: number; followers: number; posts30d: number; likes: number; comments: number }> = {};
  for (const p of ALL_PLATFORMS) {
    statsMap[p] = { connected: 0, followers: 0, posts30d: 0, likes: 0, comments: 0 };
  }

  // Aggregate platform accounts
  for (const pa of platformsRes.data ?? []) {
    const p = pa.platform as string;
    if (!statsMap[p]) statsMap[p] = { connected: 0, followers: 0, posts30d: 0, likes: 0, comments: 0 };
    statsMap[p].connected++;
    statsMap[p].followers += pa.follower_count ?? 0;
  }

  // Aggregate posts (last 30 days) with engagement
  for (const post of postsRes.data ?? []) {
    const p = post.platform as string;
    if (!statsMap[p]) statsMap[p] = { connected: 0, followers: 0, posts30d: 0, likes: 0, comments: 0 };
    statsMap[p].posts30d++;
    statsMap[p].likes += post.likes ?? 0;
    statsMap[p].comments += post.comments ?? 0;
  }

  // Derive totals
  const platforms: PlatformStats[] = ALL_PLATFORMS.map((p) => ({
    platform: p,
    connected: statsMap[p].connected,
    followers: statsMap[p].followers,
    posts30d: statsMap[p].posts30d,
  }));

  const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);
  const totalPosts30d = platforms.reduce((sum, p) => sum + p.posts30d, 0);
  const totalConnected = platforms.reduce((sum, p) => sum + p.connected, 0);

  return (
    <AnalyticsClient
      platforms={platforms}
      totalFollowers={totalFollowers}
      totalPosts30d={totalPosts30d}
      totalConnected={totalConnected}
    />
  );
}
