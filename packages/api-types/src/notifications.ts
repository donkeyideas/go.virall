import { z } from 'zod';
import { PaginationInput } from './common';

export const NotificationKindEnum = z.enum([
  'score_ready',
  'sync_complete',
  'deal_update',
  'collab_match',
  'invoice_paid',
  'system',
]);

export type NotificationKind = z.infer<typeof NotificationKindEnum>;

export const ListNotificationsQuery = PaginationInput.extend({
  unread_only: z.coerce.boolean().optional().default(false),
});

export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuery>;
