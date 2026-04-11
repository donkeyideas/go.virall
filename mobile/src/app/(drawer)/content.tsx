import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { ProfileSelector } from '../../components/ui/ProfileSelector';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { PlatformLabels } from '../../constants/platforms';
import { trackEvent } from '../../lib/track';
import { formatNumber } from '../../lib/format';

interface FlatPost {
  id: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  isVideo: boolean;
  timestamp: string;
  imageUrl: string;
  platform: string;
  handle: string;
  profileId: string;
}

function formatPostDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString();
}

export default function ContentScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [posts, setPosts] = useState<FlatPost[]>([]);

  useEffect(() => { trackEvent('page_view', 'content'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    const { data: profs } = await supabase
      .from('social_profiles')
      .select('id, platform, handle, display_name, followers_count, recent_posts')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true });

    const profileList = profs ?? [];
    setProfiles(profileList);

    // Flatten recent_posts from all profiles (or selected one)
    const targetProfiles = selectedProfileId
      ? profileList.filter((p: any) => p.id === selectedProfileId)
      : profileList;

    const allPosts: FlatPost[] = [];
    for (const prof of targetProfiles) {
      const rp = Array.isArray(prof.recent_posts) ? prof.recent_posts : [];
      for (const post of rp) {
        allPosts.push({
          id: post.id || `${prof.id}-${allPosts.length}`,
          caption: post.caption || '',
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          isVideo: !!post.isVideo,
          timestamp: post.timestamp || '',
          imageUrl: post.imageUrl || '',
          platform: prof.platform,
          handle: prof.handle || prof.display_name || prof.platform,
          profileId: prof.id,
        });
      }
    }

    // Sort by timestamp (most recent first), fallback to likes
    allPosts.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return b.likesCount - a.likesCount;
    });

    setPosts(allPosts);
  }, [organization?.id, selectedProfileId]);

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
      <SectionTitle>Content</SectionTitle>

      {/* Profile Selector */}
      {profiles.length > 1 && (
        <ProfileSelector
          profiles={profiles.map((p: any) => ({
            id: p.id,
            platform: p.platform,
            username: p.handle || p.display_name || p.platform,
          }))}
          selectedId={selectedProfileId}
          onSelect={setSelectedProfileId}
        />
      )}

      {/* Summary */}
      {posts.length > 0 && (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{posts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {formatNumber(posts.reduce((s, p) => s + p.likesCount, 0))}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Likes</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success || '#4ADE80' }]}>
              {formatNumber(posts.reduce((s, p) => s + p.commentsCount, 0))}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Comments</Text>
          </Card>
        </View>
      )}

      {posts.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {profiles.length === 0
              ? 'No profiles connected yet. Add a social profile from the Profiles screen.'
              : 'No content found. Sync your profiles to pull in recent posts.'}
          </Text>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.id} style={styles.postCard}>
            {/* Platform + handle + date */}
            <View style={styles.postHeader}>
              <View style={styles.platformRow}>
                <PlatformIcon platform={post.platform} size={16} />
                <Text style={[styles.handleText, { color: colors.textSecondary }]}>
                  @{post.handle}
                </Text>
              </View>
              {post.timestamp ? (
                <Text style={[styles.postDate, { color: colors.textMuted }]}>
                  {formatPostDate(post.timestamp)}
                </Text>
              ) : null}
            </View>

            {/* Caption */}
            {post.caption ? (
              <Text
                style={[styles.caption, { color: colors.text }]}
                numberOfLines={3}
              >
                {post.caption}
              </Text>
            ) : (
              <Text style={[styles.caption, { color: colors.textMuted, fontStyle: 'italic' }]}>
                No caption
              </Text>
            )}

            {/* Type badge */}
            {post.isVideo && (
              <View style={[styles.typeBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: colors.primary }]}>Video</Text>
              </View>
            )}

            {/* Engagement stats */}
            <View style={styles.statsRowInline}>
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.text }]}>
                  {formatNumber(post.likesCount)}
                </Text>
                <Text style={[styles.statItemLabel, { color: colors.textMuted }]}>
                  likes
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statItemValue, { color: colors.text }]}>
                  {formatNumber(post.commentsCount)}
                </Text>
                <Text style={[styles.statItemLabel, { color: colors.textMuted }]}>
                  comments
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  postCard: {
    gap: Spacing.sm,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  handleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  postDate: {
    fontSize: FontSize.xs,
  },
  caption: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  typeBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  statsRowInline: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statItemValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  statItemLabel: {
    fontSize: FontSize.sm,
  },
});
