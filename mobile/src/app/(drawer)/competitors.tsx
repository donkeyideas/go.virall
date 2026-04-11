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

function formatNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function CompetitorsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [competitors, setCompetitors] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'competitors'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    // Load social profiles for the org
    const { data: profiles } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('organization_id', organization.id);

    if (!profiles || profiles.length === 0) {
      setCompetitors([]);
      return;
    }

    const profileIds = profiles.map((p: any) => p.id);

    // Load competitors from social_competitors table
    const { data } = await supabase
      .from('social_competitors')
      .select('*')
      .in('social_profile_id', profileIds)
      .order('followers_count', { ascending: false });

    setCompetitors(data ?? []);
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SectionTitle>Competitors</SectionTitle>

      {competitors.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No competitor data available. Run an analysis to track competitors.
          </Text>
        </Card>
      ) : (
        competitors.map((comp: any) => (
          <Card key={comp.id}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compName, { color: colors.text }]}>
                  {comp.name || comp.handle || 'Unknown'}
                </Text>
                {comp.handle && comp.name && (
                  <Text style={[styles.compHandle, { color: colors.textMuted }]}>
                    @{comp.handle}
                  </Text>
                )}
              </View>
              {comp.platform && (
                <View style={[styles.platformBadge, { backgroundColor: colors.surfaceLight }]}>
                  <Text style={[styles.platformText, { color: colors.primary }]}>
                    {comp.platform.charAt(0).toUpperCase() + comp.platform.slice(1)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {formatNum(comp.followers_count || 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {comp.engagement_rate != null
                    ? (comp.engagement_rate * 100).toFixed(1) + '%'
                    : 'N/A'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Engagement</Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  compName: { fontSize: FontSize.md, fontWeight: '700' },
  compHandle: { fontSize: FontSize.sm, marginTop: 2 },
  platformBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  platformText: { fontSize: FontSize.xs, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
});
