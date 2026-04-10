import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { searchCreators } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius, neuShadow, neuShadowSm } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { trackEvent } from '../../lib/track';

const PLATFORMS = ['all', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin'] as const;
type Platform = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  all: 'All',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
};

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function formatEngagement(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

export default function BrandDiscoverScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activePlatform, setActivePlatform] = useState<Platform>('all');
  const [creators, setCreators] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { trackEvent('page_view', 'brand_discover'); }, []);

  const loadData = useCallback(async (searchQuery?: string, platform?: Platform) => {
    const platformFilter = platform && platform !== 'all' ? platform : undefined;
    const queryFilter = searchQuery?.trim() || undefined;
    const data = await searchCreators(queryFilter, undefined, platformFilter);
    setCreators(data);
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(query, activePlatform);
    setRefreshing(false);
  }, [loadData, query, activePlatform]);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setLoading(true);
      loadData(text, activePlatform).finally(() => setLoading(false));
    }, 500);
    setSearchTimeout(timeout);
  }, [searchTimeout, loadData, activePlatform]);

  const handlePlatformChange = useCallback((platform: Platform) => {
    setActivePlatform(platform);
    setLoading(true);
    loadData(query, platform).finally(() => setLoading(false));
  }, [loadData, query]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  const renderCreatorCard = (creator: any) => {
    const platforms: string[] = creator.platforms ?? [];

    return (
      <Card key={creator.id}>
        <View style={styles.creatorHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.creatorName, { color: colors.text }]} numberOfLines={1}>
              {creator.full_name || creator.company_name || 'Creator'}
            </Text>
            {creator.industry && (
              <Text style={[styles.creatorNiche, { color: colors.textSecondary }]} numberOfLines={1}>
                {creator.industry}
              </Text>
            )}
          </View>
          {creator.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.verifiedText, { color: '#065F46' }]}>Verified</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatFollowers(creator.totalFollowers || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#059669' }]}>
              {formatEngagement(creator.avgEngagement || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Engagement</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {platforms.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Platforms</Text>
          </View>
        </View>

        {/* Platform chips */}
        {platforms.length > 0 && (
          <View style={styles.platformChips}>
            {platforms.map((p: string) => (
              <View key={p} style={[styles.platformChip, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.platformChipText, { color: colors.textSecondary }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Send Proposal button */}
        <Pressable
          onPress={() => router.push('/(drawer)/proposals' as any)}
          style={[styles.proposalBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
        >
          <Text style={[styles.proposalBtnText, { color: colors.primary }]}>Send Proposal</Text>
        </Pressable>
      </Card>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBg }, neuShadow(colors)]}>
        <Text style={[styles.searchIcon, { color: colors.textMuted }]}>Search</Text>
        <TextInput
          placeholder="Search creators by name..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleSearchChange}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => handleSearchChange('')}>
            <Text style={[styles.clearBtn, { color: colors.textMuted }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Platform Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {PLATFORMS.map((platform) => {
          const isActive = activePlatform === platform;
          return (
            <Pressable
              key={platform}
              onPress={() => handlePlatformChange(platform)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.accent : colors.surface,
                },
                neuShadowSm(colors),
              ]}
            >
              <Text style={[styles.filterChipText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>
                {PLATFORM_LABELS[platform]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Results */}
      {loading ? (
        <View style={styles.loaderInline}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : creators.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Creators Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {query.trim()
              ? `No creators match "${query}". Try a different search term or filter.`
              : 'No creators available at the moment. Check back soon!'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
            {creators.length} creator{creators.length !== 1 ? 's' : ''} found
          </Text>
          {creators.map(renderCreatorCard)}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: FontSize.sm, fontWeight: '600' },
  searchInput: { flex: 1, fontSize: FontSize.md, paddingVertical: Spacing.md },
  clearBtn: { fontSize: FontSize.sm, fontWeight: '600' },
  filterRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  loaderInline: { alignItems: 'center', paddingVertical: Spacing.xxl },
  resultCount: { fontSize: FontSize.sm },
  creatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  creatorName: { fontSize: FontSize.lg, fontWeight: '700' },
  creatorNiche: { fontSize: FontSize.sm, marginTop: 2 },
  verifiedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  verifiedText: { fontSize: FontSize.xs, fontWeight: '600' },
  statsRow: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.md, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  platformChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  platformChip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  platformChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  proposalBtn: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  proposalBtnText: { fontWeight: '700', fontSize: FontSize.md },
  emptyState: { alignItems: 'center', marginTop: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.lg },
});
