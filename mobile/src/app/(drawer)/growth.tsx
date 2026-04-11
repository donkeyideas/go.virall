import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { trackEvent } from '../../lib/track';

function parseResult(result: any): any {
  if (!result) return null;
  if (typeof result === 'string') {
    try {
      return JSON.parse(result.replace(/```json\s*/g, '').replace(/```/g, '').trim());
    } catch {
      return null;
    }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try {
      return JSON.parse(result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim());
    } catch {
      return null;
    }
  }
  return result;
}

export default function GrowthScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [growthData, setGrowthData] = useState<any>(null);

  useEffect(() => { trackEvent('page_view', 'growth'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    // Get social profiles for this org
    const { data: profiles } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('organization_id', organization.id);

    if (!profiles || profiles.length === 0) return;

    const profileIds = profiles.map((p: any) => p.id);

    // Fetch latest growth analysis
    const { data } = await supabase
      .from('social_analyses')
      .select('*')
      .in('social_profile_id', profileIds)
      .eq('analysis_type', 'growth')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setGrowthData(parseResult(data[0].result));
    } else {
      setGrowthData(null);
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

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Extract growth fields from parsed data
  const growth = growthData?.growth || growthData || {};
  const growthRate = growth.growthRate ?? growth.growth_rate ?? growth.rate ?? null;
  const followerTrends: any[] = growth.followerTrends ?? growth.follower_trends ?? growth.trends ?? [];
  const bestPeriod = growth.bestPerformingPeriod ?? growth.best_performing_period ?? growth.bestPeriod ?? growth.best_period ?? null;
  const metrics: any[] = growth.keyMetrics ?? growth.key_metrics ?? growth.metrics ?? [];
  const recommendations: any[] = growth.recommendations ?? growth.tips ?? [];

  const hasData = growthData && (growthRate !== null || followerTrends.length > 0 || bestPeriod || metrics.length > 0 || recommendations.length > 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SectionTitle>Growth Analysis</SectionTitle>

      {!hasData ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No growth analysis data. Run an analysis from the Overview.
          </Text>
        </Card>
      ) : (
        <>
          {/* Growth Rate */}
          {growthRate !== null && (
            <>
              <SectionTitle>Growth Rate</SectionTitle>
              <Card>
                <Text style={[growthStyles.bigValue, { color: colors.primary }]}>
                  {typeof growthRate === 'number' ? `${growthRate}%` : String(growthRate)}
                </Text>
                <Text style={[growthStyles.bigLabel, { color: colors.textSecondary }]}>
                  Overall Growth Rate
                </Text>
              </Card>
            </>
          )}

          {/* Best Performing Period */}
          {bestPeriod && (
            <>
              <SectionTitle>Best Performing Period</SectionTitle>
              <Card>
                {typeof bestPeriod === 'string' ? (
                  <Text style={[growthStyles.periodText, { color: colors.text }]}>
                    {bestPeriod}
                  </Text>
                ) : (
                  <>
                    {bestPeriod.period && (
                      <Text style={[growthStyles.periodText, { color: colors.text }]}>
                        {bestPeriod.period}
                      </Text>
                    )}
                    {bestPeriod.description && (
                      <Text style={[growthStyles.periodDesc, { color: colors.textSecondary }]}>
                        {bestPeriod.description}
                      </Text>
                    )}
                  </>
                )}
              </Card>
            </>
          )}

          {/* Key Metrics */}
          {metrics.length > 0 && (
            <>
              <SectionTitle>Key Metrics</SectionTitle>
              {metrics.map((metric: any, i: number) => {
                const label = typeof metric === 'string' ? metric : metric.label || metric.name || metric.title || '';
                const value = typeof metric === 'object' ? metric.value ?? metric.metric ?? '' : '';
                return (
                  <Card key={i}>
                    <View style={growthStyles.metricRow}>
                      <Text style={[growthStyles.metricLabel, { color: colors.text }]}>{label}</Text>
                      {value !== '' && (
                        <Text style={[growthStyles.metricValue, { color: colors.primary }]}>
                          {String(value)}
                        </Text>
                      )}
                    </View>
                  </Card>
                );
              })}
            </>
          )}

          {/* Follower Trends */}
          {followerTrends.length > 0 && (
            <>
              <SectionTitle>Follower Trends</SectionTitle>
              {followerTrends.map((trend: any, i: number) => {
                const text = typeof trend === 'string' ? trend : trend.description || trend.text || trend.title || '';
                return (
                  <Card key={i}>
                    <Text style={[growthStyles.trendText, { color: colors.text }]}>{text}</Text>
                  </Card>
                );
              })}
            </>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <>
              <SectionTitle>Recommendations</SectionTitle>
              {recommendations.map((rec: any, i: number) => {
                const title = typeof rec === 'string' ? '' : rec.title || rec.headline || '';
                const text = typeof rec === 'string' ? rec : rec.text || rec.description || rec.tip || '';
                return (
                  <Card key={i}>
                    {title ? (
                      <Text style={[growthStyles.recTitle, { color: colors.text }]}>{title}</Text>
                    ) : null}
                    <Text style={[growthStyles.recText, { color: colors.textSecondary }]}>{text}</Text>
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});

const growthStyles = StyleSheet.create({
  bigValue: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  bigLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  periodText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  periodDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  metricValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  trendText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  recTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  recText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
