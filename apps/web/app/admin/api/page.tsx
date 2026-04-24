import { createAdminClient } from '@govirall/db/admin';
import { ApiClient } from './api-client';

export default async function AdminApiPage() {
  const admin = createAdminClient();

  const [configsRes, errorsRes] = await Promise.all([
    admin
      .from('api_configs')
      .select('key, label, description, is_set, category, updated_at, last_used_at, usage_count, last_error, last_rotated_at')
      .order('category', { ascending: true })
      .order('label', { ascending: true }),
    admin
      .from('audit_log')
      .select('id, action, metadata, created_at')
      .like('action', '%api%error%')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <ApiClient
      configs={(configsRes.data ?? []).map((c) => ({
        key: c.key,
        label: c.label,
        description: c.description,
        isSet: c.is_set,
        category: c.category,
        updatedAt: c.updated_at,
        lastUsedAt: c.last_used_at,
        usageCount: c.usage_count ?? 0,
        lastError: c.last_error,
        lastRotatedAt: c.last_rotated_at,
      }))}
      recentErrors={(errorsRes.data ?? []).map((e) => ({
        id: e.id,
        action: e.action,
        metadata: e.metadata,
        createdAt: e.created_at,
      }))}
    />
  );
}
