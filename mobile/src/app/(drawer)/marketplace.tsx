import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, TextInput, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getMarketplaceCreators, searchCreators } from '../../lib/dal';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius, neuShadow, neuShadowSm } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { trackEvent } from '../../lib/track';

// ── Constants ────────────────────────────────────────────────────────

const CATEGORIES = [
  'All', 'Fitness', 'Beauty', 'Tech', 'Food', 'Travel',
  'Gaming', 'Fashion', 'Lifestyle', 'Education', 'Music',
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Component ────────────────────────────────────────────────────────

export default function MarketplaceScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creators, setCreators] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [messagingCreator, setMessagingCreator] = useState(false);

  useEffect(() => { trackEvent('page_view', 'marketplace'); }, []);

  // ── Data Loading ───────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const niche = activeCategory === 'All' ? undefined : activeCategory;
    const trimmed = query.trim();

    if (trimmed || niche) {
      const data = await searchCreators(trimmed || undefined, niche, undefined, 40);
      setCreators(data);
    } else {
      const data = await getMarketplaceCreators(40);
      setCreators(data);
    }
  }, [query, activeCategory]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ── Search with debounce ───────────────────────────────────────────

  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (text: string) => {
    setQuery(text);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      // loadData will be triggered by the useEffect on query change
    }, 400);
    setSearchTimer(timer);
  };

  // ── Category Selection ─────────────────────────────────────────────

  const handleCategoryPress = (category: string) => {
    setActiveCategory(category);
    trackEvent('marketplace_filter', 'marketplace', { category });
  };

  // ── Creator Selection ──────────────────────────────────────────────

  const handleCreatorPress = (creator: any) => {
    setSelectedCreator(creator);
    trackEvent('marketplace_view_creator', 'marketplace', { creatorId: creator.id });
  };

  // ── Message Creator ────────────────────────────────────────────────

  const handleMessage = async () => {
    if (!selectedCreator || !user?.id || messagingCreator) return;
    setMessagingCreator(true);

    const { data, error } = await mobileApi<{ thread: any }>('/api/mobile/messages', {
      method: 'POST',
      body: {
        recipientId: selectedCreator.id,
        content: `Hi ${selectedCreator.full_name || 'there'}! I found your profile on the marketplace and would love to connect.`,
      },
    });

    setMessagingCreator(false);

    if (!error) {
      setSelectedCreator(null);
      router.push('/(drawer)/messages' as any);
    }
  };

  // ── Loading State ──────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Main Render ────────────────────────────────────────────────────

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.inputBg }, neuShadow(colors)]}>
          <Text style={[styles.searchIcon, { color: colors.textMuted }]}>Search</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search creators..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: colors.textMuted }]}>X</Text>
            </Pressable>
          )}
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => handleCategoryPress(category)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive ? colors.accent : colors.surface,
                  },
                  neuShadowSm(colors),
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Results Count */}
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
          {creators.length} creator{creators.length !== 1 ? 's' : ''} found
          {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}
        </Text>

        {/* Creator Cards */}
        {creators.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Creators Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {query
                ? `No results for "${query}". Try a different search or category.`
                : 'No creators available in this category yet. Try selecting a different niche.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {creators.map((creator) => (
              <Pressable key={creator.id} onPress={() => handleCreatorPress(creator)}>
                <Card style={styles.creatorCard}>
                  {/* Header: Avatar + Name */}
                  <View style={styles.creatorHeader}>
                    <Avatar name={creator.full_name || 'Creator'} size={48} />
                    <View style={styles.creatorInfo}>
                      <Text style={[styles.creatorName, { color: colors.text }]} numberOfLines={1}>
                        {creator.full_name || 'Creator'}
                      </Text>
                      {creator.industry && (
                        <Text style={[styles.creatorNiche, { color: colors.textSecondary }]} numberOfLines={1}>
                          {creator.industry}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>
                        {formatFollowers(creator.totalFollowers || 0)}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>Followers</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: colors.primary }]}>
                        {(creator.avgEngagement || 0).toFixed(1)}%
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>Engagement</Text>
                    </View>
                  </View>

                  {/* Platform Chips */}
                  {creator.platforms && creator.platforms.length > 0 && (
                    <View style={styles.platformsRow}>
                      {creator.platforms.map((platform: string, idx: number) => (
                        <View
                          key={`${platform}-${idx}`}
                          style={[styles.platformChip, { backgroundColor: colors.surfaceLight }]}
                        >
                          <PlatformIcon platform={platform as any} size={14} />
                          <Text style={[styles.platformText, { color: colors.textSecondary }]}>
                            {capitalize(platform)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* View Profile Button */}
                  <Pressable
                    onPress={() => handleCreatorPress(creator)}
                    style={[styles.viewProfileBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
                  >
                    <Text style={[styles.viewProfileText, { color: colors.primary }]}>View Profile</Text>
                  </Pressable>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Creator Detail Modal */}
      <Modal visible={!!selectedCreator} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setSelectedCreator(null)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {selectedCreator && (
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Avatar name={selectedCreator.full_name || 'Creator'} size={64} />
                <View style={styles.modalHeaderInfo}>
                  <Text style={[styles.modalName, { color: colors.text }]}>
                    {selectedCreator.full_name || 'Creator'}
                  </Text>
                  {selectedCreator.industry && (
                    <Text style={[styles.modalNiche, { color: colors.textSecondary }]}>
                      {selectedCreator.industry}
                    </Text>
                  )}
                  {selectedCreator.company_name && (
                    <Text style={[styles.modalCompany, { color: colors.textMuted }]}>
                      {selectedCreator.company_name}
                    </Text>
                  )}
                </View>
              </View>

              {/* Stats Cards */}
              <View style={styles.modalStatsRow}>
                <Card style={styles.modalStatCard}>
                  <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                    {formatFollowers(selectedCreator.totalFollowers || 0)}
                  </Text>
                  <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>
                    Total Followers
                  </Text>
                </Card>
                <Card style={styles.modalStatCard}>
                  <Text style={[styles.modalStatValue, { color: colors.primary }]}>
                    {(selectedCreator.avgEngagement || 0).toFixed(2)}%
                  </Text>
                  <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>
                    Avg Engagement
                  </Text>
                </Card>
              </View>

              {/* Platforms Section */}
              {selectedCreator.platforms && selectedCreator.platforms.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Platforms</Text>
                  <View style={styles.platformsRow}>
                    {selectedCreator.platforms.map((platform: string, idx: number) => (
                      <View
                        key={`${platform}-${idx}`}
                        style={[styles.modalPlatformChip, { backgroundColor: colors.surfaceLight }]}
                      >
                        <PlatformIcon platform={platform as any} size={18} showBackground />
                        <Text style={[styles.modalPlatformText, { color: colors.text }]}>
                          {capitalize(platform)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Verified Badge */}
              {selectedCreator.isVerified && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.verifiedText, { color: colors.success }]}>Verified Creator</Text>
                </View>
              )}

              {/* Account Info */}
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Details</Text>
              <Card>
                <View style={styles.detailRow}>
                  <Text style={{ color: colors.textSecondary }}>Account Type</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {capitalize(selectedCreator.account_type || 'creator')}
                  </Text>
                </View>
                {selectedCreator.created_at && (
                  <View style={[styles.detailRow, { marginTop: Spacing.sm }]}>
                    <Text style={{ color: colors.textSecondary }}>Member Since</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {new Date(selectedCreator.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </Card>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleMessage}
                  disabled={messagingCreator}
                  style={[
                    styles.messageBtn,
                    { backgroundColor: colors.primary, opacity: messagingCreator ? 0.6 : 1 },
                  ]}
                >
                  <Text style={styles.messageBtnText}>
                    {messagingCreator ? 'Sending...' : 'Message'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedCreator(null)}
                  style={[styles.closeBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
                >
                  <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>Close</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: FontSize.sm, fontWeight: '600' },
  searchInput: { flex: 1, fontSize: FontSize.md, paddingVertical: Spacing.md },
  clearBtn: { fontSize: FontSize.md, fontWeight: '700', paddingHorizontal: Spacing.xs },

  // Categories
  categoriesContainer: { paddingVertical: Spacing.xs, gap: Spacing.sm },
  categoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  categoryText: { fontSize: FontSize.sm, fontWeight: '600' },

  // Results
  resultsText: { fontSize: FontSize.sm },

  // Empty State
  emptyContainer: { alignItems: 'center', marginTop: Spacing.xxl, padding: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },

  // Creator Grid
  grid: { gap: Spacing.md },
  creatorCard: { gap: Spacing.md },

  // Creator Card
  creatorHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  creatorInfo: { flex: 1 },
  creatorName: { fontSize: FontSize.lg, fontWeight: '700' },
  creatorNiche: { fontSize: FontSize.sm, marginTop: 2 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  statDivider: { width: 1, height: 28 },

  // Platforms
  platformsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  platformText: { fontSize: FontSize.xs, fontWeight: '600' },

  // View Profile Button
  viewProfileBtn: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  viewProfileText: { fontWeight: '700', fontSize: FontSize.md },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  // Modal Header
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalHeaderInfo: { flex: 1 },
  modalName: { fontSize: FontSize.xl, fontWeight: '700' },
  modalNiche: { fontSize: FontSize.md, marginTop: 2 },
  modalCompany: { fontSize: FontSize.sm, marginTop: 2 },

  // Modal Stats
  modalStatsRow: { flexDirection: 'row', gap: Spacing.sm },
  modalStatCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  modalStatValue: { fontSize: FontSize.lg, fontWeight: '700' },
  modalStatLabel: { fontSize: FontSize.xs, marginTop: 2 },

  // Modal Platforms
  modalPlatformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalPlatformText: { fontSize: FontSize.sm, fontWeight: '600' },

  // Section Label
  sectionLabel: { fontSize: FontSize.lg, fontWeight: '700' },

  // Verified Badge
  verifiedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  verifiedText: { fontSize: FontSize.sm, fontWeight: '700' },

  // Detail Row
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailValue: { fontWeight: '600', fontSize: FontSize.md },

  // Modal Actions
  modalActions: { gap: Spacing.sm, marginTop: Spacing.sm },
  messageBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  messageBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
  closeBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  closeBtnText: { fontWeight: '600', fontSize: FontSize.md },
});
