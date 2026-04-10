import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getCampaigns } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius, neuShadowSm } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

const FILTERS = ['All', 'Draft', 'Active', 'Paused', 'Completed'];

function formatCurrency(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function BrandCampaignsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);

  useEffect(() => { trackEvent('page_view', 'brand_campaigns'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const data = await getCampaigns(organization.id);
    setCampaigns(data);
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

  // Stats
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;

  // Filter campaigns
  const filterLabel = FILTERS[activeFilter].toLowerCase();
  const filteredCampaigns = filterLabel === 'all'
    ? campaigns
    : campaigns.filter(c => (c.status || 'draft').toLowerCase() === filterLabel);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{totalCampaigns}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{activeCampaigns}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{completedCampaigns}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </Card>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((filter, i) => (
          <Pressable
            key={filter}
            onPress={() => setActiveFilter(i)}
            style={[
              styles.filterChip,
              { backgroundColor: colors.surface },
              neuShadowSm(colors),
              activeFilter === i && { backgroundColor: colors.primary + '20' },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: activeFilter === i ? colors.primary : colors.text },
              ]}
            >
              {filter}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Campaigns</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {filterLabel === 'all'
              ? 'Create your first campaign to start managing brand collaborations.'
              : `No ${filterLabel} campaigns found.`}
          </Text>
        </View>
      ) : (
        filteredCampaigns.map((campaign: any) => {
          const daysLeft = getDaysRemaining(campaign.end_date);
          const status = campaign.status || 'draft';

          return (
            <Card key={campaign.id}>
              <View style={styles.campaignHeader}>
                <Text style={[styles.campaignName, { color: colors.text }]} numberOfLines={2}>
                  {campaign.name || 'Untitled Campaign'}
                </Text>
                <StatusBadge status={status} />
              </View>

              <View style={styles.dateRow}>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                  {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                {campaign.budget != null && campaign.budget > 0 && (
                  <View style={[styles.metaChip, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.metaChipText, { color: colors.text }]}>
                      {formatCurrency(campaign.budget)}
                    </Text>
                  </View>
                )}

                {daysLeft !== null && status === 'active' && (
                  <View
                    style={[
                      styles.metaChip,
                      {
                        backgroundColor: daysLeft <= 3
                          ? '#FEE2E2'
                          : daysLeft <= 7
                            ? '#FEF3C7'
                            : '#D1FAE5',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.metaChipText,
                        {
                          color: daysLeft <= 3
                            ? '#991B1B'
                            : daysLeft <= 7
                              ? '#92400E'
                              : '#065F46',
                        },
                      ]}
                    >
                      {daysLeft > 0 ? `${daysLeft}d remaining` : 'Ended'}
                    </Text>
                  </View>
                )}
              </View>

              {campaign.description && (
                <Text
                  style={[styles.description, { color: colors.textMuted }]}
                  numberOfLines={2}
                >
                  {campaign.description}
                </Text>
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
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  filterRow: { gap: Spacing.xs, paddingBottom: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  campaignName: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  dateRow: { marginTop: Spacing.xs },
  dateText: { fontSize: FontSize.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  metaChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  metaChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  description: { fontSize: FontSize.sm, marginTop: Spacing.xs, lineHeight: 18 },
  emptyContainer: { alignItems: 'center', marginTop: Spacing.xxl, padding: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
});
