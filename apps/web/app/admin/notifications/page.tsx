import { createAdminClient } from '@govirall/db/admin';
import { NotificationsClient } from './notifications-client';

export default async function AdminNotificationsPage() {
  const admin = createAdminClient();

  const [notifRes, totalRes, unreadRes] = await Promise.all([
    admin
      .from('notifications')
      .select('id, user_id, kind, title, body, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    admin.from('notifications').select('id', { count: 'exact', head: true }),
    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null),
  ]);

  // Collect unique user IDs and fetch handles in a single query
  const userIds = [...new Set((notifRes.data ?? []).map((n) => n.user_id))];
  const { data: userRows } =
    userIds.length > 0
      ? await admin.from('users').select('id, handle').in('id', userIds)
      : { data: [] };

  const handleMap: Record<string, string> = {};
  for (const u of userRows ?? []) handleMap[u.id] = u.handle;

  const totalSent = totalRes.count ?? 0;
  const unreadCount = unreadRes.count ?? 0;

  return (
    <NotificationsClient
      notifications={(notifRes.data ?? []).map((n) => ({
        id: n.id,
        userHandle: handleMap[n.user_id] ?? 'unknown',
        kind: n.kind,
        title: n.title,
        body: n.body ?? '',
        isRead: n.read_at !== null,
        createdAt: n.created_at,
      }))}
      totalSent={totalSent}
      unreadCount={unreadCount}
    />
  );
}
