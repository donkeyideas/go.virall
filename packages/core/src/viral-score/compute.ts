import { PLATFORM_WEIGHTS, type Platform, type ScoreFactor } from './weights';
import { scoreHookStrength } from './signals/hook-strength';
import { scoreCaptionQuality } from './signals/caption-quality';
import { scoreFormatFit } from './signals/format-fit';
import { scoreTiming } from './signals/timing';
import { scoreHashtags } from './signals/hashtags';

export type SignalResult = {
  key: string;
  label: string;
  value: number;
  status: 'good' | 'ok' | 'bad';
  tip: string;
};

export type ScoreOutput = {
  score: number;
  confidence: number;
  signals: SignalResult[];
  improvements: Array<{
    label: string;
    delta: number;
    action: string;
  }>;
};

export type ScoreInput = {
  platform: Platform;
  format: string;
  hook: string;
  caption: string;
  hashtags: string[];
  scheduled_at?: string;
};

function status(value: number): 'good' | 'ok' | 'bad' {
  if (value >= 70) return 'good';
  if (value >= 40) return 'ok';
  return 'bad';
}

/**
 * V1 rules-based viral score engine.
 * Computes a 0-100 score with 6 weighted signals.
 */
export function computeViralScore(input: ScoreInput): ScoreOutput {
  const { platform, format, hook, caption, hashtags, scheduled_at } = input;
  const weights = PLATFORM_WEIGHTS[platform];

  // Compute each signal
  const hookResult = scoreHookStrength(hook);
  const captionResult = scoreCaptionQuality(caption, platform);
  const formatResult = scoreFormatFit(platform, format);
  const timingResult = scoreTiming(scheduled_at, platform);
  const hashtagResult = scoreHashtags(hashtags, platform);

  // Consistency is a placeholder (would need historical data)
  const consistencyValue = 50;
  const consistencyTip = 'Post regularly to build consistency.';

  const signalMap: Record<ScoreFactor, { value: number; tip: string; label: string }> = {
    hook_strength: { ...hookResult, label: 'Hook Strength' },
    caption_quality: { ...captionResult, label: 'Caption Quality' },
    format_fit: { ...formatResult, label: 'Format Fit' },
    timing: { ...timingResult, label: 'Timing' },
    consistency: { value: consistencyValue, tip: consistencyTip, label: 'Consistency' },
    engagement_pattern: {
      value: 50,
      tip: 'Engagement patterns will improve as we learn from your data.',
      label: 'Engagement Pattern',
    },
  };

  // Weighted sum
  let totalScore = 0;
  const signals: SignalResult[] = [];

  for (const [factor, weight] of Object.entries(weights) as [ScoreFactor, number][]) {
    const signal = signalMap[factor];
    totalScore += signal.value * weight;
    signals.push({
      key: factor,
      label: signal.label,
      value: signal.value,
      status: status(signal.value),
      tip: signal.tip,
    });
  }

  const score = Math.round(Math.max(0, Math.min(100, totalScore)));

  // Confidence: higher when we have more data points filled in
  const filledSignals = [
    hook.length > 0,
    caption.length > 0,
    true, // format always provided
    !!scheduled_at,
    hashtags.length > 0,
  ].filter(Boolean).length;
  const confidence = Math.round((filledSignals / 5) * 100) / 100;

  // Generate improvements: sort signals by potential uplift (weight * deficit)
  const improvements = signals
    .filter((s) => s.value < 80)
    .map((s) => {
      const weight = weights[s.key as ScoreFactor] ?? 0;
      const deficit = 90 - s.value; // how much room to improve
      const delta = Math.round(deficit * weight);
      return {
        label: s.label,
        delta,
        action: s.tip,
      };
    })
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);

  return { score, confidence, signals, improvements };
}
