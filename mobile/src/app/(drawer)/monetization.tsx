import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { SimpleBarChart } from '../../components/ui/SimpleBarChart';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { formatCurrency } from '../../lib/format';
import { getDeals } from '../../lib/dal';

export default function MonetizeScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const data = await getDeals(organization.id);
    setDeals(data);
  }, [organization?.id]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const activeDeals = deals.filter((d: any) => d.status === 'active');
  const pendingDeals = deals.filter((d: any) => d.status === 'negotiation' || d.status === 'inquiry');
  const totalActive = activeDeals.reduce((s: number, d: any) => s + (d.total_value || 0), 0);
  const totalPending = pendingDeals.reduce((s: number, d: any) => s + (d.total_value || 0), 0);
  const totalLifetime = deals.reduce((s: number, d: any) => s + (d.total_value || 0), 0);

  const kpis = [
    { label: 'Active', value: formatCurrency(totalActive), change: 0 },
    { label: 'Pending', value: formatCurrency(totalPending), change: 0 },
    { label: 'Lifetime', value: formatCurrency(totalLifetime), change: 0 },
  ];

  // Build bar chart data from deals by month
  const monthlyRevenue: Record<string, number> = {};
  for (const d of deals) {
    if (d.status === 'completed' || d.status === 'active') {
      const date = new Date(d.created_at);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (d.total_value || 0);
    }
  }
  const barData = Object.entries(monthlyRevenue).map(([label, value]) => ({ label, value }));

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: colors.success + '20', text: colors.success },
    completed: { bg: colors.accent + '20', text: colors.accent },
    negotiation: { bg: colors.warning + '20', text: colors.warning },
    inquiry: { bg: colors.primary + '20', text: colors.primary },
    cancelled: { bg: colors.error + '20', text: colors.error },
  };

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
      <Text style={[styles.title, { color: colors.text }]}>Monetize</Text>

      <View style={styles.kpiRow}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </View>

      {barData.length > 0 && <SimpleBarChart data={barData} title="Revenue Trend" />}

      <SectionTitle>Deals</SectionTitle>
      {deals.length === 0 && (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No deals yet. Create deals from the web dashboard.
          </Text>
        </Card>
      )}
      {deals.map((deal: any) => {
        const sc = statusColors[deal.status] || statusColors.inquiry;
        return (
          <Card key={deal.id} style={styles.dealCard}>
            <View style={styles.dealHeader}>
              <Text style={[styles.dealBrand, { color: colors.text }]}>{deal.brand_name}</Text>
              <View style={[styles.dealStatus, { backgroundColor: sc.bg }]}>
                <Text style={[styles.dealStatusText, { color: sc.text }]}>
                  {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                </Text>
              </View>
            </View>
            {deal.notes && <Text style={[styles.dealType, { color: colors.textSecondary }]} numberOfLines={1}>{deal.notes}</Text>}
            <View style={styles.dealFooter}>
              <Text style={[styles.dealValue, { color: colors.primary }]}>{formatCurrency(deal.total_value || 0)}</Text>
              <Text style={[styles.dealDue, { color: colors.textMuted }]}>
                {deal.contact_email || ''}
              </Text>
            </View>
          </Card>
        );
      })}
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
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dealCard: {
    marginBottom: Spacing.sm,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  dealBrand: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  dealStatus: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  dealStatusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  dealType: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  dealDue: {
    fontSize: FontSize.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
