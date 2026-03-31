import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { PlatformColors, type PlatformName } from '../../constants/platforms';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { getScheduledPosts } from '../../lib/dal';
import { formatTime } from '../../lib/format';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth());

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const data = await getScheduledPosts(organization.id);
    setPosts(data);
  }, [organization?.id]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Build calendar dots from real posts
  const calendarDots: Record<string, string[]> = {};
  for (const post of posts) {
    const dateStr = post.scheduled_at ? post.scheduled_at.slice(0, 10) : null;
    if (dateStr) {
      if (!calendarDots[dateStr]) calendarDots[dateStr] = [];
      if (post.platform) calendarDots[dateStr].push(post.platform);
    }
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

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
      <Text style={[styles.title, { color: colors.text }]}>Schedule</Text>

      <Card>
        <Text style={[styles.monthTitle, { color: colors.text }]}>{MONTHS[month]} {year}</Text>
        <View style={styles.dayHeaders}>
          {DAYS.map((d) => (
            <Text key={d} style={[styles.dayHeader, { color: colors.textMuted }]}>{d}</Text>
          ))}
        </View>
        <View style={styles.calendarGrid}>
          {cells.map((day, i) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
            const dots = day ? (calendarDots[dateStr] || []) : [];
            const isToday = dateStr === todayStr;

            return (
              <View key={i} style={styles.dayCell}>
                {day !== null && (
                  <>
                    <View style={[styles.dayCircle, isToday && { backgroundColor: colors.accent + '30' }]}>
                      <Text style={[styles.dayText, { color: isToday ? colors.accent : colors.text }]}>
                        {day}
                      </Text>
                    </View>
                    {dots.length > 0 && (
                      <View style={styles.dots}>
                        {dots.slice(0, 3).map((p, di) => (
                          <View
                            key={di}
                            style={[styles.dot, { backgroundColor: PlatformColors[p as PlatformName] || '#7C6BFF' }]}
                          />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      </Card>

      <SectionTitle>Upcoming Posts</SectionTitle>
      {posts.length === 0 && (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No scheduled posts yet. Create posts from the web dashboard.
          </Text>
        </Card>
      )}
      {posts.map((post) => {
        const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at) : null;
        return (
          <Card key={post.id} style={styles.postCard}>
            <View style={styles.postRow}>
              {post.platform && <PlatformIcon platform={post.platform as PlatformName} size={32} />}
              <View style={styles.postInfo}>
                <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={1}>
                  {post.content?.slice(0, 60) || 'Untitled Post'}
                </Text>
                <Text style={[styles.postMeta, { color: colors.textSecondary }]}>
                  {scheduledDate
                    ? `${scheduledDate.toLocaleDateString()} at ${formatTime(scheduledDate)}`
                    : 'No date set'}
                </Text>
              </View>
              <View style={[styles.statusBadge, {
                backgroundColor: post.status === 'scheduled' ? colors.success + '20'
                  : post.status === 'published' ? colors.accent + '20'
                  : colors.warning + '20',
              }]}>
                <Text style={[styles.statusText, {
                  color: post.status === 'scheduled' ? colors.success
                    : post.status === 'published' ? colors.accent
                    : colors.warning,
                }]}>
                  {post.status === 'scheduled' ? 'Scheduled' : post.status === 'published' ? 'Published' : 'Draft'}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
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
    marginBottom: Spacing.sm,
  },
  monthTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 44,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  postCard: {
    marginBottom: Spacing.sm,
  },
  postRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  postInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  postTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  postMeta: {
    fontSize: FontSize.sm,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
