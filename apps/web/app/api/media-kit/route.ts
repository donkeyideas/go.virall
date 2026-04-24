import { handleRoute, ApiError } from '../_lib/handler';

// GET /api/media-kit -- get current user's media kit
export const GET = handleRoute(async ({ userId, supabase }) => {

  const { data, error } = await supabase
    .from('media_kits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) throw ApiError.notFound('Media kit not found');

  return data;
});

// PATCH /api/media-kit -- update media kit
export const PATCH = handleRoute(async ({ req, userId, supabase }) => {
  const body = await req.json();

  const { data, error } = await supabase
    .from('media_kits')
    .upsert(
      { user_id: userId, ...body, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
