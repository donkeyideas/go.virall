import { handleRoute } from '../../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';

export const POST = handleRoute(async ({ userId }) => {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('users')
    .select('id, onboarded_at')
    .eq('id', userId)
    .maybeSingle();

  if (existing?.onboarded_at) {
    return { success: true, onboarded_at: existing.onboarded_at };
  }

  if (existing) {
    const { error } = await admin
      .from('users')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw new Error(`Update failed: ${error.message}`);
  } else {
    const { error } = await admin.from('users').insert({
      id: userId,
      email: '',
      display_name: 'User',
      handle: `user_${userId.slice(0, 8)}`,
      onboarded_at: new Date().toISOString(),
    });

    if (error) throw new Error(`Insert failed: ${error.message}`);
  }

  return { success: true };
});
