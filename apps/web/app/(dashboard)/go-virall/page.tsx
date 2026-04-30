import { createAdminClient } from '@govirall/db/admin';
import { createServerClient } from '@govirall/db/server';
import { redirect } from 'next/navigation';
import { GoVirallClient } from './go-virall-client';

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
type Platform = { id: string; platform: string; platform_username: string; follower_count: number | null; following_count: number | null; post_count: number | null; sync_status: string };
type SmoHistory = { score: number; computed_at: string };

/* ── Signal computation helpers ── */

function computeContentHeat(viralScores: ViralScore[]) {
  if (viralScores.length === 0) {
    return { score: 0, explanation: 'No viral scores yet. Score a post in Compose.', trend: 'flat' as const };
  }

  const scores = viralScores.map((v) => v.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  let trend: 'rising' | 'falling' | 'flat' = 'flat';
  let trendFactor = 1.0;

  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2);
    const recentAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const olderAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    const diff = recentAvg - olderAvg;

    if (diff > 5) {
      trend = 'rising';
      trendFactor = 1.0 + Math.min(0.3, diff / 30);
    } else if (diff < -5) {
      trend = 'falling';
      trendFactor = 1.0 - Math.min(0.2, Math.abs(diff) / 30);
    }
  }

  // Strict power curve: 50 avg -> ~25, 70 avg -> ~45, 85 avg -> ~63
  const baseScore = Math.pow(avg / 100, 1.3) * 80;
  const finalScore = Math.round(Math.max(0, Math.min(100, baseScore * trendFactor)));

  const explanation =
    scores.length < 3
      ? `Based on ${scores.length} viral score${scores.length > 1 ? 's' : ''}. Score more posts for accuracy.`
      : trend === 'rising'
        ? `Avg viral score ${Math.round(avg)} and rising. Recent content outperforms earlier work.`
        : trend === 'falling'
          ? `Avg viral score ${Math.round(avg)} but declining. Recent content underperforms your baseline.`
          : `Avg viral score ${Math.round(avg)}, holding steady.`;

  return { score: finalScore, explanation, trend };
}

function engagementValue(p: Post): number {
  return (
    (p.views ?? 0) * 1 +
    (p.likes ?? 0) * 5 +
    (p.comments ?? 0) * 15 +
    (p.shares ?? 0) * 20 +
    (p.saves ?? 0) * 12
  );
}

function computeEngagementSpike(posts: Post[]) {
  const published = posts.filter((p) => p.published_at);
  if (published.length < 3) {
    return { score: 0, explanation: 'Need at least 3 published posts to detect engagement spikes.', spikeRatio: 0 };
  }

  const sorted = [...published].sort(
    (a, b) => new Date(b.published_at!).getTime() - new Date(a.published_at!).getTime(),
  );

  const allEng = sorted.map(engagementValue);
  const historicalAvg = allEng.reduce((a, b) => a + b, 0) / allEng.length;

  if (historicalAvg === 0) {
    return { score: 0, explanation: 'No engagement data recorded on your posts yet.', spikeRatio: 0 };
  }

  const recentEng = allEng.slice(0, Math.min(5, allEng.length));
  const bestRecent = Math.max(...recentEng);
  const spikeRatio = bestRecent / historicalAvg;

  let score = 0;
  if (spikeRatio >= 10) score = 100;
  else if (spikeRatio >= 5) score = 80 + ((spikeRatio - 5) / 5) * 20;
  else if (spikeRatio >= 3) score = 55 + ((spikeRatio - 3) / 2) * 25;
  else if (spikeRatio >= 2) score = 30 + ((spikeRatio - 2) / 1) * 25;
  else if (spikeRatio >= 1.5) score = 15 + ((spikeRatio - 1.5) / 0.5) * 15;
  else if (spikeRatio >= 1.0) score = 5 + ((spikeRatio - 1.0) / 0.5) * 10;
  else score = Math.round(spikeRatio * 5);

  score = Math.round(Math.max(0, Math.min(100, score)));

  const explanation =
    spikeRatio >= 3
      ? `A recent post is performing ${spikeRatio.toFixed(1)}x above your average. Spike detected.`
      : spikeRatio >= 1.5
        ? `Recent content is ${spikeRatio.toFixed(1)}x your average. Warming up.`
        : spikeRatio >= 1.0
          ? `Recent posts are performing near your average. No spike yet.`
          : `Recent posts are below your historical average.`;

  return { score, explanation, spikeRatio };
}

