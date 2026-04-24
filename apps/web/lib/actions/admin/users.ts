'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function banUser(userId: string) {
  const { user, admin } = await requireAdmin();

  await admin
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);

  await writeAuditLog(admin, user.id, 'ban_user', 'user', userId);
  return { success: true };
}

export async function restoreUser(userId: string) {
  const { user, admin } = await requireAdmin();

  await admin
    .from('users')
    .update({ deleted_at: null })
    .eq('id', userId);

  await writeAuditLog(admin, user.id, 'restore_user', 'user', userId);
  return { success: true };
}

export async function changeUserRole(userId: string, role: 'creator' | 'admin' | 'support') {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) return { error: error.message };

  await writeAuditLog(admin, user.id, 'change_role', 'user', userId, { role });
  return { success: true };
}

export async function grantTier(userId: string, tier: 'free' | 'creator' | 'pro' | 'agency') {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('users')
    .update({ subscription_tier: tier })
    .eq('id', userId);

  if (error) return { error: error.message };

  await writeAuditLog(admin, user.id, 'grant_tier', 'user', userId, { tier });
  return { success: true };
}
