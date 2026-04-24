'use server';

import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';

/**
 * Checks that the current user is authenticated and has role='admin'.
 * Returns the user and an admin (service-role) Supabase client.
 * Throws if not authenticated or not admin.
 */
export async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return { user, admin };
}

/**
 * Writes an entry to the audit_log table (if it exists).
 * Fire-and-forget — errors are logged, not thrown.
 */
export async function writeAuditLog(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await admin.from('audit_log').insert({
      actor_user_id: actorId,
      actor_role: 'admin',
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      metadata: metadata ?? {},
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write:', err);
  }
}