function computeGrowthVelocity(snapshots: AudienceSnap[], platforms: Platform[]) {
  const connected = platforms.filter((p) => p.sync_status === 'healthy');
  const totalFollowers = connected.reduce((s, p) => s + (p.follower_count ?? 0), 0);

  if (snapshots.length < 2) {
    if (totalFollowers > 0) {
      return { score: 3, explanation: 'Not enough daily snapshots to measure growth yet. Check back tomorrow.', growthRate: 0 };
    }
    return { score: 0, explanation: 'Connect platforms to start tracking growth.', growthRate: 0 };
  }

  // Aggregate by day
  const sorted = [...snapshots].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
  const byDay = new Map<string, number>();
  for (const s of sorted) {
    const day = s.captured_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + s.follower_count);
  }
  const dailyTotals = Array.from(byDay.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, count]) => count);

  if (dailyTotals.length < 2) {
    return { score: 3, explanation: 'Need at least 2 days of snapshot data.', growthRate: 0 };
  }

  const latest = dailyTotals[dailyTotals.length - 1];
  const weekAgoIdx = Math.max(0, dailyTotals.length - 8);
  const weekAgo = dailyTotals[weekAgoIdx];
  const weekGrowthRate = weekAgo > 0 ? (latest - weekAgo) / weekAgo : 0;

  let acceleration = 1.0;
  if (dailyTotals.length >= 14) {
    const twoWeeksAgoIdx = Math.max(0, dailyTotals.length - 15);
    const twoWeeksAgo = dailyTotals[twoWeeksAgoIdx];
    const priorWeekGrowth = weekAgo > 0 && twoWeeksAgo > 0 ? (weekAgo - twoWeeksAgo) / twoWeeksAgo : 0;
    if (priorWeekGrowth > 0) {
      acceleration = Math.max(0.5, Math.min(2.5, weekGrowthRate / priorWeekGrowth));
    }
  }

  const growthPct = weekGrowthRate * 100;
  let baseScore = 0;
  if (growthPct <= 0) baseScore = Math.max(0, 5 + growthPct);
  else if (growthPct <= 0.5) baseScore = 5 + (growthPct / 0.5) * 10;
  else if (growthPct <= 1) baseScore = 15 + ((growthPct - 0.5) / 0.5) * 10;
  else if (growthPct <= 2) baseScore = 25 + ((growthPct - 1) / 1) * 15;
  else if (growthPct <= 5) baseScore = 40 + ((growthPct - 2) / 3) * 20;
  else if (growthPct <= 10) baseScore = 60 + ((growthPct - 5) / 5) * 25;
  else baseScore = 85 + Math.min(15, ((growthPct - 10) / 10) * 15);

  const finalScore = Math.round(Math.max(0, Math.min(100, baseScore * acceleration)));

  const explanation =
    weekGrowthRate > 0.02
      ? `${(weekGrowthRate * 100).toFixed(1)}% weekly growth${acceleration > 1.2 ? ' and accelerating' : ''}. Strong momentum.`
      : weekGrowthRate > 0
        ? `${(weekGrowthRate * 100).toFixed(1)}% weekly growth. Steady but not explosive yet.`
        : weekGrowthRate < 0
          ? `Followers declined ${(Math.abs(weekGrowthRate) * 100).toFixed(1)}% this week.`
          : 'Flat growth this week. No new followers detected.';

  return { score: finalScore, explanation, growthRate: weekGrowthRate };
}

