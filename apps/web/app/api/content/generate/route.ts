import { handleRoute, parseBody } from '@/app/api/_lib/handler';
import { GenerateContentInput } from '@govirall/api-types';
import { generateContentAI } from '@govirall/core';
import { createAdminClient } from '@govirall/db/admin';

export const POST = handleRoute(async ({ req, userId }) => {
  const body = await parseBody(req, GenerateContentInput);

  const admin = createAdminClient();

  // Build queries — filter posts to selected account when provided
  let postsQuery = admin
    .from('posts')
    .select('caption, hook, hashtags, platform')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })
    .limit(15);

  if (body.platformAccountId) {
    postsQuery = postsQuery.eq('platform_account_id', body.platformAccountId);
  }

  const [userRes, platformsRes, postsRes] = await Promise.all([
    admin
      .from('users')
      .select('mission, bio, display_name, handle')
      .eq('id', userId)
      .single(),
    admin
      .from('platform_accounts')
      .select('id, platform, platform_username, platform_display_name, platform_bio, follower_count')
      .eq('user_id', userId)
      .is('disconnected_at', null),
    postsQuery,
  ]);

  const user = userRes.data;
  const allPlatforms = platformsRes.data ?? [];
  const recentPosts = postsRes.data ?? [];

  // Find the specific platform account for this generation
  let platformHandle: string | null = null;
  let platformDisplayName: string | null = null;
  let platformBio: string | null = null;
  let followerCount: number | null = null;

  if (body.platformAccountId) {
    const account = allPlatforms.find((p) => p.id === body.platformAccountId);
    if (account) {
      platformHandle = account.platform_username;
      platformDisplayName = account.platform_display_name;
      platformBio = account.platform_bio;
      followerCount = account.follower_count;
    }
  } else {
    const account = allPlatforms.find((p) => p.platform === body.platform);
    if (account) {
      platformHandle = account.platform_username;
      platformDisplayName = account.platform_display_name;
      platformBio = account.platform_bio;
      followerCount = account.follower_count;
    }
  }

  // Niche context: only from the selected account, not all accounts
  const selectedAccount = body.platformAccountId
    ? allPlatforms.find((p) => p.id === body.platformAccountId)
    : allPlatforms.find((p) => p.platform === body.platform);

  const bestDisplayName =
    platformDisplayName ?? selectedAccount?.platform_display_name ?? user?.display_name ?? null;

  const nicheSummary = selectedAccount?.platform_display_name ?? null;

  // Posts are already filtered at DB level — use them directly
  const postClues: string[] = [];
  for (const post of recentPosts.slice(0, 8)) {
    const text = post.hook || post.caption || '';
    if (text) postClues.push(text.slice(0, 120));
    if (post.hashtags?.length > 0)
      postClues.push(`Hashtags: ${post.hashtags.slice(0, 5).join(', ')}`);
  }
  const recentContentSummary =
    postClues.length > 0 ? postClues.join('\n') : null;

  const result = await generateContentAI({
    platform: body.platform,
    contentType: body.contentType,
    topic: body.topic,
    tone: body.tone,
    count: body.count,
    primaryGoal: user?.mission ?? null,
    platformHandle,
    followerCount,
    userBio: platformBio || user?.bio || null,
    displayName: bestDisplayName,
    userHandle: platformHandle ?? user?.handle ?? null,
    nicheSummary,
    recentContentSummary,
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
