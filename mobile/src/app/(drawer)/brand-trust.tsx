import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getTrustScore, getTrustScoreHistory } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { trackEvent } from '../../lib/track';

// ── helpers ──────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Needs Improvement';
  return 'Poor';
}

const FACTOR_LABELS: Record<string, string> = {
  payment_history: 'Payment History',
  communication: 'Communication',
  deliverable_quality: 'Deliverable Quality',
  response_time: 'Response Time',
  contract_adherence: 'Contract Adherence',
  dispute_history: 'Dispute History',
  verification_level: 'Verification Level',
  account_age: 'Account Age',
  review_rating: 'Review Rating',
  completion_rate: 'Completion Rate',
};

const FACTOR_ICONS: Record<string, string> = {
  payment_history: '$',
  communication: 'C',
  deliverable_quality: 'Q',
  response_time: 'R',
  contract_adherence: 'A',
  dispute_history: 'D',
  verification_level: 'V',
  account_age: 'T',
  review_rating: 'R',
  completion_rate: '%',
};

// ── component ────────────────────────────────────────────────────────

export default function BrandTrustScreen() {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [trustScore, setTrustScore] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'brand_trust'); }, []);

  const profileId = user?.id ?? profile?.id ?? null;

  const loadData = useCallback(async () => {
    if (!profileId) return;
    const [score, hist] = await Promise.all([
      getTrustScore(profileId),
      getTrustScoreHistory(profileId),
    ]);
    setTrustScore(score);
    setHistory(hist.slice(0, 10));
  }, [profileId]);

  useEffect(() => {
    if (profileId) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadData, profileId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── derived data ─────────────────────────────────────────────────

  const overallScore: number = trustScore?.overall_score ?? trustScore?.score ?? 0;
  const scoreColor = getScoreColor(overallScore);
  const scoreLabel = getScoreLabel(overallScore);

  // Extract factor scores from trust score data
  const factors: Array<{ key: string; label: string; score: number; icon: string }> = (() => {
    if (!trustScore) return [];
    const factorData = trustScore.factors ?? trustScore.breakdown ?? trustScore.score_factors ?? {};
    if (typeof factorData !== 'object' || factorData === null) return [];
    return Object.entries(factorData)
      .filter(([, val]) => typeof val === 'number')
      .map(([key, val]) => ({
        key,
        label: FACTOR_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        score: val as number,
        icon: FACTOR_ICONS[key] || key.charAt(0).toUpperCase(),
      }))
      .sort((a, b) => b.score - a.score);
  })();

  // ── loading / empty states ───────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!trustScore && history.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.emptyContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>Trust Score</Text>
        <Card style={styles.emptyCard}>
          <View style={[styles.emptyCircle, { borderColor: colors.surfaceLight }]}>
            <Text style={[styles.emptyCircleText, { color: colors.textMuted }]}>--</Text>
          </View>
          <Text style={[styles.emptyHeading, { color: colors.text }]}>No Trust Score Yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Your trust score will be calculated once you have completed deals, payments, and interactions on the platform.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  // ── render ───────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Trust Score</Text>

      {/* ── Large Score Display ──────────────────────────────── */}
      <Card style={styles.scoreCard}>
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{overallScore}</Text>
          <Text style={[styles.scoreMax, { color: colors.textMuted }]}>/100</Text>
        </View>
        <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
        {trustScore?.updated_at && (
          <Text style={[styles.scoreDate, { color: colors.textMuted }]}>
            Last updated: {new Date(trustScore.updated_at).toLocaleDateString()}
          </Text>
        )}
      </Card>

      {/* ── Score Breakdown Factors ──────────────────────────── */}
      {factors.length > 0 && (
        <>
          <SectionTitle>Score Breakdown</SectionTitle>
          {factors.map((factor) => {
            const factorColor = getScoreColor(factor.score);
            const pct = Math.min(factor.score, 100);
            return (
              <Card key={factor.key} style={styles.factorCard}>
                <View style={styles.factorHeader}>
                  <View style={[styles.factorIconCircle, { backgroundColor: factorColor + '20' }]}>
                    <Text style={[styles.factorIcon, { color: factorColor }]}>{factor.icon}</Text>
                  </View>
                  <Text style={[styles.factorLabel, { color: colors.text }]}>{factor.label}</Text>
                  <Text style={[styles.factorScore, { color: factorColor }]}>
                    {factor.score}
                  </Text>
                </View>
                <View style={[styles.factorBarTrack, { backgroundColor: colors.surfaceLight }]}>
                  <View
                    style={[
                      styles.factorBarFill,
                      { width: `${pct}%`, backgroundColor: factorColor },
                    ]}
                  />
                </View>
              </Card>
            );
          })}
        </>
      )}

      {/* ── Score History ────────────────────────────────────── */}
      {history.length > 0 && (
        <>
          <SectionTitle>Score History</SectionTitle>
          <Card>
            {history.map((entry, i) => {
              const entryScore = entry.overall_score ?? entry.score ?? 0;
              const entryColor = getScoreColor(entryScore);
              const prevScore = i < history.length - 1
                ? (history[i + 1].overall_score ?? history[i + 1].score ?? 0)
                : entryScore;
              const diff = entryScore - prevScore;
              const dateStr = entry.recorded_at
                ? new Date(entry.recorded_at).toLocaleDateString()
                : entry.created_at
                  ? new Date(entry.created_at).toLocaleDateString()
                  : 'N/A';

              return (
                <View
                  key={entry.id || i}
                  style={[
                    styles.historyRow,
                    i < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                    {dateStr}
                  </Text>
                  <View style={styles.historyScoreGroup}>
                    <Text style={[styles.historyScore, { color: entryColor }]}>{entryScore}</Text>
                    {i < history.length - 1 && diff !== 0 && (
                      <Text
                        style={[
                          styles.historyChange,
                          { color: diff > 0 ? '#22C55E' : '#EF4444' },
                        ]}
                      >
                        {diff > 0 ? '+' : ''}{diff}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {/* ── Score Explanation ─────────────────────────────────── */}
      <SectionTitle>How Trust Scores Work</SectionTitle>
      <Card>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Your trust score (0-100) reflects your reliability and reputation on the platform. It is calculated from factors like payment history, communication quality, deliverable standards, and contract adherence.
        </Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <View style={[styles.infoDot, { backgroundColor: '#22C55E' }]} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>80+: Excellent standing</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.infoDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>60-79: Good standing</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.infoDot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Below 60: Needs improvement</Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  emptyContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.sm },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyCircleText: { fontSize: 36, fontWeight: '800' },
  emptyHeading: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.sm },
  emptySubtext: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.lg },

  // Score display
  scoreCard: { alignItems: 'center', paddingVertical: Spacing.xxl },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  scoreNumber: { fontSize: 48, fontWeight: '800' },
  scoreMax: { fontSize: FontSize.sm, marginTop: -4 },
  scoreLabel: { fontSize: FontSize.lg, fontWeight: '700' },
  scoreDate: { fontSize: FontSize.xs, marginTop: Spacing.xs },

  // Factors
  factorCard: { marginBottom: Spacing.xs },
  factorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  factorIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorIcon: { fontSize: 12, fontWeight: '800' },
  factorLabel: { fontSize: FontSize.sm, fontWeight: '500', flex: 1 },
  factorScore: { fontSize: FontSize.md, fontWeight: '700', fontVariant: ['tabular-nums'] },
  factorBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // History
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  historyDate: { fontSize: FontSize.sm },
  historyScoreGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  historyScore: { fontSize: FontSize.md, fontWeight: '700', fontVariant: ['tabular-nums'] },
  historyChange: { fontSize: FontSize.xs, fontWeight: '600' },

  // Info section
  infoText: { fontSize: FontSize.sm, lineHeight: 22, marginBottom: Spacing.md },
  infoGrid: { gap: Spacing.sm },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoDot: { width: 10, height: 10, borderRadius: 5 },
  infoLabel: { fontSize: FontSize.sm },
});
