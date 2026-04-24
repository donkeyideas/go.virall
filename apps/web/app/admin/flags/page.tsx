import { createAdminClient } from '@govirall/db/admin';
import { FlagsClient } from './flags-client';

export default async function AdminFlagsPage() {
  const admin = createAdminClient();

  const { data: flags } = await admin
    .from('feature_flags')
    .select('key, description, enabled, rollout_percent, created_at')
    .order('created_at', { ascending: false });

  return (
    <FlagsClient
      flags={(flags ?? []).map((f) => ({
        key: f.key,
        description: f.description,
        enabled: f.enabled,
        rolloutPercent: f.rollout_percent,
        createdAt: f.created_at,
      }))}
    />
  );
}
