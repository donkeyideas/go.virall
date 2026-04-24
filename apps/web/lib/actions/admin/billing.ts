'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function adminCancelSubscription(subscriptionId: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('subscriptions')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) return { error: error.message };

  await writeAuditLog(admin, user.id, 'admin_cancel_subscription', 'subscription', subscriptionId);
  return { success: true };
}
