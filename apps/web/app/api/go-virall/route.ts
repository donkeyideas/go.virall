import { handleRoute } from '../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';

/* ── Types ── */
type Post = {
  id: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  published_at: string | null;
  platform: string;
  format: string | null;
};
type ViralScore = { score: number; confidence: number | null; created_at: string };
type AudienceSnap = { platform_account_id: string; follower_count: number; engagement_rate: number | null; captured_at: string };
type Platform = { id: string; platform: string; follower_count: number | null; following_count: number | null; sync_status: string };
type SmoHistory = { score: number; computed_at: string };

/* ── Signal computation helpers (same as web page) ── */

function computeContentHeat(viralScores: ViralScore[]) {
  if (viralScores.length === 0) return { score: 0, explanation: 'No viral scores yet. Score a post in Compose.' };
  const scores = viralScores.map((v) => v.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  let trendFactor = 1.0;
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2);
    const recentAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const olderAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    const diff = recentAvg - olderAvg;
    if (diff > 5) trendFactor = 1.0 + Math.min(0.3, diff / 30);
    else if (diff < -5) trendFactor = 1.0 - Math.min(0.2, Math.abs(diff) / 30);
  }
  const baseScore = Math.pow(avg / 100, 1.3) * 80;
  const score = Math.round(Math.max(0, Math.min(100, baseScore * trendFactor)));
  const explanation = scores.length < 3
    ? `Based on ${scores.length} viral score${scores.length > 1 ? 's' : ''}.`
    : `Avg viral score ${Math.round(avg)}.`;
  return { score, explanation };
}

function engagementValue(p: Post): number {
  return (p.views ?? 0) + (p.likes ?? 0) * 5 + (p.comments ?? 0) * 15 + (p.shares ?? 0) * 20 + (p.saves ?? 0) * 12;
}

function computeEngagementSpike(posts: Post[]) {
  const published = posts.filter((p) => p.published_at);
  if (published.length < 3) return { score: 0, explanation: 'Need at least 3 published posts.', spikeRatio: 0 };
  const sorted = [...published].sort((a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime());
  const allEng = sorted.map(engagementValue);
  const historicalAvg = allEng.reduce((a, b) => a + b, 0) / allEng.length;
  if (historicalAvg === 0) return { score: 0, explanation: 'No engagement data.', spikeRatio: 0 };
  const recentEng = allEng.slice(0, Math.min(5, allEng.length));
  const spikeRatio = Math.max(...recentEng) / historicalAvg;
  let score = spikeRatio >= 10 ? 100 : spikeRatio >= 5 ? 80 + ((spikeRatio - 5) / 5) * 20
    : spikeRatio >= 3 ? 55 + ((spikeRatio - 3) / 2) * 25 : spikeRatio >= 2 ? 30 + (spikeRatio - 2) * 25
    : spikeRatio >= 1.5 ? 15 + ((spikeRatio - 1.5) / 0.5) * 15 : spikeRatio >= 1 ? 5 + ((spikeRatio - 1) / 0.5) * 10 : Math.round(spikeRatio * 5);
  score = Math.round(Math.max(0, Math.min(100, score)));
  const explanation = spikeRatio >= 3 ? `A recent post is ${spikeRatio.toFixed(1)}x your average.`
    : spikeRatio >= 1.5 ? `Recent content is ${spikeRatio.toFixed(1)}x your average.`
    : 'No significant engagement spike.';
  return { score, explanation, spikeRatio };
}

function computeGrowthVelocity(snapshots: AudienceSnap[], platforms: Platform[]) {
  const connected = platforms.filter((p) => p.sync_status === 'healthy');
  const totalFollowers = connected.reduce((s, p) => s + (p.follower_count ?? 0), 0);
  if (snapshots.length < 2) return { score: totalFollowers > 0 ? 3 : 0, explanation: 'Not enough snapshots.', growthRate: 0 };
  const sorted = [...snapshots].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
  const byDay = new Map<string, number>();
  for (const s of sorted) { const day = s.captured_at.slice(0, 10); byDay.set(day, (byDay.get(day) ?? 0) + s.follower_count); }
  const dailyTotals = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, count]) => count);
  if (dailyTotals.length < 2) return { score: 3, explanation: 'Need more daily snapshots.', growthRate: 0 };
  const latest = dailyTotals[dailyTotals.length - 1];
  const weekAgo = dailyTotals[Math.max(0, dailyTotals.length - 8)];
  const weekGrowthRate = weekAgo > 0 ? (latest - weekAgo) / weekAgo : 0;
  const growthPct = weekGrowthRate * 100;
  let baseScore = growthPct <= 0 ? Math.max(0, 5 + growthPct) : growthPct <= 1 ? 5 + growthPct * 20
    : growthPct <= 5 ? 25 + ((growthPct - 1) / 4) * 35 : 60 + Math.min(40, ((growthPct - 5) / 10) * 40);
  const score = Math.round(Math.max(0, Math.min(100, baseScore)));
  const explanation = weekGrowthRate > 0.02 ? `${growthPct.toFixed(1)}% weekly growth. Strong momentum.`
    : weekGrowthRate > 0 ? `${growthPct.toFixed(1)}% weekly growth. Steady.`
    : weekGrowthRate < 0 ? `Followers declined ${Math.abs(growthPct).toFixed(1)}% this week.`
    : 'Flat growth this week.';
  return { score, explanation, growthRate: weekGrowthRate };
}

