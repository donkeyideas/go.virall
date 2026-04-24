// Platform-specific factor weights for viral score computation
// Weights sum to 1.0 per platform

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'facebook' | 'twitch';

export type ScoreFactor =
  | 'hook_strength'
  | 'caption_quality'
  | 'format_fit'
  | 'timing'
  | 'consistency'
  | 'engagement_pattern';

export const PLATFORM_WEIGHTS: Record<Platform, Record<ScoreFactor, number>> = {
  instagram: {
    hook_strength: 0.25,
    caption_quality: 0.15,
    format_fit: 0.20,
    timing: 0.10,
    consistency: 0.15,
    engagement_pattern: 0.15,
  },
  tiktok: {
    hook_strength: 0.30,
    caption_quality: 0.10,
    format_fit: 0.20,
    timing: 0.10,
    consistency: 0.10,
    engagement_pattern: 0.20,
  },
  youtube: {
    hook_strength: 0.20,
    caption_quality: 0.20,
    format_fit: 0.15,
    timing: 0.10,
    consistency: 0.20,
    engagement_pattern: 0.15,
  },
  linkedin: {
    hook_strength: 0.20,
    caption_quality: 0.25,
    format_fit: 0.15,
    timing: 0.15,
    consistency: 0.15,
    engagement_pattern: 0.10,
  },
  x: {
    hook_strength: 0.25,
    caption_quality: 0.20,
    format_fit: 0.10,
    timing: 0.15,
    consistency: 0.15,
    engagement_pattern: 0.15,
  },
  facebook: {
    hook_strength: 0.20,
    caption_quality: 0.20,
    format_fit: 0.15,
    timing: 0.15,
    consistency: 0.15,
    engagement_pattern: 0.15,
  },
  twitch: {
    hook_strength: 0.25,
    caption_quality: 0.15,
    format_fit: 0.20,
    timing: 0.15,
    consistency: 0.10,
    engagement_pattern: 0.15,
  },
};
