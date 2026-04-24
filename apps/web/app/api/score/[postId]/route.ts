import { handleRoute, ApiError } from '../../_lib/handler';
import { computeViralScore } from '@govirall/core';

// POST /api/score/[postId] -- recompute and persist score for a saved post
export const POST = handleRoute(async ({ userId, params, supabase }) => {
  const postId = params!.postId;

  // Fetch post
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();

  if (error || !post) throw ApiError.notFound('Post not found');

  // Compute score
  const result = computeViralScore({
    platform: post.platform,
    format: post.format,
    hook: post.hook ?? '',
    caption: post.caption ?? '',
    hashtags: post.hashtags ?? [],
    scheduled_at: post.scheduled_at ?? undefined,
  });

  // Upsert viral_score row
  const { data: scoreRow, error: scoreError } = await supabase
    .from('viral_scores')
    .upsert(
      {
        post_id: postId,
        model_version: 'v1-rules',
        score: result.score,
        factors: result.signals,
        suggestions: result.improvements,
      },
      { onConflict: 'post_id, model_version' },
    )
    .select()
    .single();

  if (scoreError) throw ApiError.badRequest(scoreError.message);

  return { ...result, id: scoreRow?.id };
});
