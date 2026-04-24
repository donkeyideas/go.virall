import { z } from 'zod';
import { PlatformEnum, PostFormatEnum, PaginationInput } from './common';

export const CreatePostInput = z.object({
  platform: PlatformEnum,
  format: PostFormatEnum,
  hook: z.string().min(1).max(300),
  caption: z.string().max(5000).optional().default(''),
  hashtags: z.array(z.string()).max(30).optional().default([]),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled']).default('draft'),
});

export type CreatePostInput = z.infer<typeof CreatePostInput>;

export const UpdatePostInput = z.object({
  hook: z.string().min(1).max(300).optional(),
  caption: z.string().max(5000).optional(),
  hashtags: z.array(z.string()).max(30).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
  format: PostFormatEnum.optional(),
});

export type UpdatePostInput = z.infer<typeof UpdatePostInput>;

export const ListPostsQuery = PaginationInput.extend({
  platform: PlatformEnum.optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
});

export type ListPostsQuery = z.infer<typeof ListPostsQuery>;
