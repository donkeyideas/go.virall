'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function adminSendNotification(data: {
  targetType: 'all' | 'user' | 'tier';
  targetValue?: string;
  kind: string;
  title: string;
  body?: string;
}) {
  const { user, admin } = await requireAdmin();

  let userIds: string[] = [];

  if (data.targetType === 'all') {
    const { data: users } = await admin.from('users').select('id');
    userIds = (users ?? []).map((u) => u.id);
  } else if (data.targetType === 'user' && data.targetValue) {
    userIds = [data.targetValue];
  } else if (data.targetType === 'tier' && data.targetValue) {
    const { data: users } = await admin
      .from('users')
      .select('id')
      .eq('subscription_tier', data.targetValue);
    userIds = (users ?? []).map((u) => u.id);
  }

  if (userIds.length === 0) return { error: 'No target users found' };

  const rows = userIds.map((uid) => ({
    user_id: uid,
    kind: data.kind,
    title: data.title,
    body: data.body ?? null,
  }));

  const { error } = await admin.from('notifications').insert(rows);
  if (error) return { error: error.message };

  await writeAuditLog(admin, user.id, 'admin_send_notification', 'notification', undefined, {
    targetType: data.targetType,
    targetValue: data.targetValue,
    count: userIds.length,
  });

  return { success: true, count: userIds.length };
}

export async function adminDeleteNotification(id: string) {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from('notifications').delete().eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'delete_notification', 'notification', id);
  return { success: true };
}
