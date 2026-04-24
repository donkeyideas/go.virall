import { handleRoute, ApiError } from '../../../_lib/handler';

// GET /api/deals/[id]/events -- deal event timeline
export const GET = handleRoute(async ({ userId, params, supabase }) => {

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
    .select('*')
    .eq('deal_id', params!.id)
    .order('created_at', { ascending: false });

  if (error) throw ApiError.badRequest(error.message);

  return data ?? [];
});
