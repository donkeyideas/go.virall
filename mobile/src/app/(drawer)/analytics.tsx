import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { TabPills } from '../../components/ui/TabPills';
import { KpiCard } from '../../components/ui/KpiCard';
import { SimpleLineChart } from '../../components/ui/SimpleLineChart';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { type PlatformName } from '../../constants/platforms';
import { FontSize, Spacing } from '../../constants/theme';
import { formatNumber } from '../../lib/format';
import { getSocialProfiles, getLatestMetrics } from '../../lib/dal';

const TABS = ['Overview', 'Growth', 'Content', 'Audience'];

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const profs = await getSocialProfiles(organization.id);
    setProfiles(profs);
    if (profs.length > 0) {
      const m = await getLatestMetrics(profs[0].id, 30);
      setMetrics(m);
    }
  }, [organization?.id]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalViews = metrics.reduce((s: number, m: any) => s + (m.avg_views || 0), 0);
  const totalLikes = metrics.reduce((s: number, m: any) => s + (m.avg_likes || 0), 0);
  const totalComments = metrics.reduce((s: number, m: any) => s + (m.avg_comments || 0), 0);
  const totalShares = metrics.reduce((s: number, m: any) => s + (m.avg_shares || 0), 0);

  const kpis = [
    { label: 'Total Views', value: formatNumber(totalViews), change: 0 },
    { label: 'Likes', value: formatNumber(totalLikes), change: 0 },
    { label: 'Comments', value: formatNumber(totalComments), change: 0 },
    { label: 'Shares', value: formatNumber(totalShares), change: 0 },
  ];

  const engagementData = metrics.map((m: any) => m.engagement_rate ?? 0);
  const engagementLabels = metrics.map((m: any) => {
    const d = new Date(m.date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  // Top content from recent_posts in social_profiles
  const topContent: any[] = [];
  for (const p of profiles) {
    const posts = p.recent_posts || [];
    for (const post of posts) {
      topContent.push({
        id: post.url || post.id || Math.random().toString(),
        title: post.caption?.slice(0, 60) || post.title || 'Untitled Post',
        views: formatNumber(post.views || post.likes || 0),
        engagement: ((post.engagement_rate || 0) * 100).toFixed(1) + '%',
        platform: p.platform as PlatformName,
      });
    }
  }
  topContent.sort((a, b) => parseInt(b.views) - parseInt(a.views));

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
      <Text style={[styles.title, { color: colors.text }]}>Analytics</Text>

      <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />

      <View style={styles.kpiGrid}>
        <View style={styles.kpiRow}>
          <KpiCard {...kpis[0]} />
          <KpiCard {...kpis[1]} />
        </View>
        <View style={styles.kpiRow}>
          <KpiCard {...kpis[2]} />
          <KpiCard {...kpis[3]} />
        </View>
      </View>

      {engagementData.length > 1 && (
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <SimpleLineChart
            data={engagementData}
            labels={engagementLabels.length > 4
              ? [engagementLabels[0], engagementLabels[Math.floor(engagementLabels.length / 2)], engagementLabels[engagementLabels.length - 1]]
              : engagementLabels
            }
            title="Engagement Over Time"
          />
        </View>
      )}

      {topContent.length > 0 && (
        <>
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <SectionTitle>Top Content</SectionTitle>
          </View>
          {topContent.slice(0, 10).map((item) => (
            <Card key={item.id} style={styles.contentItem}>
              <View style={styles.contentRow}>
                <PlatformIcon platform={item.platform} size={32} />
                <View style={styles.contentInfo}>
                  <Text style={[styles.contentTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.contentMeta, { color: colors.textSecondary }]}>
                    {item.views} views -- {item.engagement} engagement
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {profiles.length === 0 && (
        <Card style={{ marginHorizontal: Spacing.lg }}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No social profiles connected yet. Add them from the web dashboard.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  kpiGrid: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contentItem: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  contentInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  contentTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  contentMeta: {
    fontSize: FontSize.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
