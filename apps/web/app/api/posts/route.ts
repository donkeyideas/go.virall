import { handleRoute, parseBody, parseQuery, ApiError } from '../_lib/handler';
import { CreatePostInput, ListPostsQuery } from '@govirall/api-types';

// GET /api/posts -- list posts
export const GET = handleRoute(async ({ req, userId, supabase }) => {
  const query = parseQuery(req, ListPostsQuery);

  let q = supabase
    .from('posts')
    .select('*, viral_scores(score, created_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(query.limit);

  if (query.platform) q = q.eq('platform', query.platform);
  if (query.status) q = q.eq('status', query.status);
  if (query.cursor) q = q.lt('created_at', query.cursor);

  const { data, error } = await q;

  if (error) throw ApiError.badRequest(error.message);

  return {
    items: data ?? [],
    cursor: data && data.length === query.limit ? data[data.length - 1].created_at : null,
  };
});

// POST /api/posts -- create post
export const POST = handleRoute(async ({ req, userId, supabase }) => {
  const body = await parseBody(req, CreatePostInput);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      platform: body.platform,
      format: body.format,
      hook: body.hook,
      caption: body.caption,
      hashtags: body.hashtags,
      scheduled_at: body.scheduled_at ?? null,
      status: body.status,
    })
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
