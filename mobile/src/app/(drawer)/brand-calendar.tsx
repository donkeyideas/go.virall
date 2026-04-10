import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getBrandDeals } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

// ── helpers ──────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatCurrency(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthName(date: Date): string {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Extract all relevant dates from a deal (start, end, deliverable deadlines) */
function getDealDates(deal: any): Date[] {
  const dates: Date[] = [];
  if (deal.start_date) dates.push(new Date(deal.start_date));
  if (deal.end_date) dates.push(new Date(deal.end_date));
  if (deal.created_at) dates.push(new Date(deal.created_at));
  if (deal.deal_deliverables) {
    for (const del of deal.deal_deliverables) {
      if (del.deadline) dates.push(new Date(del.deadline));
      if (del.due_date) dates.push(new Date(del.due_date));
    }
  }
  return dates;
}

/** Get deals that fall on a specific date */
function getDealsForDate(deals: any[], date: Date): any[] {
  return deals.filter((deal) => {
    const dealDates = getDealDates(deal);
    return dealDates.some((d) => isSameDay(d, date));
  });
}

// ── component ────────────────────────────────────────────────────────

export default function BrandCalendarScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deals, setDeals] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => { trackEvent('page_view', 'brand_calendar'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const d = await getBrandDeals(organization.id);
    setDeals(d);
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

  // ── calendar data ────────────────────────────────────────────────

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  /** Map of day-of-month to deal count for current month */
  const dealDayMap: Map<number, number> = useMemo(() => {
    const map = new Map<number, number>();
    for (const deal of deals) {
      const dealDates = getDealDates(deal);
      for (const d of dealDates) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          map.set(day, (map.get(day) || 0) + 1);
        }
      }
    }
    return map;
  }, [deals, year, month]);

  const selectedDeals = useMemo(() => {
    if (!selectedDate) return [];
    return getDealsForDate(deals, selectedDate);
  }, [deals, selectedDate]);

  // ── stats ────────────────────────────────────────────────────────

  const activeDeals = deals.filter(
    (d) => d.status === 'active' || d.status === 'in_progress',
  ).length;

  const thisMonthDeals = deals.filter((deal) => {
    const dealDates = getDealDates(deal);
    return dealDates.some(
      (d) => d.getFullYear() === year && d.getMonth() === month,
    );
  }).length;

  const pipelineValue = deals
    .filter((d) => ['inquiry', 'negotiation', 'active', 'negotiating', 'in_progress'].includes(d.status))
    .reduce((s, d) => s + (d.total_value || 0), 0);

  // ── navigation ───────────────────────────────────────────────────

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDayPress = (day: number) => {
    const newDate = new Date(year, month, day);
    if (selectedDate && isSameDay(selectedDate, newDate)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(newDate);
    }
  };

  // ── loading / empty states ───────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── build calendar grid ──────────────────────────────────────────

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const isSelected = (day: number) =>
    selectedDate !== null &&
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === day;

  // Build rows of 7 cells
  const calendarRows: Array<Array<number | null>> = [];
  let currentRow: Array<number | null> = [];

  // Empty cells for offset
  for (let i = 0; i < firstDay; i++) {
    currentRow.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentRow.push(day);
    if (currentRow.length === 7) {
      calendarRows.push(currentRow);
      currentRow = [];
    }
  }

  // Fill remaining cells in last row
  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push(null);
    }
    calendarRows.push(currentRow);
  }

  // ── render ───────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Deal Calendar</Text>

      {/* ── Stats Row ──────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{activeDeals}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Deals</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{thisMonthDeals}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(pipelineValue)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pipeline</Text>
        </Card>
      </View>

      {/* ── Month Navigation ──────────────────────────────────── */}
      <Card style={styles.calendarCard}>
        <View style={styles.monthNav}>
          <Pressable onPress={goToPrevMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.navBtnText, { color: colors.text }]}>{'<'}</Text>
          </Pressable>
          <Pressable onPress={goToToday}>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {getMonthName(currentDate)}
            </Text>
          </Pressable>
          <Pressable onPress={goToNextMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.navBtnText, { color: colors.text }]}>{'>'}</Text>
          </Pressable>
        </View>

        {/* Weekday Headers */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, { color: colors.textMuted }]}>{wd}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        {calendarRows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.calendarRow}>
            {row.map((day, colIdx) => {
              if (day === null) {
                return <View key={`empty-${colIdx}`} style={styles.dayCell} />;
              }

              const dealCount = dealDayMap.get(day) || 0;
              const isTodayDay = isToday(day);
              const isSelectedDay = isSelected(day);

              return (
                <Pressable
                  key={day}
                  onPress={() => handleDayPress(day)}
                  style={[
                    styles.dayCell,
                    isTodayDay && [styles.todayCell, { borderColor: colors.primary }],
                    isSelectedDay && [styles.selectedCell, { backgroundColor: colors.primary }],
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: colors.text },
                      isTodayDay && { color: colors.primary, fontWeight: '700' },
                      isSelectedDay && { color: '#FFFFFF', fontWeight: '700' },
                    ]}
                  >
                    {day}
                  </Text>
                  {dealCount > 0 && (
                    <View style={styles.dotRow}>
                      {Array.from({ length: Math.min(dealCount, 3) }).map((_, di) => (
                        <View
                          key={di}
                          style={[
                            styles.dealDot,
                            {
                              backgroundColor: isSelectedDay ? '#FFFFFF' : colors.primary,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      {/* ── Selected Day Details ──────────────────────────────── */}
      {selectedDate && (
        <>
          <Text style={[styles.selectedDateLabel, { color: colors.text }]}>
            {selectedDate.toLocaleDateString('default', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          {selectedDeals.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No deals on this date.
              </Text>
            </Card>
          ) : (
            selectedDeals.map((deal) => (
              <Card key={deal.id} style={styles.dealCard}>
                <View style={styles.dealHeader}>
                  <Text style={[styles.dealName, { color: colors.text }]} numberOfLines={1}>
                    {deal.brand_name || deal.title || 'Untitled Deal'}
                  </Text>
                  <StatusBadge status={deal.status || 'pending'} />
                </View>
                <View style={styles.dealMeta}>
                  <Text style={[styles.dealValue, { color: colors.primary }]}>
                    {formatCurrency(deal.total_value || 0)}
                  </Text>
                  {deal.pipeline_stage && (
                    <Text style={[styles.dealStage, { color: colors.textSecondary }]}>
                      {deal.pipeline_stage.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Text>
                  )}
                </View>
                {deal.deal_deliverables && deal.deal_deliverables.length > 0 && (
                  <View style={styles.deliverablesList}>
                    <Text style={[styles.deliverablesLabel, { color: colors.textMuted }]}>
                      DELIVERABLES
                    </Text>
                    {deal.deal_deliverables.map((del: any) => {
                      const deadline = del.deadline || del.due_date;
                      const isOnSelectedDate = deadline && selectedDate && isSameDay(new Date(deadline), selectedDate);
                      return (
                        <View
                          key={del.id}
                          style={[
                            styles.deliverableRow,
                            isOnSelectedDate && { backgroundColor: colors.primary + '10' },
                          ]}
                        >
                          <Text style={[styles.deliverableTitle, { color: colors.text }]} numberOfLines={1}>
                            {del.title || del.content_type || 'Deliverable'}
                          </Text>
                          <View style={styles.deliverableRight}>
                            {deadline && (
                              <Text style={[styles.deliverableDate, { color: colors.textMuted }]}>
                                {new Date(deadline).toLocaleDateString()}
                              </Text>
                            )}
                            <StatusBadge status={del.status || 'pending'} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            ))
          )}
        </>
      )}

      {/* ── All Upcoming Deals ────────────────────────────────── */}
      {!selectedDate && deals.length > 0 && (
        <>
          <Text style={[styles.sectionSubTitle, { color: colors.text }]}>
            All Deals ({deals.length})
          </Text>
          {deals.slice(0, 10).map((deal) => (
            <Card key={deal.id} style={styles.dealCard}>
              <View style={styles.dealHeader}>
                <Text style={[styles.dealName, { color: colors.text }]} numberOfLines={1}>
                  {deal.brand_name || deal.title || 'Untitled Deal'}
                </Text>
                <StatusBadge status={deal.status || 'pending'} />
              </View>
              <View style={styles.dealMeta}>
                <Text style={[styles.dealValue, { color: colors.primary }]}>
                  {formatCurrency(deal.total_value || 0)}
                </Text>
                <Text style={[styles.dealDate, { color: colors.textMuted }]}>
                  {new Date(deal.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}

      {deals.length === 0 && !selectedDate && (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No deals yet. Create deals to see them on the calendar.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },

  // Stats
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2, textAlign: 'center' },

  // Calendar
  calendarCard: { padding: Spacing.md },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: { fontSize: FontSize.lg, fontWeight: '700' },
  monthTitle: { fontSize: FontSize.lg, fontWeight: '700' },

  weekdayRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  weekdayCell: { flex: 1, alignItems: 'center' },
  weekdayText: { fontSize: FontSize.xs, fontWeight: '600' },

  calendarRow: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
    borderRadius: BorderRadius.sm,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  selectedCell: {
    borderRadius: BorderRadius.sm,
  },
  dayText: { fontSize: FontSize.sm },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dealDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Selected date
  selectedDateLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },

  // Deals
  dealCard: { marginBottom: Spacing.xs },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dealName: { fontSize: FontSize.md, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
  dealMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dealValue: { fontSize: FontSize.md, fontWeight: '700' },
  dealStage: { fontSize: FontSize.xs, textTransform: 'capitalize' },
  dealDate: { fontSize: FontSize.xs },

  // Deliverables
  deliverablesList: { marginTop: Spacing.sm },
  deliverablesLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  deliverableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  deliverableTitle: { fontSize: FontSize.sm, flex: 1, marginRight: Spacing.sm },
  deliverableRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  deliverableDate: { fontSize: FontSize.xs },

  // Section
  sectionSubTitle: { fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.sm },
});
