import { z } from 'zod';
import { ThemeEnum, MissionEnum } from './common';

export const UpdateProfileInput = z.object({
  display_name: z.string().min(1).max(100).optional(),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  theme: ThemeEnum.optional(),
  mission: MissionEnum.optional(),
  timezone: z.string().max(50).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;

export const OnboardingCompleteInput = z.object({
  theme: ThemeEnum,
  mission: MissionEnum,
});

export type OnboardingCompleteInput = z.infer<typeof OnboardingCompleteInput>;
