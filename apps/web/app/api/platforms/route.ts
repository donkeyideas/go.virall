import { handleRoute, ApiError } from '../_lib/handler';

// GET /api/platforms -- list connected platforms
export const GET = handleRoute(async ({ userId, supabase }) => {

  const { data, error } = await supabase
    .from('platform_accounts_safe')
    .select('*')
    .eq('user_id', userId)
    .order('connected_at', { ascending: false });

  if (error) throw ApiError.badRequest(error.message);

  return data ?? [];
});
