import { z } from 'zod';
import { PlatformEnum } from './common';

export const CompetitorLabelEnum = z.enum(['benchmark', 'rival', 'watch', 'collab']);

export const AddCompetitorInput = z.object({
  platform: PlatformEnum,
  handle: z.string().min(1).max(100),
  label: CompetitorLabelEnum.default('watch'),
});

export type AddCompetitorInput = z.infer<typeof AddCompetitorInput>;

export const UpdateCompetitorInput = z.object({
  label: CompetitorLabelEnum.optional(),
});

export type UpdateCompetitorInput = z.infer<typeof UpdateCompetitorInput>;

export const DismissCollabInput = z.object({
  status: z.enum(['dismissed', 'contacted']),
});

export type DismissCollabInput = z.infer<typeof DismissCollabInput>;
