import { createAdminClient } from '@govirall/db/admin';
import { ApiClient } from './api-client';

/**
 * The app resolves every key from `process.env` at runtime (see the AI
 * provider, OAuth config, Stripe, cron, etc.) — nothing reads
 * `api_configs.value_encrypted`. So a key can be fully configured in
 * .env.local / Vercel yet still have `is_set = false` in the DB, which made
 * this panel wrongly report "NOT SET".
 *
 * We therefore derive "configured" from the actual environment. Almost every
 * config key maps to its uppercased name; the few exceptions are listed here.
 */
const ENV_NAME_OVERRIDES: Record<string, string[]> = {
  stripe_publishable_key: ['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
  // Upstash / Vercel KV isn't referenced in code yet — accept the common names.
  upstash_redis_url: ['UPSTASH_REDIS_URL', 'UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL'],
  upstash_redis_token: ['UPSTASH_REDIS_TOKEN', 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN'],
};

function envNamesForKey(key: string): string[] {
  return ENV_NAME_OVERRIDES[key] ?? [key.toUpperCase()];
}

/** A key is "set" if its env var is present at runtime, OR it was set via this panel. */
function isKeyConfigured(key: string, dbIsSet: boolean): boolean {
  if (dbIsSet) return true;
  return envNamesForKey(key).some((name) => {
    const v = process.env[name];
    return typeof v === 'string' && v.trim().length > 0;
  });
}

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
        isSet: isKeyConfigured(c.key, c.is_set),
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
