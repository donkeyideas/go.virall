import { z } from 'zod';

export const PaginationInput = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ApiResponse<T> = { data: T } | z.infer<typeof ErrorResponse>;

export const PlatformEnum = z.enum([
  'instagram',
  'tiktok',
  'youtube',
  'linkedin',
  'x',
  'facebook',
  'twitch',
]);

export type Platform = z.infer<typeof PlatformEnum>;

export const PostFormatEnum = z.enum([
  'reel',
  'short',
  'story',
  'carousel',
  'static',
  'long-video',
  'thread',
  'article',
]);

export type PostFormat = z.infer<typeof PostFormatEnum>;

export const ThemeEnum = z.enum([
  'glassmorphic',
  'neon-editorial',
  'neumorphic',
]);

export type Theme = z.infer<typeof ThemeEnum>;

export const MissionEnum = z.enum([
  'grow-audience',
  'monetize',
  'launch-product',
  'community',
  'land-deals',
]);

export type Mission = z.infer<typeof MissionEnum>;

export const SubscriptionTierEnum = z.enum([
  'free',
  'creator',
  'pro',
  'agency',
]);

export type SubscriptionTier = z.infer<typeof SubscriptionTierEnum>;
