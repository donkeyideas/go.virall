import { handleRoute, parseBody, ApiError } from '../../../_lib/handler';
import { CreateDealNoteInput } from '@govirall/api-types';

// POST /api/deals/[id]/notes -- add a note to a deal
export const POST = handleRoute(async ({ req, userId, params, supabase }) => {
  const body = await parseBody(req, CreateDealNoteInput);

  // Verify deal ownership
  const { data: deal } = await supabase
    .from('deals')
    .select('id')
    .eq('id', params!.id)
    .eq('user_id', userId)
    .single();

  if (!deal) throw ApiError.notFound('Deal not found');

  const { data, error } = await supabase
    .from('deal_events')
    .insert({
      deal_id: params!.id,
      kind: 'note',
      payload: { body: body.body },
    })
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
