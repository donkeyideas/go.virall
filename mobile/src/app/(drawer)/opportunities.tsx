import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getBrandMatches } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius, neuShadowSm } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { trackEvent } from '../../lib/track';

export default function OpportunitiesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'opportunities'); }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const data = await getBrandMatches(user.id);
    setMatches(data);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [loadData, user?.id]);

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

  if (matches.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.emptyRoot}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matches Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          AI brand matching will find partnership opportunities for you. Check back soon!
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={[styles.headerText, { color: colors.textSecondary }]}>
        {matches.length} brand{matches.length !== 1 ? 's' : ''} matched to your profile
      </Text>

      {matches.map((match: any) => {
        const brand = match.brand;
        const score = match.match_score || 0;
        const reasons = match.match_reasons ?? [];

        return (
          <Card key={match.id}>
            <View style={styles.matchHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.brandName, { color: colors.text }]}>
                  {brand?.company_name || brand?.full_name || 'Brand'}
                </Text>
                {brand?.industry && (
                  <Text style={[styles.industry, { color: colors.textSecondary }]}>{brand.industry}</Text>
                )}
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? '#D1FAE5' : score >= 60 ? '#FEF3C7' : '#F3F4F6' }]}>
                <Text style={[styles.scoreText, { color: score >= 80 ? '#065F46' : score >= 60 ? '#92400E' : '#6B7280' }]}>
                  {score}%
                </Text>
              </View>
            </View>

            {reasons.length > 0 && (
              <View style={styles.reasonsRow}>
                {reasons.slice(0, 3).map((reason: string, i: number) => (
                  <View key={i} style={[styles.reasonChip, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.reasonText, { color: colors.textSecondary }]}>{reason}</Text>
                  </View>
                ))}
              </View>
            )}

            <Pressable
              onPress={() => router.push('/(drawer)/proposals' as any)}
              style={[styles.connectBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
            >
              <Text style={[styles.connectBtnText, { color: colors.primary }]}>Send Proposal</Text>
            </Pressable>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  headerText: { fontSize: FontSize.sm },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandName: { fontSize: FontSize.lg, fontWeight: '700' },
  industry: { fontSize: FontSize.sm, marginTop: 2 },
  scoreBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  scoreText: { fontSize: FontSize.md, fontWeight: '700' },
  reasonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  reasonChip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  reasonText: { fontSize: FontSize.xs },
  connectBtn: { marginTop: Spacing.md, padding: Spacing.sm, borderRadius: BorderRadius.md, alignItems: 'center' },
  connectBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
