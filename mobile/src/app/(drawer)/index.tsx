import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { SimpleLineChart } from '../../components/ui/SimpleLineChart';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { HorizontalBar } from '../../components/ui/HorizontalBar';
import { PlatformColors, PlatformLabels, type PlatformName } from '../../constants/platforms';
import { FontSize, Spacing } from '../../constants/theme';
import { formatNumber } from '../../lib/format';
import { supabase } from '../../lib/supabase';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Safely parse a JSONB result that might be a string or object */
function parseResult(result: any): any {
  if (!result) return null;
  if (typeof result === 'string') {
    try {
      const clean = result.replace(/```json\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try {
      const clean = result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch { return null; }
  }
  return result;
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { profile, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    // Fetch social profiles for this org
    const { data: profs } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    const profileList = profs ?? [];
    setProfiles(profileList);

    if (profileList.length > 0) {
      const firstId = profileList[0].id;

      // Fetch metrics and all analyses for the first profile
      const [metricsRes, analysesRes] = await Promise.all([
        supabase
          .from('social_metrics')
          .select('*')
          .eq('social_profile_id', firstId)
          .order('date', { ascending: true })
          .limit(12),
        supabase
          .from('social_analyses')
          .select('*')
          .eq('social_profile_id', firstId)
          .order('created_at', { ascending: false }),
      ]);

      setMetrics(metricsRes.data ?? []);
      setAnalyses(analysesRes.data ?? []);
    }
  }, [organization?.id]);

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

  // Aggregate KPIs from social profiles
  const totalFollowers = profiles.reduce((sum: number, p: any) => sum + (p.followers_count || 0), 0);
  const avgEngagement = profiles.length > 0
    ? profiles.reduce((sum: number, p: any) => sum + (p.engagement_rate || 0), 0) / profiles.length
    : 0;
  const totalPosts = profiles.reduce((sum: number, p: any) => sum + (p.posts_count || 0), 0);

  const kpis = [
    { label: 'Followers', value: formatNumber(totalFollowers), change: 0 },
    { label: 'Engagement', value: avgEngagement.toFixed(1) + '%', change: 0 },
    { label: 'Posts', value: formatNumber(totalPosts), change: 0 },
    { label: 'Platforms', value: profiles.length.toString(), change: 0 },
  ];

  const engagementData = metrics.map((m: any) => m.engagement_rate ?? m.avg_likes ?? 0);
  const engagementLabels = metrics.map((m: any) => {
    const d = new Date(m.date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  // Extract AI insights from analysis results
  const parsedInsights: { id: string; title: string; description: string }[] = [];
  for (const a of analyses) {
    if (parsedInsights.length >= 3) break;
    const data = parseResult(a.result);
    if (!data) continue;

    // Handle different analysis result structures
    const items = data.insights || data.tips || data.recommendations || [];
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items.slice(0, 3 - parsedInsights.length)) {
        parsedInsights.push({
          id: a.id + '-' + parsedInsights.length,
          title: item.title || item.headline || item.factor || 'Insight',
          description: item.insight || item.description || item.recommendation || item.summary || '',
        });
      }
    }
  }

  // Extract health score from smo_score analysis
  let overallScore = 0;
  let smoGrade = '';
  const smoAnalysis = analyses.find((a: any) => a.analysis_type === 'smo_score');
  if (smoAnalysis) {
    const data = parseResult(smoAnalysis.result);
    if (data) {
      const smo = data.smo || data;
      smoGrade = smo.grade || '';
      if (smo.factors && Array.isArray(smo.factors)) {
        const totalWeight = smo.factors.reduce((s: number, f: any) => s + (f.weight || 1), 0);
        const weightedSum = smo.factors.reduce((s: number, f: any) => s + (f.score || 0) * (f.weight || 1), 0);
        overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
      } else if (smo.overall_score) {
        overallScore = Math.round(smo.overall_score);
      }
    }
  }

  // Platform bars from followers ratio
  const maxFollowers = Math.max(...profiles.map((p: any) => p.followers_count || 0), 1);
  const platformBars = profiles.map((p: any) => ({
    platform: p.platform as PlatformName,
    label: PlatformLabels[p.platform as PlatformName] || p.platform,
    score: p.engagement_rate
      ? Math.round(p.engagement_rate * 100)
      : Math.round(((p.followers_count || 0) / maxFollowers) * 100),
  }));

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
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
        <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name || 'Creator'}</Text>
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <KpiCard {...kpis[0]} />
          <KpiCard {...kpis[1]} />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard {...kpis[2]} />
          <KpiCard {...kpis[3]} />
        </View>
      </View>

      {engagementData.length > 1 && (
        <SimpleLineChart
          data={engagementData}
          labels={engagementLabels.length > 4
            ? [engagementLabels[0], engagementLabels[Math.floor(engagementLabels.length / 2)], engagementLabels[engagementLabels.length - 1]]
            : engagementLabels
          }
          title="Engagement Trend"
        />
      )}

      {parsedInsights.length > 0 && (
        <>
          <SectionTitle>AI Insights</SectionTitle>
          {parsedInsights.map((insight) => (
            <Card key={insight.id} style={styles.insightCard}>
              <Text style={[styles.insightTitle, { color: colors.primary }]}>{insight.title}</Text>
              <Text style={[styles.insightDesc, { color: colors.textSecondary }]} numberOfLines={3}>{insight.description}</Text>
            </Card>
          ))}
        </>
      )}

      {(overallScore > 0 || platformBars.length > 0) && (
        <>
          <SectionTitle>Health Score</SectionTitle>
          <Card style={styles.healthCard}>
            <View style={styles.healthRow}>
              <ScoreRing score={overallScore} label={smoGrade || 'Overall'} />
              <View style={styles.platformBars}>
                {platformBars.map((p) => (
                  <HorizontalBar
                    key={p.platform}
                    label={p.label}
                    value={p.score}
                    maxValue={100}
                    color={PlatformColors[p.platform] || '#7C6BFF'}
                  />
                ))}
              </View>
            </View>
          </Card>
        </>
      )}

      {profiles.length === 0 && !loading && (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Connect your social accounts on the web dashboard to see your analytics here.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.md,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  kpiGrid: {
    gap: Spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  insightCard: {
    marginBottom: Spacing.sm,
  },
  insightTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  insightDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  healthCard: {
    marginBottom: Spacing.lg,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  platformBars: {
    flex: 1,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
