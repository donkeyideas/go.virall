import { handleRoute, parseBody, ApiError } from '../../../_lib/handler';
import { DismissCollabInput } from '@govirall/api-types';

// PATCH /api/audience/collab-matches/[id]
export const PATCH = handleRoute(async ({ req, userId, params, supabase }) => {
  const body = await parseBody(req, DismissCollabInput);

  const updatePayload: Record<string, string> = {};
  if (body.status === 'dismissed') {
    updatePayload.dismissed_at = new Date().toISOString();
  } else if (body.status === 'contacted') {
    updatePayload.acted_on_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('collab_matches')
    .update(updatePayload)
    .eq('id', params!.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound('Collab match not found');

  return data;
});