function computeShareability(posts: Post[]) {
  const recent = posts.slice(0, 20);
  if (recent.length === 0) return { score: 0, explanation: 'No published posts to analyze.', shareRatio: 0 };
  let totalShares = 0, totalSaves = 0, totalEngagement = 0;
  for (const p of recent) {
    totalShares += p.shares ?? 0; totalSaves += p.saves ?? 0;
    totalEngagement += (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saves ?? 0);
  }
  if (totalEngagement === 0) return { score: 2, explanation: 'No engagement recorded.', shareRatio: 0 };
  const shareRatio = (totalShares + totalSaves) / totalEngagement;
  const ratioPct = shareRatio * 100;
  let score = ratioPct < 5 ? 5 + ratioPct : ratioPct < 15 ? 10 + ((ratioPct - 5) / 10) * 20
    : ratioPct < 25 ? 30 + ((ratioPct - 15) / 10) * 20 : ratioPct < 40 ? 50 + ((ratioPct - 25) / 15) * 20
    : 70 + Math.min(25, ((ratioPct - 40) / 30) * 25);
  score = Math.round(Math.max(0, Math.min(95, score)));
  const explanation = ratioPct >= 25 ? `${ratioPct.toFixed(0)}% share/save ratio. Highly shareable.`
    : ratioPct >= 10 ? `${ratioPct.toFixed(0)}% share/save ratio. Good but can improve.`
    : `${ratioPct.toFixed(0)}% share/save ratio. Most engagement is passive.`;
  return { score, explanation, shareRatio };
}

function computeConsistency(posts: Post[]) {
  const published = posts.filter((p) => p.published_at).map((p) => new Date(p.published_at!).getTime()).sort((a, b) => b - a);
  if (published.length === 0) return { score: 0, explanation: 'No posts published yet.', postsPerWeek: 0 };
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const postsLast30 = published.filter((t) => t > thirtyDaysAgo).length;
  const postsPerWeek = postsLast30 / 4.3;
  const daysSinceLast = Math.floor((now - published[0]) / 86400000);
  let freqScore = postsPerWeek >= 3 ? 50 : postsPerWeek >= 2 ? 40 : postsPerWeek >= 1 ? 25 : postsPerWeek > 0 ? 10 : 0;
  let recencyScore = daysSinceLast <= 1 ? 30 : daysSinceLast <= 3 ? 25 : daysSinceLast <= 7 ? 15 : daysSinceLast <= 14 ? 5 : 0;
  const score = Math.round(Math.max(0, Math.min(100, freqScore + recencyScore)));
  const explanation = daysSinceLast <= 3 ? `${postsPerWeek.toFixed(1)} posts/week. Consistent.`
    : daysSinceLast <= 7 ? `${postsPerWeek.toFixed(1)} posts/week. Could post more.`
    : `Last post was ${daysSinceLast} days ago.`;
  return { score, explanation, postsPerWeek };
}

