import { handleRoute, ApiError } from '../../_lib/handler';

// DELETE /api/platforms/[id] -- disconnect platform
export const DELETE = handleRoute(async ({ userId, supabase, params }) => {

  const { error } = await supabase
    .from('platform_accounts')
    .update({
      sync_status: 'disconnected',
      disconnected_at: new Date().toISOString(),
    })
    .eq('id', params!.id)
    .eq('user_id', userId);

  if (error) throw ApiError.badRequest(error.message);

  return { disconnected: true };
});
