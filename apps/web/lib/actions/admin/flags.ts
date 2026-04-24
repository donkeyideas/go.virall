'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function createFlag(data: { key: string; description?: string; enabled?: boolean; rolloutPercent?: number }) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin.from('feature_flags').insert({
    key: data.key,
    description: data.description ?? null,
    enabled: data.enabled ?? false,
    rollout_percent: data.rolloutPercent ?? 0,
  });

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'create_flag', 'feature_flag', data.key);
  return { success: true };
}

export async function toggleFlag(key: string, enabled: boolean) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin.from('feature_flags').update({ enabled }).eq('key', key);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'toggle_flag', 'feature_flag', key, { enabled });
  return { success: true };
}

export async function setFlagRollout(key: string, rolloutPercent: number) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin.from('feature_flags').update({ rollout_percent: rolloutPercent }).eq('key', key);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'set_flag_rollout', 'feature_flag', key, { rolloutPercent });
  return { success: true };
}

export async function deleteFlag(key: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin.from('feature_flags').delete().eq('key', key);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'delete_flag', 'feature_flag', key);
  return { success: true };
}
