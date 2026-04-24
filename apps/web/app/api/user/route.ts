import { handleRoute, parseBody, ApiError } from '../_lib/handler';
import { UpdateProfileInput } from '@govirall/api-types';

// GET /api/user -- get current user profile
export const GET = handleRoute(async ({ userId, supabase }) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) throw ApiError.notFound('User not found');

  return data;
});

// PATCH /api/user -- update profile
export const PATCH = handleRoute(async ({ req, userId, supabase }) => {
  const body = await parseBody(req, UpdateProfileInput);

  // If handle is being updated, check uniqueness
  if (body.handle) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('handle', body.handle)
      .neq('id', userId)
      .single();

    if (existing) throw ApiError.conflict('Handle already taken');
  }

  const { data, error } = await supabase
    .from('users')
    .update(body)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});

// DELETE /api/user -- delete account (soft: sets deleted_at)
export const DELETE = handleRoute(async ({ userId, supabase }) => {
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw ApiError.badRequest(error.message);

  return { deleted: true };
});