function computeShareability(posts: Post[]) {
  const recent = posts.slice(0, 20);
  if (recent.length === 0) {
    return { score: 0, explanation: 'No published posts to analyze.', shareRatio: 0 };
  }

  let totalShares = 0;
  let totalSaves = 0;
  let totalEngagement = 0;

  for (const p of recent) {
    const shares = p.shares ?? 0;
    const saves = p.saves ?? 0;
    const likes = p.likes ?? 0;
    const comments = p.comments ?? 0;
    totalShares += shares;
    totalSaves += saves;
    totalEngagement += likes + comments + shares + saves;
  }

  if (totalEngagement === 0) {
    return { score: 2, explanation: 'No engagement recorded on recent posts yet.', shareRatio: 0 };
  }

  const shareRatio = (totalShares + totalSaves) / totalEngagement;
  const ratioPct = shareRatio * 100;

  let score = 0;
  if (ratioPct < 5) score = 5 + (ratioPct / 5) * 5;
  else if (ratioPct < 15) score = 10 + ((ratioPct - 5) / 10) * 20;
  else if (ratioPct < 25) score = 30 + ((ratioPct - 15) / 10) * 20;
  else if (ratioPct < 40) score = 50 + ((ratioPct - 25) / 15) * 20;
  else score = 70 + Math.min(25, ((ratioPct - 40) / 30) * 25);

  score = Math.round(Math.max(0, Math.min(95, score)));

  const explanation =
    ratioPct >= 25
      ? `${ratioPct.toFixed(0)}% of engagement is shares/saves. Highly shareable content.`
      : ratioPct >= 10
        ? `${ratioPct.toFixed(0)}% share+save ratio. Content resonates but could spread more.`
        : `${ratioPct.toFixed(0)}% share+save ratio. Most engagement is passive (likes only).`;

  return { score, explanation, shareRatio };
}