/* ── GET /api/go-virall ── */
export const GET = handleRoute(async ({ userId }) => {
  const admin = createAdminClient();

  const [platformsRes, postsRes, viralScoresRes, audienceRes, smoHistoryRes] = await Promise.all([
    admin.from('platform_accounts_safe').select('id, platform, follower_count, following_count, sync_status').eq('user_id', userId),
    admin.from('posts').select('id, views, likes, comments, shares, saves, reach, published_at, platform, format').eq('user_id', userId).not('published_at', 'is', null).order('published_at', { ascending: false }).limit(100),
    admin.from('viral_scores').select('score, confidence, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('audience_snapshots').select('platform_account_id, follower_count, engagement_rate, captured_at').eq('user_id', userId).order('captured_at', { ascending: false }).limit(60),
    admin.from('smo_scores').select('score, computed_at').eq('user_id', userId).order('computed_at', { ascending: false }).limit(30),
  ]);

  const platforms = (platformsRes.data ?? []) as Platform[];
  const posts = (postsRes.data ?? []) as Post[];
  const viralScores = (viralScoresRes.data ?? []) as ViralScore[];
  const snapshots = (audienceRes.data ?? []) as AudienceSnap[];
  const smoHistory = (smoHistoryRes.data ?? []) as SmoHistory[];

  const contentHeat = computeContentHeat(viralScores);
  const engagementSpike = computeEngagementSpike(posts);
  const growthVelocity = computeGrowthVelocity(snapshots, platforms);
  const shareability = computeShareability(posts);
  const consistency = computeConsistency(posts);

  const overall = Math.round(
    contentHeat.score * 0.3 + engagementSpike.score * 0.25 + growthVelocity.score * 0.2 + shareability.score * 0.15 + consistency.score * 0.1,
  );

  const status = overall >= 81 ? { label: 'Viral Ready', description: 'All signals aligned. Your next post could break through.' }
    : overall >= 61 ? { label: 'On Fire', description: 'Viral momentum is building.' }
    : overall >= 41 ? { label: 'Getting Hot', description: 'Signals are emerging.' }
    : overall >= 21 ? { label: 'Warming Up', description: 'Foundation is there. Focus on spikes and growth.' }
    : { label: 'Cold', description: 'Build your content engine and grow your audience.' };

  const signals = [
    { name: 'Content Heat', score: contentHeat.score, weight: '30%', explanation: contentHeat.explanation },
    { name: 'Engagement Spike', score: engagementSpike.score, weight: '25%', explanation: engagementSpike.explanation },
    { name: 'Growth Velocity', score: growthVelocity.score, weight: '20%', explanation: growthVelocity.explanation },
    { name: 'Shareability', score: shareability.score, weight: '15%', explanation: shareability.explanation },
    { name: 'Consistency', score: consistency.score, weight: '10%', explanation: consistency.explanation },
  ];

  const trendData = [...smoHistory].reverse().map((s) => ({ date: s.computed_at, score: s.score }));

  const connected = platforms.filter((p) => p.sync_status === 'healthy');
  const totalFollowers = connected.reduce((s, p) => s + (p.follower_count ?? 0), 0);

  return {
    overall,
    status,
    signals,
    trendData,
    stats: {
      totalFollowers,
      connectedPlatforms: connected.length,
      postsAnalyzed: posts.length,
      postsPerWeek: Math.round(consistency.postsPerWeek * 10) / 10,
    },
  };
});
