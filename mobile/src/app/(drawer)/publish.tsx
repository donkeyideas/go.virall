import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, Modal, TextInput, Alert,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getScheduledPosts, getSocialProfiles } from '../../lib/dal';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius, neuShadowSm, neuInset } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

const TABS = ['Calendar', 'List'];
const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'threads', 'pinterest'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PublishScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    platform: 'instagram', content: '', hashtags: '', scheduled_at: '', social_profile_id: '',
  });

  useEffect(() => { trackEvent('page_view', 'publish'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const [postsData, profilesData] = await Promise.all([
      getScheduledPosts(organization.id),
      getSocialProfiles(organization.id),
    ]);
    setPosts(postsData);
    setProfiles(profilesData);
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

  const handleCreate = async () => {
    if (!form.content.trim() || !form.platform) return;
    setCreating(true);
    const { error } = await mobileApi('/api/mobile/publish', {
      method: 'POST',
      body: {
        platform: form.platform,
        content: form.content.trim(),
        hashtags: form.hashtags ? form.hashtags.split(',').map(h => h.trim()).filter(Boolean) : [],
        scheduled_at: form.scheduled_at || new Date().toISOString(),
        social_profile_id: form.social_profile_id || null,
        status: form.scheduled_at ? 'scheduled' : 'draft',
      },
    });
    setCreating(false);
    if (error) { Alert.alert('Error', error); return; }
    setShowCreate(false);
    setForm({ platform: 'instagram', content: '', hashtags: '', scheduled_at: '', social_profile_id: '' });
    await loadData();
  };

  const handleDelete = async (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await mobileApi('/api/mobile/publish', { method: 'DELETE', body: { postId } });
          await loadData();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Stats
  const scheduled = posts.filter(p => p.status === 'scheduled').length;
  const published = posts.filter(p => p.status === 'published').length;
  const drafts = posts.filter(p => p.status === 'draft').length;

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);

  const postsByDay = new Map<number, any[]>();
  posts.forEach(p => {
    if (!p.scheduled_at) return;
    const d = new Date(p.scheduled_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      const arr = postsByDay.get(day) ?? [];
      arr.push(p);
      postsByDay.set(day, arr);
    }
  });

  const renderCalendar = () => (
    <View>
      <View style={styles.calNav}>
        <Pressable onPress={() => setCurrentMonth(new Date(year, month - 1, 1))}>
          <Text style={[styles.calNavBtn, { color: colors.primary }]}>Prev</Text>
        </Pressable>
        <Text style={[styles.calMonth, { color: colors.text }]}>
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}>
          <Text style={[styles.calNavBtn, { color: colors.primary }]}>Next</Text>
        </Pressable>
      </View>

      <View style={styles.calGrid}>
        {WEEKDAYS.map(d => (
          <View key={d} style={styles.calCell}>
            <Text style={[styles.calWeekday, { color: colors.textMuted }]}>{d}</Text>
          </View>
        ))}
        {days.map((day, i) => {
          const dayPosts = day ? postsByDay.get(day) ?? [] : [];
          const isToday = day && new Date().getFullYear() === year && new Date().getMonth() === month && new Date().getDate() === day;
          return (
            <View key={i} style={styles.calCell}>
              {day && (
                <View style={[styles.calDay, isToday ? { backgroundColor: colors.primary + '20' } : undefined]}>
                  <Text style={[styles.calDayNum, { color: isToday ? colors.primary : colors.text }]}>{day}</Text>
                  {dayPosts.length > 0 && (
                    <View style={[styles.calDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderList = () => (
    <View style={{ gap: Spacing.sm }}>
      {posts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet. Create your first one!</Text>
      ) : (
        posts.map(post => (
          <Pressable key={post.id} onLongPress={() => handleDelete(post.id)}>
            <Card>
              <View style={styles.postHeader}>
                <Text style={[styles.postPlatform, { color: colors.primary }]}>{post.platform}</Text>
                <StatusBadge status={post.status || 'draft'} />
              </View>
              <Text style={[styles.postContent, { color: colors.text }]} numberOfLines={2}>{post.content}</Text>
              {post.hashtags?.length > 0 && (
                <Text style={[styles.postHashtags, { color: colors.textMuted }]}>
                  {post.hashtags.map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ')}
                </Text>
              )}
              <Text style={[styles.postDate, { color: colors.textMuted }]}>
                {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : 'No date set'}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{posts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{scheduled}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Scheduled</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{published}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Published</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{drafts}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Drafts</Text>
          </Card>
        </View>

        <View style={styles.tabRow}>
          <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />
          <Pressable onPress={() => setShowCreate(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.addBtnText}>+ New Post</Text>
          </Pressable>
        </View>

        {activeTab === 0 ? renderCalendar() : renderList()}
      </ScrollView>

      {/* Create Post Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setShowCreate(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>New Post</Text>

            {/* Platform picker */}
            <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>Platform</Text>
            <View style={styles.platformRow}>
              {PLATFORMS.map(p => (
                <Pressable
                  key={p}
                  onPress={() => setForm(f => ({ ...f, platform: p }))}
                  style={[styles.platformChip, { backgroundColor: colors.surface }, neuShadowSm(colors), form.platform === p && { backgroundColor: colors.primary + '20' }]}
                >
                  <Text style={[styles.platformChipText, { color: form.platform === p ? colors.primary : colors.text }]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              placeholder="Content *"
              placeholderTextColor={colors.textMuted}
              value={form.content}
              onChangeText={v => setForm(f => ({ ...f, content: v }))}
              multiline
              style={[styles.input, styles.inputMulti, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
            />

            <TextInput
              placeholder="Hashtags (comma-separated)"
              placeholderTextColor={colors.textMuted}
              value={form.hashtags}
              onChangeText={v => setForm(f => ({ ...f, hashtags: v }))}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
            />

            <Pressable
              onPress={handleCreate}
              disabled={creating}
              style={[styles.createBtn, { backgroundColor: colors.primary, opacity: creating ? 0.6 : 1 }]}
            >
              <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Post'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.xs },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.sm },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  tabRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
  emptyText: { textAlign: 'center', marginTop: Spacing.xl, fontSize: FontSize.md },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postPlatform: { fontSize: FontSize.sm, fontWeight: '700', textTransform: 'capitalize' },
  postContent: { fontSize: FontSize.md, marginTop: 4 },
  postHashtags: { fontSize: FontSize.sm, marginTop: 4 },
  postDate: { fontSize: FontSize.xs, marginTop: 4 },
  calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  calNavBtn: { fontSize: FontSize.md, fontWeight: '600' },
  calMonth: { fontSize: FontSize.lg, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calWeekday: { fontSize: FontSize.xs, fontWeight: '600' },
  calDay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  calDayNum: { fontSize: FontSize.sm },
  calDot: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  platformRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  platformChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md },
  platformChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  input: { borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md },
  inputMulti: { minHeight: 100, textAlignVertical: 'top' },
  createBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
});
