import { z } from 'zod';

export const ContentTypeEnum = z.enum([
  'post_ideas',
  'captions',
  'scripts',
  'bio',
]);

export type ContentType = z.infer<typeof ContentTypeEnum>;

export const GenerateContentInput = z.object({
  platform: z.string().min(1),
  contentType: ContentTypeEnum,
  topic: z.string().min(1).max(500),
  tone: z.string().min(1).max(100),
  count: z.coerce.number().int().min(1).max(10).default(5),
  platformAccountId: z.string().uuid().optional(),
});

export type GenerateContentInputType = z.infer<typeof GenerateContentInput>;
