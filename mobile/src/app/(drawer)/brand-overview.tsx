import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getDeals, getCampaigns, getBrandProposals, getBrandPayments } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BrandOverviewScreen() {
  const { colors } = useTheme();
  const { user, organization } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'brand_overview'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id || !user?.id) return;
    const [dealsData, campaignsData, proposalsData, paymentsData] = await Promise.all([
      getDeals(organization.id),
      getCampaigns(organization.id),
      getBrandProposals(user.id),
      getBrandPayments(organization.id),
    ]);
    setDeals(dealsData);
    setCampaigns(campaignsData);
    setProposals(proposalsData);
    setPayments(paymentsData);
  }, [organization?.id, user?.id]);

  useEffect(() => {
    if (organization?.id && user?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [loadData, organization?.id, user?.id]);

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

  // Computed stats
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const pendingProposals = proposals.filter(p => p.status === 'pending').length;
  const activeDeals = deals.filter(d =>
    ['active', 'in_progress', 'contracted'].includes(d.status || d.pipeline_stage),
  ).length;
  const totalSpent = payments.reduce((sum, p) => sum + (p.amount || p.net_amount || 0), 0);

  const recentDeals = deals.slice(0, 5);
  const recentProposals = proposals.slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Stats Row */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{activeCampaigns}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Campaigns</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#D97706' }]}>{pendingProposals}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Proposals</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#059669' }]}>{activeDeals}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Deals</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(totalSpent)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Spent</Text>
        </Card>
      </View>

      {/* Recent Deals */}
      <SectionTitle>Recent Deals</SectionTitle>
      {recentDeals.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No deals yet. Start by discovering creators!
          </Text>
        </Card>
      ) : (
        recentDeals.map((deal) => (
          <Pressable key={deal.id} onPress={() => router.push('/(drawer)/deals' as any)}>
            <Card>
              <View style={styles.row}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {deal.brand_name || 'Untitled Deal'}
                </Text>
                <StatusBadge status={deal.pipeline_stage || deal.status || 'lead'} />
              </View>
              <View style={styles.row}>
                <Text style={[styles.itemValue, { color: colors.primary }]}>
                  ${(deal.total_value || 0).toLocaleString()}
                </Text>
                <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                  {new Date(deal.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}

      {recentDeals.length > 0 && (
        <Pressable onPress={() => router.push('/(drawer)/deals' as any)}>
          <Text style={[styles.viewAllLink, { color: colors.primary }]}>View all deals</Text>
        </Pressable>
      )}

      {/* Recent Proposals */}
      <SectionTitle>Recent Proposals</SectionTitle>
      {recentProposals.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No proposals yet. Send your first proposal to a creator!
          </Text>
        </Card>
      ) : (
        recentProposals.map((proposal) => (
          <Pressable key={proposal.id} onPress={() => router.push('/(drawer)/proposals' as any)}>
            <Card>
              <View style={styles.row}>
                <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                  {proposal.title || 'Untitled Proposal'}
                </Text>
                <StatusBadge status={proposal.status || 'pending'} />
              </View>
              <View style={styles.row}>
                <Text style={[styles.itemValue, { color: colors.primary }]}>
                  ${(proposal.total_amount || 0).toLocaleString()}
                </Text>
                <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                  {new Date(proposal.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}

      {recentProposals.length > 0 && (
        <Pressable onPress={() => router.push('/(drawer)/proposals' as any)}>
          <Text style={[styles.viewAllLink, { color: colors.primary }]}>View all proposals</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { width: '47%', alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  itemName: { fontSize: FontSize.md, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
  itemValue: { fontSize: FontSize.md, fontWeight: '700' },
  itemDate: { fontSize: FontSize.sm },
  emptyText: { textAlign: 'center', fontSize: FontSize.md },
  viewAllLink: { textAlign: 'center', fontWeight: '700', fontSize: FontSize.md, paddingVertical: Spacing.sm },
});
