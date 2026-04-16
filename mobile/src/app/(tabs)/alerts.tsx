import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { cockpit } from '../../lib/cockpit-theme';
import { supabase } from '../../lib/supabase';
import { ScreenHeader } from '../../components/cockpit/ScreenHeader';

type AlertFilter = 'all' | 'viral' | 'timing' | 'insights';

type AlertVariant = 'viral' | 'timing' | 'milestone' | 'insight' | 'drop' | 'weekly';

interface AlertItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function classify(type: string, title: string): AlertVariant {
  const t = (type + ' ' + title).toLowerCase();
  if (t.includes('viral') || t.includes('trend')) return 'viral';
  if (t.includes('time') || t.includes('schedule') || t.includes('window')) return 'timing';
  if (t.includes('milestone') || t.includes('reach')) return 'milestone';
  if (t.includes('dip') || t.includes('drop') || t.includes('down')) return 'drop';
  if (t.includes('weekly') || t.includes('summary')) return 'weekly';
  return 'insight';
}

function filterFor(v: AlertVariant): AlertFilter {
  if (v === 'viral' || v === 'drop') return 'viral';
  if (v === 'timing') return 'timing';
  return 'insights';
}

function iconFor(v: AlertVariant): keyof typeof Ionicons.glyphMap {
  if (v === 'viral') return 'flame';
  if (v === 'timing') return 'time-outline';
  if (v === 'milestone') return 'star';
  if (v === 'drop') return 'trending-down';
  if (v === 'weekly') return 'bar-chart';
  return 'bulb-outline';
}

export default function AlertsScreen() {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<AlertFilter>('all');

  const loadAlerts = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setAlerts(data ?? []);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    loadAlerts().finally(() => setLoading(false));
  }, [loadAlerts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, [loadAlerts]);

  const enriched = useMemo(
    () =>
      alerts.map((a) => {
        const variant = classify(a.type || '', a.title || '');
        return { ...a, variant, tabType: filterFor(variant) };
      }),
    [alerts],
  );

  const filtered = enriched.filter((a) =>
    filter === 'all' ? true : a.tabType === filter,
  );

  const markAsRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const variantStyle = (v: AlertVariant) => {
    if (v === 'viral') return { bg: 'rgba(248,113,113,0.12)', fg: c.red };
    if (v === 'timing') return { bg: c.blueDim, fg: c.blue };
    if (v === 'milestone') return { bg: c.goldDim, fg: c.gold };
    if (v === 'drop') return { bg: 'rgba(248,113,113,0.12)', fg: c.red };
    if (v === 'weekly') return { bg: c.purpleDim, fg: c.purple };
    return { bg: c.tealDim, fg: c.teal };
  };

  const TABS: AlertFilter[] = ['all', 'viral', 'timing', 'insights'];

  return (
    <View style={{ flex: 1, backgroundColor: c.bgDeep }}>
      <ScreenHeader title="Alerts" activeKey="alerts" />

      <View style={styles.tabs}>
        {TABS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? c.goldDim : c.bgCard,
                  borderColor: active ? c.goldBorder : c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? c.gold : c.textSecondary },
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={c.gold} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.gold}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color={c.textMuted}
              />
              <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
                No alerts yet
              </Text>
              <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
                You'll get notified when your content goes viral or brands
                reach out.
              </Text>
            </View>
          ) : (
            filtered.map((a) => {
              const vs = variantStyle(a.variant);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => !a.read && markAsRead(a.id)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: !a.read ? c.goldBorder : c.border,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: vs.bg }]}>
                    <Ionicons name={iconFor(a.variant)} size={16} color={vs.fg} />
                  </View>
                  <View style={styles.body}>
                    <Text
                      style={[styles.title, { color: c.textPrimary }]}
                      numberOfLines={1}
                    >
                      {a.title}
                    </Text>
                    {a.body ? (
                      <Text
                        style={[styles.desc, { color: c.textSecondary }]}
                        numberOfLines={2}
                      >
                        {a.body}
                      </Text>
                    ) : null}
                    <Text style={[styles.time, { color: c.textMuted }]}>
                      {timeAgo(a.created_at)}
                    </Text>
                  </View>
                  {!a.read && (
                    <View style={[styles.dot, { backgroundColor: c.gold }]} />
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: { fontSize: 11, fontWeight: '600' },
  list: { paddingHorizontal: 18, paddingBottom: 80, gap: 10 },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 30,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '600' },
  desc: { fontSize: 12, lineHeight: 16 },
  time: { fontSize: 10, marginTop: 3, letterSpacing: 0.3 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
});
