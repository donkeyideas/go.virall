import { handleRoute, parseBody } from '@/app/api/_lib/handler';
import { GenerateContentInput } from '@govirall/api-types';
import { generateContentAI } from '@govirall/core';
import { createAdminClient } from '@govirall/db/admin';

export const POST = handleRoute(async ({ req, userId }) => {
  const body = await parseBody(req, GenerateContentInput);

  // Fetch user mission for goal-directed generation
  const admin = createAdminClient();
  const { data: user } = await admin
    .from('users')
    .select('mission')
    .eq('id', userId)
    .single();

  // If a platform account was specified, get its details
  let platformHandle: string | null = null;
  let followerCount: number | null = null;
  if (body.platformAccountId) {
    const { data: account } = await admin
      .from('platform_accounts_safe')
      .select('platform_username, follower_count')
      .eq('id', body.platformAccountId)
      .eq('user_id', userId)
      .single();
    if (account) {
      platformHandle = account.platform_username;
      followerCount = account.follower_count;
    }
  }

  const result = await generateContentAI({
    platform: body.platform,
    contentType: body.contentType,
    topic: body.topic,
    tone: body.tone,
    count: body.count,
    primaryGoal: user?.mission ?? null,
    platformHandle,
    followerCount,
  });

  // Save to DB (fire-and-forget)
  try {
    await admin
      .from('content_generations')
      .insert({
        user_id: userId,
        platform_account_id: body.platformAccountId ?? null,
        platform: body.platform,
        content_type: body.contentType,
        topic: body.topic,
        tone: body.tone,
        result: result.data,
        ai_provider: result.provider,
        tokens_used: result.tokensUsed ?? 0,
        cost_cents: result.costCents ?? 0,
      });
  } catch {
    // Ignore DB errors — results still returned
  }

  return result;
});
