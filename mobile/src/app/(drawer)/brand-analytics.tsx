import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getDeals, getCampaigns, getBrandPayments } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

// ── helpers ──────────────────────────────────────────────────────────

function formatCurrency(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getMonthLabel(date: Date): string {
  return date.toLocaleString('default', { month: 'short', year: '2-digit' });
}

// ── types ────────────────────────────────────────────────────────────

interface DealStatusGroup {
  status: string;
  count: number;
  totalValue: number;
}

interface MonthlySpend {
  label: string;
  amount: number;
}

// ── component ────────────────────────────────────────────────────────

export default function BrandAnalyticsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deals, setDeals] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'brand_analytics'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const [d, c, p] = await Promise.all([
      getDeals(organization.id),
      getCampaigns(organization.id),
      getBrandPayments(organization.id),
    ]);
    setDeals(d);
    setCampaigns(c);
    setPayments(p);
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

  // ── derived data ─────────────────────────────────────────────────

  const totalDeals = deals.length;
  const totalValue = deals.reduce((s, d) => s + (d.total_value || 0), 0);
  const avgDealValue = totalDeals > 0 ? totalValue / totalDeals : 0;
  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'active' || c.status === 'in_progress',
  ).length;

  // Group deals by status
  const statusGroups: DealStatusGroup[] = (() => {
    const map = new Map<string, DealStatusGroup>();
    for (const deal of deals) {
      const status = deal.status || 'unknown';
      const existing = map.get(status);
      if (existing) {
        existing.count += 1;
        existing.totalValue += deal.total_value || 0;
      } else {
        map.set(status, { status, count: 1, totalValue: deal.total_value || 0 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  })();

  // Monthly spending from payments (last 6 months)
  const monthlySpending: MonthlySpend[] = (() => {
    const now = new Date();
    const months: MonthlySpend[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: getMonthLabel(d), amount: 0 });
    }

    for (const payment of payments) {
      const pDate = new Date(payment.created_at);
      for (let i = 0; i < months.length; i++) {
        const refDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        if (
          pDate.getFullYear() === refDate.getFullYear() &&
          pDate.getMonth() === refDate.getMonth()
        ) {
          months[i].amount += payment.amount || payment.net_amount || 0;
          break;
        }
      }
    }

    return months;
  })();

  const maxMonthlySpend = Math.max(...monthlySpending.map((m) => m.amount), 1);

  // ── loading / empty states ───────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!organization) {
    return (
      <View style={[styles.emptyRoot, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Brand Analytics</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Sign in with a brand account to see analytics.
        </Text>
      </View>
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
      <Text style={[styles.pageTitle, { color: colors.text }]}>Brand Analytics</Text>

      {/* ── Stats Row ──────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalDeals}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Deals</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(totalValue)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Value</Text>
        </Card>
      </View>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(avgDealValue)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Deal Value</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{activeCampaigns}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Campaigns</Text>
        </Card>
      </View>

      {/* ── Deal Status Breakdown ─────────────────────────────── */}
      <SectionTitle>Deal Status Breakdown</SectionTitle>
      {statusGroups.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No deals yet. Create your first deal to see analytics.
          </Text>
        </Card>
      ) : (
        statusGroups.map((group) => (
          <Card key={group.status} style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <StatusBadge status={group.status} size="md" />
              <Text style={[styles.statusCount, { color: colors.text }]}>
                {group.count} {group.count === 1 ? 'deal' : 'deals'}
              </Text>
            </View>
            <Text style={[styles.statusValue, { color: colors.primary }]}>
              {formatCurrency(group.totalValue)}
            </Text>
          </Card>
        ))
      )}

      {/* ── Campaign Performance ──────────────────────────────── */}
      <SectionTitle>Campaign Performance</SectionTitle>
      {campaigns.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No campaigns yet.
          </Text>
        </Card>
      ) : (
        campaigns.map((campaign) => (
          <Card key={campaign.id} style={styles.campaignCard}>
            <View style={styles.campaignHeader}>
              <Text style={[styles.campaignName, { color: colors.text }]} numberOfLines={1}>
                {campaign.name || campaign.title || 'Untitled Campaign'}
              </Text>
              <StatusBadge status={campaign.status || 'draft'} />
            </View>
            <View style={styles.campaignMeta}>
              <Text style={[styles.campaignBudget, { color: colors.primary }]}>
                {formatCurrency(campaign.budget || 0)}
              </Text>
              <Text style={[styles.campaignDate, { color: colors.textMuted }]}>
                {campaign.start_date
                  ? new Date(campaign.start_date).toLocaleDateString()
                  : 'No start date'}
                {campaign.end_date
                  ? ` - ${new Date(campaign.end_date).toLocaleDateString()}`
                  : ''}
              </Text>
            </View>
            {campaign.description && (
              <Text
                style={[styles.campaignDesc, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {campaign.description}
              </Text>
            )}
          </Card>
        ))
      )}

      {/* ── Monthly Spending ──────────────────────────────────── */}
      <SectionTitle>Monthly Spending</SectionTitle>
      <Card>
        {monthlySpending.map((month, i) => {
          const pct = maxMonthlySpend > 0 ? (month.amount / maxMonthlySpend) * 100 : 0;
          return (
            <View key={i} style={styles.monthRow}>
              <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>
                {month.label}
              </Text>
              <View style={styles.monthBarContainer}>
                <View style={[styles.monthBarTrack, { backgroundColor: colors.surfaceLight }]}>
                  <View
                    style={[
                      styles.monthBarFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${Math.max(pct, month.amount > 0 ? 3 : 0)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.monthAmount, { color: colors.text }]}>
                {formatCurrency(month.amount)}
              </Text>
            </View>
          );
        })}
        {payments.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: Spacing.sm }]}>
            No payment data yet.
          </Text>
        )}
      </Card>

      {/* ── Payment Summary ───────────────────────────────────── */}
      {payments.length > 0 && (
        <>
          <SectionTitle>Recent Payments</SectionTitle>
          {payments.slice(0, 5).map((payment) => (
            <Card key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentAmount, { color: colors.text }]}>
                    {formatCurrency(payment.amount || payment.net_amount || 0)}
                  </Text>
                  {payment.description && (
                    <Text
                      style={[styles.paymentDesc, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {payment.description}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <StatusBadge status={payment.status || 'pending'} />
                  <Text style={[styles.paymentDate, { color: colors.textMuted }]}>
                    {new Date(payment.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.sm },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },

  // Status Breakdown
  statusCard: { marginBottom: Spacing.xs },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  statusCount: { fontSize: FontSize.sm, fontWeight: '600' },
  statusValue: { fontSize: FontSize.lg, fontWeight: '700' },

  // Campaigns
  campaignCard: { marginBottom: Spacing.xs },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  campaignName: { fontSize: FontSize.md, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
  campaignMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  campaignBudget: { fontSize: FontSize.md, fontWeight: '700' },
  campaignDate: { fontSize: FontSize.xs },
  campaignDesc: { fontSize: FontSize.sm, lineHeight: 20, marginTop: Spacing.xs },

  // Monthly Spending
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  monthLabel: { width: 55, fontSize: FontSize.xs },
  monthBarContainer: { flex: 1 },
  monthBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  monthBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  monthAmount: { width: 65, fontSize: FontSize.xs, textAlign: 'right', fontWeight: '600' },

  // Payments
  paymentCard: { marginBottom: Spacing.xs },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentAmount: { fontSize: FontSize.md, fontWeight: '700' },
  paymentDesc: { fontSize: FontSize.sm, marginTop: 2 },
  paymentDate: { fontSize: FontSize.xs, marginTop: 4 },
});
