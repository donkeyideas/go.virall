import { handleRoute, parseBody } from '@/app/api/_lib/handler';
import { z } from 'zod';
import { aiChat } from '@govirall/core';
import { createAdminClient } from '@govirall/db/admin';

const SuggestTopicInput = z.object({
  platform: z.string(),
  contentType: z.enum(['scripts', 'captions', 'ideas', 'bio']),
});

const PLATFORM_CONTEXT: Record<string, string> = {
  tiktok: 'TikTok (short-form video, trends, challenges, storytelling hooks, 15-60 sec)',
  instagram: 'Instagram (Reels, carousels, Stories, aesthetic visuals, lifestyle)',
  youtube: 'YouTube (long-form video, tutorials, vlogs, deep dives, SEO titles)',
  linkedin: 'LinkedIn (professional thought leadership, career tips, industry insights)',
  x: 'X/Twitter (hot takes, threads, commentary, breaking news, concise opinions)',
  facebook: 'Facebook (community posts, shareable content, longer captions, groups)',
  twitch: 'Twitch (live streaming, gaming, IRL, community interaction)',
};

const CONTENT_TYPE_CONTEXT: Record<string, string> = {
  scripts: 'video script topic',
  captions: 'post caption topic',
  ideas: 'content idea',
  bio: 'profile bio description / niche angle',
};

export const POST = handleRoute(async ({ req, userId }) => {
  const body = await parseBody(req, SuggestTopicInput);
  const platformCtx = PLATFORM_CONTEXT[body.platform] ?? body.platform;
  const contentCtx = CONTENT_TYPE_CONTEXT[body.contentType] ?? body.contentType;

  // Fetch user profile, connected platforms, and recent posts
  const admin = createAdminClient();

  const [userRes, platformsRes, postsRes] = await Promise.all([
    admin.from('users').select('display_name, bio, mission, handle').eq('id', userId).single(),
    admin.from('platform_accounts_safe').select('platform, platform_username, platform_display_name, follower_count, post_count').eq('user_id', userId),
    admin.from('posts').select('caption, hook, hashtags, platform').eq('user_id', userId).order('published_at', { ascending: false }).limit(10),
  ]);

  const user = userRes.data;
  const platforms = platformsRes.data ?? [];
  const recentPosts = postsRes.data ?? [];

  // Infer niche from all available signals
  const nicheSignals: string[] = [];

  if (user?.bio) nicheSignals.push(`Bio: "${user.bio}"`);
  if (user?.display_name) nicheSignals.push(`Display name: "${user.display_name}"`);
  if (user?.handle) nicheSignals.push(`Handle: @${user.handle}`);

  for (const p of platforms) {
    nicheSignals.push(`${p.platform} account: @${p.platform_username}${p.platform_display_name ? ` ("${p.platform_display_name}")` : ''}${p.follower_count ? `, ${p.follower_count.toLocaleString()} followers` : ''}`);
  }

  // Recent post content for niche clues
  const postClues: string[] = [];
  for (const post of recentPosts.slice(0, 5)) {
    const text = post.hook || post.caption || '';
    if (text) postClues.push(text.slice(0, 100));
    if (post.hashtags?.length > 0) postClues.push(`Hashtags: ${post.hashtags.slice(0, 5).join(', ')}`);
  }

  const prompt = `You are a social media content strategist. Your job: figure out this creator's NICHE from their profile, then suggest ONE ${contentCtx} specifically for their niche on ${platformCtx}.

CREATOR INFO:
${nicheSignals.length > 0 ? nicheSignals.join('\n') : 'No profile info available.'}
${postClues.length > 0 ? `\nRECENT POSTS:\n${postClues.join('\n')}` : ''}

STEP 1: Look at their usernames, display name, bio, and posts. What is their niche? (e.g., if username is "basktballapp" → basketball. If bio says "fitness coach" → fitness. If posts mention "recipes" → cooking.)

STEP 2: Generate a ${contentCtx} that is DIRECTLY about their niche. For example:
- Basketball account → "Top 5 crossover moves that broke ankles this season"
- Fitness coach → "The 3 exercises personal trainers never skip"
- Travel blogger → "Hidden gems in Bali that tourists always miss"

RULES:
- The topic MUST be about their specific niche — NOT about "content creation" or "growing on social media"
- Be specific (not "basketball tips" but "Why Jokic's passing IQ changes how we think about centers")
- Use formats that work on ${body.platform} (hooks, lists, hot takes, POVs, etc.)
- 5-15 words max
- Return ONLY the topic — no quotes, no explanation, no numbering`;

  const result = await aiChat(prompt, {
    temperature: 0.9,
    maxTokens: 100,
  });

  if (!result?.text) {
    return { topic: getFallback(body.platform) };
  }

  // Clean up the response — remove quotes, numbering, "Step" prefixes, etc.
  let topic = result.text.trim();
  // Remove wrapping quotes
  topic = topic.replace(/^["']|["']$/g, '');
  // Remove "Step 2:" or numbering prefixes
  topic = topic.replace(/^(step\s*\d+[:.]\s*)/i, '');
  topic = topic.replace(/^\d+[.)]\s*/, '');
  // If multi-line, take first line only
  topic = topic.split('\n')[0].trim();

  return { topic };
});

function getFallback(platform: string): string {
  const fallbacks: Record<string, string[]> = {
    tiktok: [
      '5 things I wish I knew before starting',
      'POV: The moment everything changed',
      'Ranking the best to worst in my niche',
    ],
    instagram: [
      'Behind the scenes of what I do',
      'Save this for later — you will need it',
      'The honest truth nobody talks about',
    ],
    youtube: [
      'I tried this for 30 days — here is what happened',
      'The complete beginner guide nobody made yet',
      'Everything wrong with mainstream advice',
    ],
    linkedin: [
      'The lesson that took me years to learn',
      'Why most people in my field get this wrong',
      'One habit change that transformed my work',
    ],
    x: [
      'Hot take that needs to be said',
      'Thread: lessons from doing this for years',
      'The simplest advice that actually works',
    ],
    facebook: [
      'Something our community needs to talk about',
      'Share your best tip in the comments',
      'The story behind why I started',
    ],
    twitch: [
      'Chat decides everything today',
      'First time trying this live',
      'Community challenge night',
    ],
  };
  const list = fallbacks[platform] ?? fallbacks.tiktok;
  return list[Math.floor(Math.random() * list.length)];
}
