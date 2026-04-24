'use server';

import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';

export async function completeOnboarding(data: {
  theme: string;
  mission: string;
}) {
  // 1. Verify authenticated
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { theme, mission } = data;
  const admin = createAdminClient();

  // 2. Check if user row exists
  const { data: existing } = await admin
    .from('users')
    .select('id, handle, onboarded_at')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    // Row exists — just update the fields we need
    const { error } = await admin
      .from('users')
      .update({
        theme: theme || 'glassmorphic',
        mission: mission || 'grow-audience',
        onboarded_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) return { error: `Update failed: ${error.message}` };
  } else {
    // No row — insert with admin
    const handle = (user.email ?? 'user')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 30)
      .padEnd(3, '_');

    const { error } = await admin.from('users').insert({
      id: user.id,
      email: user.email ?? '',
      display_name:
        user.user_metadata?.display_name ??
        user.email?.split('@')[0] ??
        'User',
      handle,
      theme: theme || 'glassmorphic',
      mission: mission || 'grow-audience',
      onboarded_at: new Date().toISOString(),
    });

    if (error) return { error: `Insert failed: ${error.message}` };
  }

  // 3. Verify it was actually saved
  const { data: verify } = await admin
    .from('users')
    .select('id, onboarded_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!verify?.onboarded_at) {
    return {
      error: `Verification failed: row ${verify ? 'exists but onboarded_at is null' : 'does not exist'}. User ID: ${user.id}`,
    };
  }

  return { success: true };
}
