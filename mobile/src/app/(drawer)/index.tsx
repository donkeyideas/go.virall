import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { SimpleLineChart } from '../../components/ui/SimpleLineChart';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { HorizontalBar } from '../../components/ui/HorizontalBar';
import { ProfileSelector } from '../../components/ui/ProfileSelector';
import { ActivityHeatmap } from '../../components/ui/ActivityHeatmap';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { RunAllModal } from '../../components/ui/RunAllModal';
import { Pill } from '../../components/ui/Pill';
import { PlatformLabels, PlatformColors } from '../../constants/platforms';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { formatNumber } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/track';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function parseResult(result: any): any {
  if (!result) return null;
  if (typeof result === 'string') {
    try {
      return JSON.parse(result.replace(/```json\s*/g, '').replace(/```/g, '').trim());
    } catch { return null; }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try {
      return JSON.parse(result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim());
    } catch { return null; }
  }
  return result;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#4ADE80';
  if (score >= 60) return '#FFB84D';
  return '#EF4444';
}

export default function DashboardScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const { profile, organization, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'overview'); }, []);
  const [analysisMap, setAnalysisMap] = useState<Record<string, any>>({});
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [showRunAllModal, setShowRunAllModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    const { data: profs } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true });

    const profileList = profs ?? [];
    setProfiles(profileList);

    if (profileList.length > 0) {
      // Always fetch analyses/competitors across ALL profiles so data shows
      // even when viewing a single profile
      const allProfileIds = profileList.map((p: any) => p.id);

      // For metrics, pick the selected profile or the one with most followers
      const bestProfile = selectedProfileId
        ? profileList.find((p: any) => p.id === selectedProfileId)
        : [...profileList].sort((a: any, b: any) => (b.followers_count || 0) - (a.followers_count || 0))[0];
      const metricsId = bestProfile?.id || profileList[0].id;

      const [metricsRes, analysesRes, competitorsRes] = await Promise.all([
        supabase
          .from('social_metrics')
          .select('*')
          .eq('social_profile_id', metricsId)
          .order('date', { ascending: false })
          .limit(30),
        supabase
          .from('social_analyses')
          .select('*')
          .in('social_profile_id', allProfileIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('social_competitors')
          .select('*')
          .in('social_profile_id', allProfileIds)
          .order('followers_count', { ascending: false }),
      ]);

      setMetrics(metricsRes.data ?? []);
      setCompetitors(competitorsRes.data ?? []);

      // Build analyses map — when a profile is selected, prefer its analyses
      // When "All", pick latest analysis per type (already sorted desc by created_at)
      const aMap: Record<string, any> = {};
      const targetProfileId = selectedProfileId ?? allProfileIds[0];
      const allRows = analysesRes.data ?? [];
      // First pass: try to fill from target profile
      for (const row of allRows) {
        if (row.social_profile_id === targetProfileId && !aMap[row.analysis_type]) {
          aMap[row.analysis_type] = parseResult(row.result);
        }
      }
      // Second pass: fill remaining from any profile (for "All" view completeness)
      if (!selectedProfileId) {
        for (const row of allRows) {
          if (!aMap[row.analysis_type]) {
            aMap[row.analysis_type] = parseResult(row.result);
          }
        }
      }
      setAnalysisMap(aMap);
    }
  }, [organization?.id, selectedProfileId]);

  useEffect(() => {
    if (authLoading) return;
    if (organization?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadData, organization?.id, authLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // --- Data extraction ---
  const activeProfiles = selectedProfileId
    ? profiles.filter((p) => p.id === selectedProfileId)
    : profiles;

  const totalFollowers = activeProfiles.reduce((s: number, p: any) => s + (p.followers_count || 0), 0);
  const avgLikesPerPost = (() => {
    let totalLikes = 0;
    let totalPostCount = 0;
    for (const p of activeProfiles) {
      const posts: any[] = p.recent_posts || [];
      if (posts.length) {
        totalLikes += posts.reduce((s: number, post: any) => s + (post.likesCount || 0), 0);
        totalPostCount += posts.length;
      }
    }
    return totalPostCount > 0 ? Math.round(totalLikes / totalPostCount) : 0;
  })();
  const totalPosts = activeProfiles.reduce((s: number, p: any) => s + (p.posts_count || 0), 0);

  const networkData = analysisMap.network;
  const smoData = analysisMap.smo_score;
  const audienceData = analysisMap.audience;
  const earningsData = analysisMap.earnings_forecast;
  const hashtagsData = analysisMap.hashtags;

  const influenceScore = networkData?.network?.influenceScore?.overall
    ?? smoData?.smo?.overallScore ?? 0;

  const smo = smoData?.smo || smoData;
  const smoScore = smo?.overallScore ?? smo?.overall_score ?? 0;
  const smoFactors: any[] = (smo?.factors || []).slice(0, 6);

  const audience = audienceData?.audience || audienceData;
  const rawQuality = audience?.qualityScore ?? audience?.quality_score;
  const qualityScore = typeof rawQuality === 'object' && rawQuality !== null
    ? (rawQuality.overall ?? rawQuality.score ?? 0) : (rawQuality ?? 0);
  const qualityFactors: any[] = rawQuality?.factors || [];

  const heatmap = audience?.activityHeatmap || null;

  const forecast = earningsData?.forecast || earningsData;
  const summaryStats = forecast?.summaryStats || forecast?.summary_stats;
  const revenueSources: any[] = forecast?.revenueBySources || forecast?.revenue_by_sources || [];

  const ageDistribution: any[] = audience?.ageDistribution || audience?.age_distribution || [];
  const genderDistribution = audience?.genderDistribution || audience?.gender_distribution || {};

  const rawHashtags = hashtagsData?.hashtags || [];
  const topHashtags: any[] = (Array.isArray(rawHashtags) ? rawHashtags : []).slice(0, 10);

  const engagementData = metrics.map((m: any) => m.engagement_rate ?? m.avg_likes ?? 0);
  const engagementLabels = metrics.map((m: any) => {
    const d = new Date(m.date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const followerData = metrics.map((m: any) => m.followers_count ?? 0);

  const selectedProfile = selectedProfileId
    ? profiles.find((p: any) => p.id === selectedProfileId)
    : [...profiles].sort((a: any, b: any) => (b.followers_count || 0) - (a.followers_count || 0))[0];

  // Platform split: aggregate followers by platform
  const platformSplit = (() => {
    const totals: Record<string, number> = {};
    for (const p of activeProfiles) {
      const key = (p.platform || '').toLowerCase();
      if (!key) continue;
      totals[key] = (totals[key] || 0) + (p.followers_count || 0);
    }
    const grand = Object.values(totals).reduce((a, b) => a + b, 0);
    if (grand === 0) return [];
    return Object.entries(totals)
      .map(([platform, count]) => ({ platform, count, pct: Math.round((count / grand) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  })();

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
          <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name || 'Creator'}</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={toggleTheme} style={[styles.themeToggle, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
            <Ionicons name={mode === 'dark' ? 'sunny' : 'moon'} size={18} color={colors.primary} />
          </Pressable>
          {profiles.length > 0 && (
            <Pressable
              onPress={() => setShowRunAllModal(true)}
              style={({ pressed }) => [
                styles.runAllBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.runAllIcon}>{'>'}</Text>
              <Text style={styles.runAllText}>Run All</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Profile Selector */}
      {profiles.length > 1 && (
        <ProfileSelector
          profiles={profiles.map((p: any) => ({ id: p.id, platform: p.platform, username: p.handle || p.display_name || p.platform }))}
          selectedId={selectedProfileId}
          onSelect={setSelectedProfileId}
        />
      )}

      {/* KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <KpiCard label="Followers" value={formatNumber(totalFollowers)} change={0} icon="followers" accentColor="#E1306C" />
          <KpiCard label="Avg Likes" value={formatNumber(avgLikesPerPost)} change={0} icon="engagement" accentColor={colors.success} />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard label="Posts" value={formatNumber(totalPosts)} change={0} icon="posts" accentColor={colors.accent} />
          <KpiCard label="Score" value={String(Math.round(influenceScore))} change={0} icon="score" accentColor={colors.primary} />
        </View>
      </View>

      {/* Profile Performance Card */}
      {selectedProfile && (
        <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <LinearGradient
            colors={mode === 'dark' ? ['rgba(139,92,246,0.15)', 'rgba(42,27,84,0)'] : ['rgba(124,58,237,0.08)', 'rgba(255,255,255,0)']}
            style={styles.profileGradient}
          />
          <View style={styles.perfHeader}>
            <View style={styles.perfAvatarRow}>
              <PlatformIcon platform={selectedProfile.platform} size={24} />
              <View style={styles.perfInfo}>
                <Text style={[styles.perfHandle, { color: colors.text }]}>@{selectedProfile.handle || selectedProfile.display_name || selectedProfile.platform}</Text>
                <Text style={[styles.perfPlatform, { color: colors.textSecondary }]}>
                  {PlatformLabels[selectedProfile.platform] || selectedProfile.platform}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.perfStats}>
            {[
              { label: 'FOLLOWERS', value: formatNumber(selectedProfile.followers_count || 0), color: '#E1306C' },
              { label: 'AVG LIKES', value: (() => { const posts: any[] = selectedProfile.recent_posts || []; if (!posts.length) return '---'; const total = posts.reduce((s: number, p: any) => s + (p.likesCount || 0), 0); return formatNumber(Math.round(total / posts.length)); })(), color: colors.success },
              { label: 'EST. EARNINGS', value: summaryStats?.estMonthly ? '$' + formatNumber(summaryStats.estMonthly) + '/mo' : '---', color: colors.primary },
              { label: 'TOTAL POSTS', value: formatNumber(selectedProfile.posts_count || 0), color: colors.accent },
            ].map((stat) => (
              <View key={stat.label} style={styles.perfStat}>
                <Text style={[styles.perfStatLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                <Text style={[styles.perfStatValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Platform Split */}
      {platformSplit.length > 1 && (
        <>
          <SectionTitle>Platform Split</SectionTitle>
          <Card>
            {platformSplit.map((item, i) => {
              const brandColor = PlatformColors[item.platform] || colors.accent;
              return (
                <View key={item.platform} style={[styles.platformRow, i < platformSplit.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={styles.platformLeft}>
                    <PlatformIcon platform={item.platform} size={20} />
                    <Text style={[styles.platformName, { color: colors.text }]}>
                      {PlatformLabels[item.platform] || item.platform}
                    </Text>
                  </View>
                  <Text style={[styles.platformPct, { color: brandColor }]}>{item.pct}%</Text>
                  <View style={[styles.platformTrack, { backgroundColor: colors.surfaceLight }]}>
                    <View style={[styles.platformFill, { width: `${item.pct}%`, backgroundColor: brandColor }]} />
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {/* Heatmap */}
      {heatmap && (
        <>
          <SectionTitle>Follower Activity</SectionTitle>
          <ActivityHeatmap heatmap={heatmap} />
        </>
      )}

      {/* Charts Row */}
      {engagementData.length > 1 && (
        <SimpleLineChart
          data={engagementData}
          labels={engagementLabels.length > 4
            ? [engagementLabels[0], engagementLabels[Math.floor(engagementLabels.length / 2)], engagementLabels[engagementLabels.length - 1]]
            : engagementLabels}
          title="Engagement Trend"
        />
      )}
      {followerData.length > 1 && followerData.some((v: number) => v > 0) && (
        <SimpleLineChart
          data={followerData}
          labels={engagementLabels.length > 4
            ? [engagementLabels[0], engagementLabels[Math.floor(engagementLabels.length / 2)], engagementLabels[engagementLabels.length - 1]]
            : engagementLabels}
          title="Follower Growth"
        />
      )}

      {/* Social Health + SMO Side by Side */}
      {(qualityScore > 0 || smoScore > 0) && (
        <View style={styles.scoresRow}>
          {qualityScore > 0 && (
            <View style={[styles.scoreCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.scoreCardTitle, { color: colors.textSecondary }]}>Social Health</Text>
              <ScoreRing score={Math.round(qualityScore)} label="Health" size={80} strokeWidth={7} />
              {qualityFactors.length > 0 && (
                <View style={styles.factorsCompact}>
                  {qualityFactors.slice(0, 3).map((f: any, i: number) => {
                    const pct = f.score ?? f.percentage ?? 0;
                    return (
                      <View key={i} style={styles.factorRow}>
                        <View style={[styles.factorDot, { backgroundColor: scoreColor(pct) }]} />
                        <Text style={[styles.factorName, { color: colors.textSecondary }]} numberOfLines={1}>{f.name || f.factor || ''}</Text>
                        <Text style={[styles.factorVal, { color: scoreColor(pct) }]}>{Math.round(pct)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          {smoScore > 0 && (
            <View style={[styles.scoreCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.scoreCardTitle, { color: colors.textSecondary }]}>SMO Score</Text>
              <View style={styles.smoCenter}>
                <Text style={[styles.smoValue, { color: colors.primary }]}>{Math.round(smoScore)}</Text>
                <Text style={[styles.smoMax, { color: colors.textMuted }]}>/100</Text>
              </View>
              {smoFactors.length > 0 && (
                <View style={styles.factorsCompact}>
                  {smoFactors.slice(0, 3).map((f: any, i: number) => {
                    const pct = f.maxScore ? Math.round((f.score / f.maxScore) * 100) : f.score;
                    return (
                      <View key={i} style={styles.factorRow}>
                        <View style={[styles.factorDot, { backgroundColor: scoreColor(pct) }]} />
                        <Text style={[styles.factorName, { color: colors.textSecondary }]} numberOfLines={1}>{f.factor || f.name || ''}</Text>
                        <Text style={[styles.factorVal, { color: scoreColor(pct) }]}>{pct}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Expanded Score Factors */}
      {qualityFactors.length > 3 && (
        <Card>
          <Text style={[styles.factorsSectionTitle, { color: colors.text }]}>Health Factors</Text>
          {qualityFactors.map((f: any, i: number) => {
            const pct = f.score ?? f.percentage ?? 0;
            return (
              <HorizontalBar key={i} label={f.name || f.factor || `Factor ${i + 1}`} value={Math.round(pct)} maxValue={100} color={scoreColor(pct)} />
            );
          })}
        </Card>
      )}
      {smoFactors.length > 3 && (
        <Card>
          <Text style={[styles.factorsSectionTitle, { color: colors.text }]}>SMO Factors</Text>
          {smoFactors.map((f: any, i: number) => {
            const pct = f.maxScore ? Math.round((f.score / f.maxScore) * 100) : f.score;
            return (
              <HorizontalBar key={i} label={f.factor || f.name || `Factor ${i + 1}`} value={pct} maxValue={100} color={scoreColor(pct)} />
            );
          })}
        </Card>
      )}

      {/* Competitor Watch */}
      {competitors.length > 0 && (
        <>
          <SectionTitle>Competitor Watch</SectionTitle>
          <Card>
            {competitors.slice(0, 5).map((c: any, i: number) => (
              <View key={c.id} style={[styles.competitorRow, i < competitors.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Text style={[styles.rankText, { color: i === 0 ? colors.primary : colors.textSecondary }]}>{i + 1}</Text>
                <View style={styles.competitorInfo}>
                  <Text style={[styles.competitorHandle, { color: colors.text }]} numberOfLines={1}>@{c.handle || c.username}</Text>
                  {c.platform && <PlatformIcon platform={c.platform} size={12} showBackground={false} />}
                </View>
                <Text style={[styles.competitorFollowers, { color: colors.textSecondary }]}>{formatNumber(c.followers_count || 0)}</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Revenue by Source */}
      {revenueSources.length > 0 && (
        <>
          <SectionTitle>Revenue by Source</SectionTitle>
          <Card>
            {revenueSources.map((src: any, i: number) => (
              <View key={i} style={styles.revenueRow}>
                <View style={styles.revenueHeader}>
                  <Text style={[styles.revenueSource, { color: colors.text }]}>{src.source}</Text>
                  <Text style={[styles.revenueAmount, { color: colors.success }]}>${formatNumber(src.monthlyAmount || 0)}/mo</Text>
                </View>
                <View style={[styles.revenueTrack, { backgroundColor: colors.surfaceLight }]}>
                  <View style={[styles.revenueFill, { width: `${Math.min(src.percentage || 0, 100)}%`, backgroundColor: '#4ADE80', opacity: 1 - i * 0.12 }]} />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Audience Demographics */}
      {(Object.keys(genderDistribution).length > 0 || ageDistribution.length > 0) && (
        <>
          <SectionTitle>Audience Demographics</SectionTitle>
          <Card>
            {Object.keys(genderDistribution).length > 0 && (
              <View style={styles.genderSection}>
                <Text style={[styles.demoLabel, { color: colors.textSecondary }]}>Gender</Text>
                <View style={[styles.genderBar, { backgroundColor: colors.surfaceLight }]}>
                  {Object.entries(genderDistribution).map(([gender, pct]: [string, any]) => {
                    const gColor = gender.toLowerCase() === 'female' ? '#EF4444' : gender.toLowerCase() === 'male' ? '#5B9CF5' : colors.textMuted;
                    return <View key={gender} style={{ width: `${pct}%`, backgroundColor: gColor, height: 10, borderRadius: 5 }} />;
                  })}
                </View>
                <View style={styles.genderLegend}>
                  {Object.entries(genderDistribution).map(([gender, pct]: [string, any]) => (
                    <View key={gender} style={styles.genderLegendItem}>
                      <View style={[styles.legendDot, { backgroundColor: gender.toLowerCase() === 'female' ? '#EF4444' : gender.toLowerCase() === 'male' ? '#5B9CF5' : colors.textMuted }]} />
                      <Text style={[styles.genderLegendText, { color: colors.textSecondary }]}>{gender} {pct}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {ageDistribution.length > 0 && (
              <View style={styles.ageSection}>
                <Text style={[styles.demoLabel, { color: colors.textSecondary }]}>Age Distribution</Text>
                {ageDistribution.map((age: any, i: number) => {
                  const maxPct = Math.max(...ageDistribution.map((a: any) => a.percentage || 0));
                  const isTop = (age.percentage || 0) === maxPct;
                  return <HorizontalBar key={i} label={age.range || age.age_range || `${i}`} value={Math.round(age.percentage || 0)} maxValue={100} color={colors.primary} />;
                })}
              </View>
            )}
          </Card>
        </>
      )}

      {/* Top Hashtags */}
      {topHashtags.length > 0 && (
        <>
          <SectionTitle>Top Hashtags</SectionTitle>
          <Card>
            <View style={styles.hashtagWrap}>
              {topHashtags.map((h: any, i: number) => (
                <Pill key={i} label={`#${h.tag || h}`} />
              ))}
            </View>
          </Card>
        </>
      )}

      {/* Earnings Projection */}
      {summaryStats && (
        <>
          <SectionTitle>Earnings Projection</SectionTitle>
          <View style={styles.earningsGrid}>
            {[
              { label: 'EST. MONTHLY', value: '$' + formatNumber(summaryStats.estMonthly || 0), color: colors.primary },
              { label: 'EST. ANNUAL', value: '$' + formatNumber(summaryStats.estAnnual || (summaryStats.estMonthly || 0) * 12), color: colors.accent },
              { label: 'TOP SOURCE', value: summaryStats.topRevenueSource || '---', color: colors.success },
              { label: 'PROFILES', value: String(profiles.length), color: colors.textSecondary },
            ].map((stat) => (
              <View key={stat.label} style={[styles.earningsStat, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.earningsLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                <Text style={[styles.earningsValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Empty state */}
      {profiles.length === 0 && !loading && (
        <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.emptyIcon, { color: colors.primary }]}>--</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Profiles Connected</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Connect your social accounts on the web dashboard to see your analytics here.
          </Text>
        </View>
      )}

      {/* Run All Modal */}
      {selectedProfile && (
        <RunAllModal
          visible={showRunAllModal}
          onClose={() => setShowRunAllModal(false)}
          onComplete={() => loadData()}
          profileId={selectedProfile.id}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  themeToggle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: FontSize.sm, fontWeight: '500' },
  name: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  runAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  runAllIcon: { fontSize: 10, color: '#1A1035' },
  runAllText: { fontSize: FontSize.sm, fontWeight: '700', color: '#1A1035', letterSpacing: 0.5, textTransform: 'uppercase' },

  // KPIs
  kpiGrid: { gap: Spacing.sm },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm },

  // Profile Card
  profileCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  profileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  perfHeader: { marginBottom: Spacing.md },
  perfAvatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  perfInfo: { flex: 1 },
  perfHandle: { fontSize: FontSize.lg, fontWeight: '800' },
  perfPlatform: { fontSize: FontSize.sm },
  perfStats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  perfStat: { width: '47%', gap: 2 },
  perfStatLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  perfStatValue: { fontSize: FontSize.xl, fontWeight: '800' },

  // Scores Row
  scoresRow: { flexDirection: 'row', gap: Spacing.sm },
  scoreCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  scoreCardTitle: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm },
  smoCenter: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  smoValue: { fontSize: 36, fontWeight: '800' },
  smoMax: { fontSize: FontSize.sm, fontWeight: '500' },
  factorsCompact: { width: '100%', gap: 4 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factorDot: { width: 6, height: 6, borderRadius: 3 },
  factorName: { flex: 1, fontSize: 10, fontWeight: '500' },
  factorVal: { fontSize: 10, fontWeight: '700' },
  factorsSectionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },

  // Competitors
  competitorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  rankText: { fontSize: FontSize.md, fontWeight: '800', width: 24 },
  competitorInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  competitorHandle: { fontSize: FontSize.sm, fontWeight: '600' },
  competitorFollowers: { fontSize: FontSize.sm, fontWeight: '700' },

  // Platform Split
  platformRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  platformLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, width: 120 },
  platformName: { fontSize: FontSize.sm, fontWeight: '600' },
  platformPct: { fontSize: FontSize.sm, fontWeight: '800', width: 40, textAlign: 'right' },
  platformTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  platformFill: { height: '100%', borderRadius: 3 },

  // Revenue
  revenueRow: { marginBottom: Spacing.md },
  revenueHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  revenueSource: { fontSize: FontSize.sm, fontWeight: '500' },
  revenueAmount: { fontSize: FontSize.sm, fontWeight: '700' },
  revenueTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  revenueFill: { height: '100%', borderRadius: 3 },

  // Demographics
  genderSection: { marginBottom: Spacing.lg },
  demoLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.sm },
  genderBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  genderLegend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  genderLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  genderLegendText: { fontSize: FontSize.xs, fontWeight: '500' },
  ageSection: { marginTop: Spacing.sm },

  // Hashtags
  hashtagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  // Earnings
  earningsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  earningsStat: { width: '47%', borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md },
  earningsLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: Spacing.xs },
  earningsValue: { fontSize: FontSize.xl, fontWeight: '800' },

  // Empty
  emptyCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xxxl, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});
