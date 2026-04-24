'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function reprocessStripeEvent(eventId: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('stripe_events')
    .update({ processed: false, error: null })
    .eq('id', eventId);

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'reprocess_stripe_event', 'stripe_event', eventId);
  return { success: true };
}
