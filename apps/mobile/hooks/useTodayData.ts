import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────

interface UserProfile {
  displayName: string;
  avatarUrl: string | null;
  tier: string;
  renewsAt: string | null;
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

interface TodayData {
  loading: boolean;
  error: string | null;
  user: UserProfile | null;
  pulse: PulseData;
  smo: SmoData | null;
  nextPost: NextPostData | null;
  actions: ActionItem[];
  wins: WinItem[];
  refresh: () => Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
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

const ACTIVE_DEAL_STAGES = ['lead', 'pitched', 'negotiating', 'contract', 'delivering'];

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

  const fetchAll = useCallback(async () => {
    try {
      setError(null);

      // Parallel fetch — use allSettled so partial data still shows
      const results = await Promise.allSettled([
        api.get<any>('/user'),
        api.get<any[]>('/platforms'),
        api.post<any>('/smo/compute', {}),
        api.get<{ items: any[] }>('/posts?status=scheduled&limit=5'),
        api.get<{ items: any[] }>('/deals?limit=50'),
        api.get<{ items: any[] }>('/invoices?limit=50'),
      ]);

      const val = <T,>(r: PromiseSettledResult<T>): T | null =>
        r.status === 'fulfilled' ? r.value : null;

      const userRes = val(results[0]);
      const platformsRes = val(results[1]) as any[] | null;
      const smoRes = val(results[2]);
      const postsRes = val(results[3]) as { items: any[] } | null;
      const dealsRes = val(results[4]) as { items: any[] } | null;
      const invoicesRes = val(results[5]) as { items: any[] } | null;

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
          tier: userRes.subscription_tier || 'free',
          renewsAt: userRes.subscription_renews_at,
        });
      }

      // ── Platforms / Pulse ──
      const platforms = platformsRes ?? [];
      const totalFollowers = platforms.reduce((s: number, p: any) => s + (p.follower_count ?? 0), 0);

      // Revenue this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const invoices = invoicesRes?.items ?? [];
      const paidThisMonth = invoices
        .filter((inv: any) => inv.status === 'paid' && inv.paid_at && inv.paid_at >= monthStart)
        .reduce((s: number, inv: any) => s + (inv.amount_cents ?? 0), 0);

      // Pipeline
      const deals = dealsRes?.items ?? [];
      const pipelineDeals = deals.filter((d: any) => ACTIVE_DEAL_STAGES.includes(d.stage));
      const pipelineValue = pipelineDeals.reduce((s: number, d: any) => s + (d.amount_cents ?? d.value ?? 0), 0);

      setPulse({
        followers: {
          value: totalFollowers,
          formatted: formatNumber(totalFollowers),
          delta: platforms.length > 0 ? `${platforms.length} platforms` : 'No platforms',
          deltaVariant: platforms.length > 0 ? 'good' : 'flat',
        },
        engagement: {
          value: 0,
          formatted: '—',
          delta: platforms.length > 0 ? 'Sync to track' : '—',
          deltaVariant: 'flat',
        },
        revenueMtd: {
          value: paidThisMonth,
          formatted: formatCurrency(paidThisMonth),
          delta: paidThisMonth > 0 ? 'This month' : '—',
          deltaVariant: paidThisMonth > 0 ? 'good' : 'flat',
        },
        pipeline: {
          value: pipelineValue,
          formatted: formatCurrency(pipelineValue),
          delta: `${pipelineDeals.length} deal${pipelineDeals.length !== 1 ? 's' : ''}`,
          deltaVariant: pipelineDeals.length > 0 ? 'good' : 'flat',
        },
      });

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

      // ── Next Post ──
      const scheduledPosts = postsRes?.items ?? [];
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
        return hoursUntil > 0 && hoursUntil < 72 && ACTIVE_DEAL_STAGES.includes(d.stage);
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
          kicker: platforms.length > 1 ? `${platforms.length} platforms` : '1 platform',
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

  return { loading, error, user, pulse, smo, nextPost, actions, wins, refresh };
}
