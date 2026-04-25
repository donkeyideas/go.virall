import { z } from 'zod';
import { PaginationInput } from './common';

export const InvoiceStatusEnum = z.enum([
  'draft',
  'sent',
  'viewed',
  'paid',
  'overdue',
  'cancelled',
]);

export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const CreateInvoiceInput = z.object({
  deal_id: z.string().uuid().optional(),
  brand_name: z.string().min(1).max(200),
  brand_email: z.string().email(),
  notes: z.string().max(2000).optional().default(''),
  amount_cents: z.number().int().min(1),
  currency: z.string().length(3).default('USD'),
  due_date: z.string().datetime(),
  line_items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().min(1),
        unit_price: z.number().min(0),
      }),
    )
    .optional()
    .default([]),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInput>;

export const ListInvoicesQuery = PaginationInput.extend({
  status: InvoiceStatusEnum.optional(),
});

export type ListInvoicesQuery = z.infer<typeof ListInvoicesQuery>;
