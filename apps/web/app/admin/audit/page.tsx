import { createAdminClient } from '@govirall/db/admin';
import { AuditClient } from './audit-client';

export default async function AdminAuditPage() {
  const admin = createAdminClient();

  const { data: logs } = await admin
    .from('audit_log')
    .select('id, actor_user_id, action, target_type, target_id, metadata, ip_address, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  // Get actor names
  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_user_id).filter(Boolean))];
  const { data: actors } = actorIds.length > 0
    ? await admin.from('users').select('id, handle, display_name').in('id', actorIds as string[])
    : { data: [] };
  const actorMap: Record<string, { handle: string; displayName: string }> = {};
  for (const a of actors ?? []) actorMap[a.id] = { handle: a.handle, displayName: a.display_name };

  return (
    <AuditClient
      logs={(logs ?? []).map((l) => ({
        id: l.id,
        actor: l.actor_user_id ? actorMap[l.actor_user_id] ?? { handle: 'unknown', displayName: 'Unknown' } : { handle: 'system', displayName: 'System' },
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        metadata: l.metadata,
        ipAddress: l.ip_address,
        createdAt: l.created_at,
      }))}
    />
  );
}
