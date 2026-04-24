'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function setApiConfig(key: string, value: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('api_configs')
    .upsert({
      key,
      value_encrypted: value,
      is_set: true,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'set_api_config', 'api_config', key);
  return { success: true };
}

export async function clearApiConfig(key: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('api_configs')
    .update({
      value_encrypted: null,
      is_set: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key);

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'clear_api_config', 'api_config', key);
  return { success: true };
}

export async function rotateApiConfig(key: string, newValue: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('api_configs')
    .update({
      value_encrypted: newValue,
      is_set: true,
      last_rotated_at: new Date().toISOString(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key);

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'rotate_api_config', 'api_config', key);
  return { success: true };
}

export async function addApiConfig(data: {
  key: string;
  label: string;
  description?: string;
  category: string;
}) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from('api_configs')
    .insert({
      key: data.key,
      label: data.label,
      description: data.description ?? null,
      category: data.category,
      is_set: false,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'add_api_config', 'api_config', data.key);
  return { success: true };
}
