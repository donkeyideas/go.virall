import { handleRoute, ApiError } from '../../_lib/handler';

// POST /api/notifications/[id] -- mark single notification as read
export const POST = handleRoute(async ({ userId, params, supabase }) => {

  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', params!.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) throw ApiError.notFound('Notification not found');

  return data;
});
