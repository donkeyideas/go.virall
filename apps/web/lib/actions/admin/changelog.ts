'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function createChangelogEntry(data: {
  version: string;
  title: string;
  body: string;
  category: string;
}) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin.from('changelog_entries').insert({
    version: data.version,
    title: data.title,
    body: data.body,
    category: data.category,
  });

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'create_changelog', 'changelog', data.version);
  return { success: true };
}

export async function updateChangelogEntry(id: string, data: {
  version?: string;
  title?: string;
  body?: string;
  category?: string;
}) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin.from('changelog_entries').update(data).eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'update_changelog', 'changelog', id);
  return { success: true };
}

export async function deleteChangelogEntry(id: string) {
  const { user, admin } = await requireAdmin();

  const { error } = await admin.from('changelog_entries').delete().eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'delete_changelog', 'changelog', id);
  return { success: true };
}
