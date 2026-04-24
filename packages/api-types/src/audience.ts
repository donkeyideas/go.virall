import { z } from 'zod';
import { PlatformEnum } from './common';

export const AddCompetitorInput = z.object({
  platform: PlatformEnum,
  platform_username: z.string().min(1).max(100),
  label: z.enum(['peer', 'aspirational', 'niche']).default('peer'),
});

export type AddCompetitorInput = z.infer<typeof AddCompetitorInput>;

export const UpdateCompetitorInput = z.object({
  label: z.enum(['peer', 'aspirational', 'niche']).optional(),
});

export type UpdateCompetitorInput = z.infer<typeof UpdateCompetitorInput>;

export const DismissCollabInput = z.object({
  status: z.enum(['dismissed', 'contacted']),
});

export type DismissCollabInput = z.infer<typeof DismissCollabInput>;
