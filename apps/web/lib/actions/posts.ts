'use server';

import { createServerClient } from '@govirall/db/server';

export async function createPost(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const hook = (formData.get('hook') as string) || '';
  const platform = formData.get('platform') as string;
  const format = formData.get('format') as string;

  if (!platform || !format) {
    return { error: 'Platform and format are required' };
  }

  const hashtagsRaw = formData.get('hashtags') as string;
  const hashtags = hashtagsRaw ? hashtagsRaw.split(',').map((h) => h.trim()).filter(Boolean) : [];

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      platform,
      format,
      hook,
      caption: (formData.get('caption') as string) || '',
      hashtags,
      scheduled_at: (formData.get('scheduled_at') as string) || null,
      status: (formData.get('status') as string) || 'draft',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function updatePost(postId: string, formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const updates: Record<string, unknown> = {};
  const hook = formData.get('hook') as string;
  const caption = formData.get('caption') as string;
  const platform = formData.get('platform') as string;
  const format = formData.get('format') as string;
  const scheduledAt = formData.get('scheduled_at') as string;
  const status = formData.get('status') as string;
  const hashtagsRaw = formData.get('hashtags') as string;

  if (hook !== null) updates.hook = hook;
  if (caption !== null) updates.caption = caption;
  if (platform) updates.platform = platform;
  if (format) updates.format = format;
  if (scheduledAt) updates.scheduled_at = scheduledAt;
  if (status) updates.status = status;
  if (hashtagsRaw !== null) {
    updates.hashtags = hashtagsRaw.split(',').map((h) => h.trim()).filter(Boolean);
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', postId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function deletePost(postId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
