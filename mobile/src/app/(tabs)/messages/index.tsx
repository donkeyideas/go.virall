import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/theme-context';
import { useAuth } from '../../../contexts/auth-context';
import { cockpit } from '../../../lib/cockpit-theme';
import { getThreadsForUser } from '../../../lib/dal';
import { ScreenHeader } from '../../../components/cockpit/ScreenHeader';

function timeAgo(iso?: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function initials(name: string) {
  const parts = name
    .replace(/^@/, '')
    .split(/[\s_\-.]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Deterministic gradient per thread to match the mockup's varied brand avatars
const AVATAR_COLORS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#30cfd0', '#330867'],
];
function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function threadBadge(preview: string | null): {
  label: string;
  kind: 'deal' | 'collab' | 'inquiry';
} | null {
  const p = (preview || '').toLowerCase();
  if (
    p.includes('proposal') ||
    p.includes('deal') ||
    p.includes('$') ||
    p.includes('payment')
  )
    return { label: 'Deal', kind: 'deal' };
  if (p.includes('collab') || p.includes('contract'))
    return { label: 'Collab', kind: 'collab' };
  if (p.includes('inquiry') || p.includes('question'))
    return { label: 'Inquiry', kind: 'inquiry' };
  return null;
}

export default function MessagesListScreen() {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [threads, setThreads] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const data = await getThreadsForUser(user.id);
    setThreads(data);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const badgeColors = (k: 'deal' | 'collab' | 'inquiry') => {
    if (k === 'deal') return { bg: c.goldDim, fg: c.gold };
    if (k === 'collab') return { bg: c.tealDim, fg: c.teal };
    return { bg: c.blueDim, fg: c.blue };
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bgDeep }}>
      <ScreenHeader title="Messages" activeKey="messages" />

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.gold} />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.gold}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={42} color={c.textMuted} />
              <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
                No conversations yet
              </Text>
              <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
                When brands reach out, your threads will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const other = item.other_user;
            const unread = (item.unread_count || 0) > 0;
            const name =
              other?.display_name ||
              other?.full_name ||
              other?.company_name ||
              (other?.username ? `@${other.username}` : null) ||
              (other?.account_type === 'brand' ? 'Brand Partner' : 'Creator');
            const avatarUrl = other?.avatar_url || other?.brand_logo_url || null;
            const [g1, g2] = avatarColor(item.id);
            const badge = threadBadge(item.last_message_preview);
            const bc = badge ? badgeColors(badge.kind) : null;
            return (
              <Pressable
                onPress={() =>
                  router.push(`/(tabs)/messages/${item.id}` as any)
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? c.bgElevated : c.bgCard,
                    borderColor: unread ? c.goldBorder : c.border,
                  },
                ]}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={[styles.avatar, { borderColor: c.border }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: g1, borderColor: g2 },
                    ]}
                  >
                    <Text style={styles.avatarText}>{initials(name)}</Text>
                  </View>
                )}
                <View style={styles.body}>
                  <View style={styles.topRow}>
                    <Text
                      style={[
                        styles.name,
                        { color: c.textPrimary, fontWeight: unread ? '700' : '600' },
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Text style={[styles.time, { color: c.textMuted }]}>
                      {timeAgo(item.last_message_at)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.preview,
                      {
                        color: unread ? c.textPrimary : c.textSecondary,
                        fontWeight: unread ? '500' : '400',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.last_message_preview || 'No messages yet'}
                  </Text>
                  {badge && bc ? (
                    <View style={[styles.badge, { backgroundColor: bc.bg }]}>
                      <Text style={[styles.badgeText, { color: bc.fg }]}>
                        {badge.label}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {unread ? (
                  <View style={[styles.count, { backgroundColor: c.gold }]}>
                    <Text style={[styles.countText, { color: c.goldContrast }]}>
                      {item.unread_count}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 18, paddingBottom: 80, gap: 8 },
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  body: { flex: 1, gap: 3 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 14, flex: 1, marginRight: 8 },
  time: { fontSize: 10, letterSpacing: 0.3 },
  preview: { fontSize: 12.5 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  badgeText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.4 },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 10, fontWeight: '800' },
});
