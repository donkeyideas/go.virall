import { handleRoute, parseBody, ApiError } from '../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { aiChat } from '@govirall/core';
import { z } from 'zod';

const ChatInput = z.object({
  message: z.string().min(1).max(2000),
});

/**
 * GET /api/chat
 * Fetch recent chat history for the current user.
 */
export const GET = handleRoute(async ({ userId }) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(50);

  return {
    messages: (data ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'ai',
      text: m.content,
    })),
  };
});

/**
 * POST /api/chat
 * Chat with Virall AI strategist — context-aware responses using user data.
 * Persists both user message and AI response to DB.
 */
export const POST = handleRoute(async ({ req, userId }) => {
  const { message } = await parseBody(req, ChatInput);

  const admin = createAdminClient();

  // Save user message immediately
  await admin.from('chat_messages').insert({
    user_id: userId,
    role: 'user',
    content: message,
  });

  // Fetch user context for personalized responses
  const [profileRes, platformsRes, smoRes] = await Promise.all([
    admin.from('users').select('display_name, mission, subscription_tier').eq('id', userId).single(),
    admin.from('platform_accounts_safe').select('platform, platform_username, follower_count, sync_status').eq('user_id', userId),
    admin.from('smo_scores').select('score, factor_profile, factor_content, factor_consistency, factor_engagement, factor_growth, factor_monetization').eq('user_id', userId).order('computed_at', { ascending: false }).limit(1).single(),
  ]);

  const profile = profileRes.data;
  const platforms = (platformsRes.data ?? []).filter((p: { sync_status: string }) => p.sync_status === 'healthy');
  const smo = smoRes.data;
  const totalFollowers = platforms.reduce((s: number, p: { follower_count: number | null }) => s + (p.follower_count ?? 0), 0);

  const platformSummary = platforms.map((p: { platform: string; platform_username: string; follower_count: number | null }) =>
    `${p.platform}: @${p.platform_username} (${p.follower_count?.toLocaleString() ?? 0} followers)`
  ).join(', ');

  const smoSummary = smo
    ? `SMO Score: ${smo.score}/100 (Profile: ${smo.factor_profile}, Content: ${smo.factor_content}, Consistency: ${smo.factor_consistency}, Engagement: ${smo.factor_engagement}, Growth: ${smo.factor_growth}, Monetization: ${smo.factor_monetization})`
    : 'SMO Score: not yet computed';

  // Fetch recent chat history for context
  const { data: recentMessages } = await admin
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const chatHistory = (recentMessages ?? [])
    .reverse()
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `You are Virall AI, the built-in social media strategist for Go Virall — a social intelligence platform for creators and influencers. You give concise, actionable advice.

Creator context:
- Name: ${profile?.display_name ?? 'Creator'}
- Mission: ${profile?.mission ?? 'grow-audience'}
- Plan: ${profile?.subscription_tier ?? 'free'}
- Connected platforms: ${platformSummary || 'none yet'}
- Total followers: ${totalFollowers.toLocaleString()}
- ${smoSummary}

Recent conversation:
${chatHistory || '(first message)'}

Keep responses short (2-4 sentences max). Be specific, data-informed, and encouraging. Reference the creator's actual data when relevant. If they ask about features, guide them to the right section of the app (Compose, Studio, Audience, Revenue, Settings).

IMPORTANT: Reply in plain text only. Do NOT use markdown formatting. No asterisks, no hashtag headings, no dashes for lists, no backticks. Write naturally as if texting a friend.

User message: ${message}`;

  const response = await aiChat(systemPrompt, {
    temperature: 0.7,
    maxTokens: 500,
    timeout: 30000,
  });

  if (!response) {
    throw ApiError.badRequest('AI is temporarily unavailable. Please try again in a moment.');
  }

  // Save AI response
  await admin.from('chat_messages').insert({
    user_id: userId,
    role: 'ai',
    content: response.text,
  });

  return {
    reply: response.text,
    provider: response.provider,
  };
});
