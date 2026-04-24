import { handleRoute, ApiError } from '../../_lib/handler';

// GET /api/audience/growth -- 90-day audience growth data
export const GET = handleRoute(async ({ req, userId, supabase }) => {
  const platform = req.nextUrl.searchParams.get('platform');

  let q = supabase
    .from('audience_snapshots')
    .select('*')
    .eq('user_id', userId)
    .gte('captured_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .order('captured_at', { ascending: true });

  if (platform) q = q.eq('platform', platform);

  const { data, error } = await q;

  if (error) throw ApiError.badRequest(error.message);

  return data ?? [];
});
