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
import { getTrustScore, getTrustScoreHistory } from '../../lib/dal';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { HorizontalBar } from '../../components/ui/HorizontalBar';
import { SimpleLineChart } from '../../components/ui/SimpleLineChart';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { trackEvent } from '../../lib/track';

const FACTOR_LABELS: Record<string, string> = {
  delivery_score: 'Delivery',
  communication_score: 'Communication',
  content_quality_score: 'Content Quality',
  professionalism_score: 'Professionalism',
  response_time_score: 'Response Time',
};

const FACTOR_KEYS = [
  'delivery_score',
  'communication_score',
  'content_quality_score',
  'professionalism_score',
  'response_time_score',
];

export default function TrustScoreScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trustData, setTrustData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'trust-score'); }, []);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;

    const [score, historyData] = await Promise.all([
      getTrustScore(profile.id),
      getTrustScoreHistory(profile.id),
    ]);

    setTrustData(score);
    setHistory(historyData ?? []);
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [loadData, profile?.id]);

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

  if (!trustData) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No trust score data available yet. Complete deals and collaborate with brands to build your trust score.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  const overallScore = trustData.overall_score ?? 0;

  // Prepare history chart data (reverse so oldest is first)
  const historyScores = [...history].reverse().map((h: any) => h.overall_score ?? 0);
  const historyLabels = [...history].reverse().map((h: any) => {
    const d = new Date(h.recorded_at);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Overall Score Ring */}
      <View style={styles.ringContainer}>
        <ScoreRing score={overallScore} size={160} strokeWidth={14} label="Trust Score" />
      </View>

      {/* Factor Breakdown */}
      <SectionTitle>Score Breakdown</SectionTitle>
      <Card>
        {FACTOR_KEYS.map((key) => {
          const value = trustData[key] ?? 0;
          return (
            <HorizontalBar
              key={key}
              label={FACTOR_LABELS[key] || key}
              value={value}
              maxValue={100}
              color={colors.primary}
            />
          );
        })}
      </Card>

      {/* Score Details */}
      <SectionTitle>Details</SectionTitle>
      <Card>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Reviews</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {trustData.total_reviews ?? 0}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Completed Deals</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {trustData.completed_deals ?? 0}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Last Updated</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {trustData.updated_at
              ? new Date(trustData.updated_at).toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>
      </Card>

      {/* Trust Score History Chart */}
      {historyScores.length >= 2 && (
        <>
          <SectionTitle>Score History</SectionTitle>
          <SimpleLineChart
            data={historyScores}
            labels={historyLabels.length > 5
              ? [historyLabels[0], historyLabels[Math.floor(historyLabels.length / 2)], historyLabels[historyLabels.length - 1]]
              : historyLabels}
            title="Trust Score Over Time"
            height={160}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  ringContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 156, 211, 0.08)',
  },
  detailLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
