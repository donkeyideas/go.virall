import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { UpdatePostInput } from '@govirall/api-types';

// GET /api/posts/[id]
export const GET = handleRoute(async ({ userId, params, supabase }) => {

  const { data, error } = await supabase
    .from('posts')
    .select('*, viral_scores(*)')
    .eq('id', params!.id)
    .eq('user_id', userId)
    .single();

  if (error || !data) throw ApiError.notFound('Post not found');

  return data;
});

// PATCH /api/posts/[id]
export const PATCH = handleRoute(async ({ req, userId, params, supabase }) => {
  const body = await parseBody(req, UpdatePostInput);

  const { data, error } = await supabase
    .from('posts')
    .update(body)
    .eq('id', params!.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound('Post not found');

  return data;
});

// DELETE /api/posts/[id]
export const DELETE = handleRoute(async ({ userId, params, supabase }) => {

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', params!.id)
    .eq('user_id', userId);

  if (error) throw ApiError.badRequest(error.message);

  return { deleted: true };
});
