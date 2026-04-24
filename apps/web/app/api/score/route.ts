import { handleRoute, parseBody } from '../_lib/handler';
import { ScorePostInput } from '@govirall/api-types';
import { computeViralScore } from '@govirall/core';

// POST /api/score -- live score computation (no persistence)
export const POST = handleRoute(async ({ req }) => {
  const body = await parseBody(req, ScorePostInput);

  const result = computeViralScore({
    platform: body.platform,
    format: body.format,
    hook: body.hook,
    caption: body.caption,
    hashtags: body.hashtags,
    scheduled_at: body.scheduled_at,
  });

  return result;
});
