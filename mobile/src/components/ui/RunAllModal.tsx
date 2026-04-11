import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing, BorderRadius, glassShadow } from '../../constants/theme';
import { mobileApi } from '../../lib/api';

const ANALYSIS_TYPES = [
  { key: 'growth', label: 'Growth Analysis' },
  { key: 'content', label: 'Content Strategy' },
  { key: 'audience', label: 'Audience Insights' },
  { key: 'hashtags', label: 'Hashtag Analysis' },
  { key: 'competitors', label: 'Competitor Analysis' },
  { key: 'earnings_forecast', label: 'Earnings Forecast' },
  { key: 'smo_score', label: 'SMO Score' },
  { key: 'network', label: 'Network Analysis' },
  { key: 'optimal_times', label: 'Optimal Timing' },
  { key: 'sentiment', label: 'Sentiment Analysis' },
  { key: 'brand_safety', label: 'Brand Safety' },
];

interface RunAllModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  profileId: string;
}

export function RunAllModal({ visible, onClose, onComplete, profileId }: RunAllModalProps) {
  const { colors } = useTheme();
  const [statuses, setStatuses] = useState<Record<string, 'pending' | 'running' | 'done' | 'error'>>({});
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (visible) {
      const initial: Record<string, 'pending'> = {};
      ANALYSIS_TYPES.forEach((a) => { initial[a.key] = 'pending'; });
      setStatuses(initial);
      setElapsed(0);
      setIsRunning(true);
      runAnalyses(initial);
    }
    return () => { setIsRunning(false); };
  }, [visible]);

  // Pulse animation
  useEffect(() => {
    if (!isRunning) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRunning]);

  // Timer
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const runAnalyses = async (initial: Record<string, string>) => {
    const queue = [...ANALYSIS_TYPES];
    const concurrency = 3;
    let idx = 0;

    const runNext = async (): Promise<void> => {
      if (idx >= queue.length) return;
      const current = queue[idx++];

      setStatuses((prev) => ({ ...prev, [current.key]: 'running' }));

      try {
        await mobileApi('/api/mobile/analyses', {
          method: 'POST',
          body: { profileId, analysisType: current.key },
          timeoutMs: 120000,
        });
        setStatuses((prev) => ({ ...prev, [current.key]: 'done' }));
      } catch {
        setStatuses((prev) => ({ ...prev, [current.key]: 'done' }));
      }

      await runNext();
    };

    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => runNext());
    await Promise.all(workers);
    setIsRunning(false);
    onComplete();
  };

  const doneCount = Object.values(statuses).filter((s) => s === 'done').length;
  const total = ANALYSIS_TYPES.length;
  const progress = total > 0 ? doneCount / total : 0;
  const estTotal = 180;
  const remaining = Math.max(0, Math.round(estTotal - elapsed));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // Circular progress
  const ringSize = 64;
  const strokeW = 5;
  const radius = (ringSize - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }, glassShadow(colors)]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Svg width={ringSize} height={ringSize}>
                <Circle
                  cx={ringSize / 2} cy={ringSize / 2} r={radius}
                  stroke={colors.surfaceLight} strokeWidth={strokeW} fill="none"
                />
                <Circle
                  cx={ringSize / 2} cy={ringSize / 2} r={radius}
                  stroke={colors.primary} strokeWidth={strokeW} fill="none"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${ringSize / 2}, ${ringSize / 2}`}
                />
              </Svg>
              <View style={styles.progressTextOverlay}>
                <Text style={[styles.progressPct, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Running All Analyses</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Processing {total} types ({Math.min(3, total)} at a time)
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceLight }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
          </View>

          {/* Analysis list */}
          <View style={styles.analysisList}>
            {ANALYSIS_TYPES.map((a) => {
              const status = statuses[a.key] || 'pending';
              return (
                <View key={a.key} style={styles.analysisRow}>
                  {status === 'done' ? (
                    <View style={[styles.statusDot, { backgroundColor: colors.success }]}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  ) : status === 'running' ? (
                    <Animated.View style={[styles.statusDot, { backgroundColor: colors.primary, opacity: pulseAnim }]} />
                  ) : (
                    <View style={[styles.statusDot, { backgroundColor: colors.textMuted + '40' }]} />
                  )}
                  <Text style={[
                    styles.analysisLabel,
                    { color: status === 'done' ? colors.textMuted : status === 'running' ? colors.text : colors.textSecondary },
                    status === 'done' && styles.strikethrough,
                  ]}>
                    {a.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.timerText, { color: colors.textSecondary }]}>
              Elapsed: {formatTime(elapsed)} {isRunning && `| Est. remaining: ~${formatTime(remaining)}`}
            </Text>
            {!isRunning && (
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.closeBtnText, { color: '#FFFFFF' }]}>Done</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerLeft: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  progressTextOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPct: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  headerRight: {
    flex: 1,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    marginHorizontal: Spacing.lg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  analysisList: {
    padding: Spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '47%',
    paddingVertical: 4,
  },
  statusDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  analysisLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  timerText: {
    fontSize: FontSize.xs,
    flex: 1,
  },
  closeBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  closeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
