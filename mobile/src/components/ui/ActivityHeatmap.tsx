import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';

interface HeatmapData {
  data: Array<{ day: string; hours: number[] }>;
  peakTimes?: string[];
}

interface ActivityHeatmapProps {
  heatmap: HeatmapData;
}

const HOUR_LABELS = ['12a', '', '', '3a', '', '', '6a', '', '', '9a', '', '', '12p', '', '', '3p', '', '', '6p', '', '', '9p', '', ''];
const HOUR_FULL = [
  '12:00 AM', '1:00 AM', '2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM',
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM',
];

const BEST_FORMATS = ['Reels', 'Stories', 'Carousel', 'Video', 'Photo', 'Live', 'Short', 'Thread'];

function getCellColor(val: number): string {
  const nv = Math.min(val / 100, 1);
  const r = Math.round(255 * nv);
  const g = Math.round(184 * nv);
  const b = Math.round(77 * nv);
  return `rgba(${r},${g},${b},${0.15 + nv * 0.85})`;
}

function getActivityLabel(val: number): string {
  if (val >= 80) return 'Peak';
  if (val >= 60) return 'High';
  if (val >= 40) return 'Medium';
  if (val >= 20) return 'Low';
  return 'Minimal';
}

export function ActivityHeatmap({ heatmap }: ActivityHeatmapProps) {
  const { colors } = useTheme();
  const [selectedCell, setSelectedCell] = useState<{ day: string; hour: number; val: number } | null>(null);

  if (!heatmap?.data || heatmap.data.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>Activity Heatmap</Text>
        <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap for details</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Hour labels */}
          <View style={styles.hourRow}>
            <View style={styles.dayLabel} />
            {HOUR_LABELS.map((label, i) => (
              <View key={i} style={styles.cell}>
                {label ? (
                  <Text style={[styles.hourText, { color: colors.textMuted }]}>{label}</Text>
                ) : null}
              </View>
            ))}
          </View>
          {/* Day rows */}
          {heatmap.data.map((row, dayIdx) => (
            <View key={dayIdx} style={styles.dayRow}>
              <View style={styles.dayLabel}>
                <Text style={[styles.dayText, { color: colors.textSecondary }]}>{row.day}</Text>
              </View>
              {row.hours.map((val, hourIdx) => {
                const isSelected = selectedCell?.day === row.day && selectedCell?.hour === hourIdx;
                return (
                  <Pressable
                    key={hourIdx}
                    onPress={() => setSelectedCell({ day: row.day, hour: hourIdx, val })}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: val > 0 ? getCellColor(val) : colors.surfaceLight,
                        borderRadius: 3,
                      },
                      isSelected && {
                        borderWidth: 2,
                        borderColor: colors.primary,
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      {heatmap.peakTimes && heatmap.peakTimes.length > 0 && (
        <View style={styles.peakRow}>
          <Text style={[styles.peakLabel, { color: colors.textSecondary }]}>Peak: </Text>
          {heatmap.peakTimes.map((t, i) => (
            <Text key={i} style={[styles.peakTagText, { color: colors.primary }]}>{t}</Text>
          ))}
        </View>
      )}

      {/* Detail Modal */}
      <Modal visible={!!selectedCell} transparent animationType="fade" onRequestClose={() => setSelectedCell(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedCell(null)}>
          <Pressable style={[styles.tooltipModal, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => {}}>
            {selectedCell && (() => {
              const { day, hour, val } = selectedCell;
              const label = getActivityLabel(val);
              const engBoost = Math.round((val / 100 - 0.3) * 40);
              const bestFormat = BEST_FORMATS[(day.length + hour) % BEST_FORMATS.length];
              const isRecommended = val > 60;

              return (
                <>
                  <Text style={[styles.tooltipTitle, { color: colors.text }]}>
                    {day} {HOUR_FULL[hour]}
                  </Text>
                  <View style={[styles.divLine, { backgroundColor: colors.border }]} />

                  <View style={styles.tooltipRow}>
                    <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>ACTIVITY LEVEL</Text>
                    <View style={styles.tooltipValueRow}>
                      <Text style={[styles.tooltipValue, { color: getCellColor(val) }]}>{val}%</Text>
                      <Text style={[styles.badgeText, { color: getCellColor(val) }]}>{label}</Text>
                    </View>
                  </View>

                  <View style={[styles.tooltipBar, { backgroundColor: colors.surfaceLight }]}>
                    <View style={[styles.tooltipBarFill, { width: `${Math.min(val, 100)}%`, backgroundColor: getCellColor(val) }]} />
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>ENG. BOOST</Text>
                      <Text style={[styles.statValue, { color: engBoost > 0 ? colors.success : colors.error }]}>
                        {engBoost > 0 ? '+' : ''}{engBoost}%
                      </Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>BEST FORMAT</Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>{bestFormat}</Text>
                    </View>
                  </View>

                  {isRecommended && (
                    <Text style={[styles.recText, { color: colors.primary }]}>Recommended posting time</Text>
                  )}

                  <Pressable onPress={() => setSelectedCell(null)} style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: BorderRadius.md, borderWidth: 1, padding: Spacing.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: FontSize.md, fontWeight: '700' },
  tapHint: { fontSize: 10 },
  hourRow: { flexDirection: 'row', marginBottom: 2 },
  dayRow: { flexDirection: 'row', marginBottom: 2 },
  dayLabel: { width: 32, justifyContent: 'center' },
  dayText: { fontSize: 10, fontWeight: '500' },
  hourText: { fontSize: 8, textAlign: 'center' },
  cell: { width: 14, height: 14, marginHorizontal: 1 },
  peakRow: { flexDirection: 'row', marginTop: Spacing.sm, flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  peakLabel: { fontSize: FontSize.xs, fontWeight: '500' },
  peakTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  tooltipModal: { width: '100%', maxWidth: 320, borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  tooltipTitle: { fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center' },
  divLine: { height: 1, marginVertical: Spacing.sm },
  tooltipRow: { marginBottom: Spacing.sm },
  tooltipLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  tooltipValueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tooltipValue: { fontSize: FontSize.xxl, fontWeight: '800' },
  badgeText: { fontSize: FontSize.md, fontWeight: '700' },
  tooltipBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.md },
  tooltipBarFill: { height: '100%', borderRadius: 3 },
  statsRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  stat: { flex: 1 },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  recText: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.md, textAlign: 'center' },
  closeBtn: { paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, alignItems: 'center' },
  closeBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
});
