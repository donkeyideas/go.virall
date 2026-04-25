import { z } from 'zod';
import { PaginationInput } from './common';

export const DealStageEnum = z.enum([
  'lead',
  'outreach',
  'negotiation',
  'contract',
  'production',
  'review',
  'live',
  'done',
  'lost',
]);

export type DealStage = z.infer<typeof DealStageEnum>;

export const CreateDealInput = z.object({
  brand_name: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  brand_contact_email: z.string().email().optional().or(z.literal('')),
  amount_cents: z.number().int().min(0).optional().default(0),
  currency: z.string().length(3).default('USD'),
  stage: DealStageEnum.default('lead'),
  description: z.string().max(2000).optional().default(''),
  close_date: z.string().datetime().optional(),
});

export type CreateDealInput = z.infer<typeof CreateDealInput>;

export const UpdateDealInput = z.object({
  brand_name: z.string().min(1).max(200).optional(),
  title: z.string().min(1).max(200).optional(),
  brand_contact_email: z.string().email().optional().or(z.literal('')),
  amount_cents: z.number().int().min(0).optional(),
  currency: z.string().length(3).optional(),
  stage: DealStageEnum.optional(),
  description: z.string().max(2000).optional(),
  close_date: z.string().datetime().nullable().optional(),
});

export type UpdateDealInput = z.infer<typeof UpdateDealInput>;

export const ListDealsQuery = PaginationInput.extend({
  stage: DealStageEnum.optional(),
});

export type ListDealsQuery = z.infer<typeof ListDealsQuery>;

export const CreateDealNoteInput = z.object({
  body: z.string().min(1).max(2000),
});

export type CreateDealNoteInput = z.infer<typeof CreateDealNoteInput>;
