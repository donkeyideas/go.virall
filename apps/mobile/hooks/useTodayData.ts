import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────

interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
}

interface PulseData {
  followers: { value: number; formatted: string; delta: string; deltaVariant: 'good' | 'flat' | 'bad' };
  engagement: { value: number; formatted: string; delta: string; deltaVariant: 'good' | 'flat' | 'bad' };
}

interface SmoData {
  score: number;
  factors: { label: string; value: number }[];
  strongest: string;
  biggestLift: string;
  delta: string;
}

interface NextPostData {
  status: string;
  time: string;
  hook: string;
  platform: string;
  format: string;
  score: number | null;
}

export interface ActionItem {
  id: string;
  variant: 'urgent' | 'warm' | 'default';
  kicker: string;
  eyebrow: string;
  title: string;
  emphasisWord: string;
  meta: string;
  primaryCta: string;
  skipCta?: string;
}

export interface WinItem {
  id: string;
  kicker: string;
  text: string;
  emphasisText: string;
  number: string;
  iconName: 'trending-up' | 'dollar-sign' | 'trophy';
}

export interface PlatformItem {
  id: string;
  platform: string;
  handle: string | null;
  follower_count: number;
  share: number;
}

export interface TopPost {
  id: string;
  hook: string;
  platform: string;
  likes: number;
  views: number;
  comments: number;
  score: number;
}

export interface ScheduledPost {
  id: string;
  hook: string;
  platform: string;
  format: string;
  scheduled_at: string | null;
}

export interface GrowthPoint {
  date: string;
  followers: number;
  engagement: number;
}

