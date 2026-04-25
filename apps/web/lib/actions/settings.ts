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

export async function uploadAvatar(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('avatar') as File | null;
  if (!file || file.size === 0) return { error: 'No file selected' };

  // Validate file type & size
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) return { error: 'Only JPG, PNG, WebP, or GIF files are allowed' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Image must be under 5 MB' };

  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  // Upload to avatars bucket (public)
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  // Get public URL
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Update user record
  const admin = createAdminClient();
  const { error: dbError } = await admin
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (dbError) return { error: dbError.message };

  return { success: true, avatarUrl };
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
