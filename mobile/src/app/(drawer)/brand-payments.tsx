import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getBrandPayments } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

function formatCurrency(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface PaymentStats {
  totalPaid: number;
  outstanding: number;
  avgPayment: number;
}

function computeStats(payments: any[]): PaymentStats {
  const completed = payments.filter(
    (p: any) => p.status === 'completed' || p.status === 'paid',
  );
  const pending = payments.filter(
    (p: any) => p.status === 'pending' || p.status === 'processing',
  );

  const totalPaid = completed.reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0,
  );
  const outstanding = pending.reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0,
  );
  const avgPayment = completed.length > 0 ? totalPaid / completed.length : 0;

  return { totalPaid, outstanding, avgPayment };
}

export default function BrandPaymentsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'brand_payments'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const data = await getBrandPayments(organization.id);
    setPayments(data);
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

  const stats = computeStats(payments);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

  const getCreatorName = (p: any) => {
    return p.payee_name || p.description || 'Creator';
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#059669' }]}>
            {formatCurrency(stats.totalPaid)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Paid</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#D97706' }]}>
            {formatCurrency(stats.outstanding)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Outstanding</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatCurrency(stats.avgPayment)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Payment</Text>
        </Card>
      </View>

      {/* Section header */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History</Text>

      {/* Payment list */}
      {payments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payments</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            No payments yet. Payments will appear here once you start collaborating with creators.
          </Text>
        </View>
      ) : (
        payments.map((p: any) => {
          const netAmount = p.amount - (p.platform_fee || 0);
          return (
            <Card key={p.id}>
              <View style={styles.paymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentAmount, { color: colors.text }]}>
                    {formatCurrency(p.amount || 0)}
                  </Text>
                  <Text style={[styles.paymentCreator, { color: colors.textSecondary }]} numberOfLines={1}>
                    {getCreatorName(p)}
                  </Text>
                  {p.deal_id && (
                    <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                      Deal Payment
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <StatusBadge status={p.status} />
                  <Text style={[styles.paymentDate, { color: colors.textMuted }]}>
                    {p.paid_at ? formatDate(p.paid_at) : formatDate(p.created_at)}
                  </Text>
                </View>
              </View>
              {(p.platform_fee || 0) > 0 && (
                <View style={styles.feeRow}>
                  <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                    Platform Fee: {formatCurrency(p.platform_fee)}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                    Net: {formatCurrency(netAmount)}
                  </Text>
                </View>
              )}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.lg },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  paymentAmount: { fontSize: FontSize.md, fontWeight: '700' },
  paymentCreator: { fontSize: FontSize.sm, marginTop: 2 },
  paymentDate: { fontSize: FontSize.xs, marginTop: 4 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs, paddingTop: Spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)' },
});
