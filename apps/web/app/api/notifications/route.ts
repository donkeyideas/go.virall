import { handleRoute, parseQuery, ApiError } from '../_lib/handler';
import { ListNotificationsQuery } from '@govirall/api-types';

// GET /api/notifications
export const GET = handleRoute(async ({ req, userId, supabase }) => {
  const query = parseQuery(req, ListNotificationsQuery);

  let q = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(query.limit);

  if (query.unread_only) q = q.is('read_at', null);
  if (query.cursor) q = q.lt('created_at', query.cursor);

  const { data, error } = await q;

  if (error) throw ApiError.badRequest(error.message);

  return {
    items: data ?? [],
    cursor: data && data.length === query.limit ? data[data.length - 1].created_at : null,
  };
});

// POST /api/notifications -- mark all as read
export const POST = handleRoute(async ({ userId, supabase }) => {

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw ApiError.badRequest(error.message);

  return { success: true };
});
