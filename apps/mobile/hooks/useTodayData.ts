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
  revenueMtd: { value: number; formatted: string; delta: string; deltaVariant: 'good' | 'flat' | 'bad' };
  pipeline: { value: number; formatted: string; delta: string; deltaVariant: 'good' | 'flat' | 'bad' };
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

function formatCurrency(cents: number): string {
  // Match web's fmt(): if cents >= 100, treat as cents → dollars; otherwise treat as raw dollars
  const dollars = cents >= 100 ? cents / 100 : cents;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${Math.round(dollars).toLocaleString('en-US')}`;
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
  revenueMtd: { value: 0, formatted: '$0', delta: '—', deltaVariant: 'flat' },
  pipeline: { value: 0, formatted: '$0', delta: '0 deals', deltaVariant: 'flat' },
};

// Match web: active = everything except done/lost (avoids hardcoding stage names)
const TERMINAL_DEAL_STAGES = ['done', 'lost'];

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
      // Single /posts call (like web page.tsx) — derive scheduled/published in JS
      const results = await Promise.allSettled([
        api.get<any>('/user'),                                    // 0
        api.get<any[]>('/platforms'),                             // 1
        api.post<any>('/smo/compute', {}),                       // 2
        api.get<{ items: any[] }>('/posts?limit=50'),            // 3 — all posts (matches web)
        api.get<{ items: any[] }>('/deals?limit=50'),            // 4
        api.get<{ items: any[] }>('/invoices?limit=50'),         // 5
        api.get<any[]>('/audience/growth'),                      // 6
      ]);

      const val = <T,>(r: PromiseSettledResult<T>): T | null =>
        r.status === 'fulfilled' ? r.value : null;

      const userRes = val(results[0]);
      const platformsRes = val(results[1]) as any[] | null;
      const smoRes = val(results[2]);
      const allPostsRes = val(results[3]) as { items: any[] } | null;
      const dealsRes = val(results[4]) as { items: any[] } | null;
      const invoicesRes = val(results[5]) as { items: any[] } | null;
      const growthRes = val(results[6]) as any[] | null;

      // Log individual failures for debugging
      const labels = ['user', 'platforms', 'smo', 'posts', 'deals', 'invoices', 'growth'];
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
      // Match web: only count platforms with sync_status='healthy'
      const allPlatforms = platformsRes ?? [];
      const connectedPlatforms = allPlatforms.filter((p: any) => p.sync_status === 'healthy');
      const totalFollowers = connectedPlatforms.reduce((s: number, p: any) => s + (p.follower_count ?? 0), 0);

      // Revenue: match web — won deal value (stage=done or paid)
      const deals = dealsRes?.items ?? [];
      const wonDealValue = deals
        .filter((d: any) => d.stage === 'done' || d.stage === 'paid')
        .reduce((s: number, d: any) => s + (d.amount_cents ?? d.value ?? 0), 0);

      // Pipeline: active deals — match web: exclude done/lost
      const pipelineDeals = deals.filter((d: any) => !TERMINAL_DEAL_STAGES.includes(d.stage));
      const pipelineValue = pipelineDeals.reduce((s: number, d: any) => s + (d.amount_cents ?? d.value ?? 0), 0);

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
        revenueMtd: {
          value: wonDealValue,
          formatted: formatCurrency(wonDealValue),
          delta: wonDealValue > 0 ? 'Won deals' : '—',
          deltaVariant: wonDealValue > 0 ? 'good' : 'flat',
        },
        pipeline: {
          value: pipelineValue,
          formatted: formatCurrency(pipelineValue),
          delta: `${pipelineDeals.length} deal${pipelineDeals.length !== 1 ? 's' : ''}`,
          deltaVariant: pipelineDeals.length > 0 ? 'good' : 'flat',
        },
      });

      // ── Platform Items for cards ──
      // Match web: only connected (healthy) platforms
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

      // ── All posts — derive everything from single fetch (matches web page.tsx) ──
      const allPosts = allPostsRes?.items ?? [];
      const totalPlatformPosts = connectedPlatforms.reduce((s: number, p: any) => s + (p.post_count ?? 0), 0);
      setPostCount(totalPlatformPosts || allPosts.length);

      // ── Top Posts — filter by published_at truthy (matches web line 55) ──
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

      // ── Engagement Rate (F/F ratio) — match web: use connected platforms only ──
      const totalFollowing = connectedPlatforms.reduce((s: number, p: any) => s + (p.following_count ?? 0), 0);
      // Match web: Math.round((totalFollowers / totalFollowing) * 100) / 100
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
          { label: 'Monetization', value: smoRes.factor_monetization },
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

      // ── Next Post + Scheduled Posts — filter from allPosts (matches web line 131) ──
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

      // ── Action Items ──
      const actionItems: ActionItem[] = [];
      const now = new Date();
      const invoices = invoicesRes?.items ?? [];

      // Overdue invoices → urgent
      const overdueInvoices = invoices.filter(
        (inv: any) => inv.status === 'overdue' || (inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < now),
      );
      for (const inv of overdueInvoices.slice(0, 2)) {
        const daysPast = inv.due_date ? Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000) : 0;
        actionItems.push({
          id: `inv-${inv.id}`,
          variant: 'urgent',
          kicker: `Overdue · ${daysPast} day${daysPast !== 1 ? 's' : ''}`,
          eyebrow: `Invoice ${inv.invoice_number ?? inv.id}`,
          title: `Nudge ${inv.brand_name ?? 'client'} on the ${formatCurrency(inv.amount_cents ?? 0)} invoice.`,
          emphasisWord: inv.brand_name ?? 'client',
          meta: inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}` : '',
          primaryCta: 'Send nudge',
          skipCta: 'Tomorrow',
        });
      }

      // Deals closing soon → warm
      const closingSoon = deals.filter((d: any) => {
        if (!d.due_date) return false;
        const hoursUntil = (new Date(d.due_date).getTime() - now.getTime()) / 3600000;
        return hoursUntil > 0 && hoursUntil < 72 && !TERMINAL_DEAL_STAGES.includes(d.stage);
      });
      for (const deal of closingSoon.slice(0, 2)) {
        const hoursUntil = Math.floor((new Date(deal.due_date).getTime() - now.getTime()) / 3600000);
        actionItems.push({
          id: `deal-${deal.id}`,
          variant: 'warm',
          kicker: `Closing in ${hoursUntil}h · ${deal.probability ?? 0}% match`,
          eyebrow: deal.title ?? deal.brand_name,
          title: `Apply to ${deal.title ?? deal.brand_name}.`,
          emphasisWord: deal.title ?? deal.brand_name,
          meta: `${formatCurrency(deal.amount_cents ?? 0)} · ${deal.format ?? 'Content'} · deadline ${new Date(deal.due_date).toLocaleDateString('en-US', { weekday: 'long' })}`,
          primaryCta: 'Apply',
        });
      }

      setActions(actionItems);

      // ── Wins ──
      const winItems: WinItem[] = [];

      // Follower milestone
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

      // Recent paid deals
      const recentPaid = deals
        .filter((d: any) => d.stage === 'paid' || d.stage === 'done')
        .slice(0, 1);
      for (const deal of recentPaid) {
        winItems.push({
          id: `win-deal-${deal.id}`,
          kicker: 'Deal closed',
          text: `${deal.brand_name ?? 'Brand'} paid in full`,
          emphasisText: deal.brand_name ?? 'Brand',
          number: formatCurrency(deal.amount_cents ?? 0),
          iconName: 'dollar-sign',
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
