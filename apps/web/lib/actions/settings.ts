'use server';

import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';

export async function updateProfile(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const updates: Record<string, unknown> = {};
  const displayName = formData.get('display_name') as string;
  const handle = formData.get('handle') as string;
  const bio = formData.get('bio') as string;
  const theme = formData.get('theme') as string;
  const mission = formData.get('mission') as string;
  const timezone = formData.get('timezone') as string;

  if (displayName) updates.display_name = displayName;
  if (handle) updates.handle = handle;
  if (bio !== null) updates.bio = bio;
  if (theme) updates.theme = theme;
  if (mission) updates.mission = mission;
  if (timezone) updates.timezone = timezone;

  const admin = createAdminClient();

  // Uniqueness check for handle
  if (handle) {
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('handle', handle)
      .neq('id', user.id)
      .single();

    if (existing) return { error: 'Handle already taken' };
  }

  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateNotificationPrefs(prefs: Record<string, boolean>) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ notification_prefs: prefs })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { error: error.message };

  await supabase.auth.signOut();
  return { success: true };
}

export async function exportData() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();

  const [profile, posts, deals, invoices, platforms] = await Promise.all([
    admin.from('users').select('*').eq('id', user.id).single(),
    admin.from('posts').select('*').eq('user_id', user.id),
    admin.from('deals').select('*').eq('user_id', user.id),
    admin.from('invoices').select('*').eq('user_id', user.id),
    admin.from('platform_accounts_safe').select('*').eq('user_id', user.id),
  ]);

  return {
    success: true,
    data: {
      profile: profile.data,
      posts: posts.data,
      deals: deals.data,
      invoices: invoices.data,
      platforms: platforms.data,
      exported_at: new Date().toISOString(),
    },
  };
}
