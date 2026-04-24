import { handleRoute, parseBody, ApiError } from '../../../_lib/handler';
import { UpdateCompetitorInput } from '@govirall/api-types';

// PATCH /api/audience/competitors/[id]
export const PATCH = handleRoute(async ({ req, userId, params, supabase }) => {
  const body = await parseBody(req, UpdateCompetitorInput);

  const { data, error } = await supabase
    .from('competitors')
    .update(body)
    .eq('id', params!.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound('Competitor not found');

  return data;
});

// DELETE /api/audience/competitors/[id]
export const DELETE = handleRoute(async ({ userId, params, supabase }) => {

  const { error } = await supabase
    .from('competitors')
    .delete()
    .eq('id', params!.id)
    .eq('user_id', userId);

  if (error) throw ApiError.badRequest(error.message);

  return { deleted: true };
});
