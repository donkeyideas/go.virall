import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

const TABS = ['Overview', 'Payments', 'Deals'];

function formatCurrency(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function RevenueScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<any>(null);

  useEffect(() => { trackEvent('page_view', 'revenue'); }, []);

  const loadData = useCallback(async () => {
    const { data: res, error } = await mobileApi<any>('/api/mobile/revenue');
    if (!error && res) setData(res);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

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

  if (!data) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Revenue</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Unable to load revenue data.</Text>
      </View>
    );
  }

  const { stats, sources, monthly, dealRevenue, paymentHistory, forecast } = data;

  const renderStats = () => (
    <View style={styles.statsGrid}>
      <Card style={styles.statCard}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(stats?.totalEarnings || 0)}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Earnings</Text>
      </Card>
      <Card style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#D97706' }]}>{formatCurrency(stats?.pendingPayments || 0)}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
      </Card>
      <Card style={styles.statCard}>
        <Text style={[styles.statValue, { color: '#059669' }]}>{formatCurrency(stats?.thisMonth || 0)}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
        {stats?.thisMonthChange !== 0 && (
          <Text style={{ color: stats.thisMonthChange > 0 ? '#059669' : '#DC2626', fontSize: FontSize.xs }}>
            {stats.thisMonthChange > 0 ? '+' : ''}{stats.thisMonthChange}%
          </Text>
        )}
      </Card>
      <Card style={styles.statCard}>
        <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(stats?.pipelineValue || 0)}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pipeline</Text>
      </Card>
    </View>
  );

  const renderSources = () => (
    <>
      <SectionTitle>Revenue by Source</SectionTitle>
      {(sources ?? []).map((s: any) => (
        <View key={s.source} style={styles.sourceRow}>
          <View style={[styles.sourceDot, { backgroundColor: s.color }]} />
          <Text style={[styles.sourceName, { color: colors.text }]}>{s.source}</Text>
          <Text style={[styles.sourceAmount, { color: colors.text }]}>{formatCurrency(s.amount)}</Text>
          <Text style={[styles.sourceCount, { color: colors.textMuted }]}>{s.count}</Text>
        </View>
      ))}
    </>
  );

  const renderMonthly = () => (
    <>
      <SectionTitle>Monthly Revenue</SectionTitle>
      {(monthly ?? []).slice(-6).map((m: any, i: number) => (
        <View key={i} style={styles.monthRow}>
          <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>{m.month} {m.year}</Text>
          <View style={styles.monthBar}>
            <View style={[styles.monthBarFill, { backgroundColor: colors.primary, width: `${Math.min(100, (m.earnings / (Math.max(...monthly.map((x: any) => x.earnings), 1)) * 100))}%` }]} />
          </View>
          <Text style={[styles.monthAmount, { color: colors.text }]}>{formatCurrency(m.earnings)}</Text>
        </View>
      ))}
    </>
  );

  const renderForecast = () => (
    <>
      <SectionTitle>Revenue Forecast</SectionTitle>
      <Card>
        <View style={styles.forecastRow}>
          <Text style={{ color: colors.textSecondary }}>Projected Total</Text>
          <Text style={[styles.forecastValue, { color: colors.primary }]}>{formatCurrency(forecast?.projectedTotal || 0)}</Text>
        </View>
        <View style={styles.forecastRow}>
          <Text style={{ color: colors.textSecondary }}>Contracted</Text>
          <Text style={{ color: colors.text }}>{formatCurrency(forecast?.contractedRevenue || 0)}</Text>
        </View>
        <View style={styles.forecastRow}>
          <Text style={{ color: colors.textSecondary }}>Pipeline (40%)</Text>
          <Text style={{ color: colors.text }}>{formatCurrency(forecast?.inProgressRevenue || 0)}</Text>
        </View>
        <View style={styles.forecastRow}>
          <Text style={{ color: colors.textSecondary }}>Active Deals</Text>
          <Text style={{ color: colors.text }}>{forecast?.dealCount || 0}</Text>
        </View>
        <View style={styles.forecastRow}>
          <Text style={{ color: colors.textSecondary }}>Avg Deal Value</Text>
          <Text style={{ color: colors.text }}>{formatCurrency(forecast?.avgDealValue || 0)}</Text>
        </View>
      </Card>
    </>
  );

  const renderPayments = () => (
    <>
      <SectionTitle>Payment History</SectionTitle>
      {(paymentHistory ?? []).length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payments yet</Text>
      ) : (
        (paymentHistory ?? []).map((p: any) => (
          <Card key={p.id}>
            <View style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.paymentAmount, { color: colors.text }]}>{formatCurrency(p.netAmount)}</Text>
                {p.brandName && <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>{p.brandName}</Text>}
                {p.description && <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }} numberOfLines={1}>{p.description}</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <StatusBadge status={p.status} />
                <Text style={[styles.paymentDate, { color: colors.textMuted }]}>
                  {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            {p.platformFee > 0 && (
              <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                Fee: {formatCurrency(p.platformFee)}
              </Text>
            )}
          </Card>
        ))
      )}
    </>
  );

  const renderDeals = () => (
    <>
      <SectionTitle>Deal Revenue</SectionTitle>
      {(dealRevenue ?? []).length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No deals yet</Text>
      ) : (
        (dealRevenue ?? []).map((d: any) => (
          <Card key={d.id}>
            <View style={styles.dealRow}>
              <Text style={[styles.dealName, { color: colors.text }]}>{d.brandName || 'Deal'}</Text>
              <StatusBadge status={d.status} />
            </View>
            <View style={styles.dealRow}>
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>
                {formatCurrency(d.paidAmount)} / {formatCurrency(d.totalValue)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                {new Date(d.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {/* Progress bar */}
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceLight }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(100, d.totalValue > 0 ? (d.paidAmount / d.totalValue) * 100 : 0)}%` }]} />
            </View>
          </Card>
        ))
      )}
    </>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {renderStats()}

      <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />

      {activeTab === 0 && (
        <>
          {renderSources()}
          {renderMonthly()}
          {renderForecast()}
        </>
      )}
      {activeTab === 1 && renderPayments()}
      {activeTab === 2 && renderDeals()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  emptyText: { textAlign: 'center', fontSize: FontSize.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { width: '47%', alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  sourceDot: { width: 10, height: 10, borderRadius: 5 },
  sourceName: { flex: 1, fontSize: FontSize.sm },
  sourceAmount: { fontSize: FontSize.sm, fontWeight: '700' },
  sourceCount: { fontSize: FontSize.xs, width: 30, textAlign: 'right' },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  monthLabel: { width: 65, fontSize: FontSize.xs },
  monthBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  monthBarFill: { height: '100%', borderRadius: 4 },
  monthAmount: { width: 60, fontSize: FontSize.xs, textAlign: 'right', fontWeight: '600' },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  forecastValue: { fontSize: FontSize.lg, fontWeight: '700' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  paymentAmount: { fontSize: FontSize.md, fontWeight: '700' },
  paymentDate: { fontSize: FontSize.xs, marginTop: 4 },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  dealName: { fontSize: FontSize.md, fontWeight: '600' },
  progressBar: { height: 4, borderRadius: 2, marginTop: Spacing.xs },
  progressFill: { height: '100%', borderRadius: 2 },
});
