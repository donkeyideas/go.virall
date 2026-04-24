import { createAdminClient } from '@govirall/db/admin';
import { UsersClient } from './users-client';

export default async function AdminUsersPage() {
  const admin = createAdminClient();

  const [usersRes, roleStatsRes] = await Promise.all([
    admin
      .from('users')
      .select('id, handle, display_name, email, avatar_url, role, subscription_tier, created_at, deleted_at')
      .order('created_at', { ascending: false })
      .limit(100),
    admin.from('users').select('role'),
  ]);

  // Count platforms per user
  const userIds = (usersRes.data ?? []).map((u) => u.id);
  const { data: platformData } = userIds.length > 0
    ? await admin
        .from('platform_accounts')
        .select('user_id')
        .in('user_id', userIds)
    : { data: [] };

  const platformCounts: Record<string, number> = {};
  for (const p of platformData ?? []) {
    platformCounts[p.user_id] = (platformCounts[p.user_id] ?? 0) + 1;
  }

  // Role stats
  const roleCounts: Record<string, number> = {};
  for (const u of roleStatsRes.data ?? []) {
    const r = (u as { role: string }).role;
    roleCounts[r] = (roleCounts[r] ?? 0) + 1;
  }

  const users = (usersRes.data ?? []).map((u) => ({
    id: u.id,
    handle: u.handle,
    displayName: u.display_name,
    email: u.email,
    avatarUrl: u.avatar_url,
    role: u.role,
    tier: u.subscription_tier,
    platformCount: platformCounts[u.id] ?? 0,
    createdAt: u.created_at,
    isBanned: !!u.deleted_at,
  }));

  return <UsersClient users={users} roleCounts={roleCounts} />;
}
