import { z } from 'zod';
import { PlatformEnum, PostFormatEnum } from './common';

export const ScorePostInput = z.object({
  platform: PlatformEnum,
  format: PostFormatEnum,
  hook: z.string().max(300),
  caption: z.string().max(5000).default(''),
  hashtags: z.array(z.string()).max(30).default([]),
  scheduled_at: z.string().datetime().optional(),
});

export type ScorePostInput = z.infer<typeof ScorePostInput>;

export const ScoreSignal = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number().min(0).max(100),
  status: z.enum(['good', 'ok', 'bad']),
  tip: z.string(),
});

export type ScoreSignal = z.infer<typeof ScoreSignal>;

export const ScoreResult = z.object({
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  signals: z.array(ScoreSignal),
  improvements: z.array(
    z.object({
      label: z.string(),
      delta: z.number(),
      action: z.string(),
    }),
  ),
});

export type ScoreResult = z.infer<typeof ScoreResult>;

export const RecomputeInput = z.object({
  postId: z.string().uuid(),
});

export type RecomputeInput = z.infer<typeof RecomputeInput>;
