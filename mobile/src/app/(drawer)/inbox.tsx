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
import { getNotifications } from '../../lib/dal';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { trackEvent } from '../../lib/track';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function InboxScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'inbox'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const data = await getNotifications(organization.id);
    setNotifications(data);
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
      <SectionTitle>Notifications</SectionTitle>

      {notifications.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No notifications yet. You'll be notified when there's activity on your account.
          </Text>
        </Card>
      ) : (
        notifications.map((notif: any) => {
          const isUnread = !notif.read_at;

          return (
            <Card key={notif.id} style={styles.notifCard}>
              <View style={styles.notifHeader}>
                {/* Unread indicator */}
                {isUnread && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
                <View style={styles.notifContent}>
                  <Text
                    style={[
                      styles.notifTitle,
                      { color: colors.text },
                      isUnread && styles.notifTitleUnread,
                    ]}
                    numberOfLines={2}
                  >
                    {notif.title}
                  </Text>
                  {notif.body ? (
                    <Text
                      style={[styles.notifBody, { color: colors.textSecondary }]}
                      numberOfLines={3}
                    >
                      {notif.body}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Text style={[styles.notifTime, { color: colors.textMuted }]}>
                {timeAgo(notif.created_at)}
              </Text>
            </Card>
          );
        })
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
  notifCard: {
    gap: Spacing.sm,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  notifTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    lineHeight: 20,
  },
  notifTitleUnread: {
    fontWeight: '800',
  },
  notifBody: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  notifTime: {
    fontSize: FontSize.xs,
    textAlign: 'right',
  },
});
