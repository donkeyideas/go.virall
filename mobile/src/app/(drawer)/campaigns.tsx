import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getCampaigns } from '../../lib/dal';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { trackEvent } from '../../lib/track';

function statusColor(status: string, colors: any): string {
  switch (status?.toLowerCase()) {
    case 'active': return colors.success;
    case 'completed': return colors.primary;
    case 'draft':
    default: return colors.textMuted;
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '--';
  }
}

export default function CampaignsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'campaigns'); }, []);

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SectionTitle>Campaigns</SectionTitle>

      {campaigns.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No campaigns yet
          </Text>
        </Card>
      ) : (
        campaigns.map((campaign) => {
          const status = campaign.status || 'draft';
          const color = statusColor(status, colors);

          return (
            <Card key={campaign.id}>
              <View style={campaignStyles.header}>
                <Text style={[campaignStyles.name, { color: colors.text }]} numberOfLines={1}>
                  {campaign.name || 'Untitled Campaign'}
                </Text>
                <View style={{
                  backgroundColor: color + '20',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  alignSelf: 'flex-start',
                }}>
                  <Text style={{ color, fontSize: 11, fontWeight: '700' }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </View>
              </View>

              {campaign.budget != null && (
                <View style={campaignStyles.row}>
                  <Text style={[campaignStyles.label, { color: colors.textSecondary }]}>Budget</Text>
                  <Text style={[campaignStyles.value, { color: colors.primary }]}>
                    ${Number(campaign.budget).toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={campaignStyles.row}>
                <Text style={[campaignStyles.label, { color: colors.textSecondary }]}>Start</Text>
                <Text style={[campaignStyles.dateText, { color: colors.text }]}>
                  {formatDate(campaign.start_date)}
                </Text>
              </View>

              <View style={campaignStyles.row}>
                <Text style={[campaignStyles.label, { color: colors.textSecondary }]}>End</Text>
                <Text style={[campaignStyles.dateText, { color: colors.text }]}>
                  {formatDate(campaign.end_date)}
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});

const campaignStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  label: {
    fontSize: FontSize.sm,
  },
  value: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  dateText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
