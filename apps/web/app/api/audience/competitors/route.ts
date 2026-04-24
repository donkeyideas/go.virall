import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { AddCompetitorInput } from '@govirall/api-types';

// GET /api/audience/competitors
export const GET = handleRoute(async ({ userId, supabase }) => {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw ApiError.badRequest(error.message);

  return data ?? [];
});

// POST /api/audience/competitors
export const POST = handleRoute(async ({ req, userId, supabase }) => {
  const body = await parseBody(req, AddCompetitorInput);

  const { data, error } = await supabase
    .from('competitors')
    .insert({
      user_id: userId,
      platform: body.platform,
      platform_username: body.platform_username,
      label: body.label,
    })
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
