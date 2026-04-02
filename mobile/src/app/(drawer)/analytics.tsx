import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { ProfileSelector } from '../../components/ui/ProfileSelector';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { trackEvent } from '../../lib/track';

// ---- helpers ----

function parseResult(result: any): any {
  if (!result) return null;
  if (typeof result === 'string') {
    try { return JSON.parse(result.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try { return JSON.parse(result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  if (typeof result === 'object' && result.result && typeof result.result === 'object') {
    return result.result;
  }
  return result;
}

function extractResult(data: any): any {
  if (!data) return {};
  const parsed = parseResult(data);
  if (!parsed) return {};
  for (const key of ['audience', 'forecast', 'analysis']) {
    if (parsed[key] && typeof parsed[key] === 'object') return parsed[key];
  }
  const keys = Object.keys(parsed);
  if (keys.length === 1 && typeof parsed[keys[0]] === 'object' && parsed[keys[0]] !== null) {
    return parsed[keys[0]];
  }
  return parsed;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtMilestone(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return String(n);
}

// ---- types ----

interface PostPerformance {
  id: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isVideo: boolean;
  engagementRate: number;
  platform: string;
  handle: string;
}

interface PlatformGrowthItem {
  platform: string;
  handle: string;
  profileId: string;
  currentFollowers: number;
  previousFollowers: number;
  growth: number;
  growthPct: number;
}

interface MilestoneData {
  currentFollowers: number;
  dailyGrowthRate: number;
  milestones: Array<{ target: number; label: string; estimatedDate: string | null; daysAway: number | null }>;
}

// ---- constants ----

const TABS = ['Performance', 'Growth', 'Revenue', 'Competitive'];

// ---- component ----

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => { trackEvent('page_view', 'analytics'); }, []);

  const [profiles, setProfiles] = useState<{ id: string; platform: string; username: string; followers_count: number; engagement_rate: number | null; posts_count: number }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostPerformance[]>([]);
  const [platformGrowth, setPlatformGrowth] = useState<PlatformGrowthItem[]>([]);
  const [milestone, setMilestone] = useState<MilestoneData | null>(null);
  const [earningsData, setEarningsData] = useState<any>(null);
  const [competitorData, setCompetitorData] = useState<any>(null);

  // ---- data loading ----

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    const { data: profs } = await supabase
      .from('social_profiles')
      .select('id, platform, handle, followers_count, engagement_rate, posts_count, recent_posts')
      .eq('organization_id', organization.id)
      .order('followers_count', { ascending: false });

    if (!profs || profs.length === 0) return;

    const profileList = profs.map((p: any) => ({
      id: p.id,
      platform: p.platform,
      username: p.handle || 'unknown',
      followers_count: p.followers_count,
      engagement_rate: p.engagement_rate,
      posts_count: p.posts_count,
    }));
    setProfiles(profileList);

    // Build posts performance
    const allPosts: PostPerformance[] = [];
    for (const prof of profs) {
      if (!prof.recent_posts) continue;
      const rp = Array.isArray(prof.recent_posts) ? prof.recent_posts : [];
      for (const post of rp) {
        const engagement = prof.followers_count > 0 ? ((post.likesCount + post.commentsCount) / prof.followers_count) * 100 : 0;
        allPosts.push({
          id: post.id,
          caption: post.caption || '',
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          isVideo: !!post.isVideo,
          engagementRate: Math.round(engagement * 100) / 100,
          platform: prof.platform,
          handle: prof.handle,
        });
      }
    }
    allPosts.sort((a, b) => b.likesCount - a.likesCount);
    setPosts(allPosts);

    // Platform growth
    const growthItems: PlatformGrowthItem[] = [];
    for (const prof of profs) {
      const { data: metrics } = await supabase
        .from('social_metrics')
        .select('followers')
        .eq('social_profile_id', prof.id)
        .order('date', { ascending: false })
        .limit(30);

      const ml = (metrics ?? []) as Array<{ followers: number | null }>;
      const current = ml[0]?.followers ?? prof.followers_count;
      const previous = ml[ml.length - 1]?.followers ?? current;
      const growth = current - previous;
      const growthPct = previous > 0 ? (growth / previous) * 100 : 0;

      growthItems.push({
        platform: prof.platform,
        handle: prof.handle,
        profileId: prof.id,
        currentFollowers: current,
        previousFollowers: previous,
        growth,
        growthPct: Math.round(growthPct * 10) / 10,
      });
    }
    setPlatformGrowth(growthItems);

    // Milestone — only for specific profile
    if (selectedId) {
      await loadMilestone(selectedId, profs);
    } else {
      setMilestone(null);
    }

    // Analyses
    const profileIds = profs.map((p: any) => p.id);
    const { data: analysisRows } = await supabase
      .from('social_analyses')
      .select('*')
      .in('social_profile_id', profileIds)
      .in('analysis_type', ['earnings_forecast', 'competitors'])
      .order('created_at', { ascending: false });

    const analysesByProfile: Record<string, Record<string, any>> = {};
    for (const row of analysisRows ?? []) {
      if (!analysesByProfile[row.social_profile_id]) analysesByProfile[row.social_profile_id] = {};
      if (!analysesByProfile[row.social_profile_id][row.analysis_type]) {
        analysesByProfile[row.social_profile_id][row.analysis_type] = parseResult(row.result);
      }
    }

    // When "All" (null), pick first profile with data; otherwise use selected
    const targetId = selectedId ?? profileIds.find((id: string) => analysesByProfile[id]) ?? profileIds[0];
    const selAnalyses = analysesByProfile[targetId] ?? {};
    setEarningsData(selAnalyses.earnings_forecast ?? null);
    setCompetitorData(selAnalyses.competitors ?? null);
  }, [organization?.id, selectedId]);

  const loadMilestone = async (profileId: string, profs: any[]) => {
    const prof = profs.find((p: any) => p.id === profileId);
    if (!prof) { setMilestone(null); return; }

    const { data: metrics } = await supabase
      .from('social_metrics')
      .select('date, followers')
      .eq('social_profile_id', profileId)
      .order('date', { ascending: false })
      .limit(30);

    const ml = (metrics ?? []) as Array<{ date: string; followers: number | null }>;
    if (ml.length < 2) {
      setMilestone({ currentFollowers: prof.followers_count, dailyGrowthRate: 0, milestones: [] });
      return;
    }

    const latest = ml[0].followers ?? prof.followers_count;
    const oldest = ml[ml.length - 1].followers ?? latest;
    const daySpan = ml.length;
    const dailyGrowth = daySpan > 0 ? (latest - oldest) / daySpan : 0;

    const targets = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
    const milestones = targets
      .filter((t) => t > latest)
      .slice(0, 3)
      .map((target) => {
        const daysNeeded = dailyGrowth > 0 ? Math.ceil((target - latest) / dailyGrowth) : null;
        const estDate = daysNeeded ? new Date(Date.now() + daysNeeded * 86400000).toISOString().split('T')[0] : null;
        return { target, label: fmtMilestone(target), estimatedDate: estDate, daysAway: daysNeeded };
      });

    setMilestone({ currentFollowers: latest, dailyGrowthRate: Math.round(dailyGrowth * 10) / 10, milestones });
  };

  useEffect(() => {
    if (organization?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [loadData, organization?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const onProfileSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Analytics</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Connect a social profile to see your analytics.
        </Text>
      </View>
    );
  }

  // ═══════════════════════════════════════
  // PERFORMANCE TAB
  // ═══════════════════════════════════════

  const renderPerformance = () => {
    // Filter posts by selected profile
    const filteredPosts = selectedId
      ? (() => {
          const prof = profiles.find((p) => p.id === selectedId);
          return prof ? posts.filter((p) => p.platform === prof.platform && p.handle === prof.username) : posts;
        })()
      : posts;

    const topPosts = filteredPosts.slice(0, 10);
    const worstPosts = [...filteredPosts].sort((a, b) => a.likesCount - b.likesCount).slice(0, 5);
    const videoCount = filteredPosts.filter((p) => p.isVideo).length;
    const imageCount = filteredPosts.length - videoCount;
    const totalLikes = filteredPosts.reduce((s, p) => s + p.likesCount, 0);
    const totalComments = filteredPosts.reduce((s, p) => s + p.commentsCount, 0);
    const avgEngRate = filteredPosts.length > 0 ? filteredPosts.reduce((s, p) => s + p.engagementRate, 0) / filteredPosts.length : 0;
    const maxLikes = Math.max(...filteredPosts.map((p) => p.likesCount), 1);

    return (
      <>
        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{posts.length}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>POSTS</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{fmtNum(totalLikes)}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>LIKES</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{fmtNum(totalComments)}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>COMMENTS</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: colors.primary }]}>{avgEngRate.toFixed(2)}%</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>AVG ENG.</Text>
          </Card>
        </View>

        {/* Content Type Breakdown */}
        <SectionTitle>Content Type Breakdown</SectionTitle>
        <View style={styles.gridRow}>
          <Card style={styles.gridCard}>
            <View style={[styles.typeLine, { backgroundColor: colors.primary }]} />
            <Text style={[styles.bigNum, { color: colors.text }]}>{videoCount}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Videos / Reels</Text>
          </Card>
          <Card style={styles.gridCard}>
            <View style={[styles.typeLine, { backgroundColor: '#5b9cf5' }]} />
            <Text style={[styles.bigNum, { color: colors.text }]}>{imageCount}</Text>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Images / Carousels</Text>
          </Card>
        </View>

        {/* Top Posts */}
        <SectionTitle>Top Performing Posts</SectionTitle>
        {topPosts.map((post, i) => (
          <Card key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postRankBadge}>
                <Text style={[styles.postRankText, { color: colors.textMuted }]}>#{i + 1}</Text>
              </View>
              <Text style={[styles.postPlatform, { color: colors.textSecondary }]}>
                {post.platform} · {post.isVideo ? 'Video' : 'Image'}
              </Text>
              <Text style={[styles.engBadge, { color: colors.primary }]}>{post.engagementRate}%</Text>
            </View>
            <Text style={[styles.postCaption, { color: colors.text }]} numberOfLines={2}>
              {post.caption || '(no caption)'}
            </Text>
            <View style={styles.postStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{fmtNum(post.likesCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Likes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{fmtNum(post.commentsCount)}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Comments</Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Worst Posts with bars */}
        {worstPosts.length > 0 && (
          <>
            <SectionTitle>Lowest Performing Posts</SectionTitle>
            {worstPosts.map((post, i) => {
              const pct = (post.likesCount / maxLikes) * 100;
              return (
                <Card key={post.id} style={styles.worstPostCard}>
                  <View style={styles.worstRow}>
                    <Text style={[styles.worstRank, { color: colors.textMuted }]}>{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.worstHeader}>
                        <Text style={[styles.worstCaption, { color: colors.text }]} numberOfLines={1}>
                          {post.caption || '(no caption)'}
                        </Text>
                        <Text style={[styles.worstLikes, { color: colors.text }]}>{fmtNum(post.likesCount)}</Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: `${colors.primary}66` }]} />
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════
  // GROWTH TAB
  // ═══════════════════════════════════════

  const renderGrowth = () => {
    const filteredGrowth = selectedId
      ? platformGrowth.filter((pg) => pg.profileId === selectedId)
      : platformGrowth;
    const selected = selectedId ? filteredGrowth[0] : null;

    return (
      <>
        {/* Selected profile highlight */}
        {selected && (
          <Card style={styles.growthHighlight}>
            <Text style={[styles.growthPlatformLabel, { color: colors.textMuted }]}>
              {selected.platform} · @{selected.handle}
            </Text>
            <Text style={[styles.growthBigNumber, { color: colors.text }]}>
              {fmtNum(selected.currentFollowers)}
            </Text>
            <Text style={[styles.growthSubtext, { color: colors.textMuted }]}>followers</Text>
            <Text style={[styles.growthChange, { color: selected.growth >= 0 ? colors.success : colors.error }]}>
              {selected.growth >= 0 ? '+' : ''}{fmtNum(selected.growth)} ({selected.growthPct}%)
            </Text>
            <Text style={[styles.growthPeriod, { color: colors.textMuted }]}>30-day change</Text>
          </Card>
        )}

        {/* Growth Rate Bars */}
        <SectionTitle>Growth Rate by Platform</SectionTitle>
        {filteredGrowth.map((pg) => {
          const isSelected = pg.profileId === selectedId;
          const barPct = Math.min(Math.abs(pg.growthPct) * 5, 100);
          return (
            <Card key={pg.profileId} style={styles.growthBarCard}>
              <View style={styles.growthBarHeader}>
                <Text style={[styles.growthBarName, { color: isSelected ? colors.primary : colors.text }]}>
                  {pg.platform} · @{pg.handle}
                </Text>
                <Text style={[styles.growthBarPct, { color: pg.growth >= 0 ? colors.success : colors.error }]}>
                  {pg.growth >= 0 ? '+' : ''}{pg.growthPct}%
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${barPct}%`,
                      backgroundColor: pg.growth >= 0 ? colors.success : colors.error,
                    },
                  ]}
                />
              </View>
            </Card>
          );
        })}

        {/* Milestone Tracker — only for specific profile */}
        {selectedId && <SectionTitle>Milestone Tracker</SectionTitle>}
        {selectedId && milestone && milestone.milestones.length > 0 ? (
          <>
            <Card style={styles.milestoneRate}>
              <Text style={[styles.milestoneRateLabel, { color: colors.textSecondary }]}>
                Daily growth rate:{' '}
                <Text style={{ color: colors.success, fontWeight: '700' }}>{milestone.dailyGrowthRate}/day</Text>
              </Text>
            </Card>
            {milestone.milestones.map((m) => {
              const progress = m.daysAway ? Math.min((milestone.currentFollowers / m.target) * 100, 100) : 0;
              return (
                <Card key={m.target} style={styles.milestoneItem}>
                  <View style={styles.milestoneItemHeader}>
                    <Text style={[styles.milestoneTarget, { color: colors.text }]}>{m.label} followers</Text>
                    <Text style={[styles.milestoneEst, { color: colors.textSecondary }]}>
                      {m.daysAway ? `~${m.daysAway}d` : '—'}
                    </Text>
                  </View>
                  <View style={[styles.milestoneBar, { backgroundColor: colors.surfaceLight }]}>
                    <View style={[styles.milestoneBarFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.milestoneBarPct, { color: colors.textMuted }]}>{progress.toFixed(0)}%</Text>
                </Card>
              );
            })}
          </>
        ) : selectedId ? (
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Not enough data to project milestones yet.
            </Text>
          </Card>
        ) : null}
      </>
    );
  };

  // ═══════════════════════════════════════
  // REVENUE TAB
  // ═══════════════════════════════════════

  const renderRevenue = () => {
    if (!earningsData) {
      return (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Run an Earnings Forecast from the Monetization page to see revenue analytics here.
          </Text>
        </Card>
      );
    }

    const result = extractResult(earningsData);
    const scenarios: any[] = result.scenarios ?? result.earningScenarios ?? [];
    const sources: any[] = result.revenueSources ?? result.revenue_sources ?? result.incomeSources ?? [];
    const rates: any[] = result.recommendedRates ?? result.recommended_rates ?? result.sponsorshipRates ?? [];

    const scenarioColors = ['#5b9cf5', '#c0392b', '#4ade80'];
    const maxSourceAmount = Math.max(...sources.map((src: any) => (src.monthly ?? src.monthlyRevenue ?? src.amount ?? 0) as number), 1);

    return (
      <>
        {/* Earnings Scenarios */}
        {scenarios.length > 0 && (
          <>
            <SectionTitle>Earnings Forecast</SectionTitle>
            {scenarios.map((s: any, i: number) => {
              const label = s.name ?? s.scenario;
              const monthly = (s.monthly ?? s.monthlyEarnings) as number | undefined;
              const annual = s.annually ?? s.annualEarnings ?? (monthly ? monthly * 12 : null);
              return (
                <Card key={i} style={styles.scenarioCard}>
                  <View style={[styles.scenarioLine, { backgroundColor: scenarioColors[i] ?? '#999' }]} />
                  <Text style={[styles.scenarioName, { color: colors.textMuted }]}>{label}</Text>
                  <Text style={[styles.scenarioValue, { color: colors.text }]}>${monthly?.toLocaleString() ?? 'N/A'}</Text>
                  <Text style={[styles.scenarioUnit, { color: colors.textMuted }]}>/month</Text>
                  {annual && <Text style={[styles.scenarioAnnual, { color: colors.textSecondary }]}>${annual.toLocaleString()}/year</Text>}
                </Card>
              );
            })}
          </>
        )}

        {/* Revenue Sources with progress bars */}
        {sources.length > 0 && (
          <>
            <SectionTitle>Revenue Sources</SectionTitle>
            <Card>
              {sources.map((src: any, i: number) => {
                const name = src.name ?? src.source ?? src.type;
                const amount = (src.monthly ?? src.monthlyRevenue ?? src.amount) as number | undefined;
                const pct = amount ? (amount / maxSourceAmount) * 100 : 0;
                return (
                  <View key={i} style={styles.sourceItem}>
                    <View style={styles.sourceHeader}>
                      <Text style={[styles.sourceName, { color: colors.text }]}>{name}</Text>
                      <Text style={[styles.sourceAmt, { color: colors.text }]}>
                        {amount != null ? `$${amount.toLocaleString()}/mo` : 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Recommended Rates */}
        {rates.length > 0 && (
          <>
            <SectionTitle>Recommended Rates</SectionTitle>
            {rates.map((rate: any, i: number) => {
              const typeName = rate.type ?? rate.content_type ?? rate.contentType ?? rate.name;
              const minRate = (rate.rate ?? rate.price ?? rate.suggestedRate ?? rate.minRate) as number | undefined;
              const maxRate = (rate.maxRate ?? rate.highRate) as number | undefined;
              return (
                <Card key={i} style={styles.rateCard}>
                  <Text style={[styles.rateType, { color: colors.text }]}>{typeName}</Text>
                  <View style={styles.rateValues}>
                    <Text style={[styles.rateValue, { color: colors.primary }]}>${minRate?.toLocaleString() ?? 'N/A'}</Text>
                    {maxRate && <Text style={[styles.rateMax, { color: colors.textMuted }]}> — ${maxRate.toLocaleString()}</Text>}
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </>
    );
  };

  // ═══════════════════════════════════════
  // COMPETITIVE TAB
  // ═══════════════════════════════════════

  const renderCompetitive = () => {
    if (!competitorData) {
      return (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Run a Competitors analysis from the Intelligence page to see competitive insights here.
          </Text>
        </Card>
      );
    }

    const result = extractResult(competitorData);
    const overview: string = result.overview || result.summary || '';
    const strengths: any[] = result.strengths || [];
    const weaknesses: any[] = result.weaknesses || [];
    const opportunities: any[] = result.opportunities || [];
    const threats: any[] = result.threats || [];
    const competitors: any[] = result.competitors || [];
    const profile = profiles.find((p) => p.id === selectedId);

    const swotSections = [
      { key: 'strengths', label: 'Strengths', items: strengths, color: '#4ade80', icon: 'S' },
      { key: 'weaknesses', label: 'Weaknesses', items: weaknesses, color: '#c0392b', icon: 'W' },
      { key: 'opportunities', label: 'Opportunities', items: opportunities, color: '#5b9cf5', icon: 'O' },
      { key: 'threats', label: 'Threats', items: threats, color: '#b8860b', icon: 'T' },
    ].filter((s) => s.items.length > 0);

    return (
      <>
        {overview ? (
          <>
            <SectionTitle>Competitive Overview</SectionTitle>
            <Card>
              <Text style={[styles.overviewText, { color: colors.textSecondary }]}>{overview}</Text>
            </Card>
          </>
        ) : null}

        {/* SWOT Cards */}
        {swotSections.map((section) => (
          <Card key={section.key} style={{ ...styles.swotCard, borderLeftColor: section.color, borderLeftWidth: 3 }}>
            <View style={styles.swotHeader}>
              <View style={[styles.swotBadge, { backgroundColor: `${section.color}20`, borderColor: section.color }]}>
                <Text style={[styles.swotBadgeText, { color: section.color }]}>{section.icon}</Text>
              </View>
              <Text style={[styles.swotTitle, { color: section.color }]}>{section.label}</Text>
            </View>
            {section.items.map((item: any, i: number) => {
              const text = typeof item === 'string' ? item : item.text || item.description || item.title || '';
              return (
                <View key={i} style={styles.swotItem}>
                  <View style={[styles.swotDot, { backgroundColor: section.color }]} />
                  <Text style={[styles.swotText, { color: colors.text }]}>{text}</Text>
                </View>
              );
            })}
          </Card>
        ))}

        {/* Competitor Comparison */}
        {competitors.length > 0 && (
          <>
            <SectionTitle>Competitor Comparison</SectionTitle>
            {competitors.map((comp: any, i: number) => (
              <Card key={i} style={styles.compCard}>
                <Text style={[styles.compHandle, { color: colors.text }]}>@{comp.handle ?? comp.name ?? comp.username}</Text>
                <View style={styles.compStats}>
                  <View style={styles.compStat}>
                    <Text style={[styles.compStatLabel, { color: colors.textMuted }]}>FOLLOWERS</Text>
                    <Text style={[styles.compStatValue, { color: colors.text }]}>{fmtNum((comp.followers ?? comp.followerCount) || 0)}</Text>
                  </View>
                  <View style={styles.compStat}>
                    <Text style={[styles.compStatLabel, { color: colors.textMuted }]}>ENG.</Text>
                    <Text style={[styles.compStatValue, { color: colors.text }]}>{((comp.engagementRate ?? comp.engagement_rate) || 0).toFixed(2)}%</Text>
                  </View>
                  <View style={styles.compStat}>
                    <Text style={[styles.compStatLabel, { color: colors.textMuted }]}>GROWTH</Text>
                    <Text style={[styles.compStatValue, { color: ((comp.growth ?? comp.growthRate) || 0) >= 0 ? colors.success : colors.error }]}>
                      {((comp.growth ?? comp.growthRate) || 0) >= 0 ? '+' : ''}{((comp.growth ?? comp.growthRate) || 0).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Your Position */}
        {profile && (
          <>
            <SectionTitle>Your Position</SectionTitle>
            <View style={styles.positionRow}>
              <Card style={styles.positionCard}>
                <Text style={[styles.positionValue, { color: colors.text }]}>{fmtNum(profile.followers_count)}</Text>
                <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>Followers</Text>
              </Card>
              <Card style={styles.positionCard}>
                <Text style={[styles.positionValue, { color: colors.primary }]}>{profile.engagement_rate?.toFixed(2) ?? 'N/A'}%</Text>
                <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>Engagement</Text>
              </Card>
              <Card style={styles.positionCard}>
                <Text style={[styles.positionValue, { color: colors.text }]}>{fmtNum(profile.posts_count)}</Text>
                <Text style={[styles.positionLabel, { color: colors.textSecondary }]}>Posts</Text>
              </Card>
            </View>
          </>
        )}
      </>
    );
  };

  // ---- tab content switch ----

  const renderContent = () => {
    switch (activeTab) {
      case 0: return renderPerformance();
      case 1: return renderGrowth();
      case 2: return renderRevenue();
      case 3: return renderCompetitive();
      default: return null;
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <ProfileSelector profiles={profiles} selectedId={selectedId} onSelect={onProfileSelect} />
      <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />
      {renderContent()}
    </ScrollView>
  );
}

// ---- styles ----

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },

  // KPI Row
  kpiRow: { flexDirection: 'row', gap: Spacing.xs },
  kpiCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  kpiValue: { fontSize: FontSize.lg, fontWeight: '800' },
  kpiLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },

  // Performance
  gridRow: { flexDirection: 'row', gap: Spacing.sm },
  gridCard: { flex: 1, alignItems: 'center' },
  typeLine: { width: '100%', height: 2, marginBottom: Spacing.sm, borderRadius: 1 },
  bigNum: { fontSize: FontSize.xxl, fontWeight: '800' },
  label: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  postCard: { marginBottom: Spacing.xs },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  postRankBadge: {},
  postRankText: { fontSize: FontSize.sm, fontWeight: '700' },
  postPlatform: { fontSize: FontSize.xs, textTransform: 'capitalize', flex: 1, marginLeft: Spacing.sm },
  engBadge: { fontSize: FontSize.sm, fontWeight: '800' },
  postCaption: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
  postStats: { flexDirection: 'row', gap: Spacing.lg },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: FontSize.md, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  worstPostCard: { marginBottom: Spacing.xs },
  worstRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  worstRank: { fontSize: FontSize.sm, fontWeight: '600', width: 16 },
  worstHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  worstCaption: { flex: 1, fontSize: FontSize.sm },
  worstLikes: { fontSize: FontSize.sm, fontWeight: '700' },

  // Growth
  growthHighlight: { alignItems: 'center', paddingVertical: Spacing.lg },
  growthPlatformLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  growthBigNumber: { fontSize: 42, fontWeight: '800', marginTop: 4 },
  growthSubtext: { fontSize: FontSize.sm },
  growthChange: { fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.sm },
  growthPeriod: { fontSize: 10, marginTop: 2 },
  growthBarCard: { marginBottom: Spacing.xs },
  growthBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  growthBarName: { fontSize: FontSize.sm, fontWeight: '500' },
  growthBarPct: { fontSize: FontSize.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Bar reusable
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 4 },

  // Milestones
  milestoneRate: { marginBottom: Spacing.xs },
  milestoneRateLabel: { fontSize: FontSize.sm },
  milestoneItem: { marginBottom: Spacing.xs },
  milestoneItemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  milestoneTarget: { fontSize: FontSize.md, fontWeight: '700' },
  milestoneEst: { fontSize: FontSize.sm },
  milestoneBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  milestoneBarFill: { height: '100%', borderRadius: 3 },
  milestoneBarPct: { fontSize: 9, textAlign: 'right', marginTop: 2, fontVariant: ['tabular-nums'] },

  // Revenue
  scenarioCard: { alignItems: 'center', marginBottom: Spacing.xs, paddingVertical: Spacing.lg },
  scenarioLine: { width: '100%', height: 2, marginBottom: Spacing.sm, borderRadius: 1 },
  scenarioName: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  scenarioValue: { fontSize: 32, fontWeight: '800', marginTop: 4 },
  scenarioUnit: { fontSize: FontSize.sm },
  scenarioAnnual: { fontSize: FontSize.sm, marginTop: 4 },
  sourceItem: { marginBottom: 12 },
  sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sourceName: { fontSize: FontSize.sm, fontWeight: '500' },
  sourceAmt: { fontSize: FontSize.sm, fontWeight: '700' },
  rateCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  rateType: { fontSize: FontSize.sm, fontWeight: '500' },
  rateValues: { flexDirection: 'row', alignItems: 'center' },
  rateValue: { fontSize: FontSize.md, fontWeight: '800' },
  rateMax: { fontSize: FontSize.sm },

  // Competitive
  overviewText: { fontSize: FontSize.sm, lineHeight: 22 },
  swotCard: { marginBottom: Spacing.xs, borderLeftWidth: 3 },
  swotHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  swotBadge: { width: 24, height: 24, borderRadius: 4, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  swotBadgeText: { fontSize: 10, fontWeight: '700' },
  swotTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  swotItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  swotDot: { width: 4, height: 4, borderRadius: 2, marginTop: 7 },
  swotText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  compCard: { marginBottom: Spacing.xs },
  compHandle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  compStats: { flexDirection: 'row', gap: Spacing.lg },
  compStat: {},
  compStatLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5 },
  compStatValue: { fontSize: FontSize.md, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  positionRow: { flexDirection: 'row', gap: Spacing.sm },
  positionCard: { flex: 1, alignItems: 'center' },
  positionValue: { fontSize: FontSize.lg, fontWeight: '800' },
  positionLabel: { fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
});
