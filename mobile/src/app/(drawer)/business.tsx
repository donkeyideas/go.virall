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

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString();
}

export default function BusinessScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'business'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    // Load deals and revenue data from the deals table
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    setDeals(data ?? []);
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

  // Compute summary stats
  const totalDeals = deals.length;
  const activeDeals = deals.filter(d => d.status === 'active' || d.status === 'in_progress').length;
  const completedDeals = deals.filter(d => d.status === 'completed').length;
  const totalRevenue = deals
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + (d.deal_value || d.total_value || 0), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SectionTitle>Business Overview</SectionTitle>

      {deals.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No business data yet. Start by creating deals in the Deals section.
          </Text>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalDeals}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Deals</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{activeDeals}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Deals</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.success }]}>{completedDeals}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatCurrency(totalRevenue)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
            </Card>
          </View>

          {/* Recent Deals */}
          <SectionTitle>Recent Deals</SectionTitle>
          {deals.slice(0, 10).map((deal: any) => (
            <Card key={deal.id}>
              <View style={styles.dealRow}>
                <Text style={[styles.dealName, { color: colors.text }]} numberOfLines={1}>
                  {deal.brand_name || 'Untitled Deal'}
                </Text>
                <View style={[styles.statusBadge, {
                  backgroundColor: deal.status === 'completed'
                    ? colors.success + '20'
                    : deal.status === 'active' || deal.status === 'in_progress'
                      ? colors.primary + '20'
                      : colors.textMuted + '20',
                }]}>
                  <Text style={[styles.statusText, {
                    color: deal.status === 'completed'
                      ? colors.success
                      : deal.status === 'active' || deal.status === 'in_progress'
                        ? colors.primary
                        : colors.textMuted,
                  }]}>
                    {(deal.status || 'pending').charAt(0).toUpperCase() + (deal.status || 'pending').slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.dealRow}>
                <Text style={[styles.dealValue, { color: colors.primary }]}>
                  {formatCurrency(deal.deal_value || deal.total_value || 0)}
                </Text>
                <Text style={[styles.dealDate, { color: colors.textMuted }]}>
                  {new Date(deal.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { width: '47%', alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.xl, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  dealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dealName: { fontSize: FontSize.md, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
  dealValue: { fontSize: FontSize.md, fontWeight: '700' },
  dealDate: { fontSize: FontSize.sm },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' },
});