function computeConsistency(posts: Post[]) {
  const published = posts
    .filter((p) => p.published_at)
    .map((p) => new Date(p.published_at!).getTime())
    .sort((a, b) => b - a);

  if (published.length === 0) {
    return { score: 0, explanation: 'No posts published yet.', postsPerWeek: 0 };
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const postsLast30 = published.filter((t) => t > thirtyDaysAgo).length;
  const postsPerWeek = postsLast30 / 4.3;

  // Gap analysis
  const recentPosts = published.filter((t) => t > thirtyDaysAgo);
  let maxGapDays = 0;
  if (recentPosts.length >= 2) {
    for (let i = 0; i < recentPosts.length - 1; i++) {
      const gap = (recentPosts[i] - recentPosts[i + 1]) / 86400000;
      maxGapDays = Math.max(maxGapDays, gap);
    }
  }

  const daysSinceLast = Math.floor((now - published[0]) / 86400000);

  // Frequency score
  let freqScore = 0;
  if (postsPerWeek >= 3) freqScore = 50;
  else if (postsPerWeek >= 2) freqScore = 40;
  else if (postsPerWeek >= 1) freqScore = 25;
  else if (postsPerWeek > 0) freqScore = 10;

  // Recency score
  let recencyScore = 0;
  if (daysSinceLast <= 1) recencyScore = 30;
  else if (daysSinceLast <= 3) recencyScore = 25;
  else if (daysSinceLast <= 7) recencyScore = 15;
  else if (daysSinceLast <= 14) recencyScore = 5;

  // Gap penalty
  let gapPenalty = 0;
  if (maxGapDays > 14) gapPenalty = 15;
  else if (maxGapDays > 7) gapPenalty = 8;

  // Regularity bonus
  let regularityBonus = 0;
  if (recentPosts.length >= 4) {
    const gaps: number[] = [];
    for (let i = 0; i < recentPosts.length - 1; i++) {
      gaps.push((recentPosts[i] - recentPosts[i + 1]) / 86400000);
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgGap > 0 ? stdDev / avgGap : 999;
    if (cv < 0.3) regularityBonus = 20;
    else if (cv < 0.6) regularityBonus = 10;
  }

  const score = Math.round(Math.max(0, Math.min(100, freqScore + recencyScore + regularityBonus - gapPenalty)));

  const explanation =
    daysSinceLast <= 3
      ? `${postsPerWeek.toFixed(1)} posts/week, last post ${daysSinceLast}d ago. ${maxGapDays <= 7 ? 'Consistent.' : 'But irregular gaps detected.'}`
      : daysSinceLast <= 7
        ? `${postsPerWeek.toFixed(1)} posts/week. Consider posting more frequently.`
        : `Last post was ${daysSinceLast} days ago. Algorithms deprioritize inactive accounts.`;

  return { score, explanation, postsPerWeek };
}

/* ── Action item generator ── */

type ActionItem = { signal: string; title: string; body: string; priority: 'high' | 'medium' | 'low' };

function generateActions(
  signals: { name: string; score: number; weight: number }[],
  extras: { postsPerWeek: number; spikeRatio: number; shareRatio: number; growthRate: number },
): ActionItem[] {
  const actions: ActionItem[] = [];
  const ranked = signals
    .map((s) => ({ ...s, deficit: (100 - s.score) * s.weight }))
    .sort((a, b) => b.deficit - a.deficit);

  for (const signal of ranked) {
    if (actions.length >= 3) break;

    switch (signal.name) {
      case 'Content Heat':
        if (signal.score < 20) {
          actions.push({ signal: signal.name, title: 'Improve your viral scores', body: 'Your content scores are low. Focus on stronger hooks (first 2 seconds) and platform-native formats. Use the Compose page to score posts before publishing.', priority: 'high' });
        } else if (signal.score < 50) {
          actions.push({ signal: signal.name, title: 'Push viral scores above 70', body: 'Experiment with proven formats: "Do This Not That" for education, Transformations for visual impact, and behind-the-scenes for connection.', priority: 'medium' });
        }
        break;
      case 'Engagement Spike':
        if (signal.score < 15) {
          actions.push({ signal: signal.name, title: 'Create a breakout post', body: `Recent posts are at ${extras.spikeRatio.toFixed(1)}x your average. Aim for 3x+ by tackling trending topics or hot takes in your niche.`, priority: 'high' });
        } else if (signal.score < 40) {
          actions.push({ signal: signal.name, title: 'Amplify your best content', body: `You hit ${extras.spikeRatio.toFixed(1)}x. Repurpose your best-performing post across other platforms to compound the spike.`, priority: 'medium' });
        }
        break;
      case 'Growth Velocity':
        if (signal.score < 15) {
          actions.push({ signal: signal.name, title: 'Kickstart follower growth', body: `Weekly growth is ${(extras.growthRate * 100).toFixed(1)}%. Engage meaningfully with 10 accounts in your niche daily \u2014 real comments, not generic ones.`, priority: 'high' });
        } else if (signal.score < 40) {
          actions.push({ signal: signal.name, title: 'Accelerate your growth rate', body: `${(extras.growthRate * 100).toFixed(1)}% weekly growth is decent but not viral-level. Collaborate with creators at your level to cross-pollinate audiences.`, priority: 'medium' });
        }
        break;
      case 'Shareability':
        if (signal.score < 20) {
          actions.push({ signal: signal.name, title: 'Make content worth sharing', body: `Only ${(extras.shareRatio * 100).toFixed(0)}% of your engagement is shares/saves. Create save-worthy content: lists, tutorials, templates, and hot takes.`, priority: extras.postsPerWeek >= 2 ? 'high' : 'medium' });
        }
        break;
      case 'Consistency':
        if (signal.score < 20) {
          actions.push({ signal: signal.name, title: 'Establish a posting rhythm', body: `Posting ${extras.postsPerWeek.toFixed(1)} times/week is too infrequent. Aim for 2-3 posts/week minimum. Batch create on one day, schedule for the week.`, priority: 'low' });
        }
        break;
    }
  }

  return actions;
}

/* ── Page ── */

export default async function GoVirallPage({ searchParams }: { searchParams: Promise<{ platformAccountId?: string }> }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const admin = createAdminClient();

  const [profileRes, platformsRes, postsRes, viralScoresRes, audienceRes, smoHistoryRes] = await Promise.all([
    admin.from('users').select('theme, display_name').eq('id', user.id).single(),
    admin
      .from('platform_accounts_safe')
      .select('id, platform, platform_username, follower_count, following_count, post_count, sync_status')
      .eq('user_id', user.id),
    admin
      .from('posts')
      .select('id, views, likes, comments, shares, saves, reach, published_at, platform, format')
      .eq('user_id', user.id)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(100),
    admin
      .from('viral_scores')
      .select('score, confidence, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('audience_snapshots')
      .select('platform_account_id, follower_count, engagement_rate, captured_at')
      .eq('user_id', user.id)
      .order('captured_at', { ascending: false })
      .limit(60),
    admin
      .from('smo_scores')
      .select('score, computed_at')
      .eq('user_id', user.id)
      .order('computed_at', { ascending: false })
      .limit(30),
  ]);

  const theme = profileRes.data?.theme ?? 'glassmorphic';
  const allPlatforms = (platformsRes.data ?? []) as Platform[];
  const allPosts = (postsRes.data ?? []) as Post[];
  const viralScores = (viralScoresRes.data ?? []) as ViralScore[];
  const allSnapshots = (audienceRes.data ?? []) as AudienceSnap[];
  const smoHistory = (smoHistoryRes.data ?? []) as SmoHistory[];

  // Optional account-level filtering
  const { platformAccountId } = await searchParams;
  const selectedAccount = platformAccountId
    ? allPlatforms.find((p) => p.id === platformAccountId)
    : null;
  const filterPlatform = selectedAccount?.platform ?? null;

  const platforms = allPlatforms;
  const posts = filterPlatform ? allPosts.filter((p) => p.platform === filterPlatform) : allPosts;
  const snapshots = filterPlatform
    ? allSnapshots.filter((s) => {
        const acct = allPlatforms.find((p) => p.id === s.platform_account_id);
        return acct?.platform === filterPlatform;
      })
    : allSnapshots;

  // Compute all 5 signals
  const contentHeat = computeContentHeat(viralScores);
  const engagementSpike = computeEngagementSpike(posts);
  const growthVelocity = computeGrowthVelocity(snapshots, platforms);
  const shareability = computeShareability(posts);
  const consistency = computeConsistency(posts);

  // Overall score (weighted)
  const overall = Math.round(
    contentHeat.score * 0.3 +
      engagementSpike.score * 0.25 +
      growthVelocity.score * 0.2 +
      shareability.score * 0.15 +
      consistency.score * 0.1,
  );

  // Status label
  const status =
    overall >= 81
      ? { label: 'Viral Ready', description: 'All signals aligned. Your next post could break through.' }
      : overall >= 61
        ? { label: 'On Fire', description: 'Viral momentum is building. Keep pushing \u2014 you\u2019re close.' }
        : overall >= 41
          ? { label: 'Getting Hot', description: 'Signals are emerging. Your content is gaining traction.' }
          : overall >= 21
            ? { label: 'Warming Up', description: 'Foundation is there. Focus on engagement spikes and growth.' }
            : { label: 'Cold', description: 'Far from viral. Build your content engine and grow your audience.' };

  // Signal data for client
  const signals = [
    { name: 'Content Heat', score: contentHeat.score, weight: '30%', explanation: contentHeat.explanation, icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { name: 'Engagement Spike', score: engagementSpike.score, weight: '25%', explanation: engagementSpike.explanation, icon: 'M2 12L7 2l5 10 5-6 5 8M2 22h20' },
    { name: 'Growth Velocity', score: growthVelocity.score, weight: '20%', explanation: growthVelocity.explanation, icon: 'M23 6l-9.5 9.5-5-5L1 18' },
    { name: 'Shareability', score: shareability.score, weight: '15%', explanation: shareability.explanation, icon: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13' },
    { name: 'Consistency', score: consistency.score, weight: '10%', explanation: consistency.explanation, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z' },
  ];

  // Trend data from SMO history (newest first, reverse to chronological)
  const trendData = [...smoHistory]
    .reverse()
    .map((s) => ({ date: s.computed_at, score: s.score }));

  // Action items
  const actions = generateActions(
    signals.map((s) => ({ name: s.name, score: s.score, weight: parseFloat(s.weight) / 100 })),
    {
      postsPerWeek: consistency.postsPerWeek,
      spikeRatio: engagementSpike.spikeRatio,
      shareRatio: shareability.shareRatio,
      growthRate: growthVelocity.growthRate,
    },
  );

  // Stats
  const connected = platforms.filter((p) => p.sync_status === 'healthy');
  const totalFollowers = connected.reduce((s, p) => s + (p.follower_count ?? 0), 0);

  return (
    <GoVirallClient
      theme={theme}
      overall={overall}
      status={status}
      signals={signals}
      trendData={trendData}
      actions={actions}
      stats={{
        totalFollowers,
        connectedPlatforms: connected.length,
        postsAnalyzed: connected.reduce((s, p) => s + (p.post_count ?? 0), 0) || posts.length,
        postsPerWeek: Math.round(consistency.postsPerWeek * 10) / 10,
      }}
      platforms={platforms}
      selectedPlatformAccountId={platformAccountId ?? null}
    />
  );
}