interface TodayData {
  loading: boolean;
  error: string | null;
  user: UserProfile | null;
  pulse: PulseData;
  smo: SmoData | null;
  nextPost: NextPostData | null;
  actions: ActionItem[];
  wins: WinItem[];
  platforms: PlatformItem[];
  postCount: number;
  topPosts: TopPost[];
  scheduledPosts: ScheduledPost[];
  connectedPlatformCount: number;
  engagementRate: number;
  growthData: GrowthPoint[];
  refresh: () => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function getFactorLabel(value: number, label: string): string {
  return `${label} (${value})`;
}

const EMPTY_PULSE: PulseData = {
  followers: { value: 0, formatted: '0', delta: '—', deltaVariant: 'flat' },
  engagement: { value: 0, formatted: '0%', delta: '—', deltaVariant: 'flat' },
};

// ── Hook ───────────────────────────────────────────────────────────────

export function useTodayData(): TodayData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pulse, setPulse] = useState<PulseData>(EMPTY_PULSE);
  const [smo, setSmo] = useState<SmoData | null>(null);
  const [nextPost, setNextPost] = useState<NextPostData | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [wins, setWins] = useState<WinItem[]>([]);
  const [platformItems, setPlatformItems] = useState<PlatformItem[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [scheduledPostItems, setScheduledPostItems] = useState<ScheduledPost[]>([]);
  const [connectedPlatformCount, setConnectedPlatformCount] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([]);

  const fetchAll = useCallback(async () => {
    try {
      setError(null);

      // Parallel fetch — use allSettled so partial data still shows
      const results = await Promise.allSettled([
        api.get<any>('/user'),                                    // 0
        api.get<any[]>('/platforms'),                             // 1
        api.post<any>('/smo/compute', {}),                       // 2
        api.get<{ items: any[] }>('/posts?limit=50'),            // 3
        api.get<any[]>('/audience/growth'),                      // 4
      ]);

      const val = <T,>(r: PromiseSettledResult<T>): T | null =>
        r.status === 'fulfilled' ? r.value : null;

      const userRes = val(results[0]);
      const platformsRes = val(results[1]) as any[] | null;
      const smoRes = val(results[2]);
      const allPostsRes = val(results[3]) as { items: any[] } | null;
      const growthRes = val(results[4]) as any[] | null;

      // Log individual failures for debugging
      const labels = ['user', 'platforms', 'smo', 'posts', 'growth'];
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn(`[Today] ${labels[i]} failed:`, r.reason);
      });

      // If ALL failed, report error
      if (results.every((r) => r.status === 'rejected')) {
        const firstErr = (results[0] as PromiseRejectedResult).reason;
        throw firstErr;
      }

      // ── User Profile ──
      if (userRes) {
        setUser({
          displayName: userRes.display_name || 'Creator',
          avatarUrl: userRes.avatar_url,
        });
      }

      // ── Platforms / Pulse ──
      const allPlatforms = platformsRes ?? [];
      const connectedPlatforms = allPlatforms.filter((p: any) => p.sync_status === 'healthy');
      const totalFollowers = connectedPlatforms.reduce((s: number, p: any) => s + (p.follower_count ?? 0), 0);

      setPulse({
        followers: {
          value: totalFollowers,
          formatted: formatNumber(totalFollowers),
          delta: connectedPlatforms.length > 0 ? `${connectedPlatforms.length} platforms` : 'No platforms',
          deltaVariant: connectedPlatforms.length > 0 ? 'good' : 'flat',
        },
        engagement: {
          value: 0,
          formatted: '—',
          delta: connectedPlatforms.length > 0 ? 'Sync to track' : '—',
          deltaVariant: 'flat',
        },
      });

      // ── Platform Items for cards ──
      setConnectedPlatformCount(connectedPlatforms.length);
      setPlatformItems(
        connectedPlatforms.map((p: any) => ({
          id: p.id,
          platform: p.platform,
          handle: p.platform_username ?? p.handle ?? null,
          follower_count: p.follower_count ?? 0,
          share: totalFollowers > 0 ? Math.round(((p.follower_count ?? 0) / totalFollowers) * 100) : 0,
        })),
      );

      // ── All posts ──
      const allPosts = allPostsRes?.items ?? [];
      const totalPlatformPosts = connectedPlatforms.reduce((s: number, p: any) => s + (p.post_count ?? 0), 0);
      setPostCount(totalPlatformPosts || allPosts.length);

      // ── Top Posts ──
      const publishedPosts = allPosts.filter((p: any) => p.published_at);
      const rankedPosts = publishedPosts
        .map((p: any) => ({
          id: p.id,
          hook: p.hook ?? p.caption?.slice(0, 60) ?? 'Untitled',
          platform: p.platform ?? 'instagram',
          likes: p.likes ?? 0,
          views: p.views ?? 0,
          comments: p.comments ?? 0,
          score: (p.views ?? 0) + (p.likes ?? 0) * 5 + (p.comments ?? 0) * 10 + (p.shares ?? 0) * 15 + (p.saves ?? 0) * 8,
        }))
        .sort((a: TopPost, b: TopPost) => b.score - a.score)
        .slice(0, 3);
      setTopPosts(rankedPosts);

      // ── Engagement Rate (F/F ratio) ──
      const totalFollowing = connectedPlatforms.reduce((s: number, p: any) => s + (p.following_count ?? 0), 0);
      const rate = totalFollowers > 0 && totalFollowing > 0
        ? Math.round((totalFollowers / totalFollowing) * 100) / 100
        : 0;
      setEngagementRate(rate);

      // ── Growth Data ──
      const snapshots = growthRes ?? [];
      setGrowthData(
        snapshots.map((s: any) => ({
          date: s.captured_at,
          followers: s.follower_count ?? 0,
          engagement: Math.round((s.engagement_rate ?? 0) * 10000) / 100,
        })),
      );

      // ── SMO Score ──
      if (smoRes && typeof smoRes.score === 'number') {
        const factors = [
          { label: 'Profile', value: smoRes.factor_profile },
          { label: 'Content', value: smoRes.factor_content },
          { label: 'Consistency', value: smoRes.factor_consistency },
          { label: 'Engagement', value: smoRes.factor_engagement },
          { label: 'Growth', value: smoRes.factor_growth },
        ];
        const sorted = [...factors].sort((a, b) => b.value - a.value);
        const strongest = sorted[0];

        setSmo({
          score: smoRes.score,
          factors,
          strongest: getFactorLabel(strongest.value, strongest.label),
          biggestLift: 'Keep improving',
          delta: `Score: ${smoRes.score}`,
        });
      } else {
        setSmo(null);
      }

      // ── Next Post + Scheduled Posts ──
      const scheduledPosts = allPosts.filter((p: any) => p.status === 'scheduled' && p.hook);
      setScheduledPostItems(
        scheduledPosts.slice(0, 5).map((p: any) => ({
          id: p.id,
          hook: p.hook ?? p.caption?.slice(0, 60) ?? 'Untitled',
          platform: p.platform ?? 'instagram',
          format: p.format ?? 'post',
          scheduled_at: p.scheduled_at ?? null,
        })),
      );
      if (scheduledPosts.length > 0) {
        const post = scheduledPosts[0];
        setNextPost({
          status: `Scheduled · ${post.format ?? 'Post'} · ${(post.platform ?? 'IG').toUpperCase().slice(0, 2)}`,
          time: post.scheduled_at ? formatTime(post.scheduled_at) : 'Not set',
          hook: post.hook ?? post.caption ?? 'Untitled post',
          platform: post.platform ?? 'instagram',
          format: post.format ?? 'reel',
          score: post.viral_scores?.[0]?.score ?? null,
        });
      } else {
        setNextPost(null);
      }

      // ── Action Items (content-focused only, no deals/invoices) ──
      setActions([]);

      // ── Wins ──
      const winItems: WinItem[] = [];
      if (totalFollowers > 0) {
        winItems.push({
          id: 'win-followers',
          kicker: connectedPlatforms.length > 1 ? `${connectedPlatforms.length} platforms` : '1 platform',
          text: `${formatNumber(totalFollowers)} total followers`,
          emphasisText: 'followers',
          number: formatNumber(totalFollowers),
          iconName: 'trending-up',
        });
      }
      setWins(winItems);
    } catch (err: any) {
      console.error('Today data fetch error:', err);
      setError(err?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchAll();
  }, [fetchAll]);

  return {
    loading, error, user, pulse, smo, nextPost, actions, wins,
    platforms: platformItems, postCount, topPosts, scheduledPosts: scheduledPostItems, connectedPlatformCount,
    engagementRate, growthData, refresh,
  };
}
