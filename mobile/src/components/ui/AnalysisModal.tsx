import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing, BorderRadius, glassShadow } from '../../constants/theme';
import { mobileApi } from '../../lib/api';
import { trackEvent } from '../../lib/track';

const ANALYSIS_LABELS: Record<string, string> = {
  growth: 'Growth Analysis',
  content_strategy: 'Content Strategy',
  thirty_day_plan: '30-Day Plan',
  hashtags: 'Hashtag Analysis',
  audience: 'Audience Insights',
  competitors: 'Competitor Analysis',
  network: 'Network Analysis',
  smo_score: 'SMO Score',
  insights: 'Recommendations',
  earnings_forecast: 'Earnings Forecast',
  optimal_times: 'Optimal Timing',
  sentiment: 'Sentiment Analysis',
  brand_safety: 'Brand Safety',
};

const STEPS = [
  'Collecting profile data',
  'Fetching recent metrics',
  'Loading competitor info',
  'Running AI analysis',
  'Storing results',
];

interface AnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  profileId: string;
  profileLabel: string;
  analysisType: string;
}

export function AnalysisModal({
  visible,
  onClose,
  onComplete,
  profileId,
  profileLabel,
  analysisType,
}: AnalysisModalProps) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'running' | 'done' | 'error'>('running');
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const isRunning = status === 'running';

  useEffect(() => {
    if (!visible) return;
    setStatus('running');
    setCurrentStep(0);
    setElapsed(0);
    setErrorMsg('');
    runAnalysis();
  }, [visible]);

  // Pulse animation
  useEffect(() => {
    if (!isRunning) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
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

  // Step progression
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setCurrentStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 3000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const runAnalysis = async () => {
    trackEvent('analysis_run', 'smo-score', { type: analysisType });
    try {
      const { error: apiErr } = await mobileApi('/api/mobile/analyses', {
        method: 'POST',
        body: { profileId, analysisType },
        timeoutMs: 120000,
      });
      if (apiErr) throw new Error(apiErr);
      setCurrentStep(STEPS.length - 1);
      setStatus('done');
      onComplete();
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Analysis failed');
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const label = ANALYSIS_LABELS[analysisType] || analysisType;
  const progress = isRunning
    ? (currentStep + 1) / STEPS.length
    : status === 'done'
      ? 1
      : (currentStep + 1) / STEPS.length;

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
                  stroke={status === 'error' ? colors.error : colors.primary}
                  strokeWidth={strokeW} fill="none"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${ringSize / 2}, ${ringSize / 2}`}
                />
              </Svg>
              <View style={styles.progressTextOverlay}>
                <Text style={[styles.progressPct, { color: status === 'error' ? colors.error : colors.primary }]}>
                  {status === 'done' ? '✓' : status === 'error' ? '✗' : `${Math.round(progress * 100)}%`}
                </Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {profileLabel}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: status === 'error' ? colors.error : colors.primary,
                },
              ]}
            />
          </View>

          {/* Steps */}
          <View style={styles.stepsList}>
            {STEPS.map((step, i) => {
              const isDone = status === 'done' || i < currentStep;
              const isCurrent = isRunning && i === currentStep;
              const isPending = isRunning && i > currentStep;

              return (
                <View key={i} style={styles.stepRow}>
                  {isDone ? (
                    <View style={[styles.statusDot, { backgroundColor: colors.success }]}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  ) : isCurrent ? (
                    <Animated.View style={[styles.statusDot, { backgroundColor: colors.primary, opacity: pulseAnim }]} />
                  ) : (
                    <View style={[styles.statusDot, { backgroundColor: colors.textMuted + '40' }]} />
                  )}
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isDone ? colors.textMuted : isCurrent ? colors.text : colors.textSecondary,
                      },
                      isDone && styles.strikethrough,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Error message */}
          {status === 'error' && (
            <View style={[styles.errorBox, { backgroundColor: colors.error + '15' }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errorMsg || 'Analysis failed. Please try again.'}
              </Text>
            </View>
          )}

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Text style={[styles.timerText, { color: colors.textSecondary }]}>
              {isRunning ? `Elapsed: ${formatTime(elapsed)}` : status === 'done' ? `Completed in ${formatTime(elapsed)}` : `Failed after ${formatTime(elapsed)}`}
            </Text>
            {!isRunning && (
              <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.closeBtnText, { color: '#FFFFFF' }]}>
                  {status === 'done' ? 'Done' : 'Close'}
                </Text>
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
    fontSize: FontSize.sm,
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
  stepsList: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  errorBox: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
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
