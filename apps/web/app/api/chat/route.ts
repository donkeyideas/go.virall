import { handleRoute, parseBody, ApiError } from '../_lib/handler';
import { createAdminClient } from '@govirall/db/admin';
import { aiChat } from '@govirall/core';
import { z } from 'zod';

const ChatInput = z.object({
  message: z.string().min(1).max(2000),
});

function fmtCents(cents: number): string {
  const d = cents / 100;
  return d % 1 === 0 ? `$${d.toLocaleString('en-US')}` : `$${d.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  // Fetch ALL user context for truly personalized responses
  const [profileRes, platformsRes, smoRes, dealsRes, invoicesRes, postsRes, mediaKitRes, snapshotsRes] = await Promise.all([
    admin.from('users').select('display_name, bio, avatar_url, handle, mission, subscription_tier, created_at').eq('id', userId).single(),
    admin.from('platform_accounts_safe').select('platform, platform_username, follower_count, following_count, post_count, sync_status').eq('user_id', userId),
    admin.from('smo_scores').select('score, factor_profile, factor_content, factor_consistency, factor_engagement, factor_growth, factor_monetization').eq('user_id', userId).order('computed_at', { ascending: false }).limit(1).single(),
    admin.from('deals').select('id, brand_name, title, amount_cents, stage, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(20),
    admin.from('invoices').select('id, brand_name, amount_cents, status, due_date, paid_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    admin.from('posts').select('id, hook, platform, status, published_at, views, likes, comments, shares, saves').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    admin.from('media_kits').select('id').eq('user_id', userId).limit(1).single(),
    admin.from('audience_snapshots').select('follower_count, engagement_rate, captured_at').eq('user_id', userId).order('captured_at', { ascending: false }).limit(5),
  ]);

  const profile = profileRes.data;
  const platforms = (platformsRes.data ?? []).filter((p: { sync_status: string }) => p.sync_status === 'healthy');
  const smo = smoRes.data;
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const posts = postsRes.data ?? [];
  const hasMediaKit = !!mediaKitRes.data;
  const snapshots = snapshotsRes.data ?? [];

  const totalFollowers = platforms.reduce((s: number, p: { follower_count: number | null }) => s + (p.follower_count ?? 0), 0);
  const totalFollowing = platforms.reduce((s: number, p: { following_count: number | null }) => s + (p.following_count ?? 0), 0);

  // Platform breakdown
  const platformSummary = platforms.map((p: { platform: string; platform_username: string; follower_count: number | null; post_count: number | null }) =>
    `${p.platform}: @${p.platform_username} (${(p.follower_count ?? 0).toLocaleString()} followers, ${p.post_count ?? 0} posts)`
  ).join('; ');

  // SMO breakdown with weakest factor highlighted
  let smoSummary = 'SMO Score: not yet computed';
  let weakestFactor = '';
  let strongestFactor = '';
  if (smo) {
    const factors = [
      { name: 'Profile', val: smo.factor_profile },
      { name: 'Content', val: smo.factor_content },
      { name: 'Consistency', val: smo.factor_consistency },
      { name: 'Engagement', val: smo.factor_engagement },
      { name: 'Growth', val: smo.factor_growth },
      { name: 'Monetization', val: smo.factor_monetization },
    ];
    factors.sort((a, b) => a.val - b.val);
    weakestFactor = factors[0].name;
    strongestFactor = factors[factors.length - 1].name;
    smoSummary = `SMO Score: ${smo.score}/100 — Profile: ${smo.factor_profile}, Content: ${smo.factor_content}, Consistency: ${smo.factor_consistency}, Engagement: ${smo.factor_engagement}, Growth: ${smo.factor_growth}, Monetization: ${smo.factor_monetization}. Weakest: ${weakestFactor} (${factors[0].val}). Strongest: ${strongestFactor} (${factors[factors.length - 1].val}).`;
  }

  // Deals summary
  const activeDeals = deals.filter((d) => !['done', 'lost'].includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === 'done');
  const lostDeals = deals.filter((d) => d.stage === 'lost');
  const pipelineValue = activeDeals.reduce((s, d) => s + (d.amount_cents ?? 0), 0);
  const wonValue = wonDeals.reduce((s, d) => s + (d.amount_cents ?? 0), 0);
  const dealBrands = activeDeals.slice(0, 5).map((d) => `${d.brand_name} (${d.stage}, ${fmtCents(d.amount_cents ?? 0)})`).join('; ');
  const dealsSummary = deals.length > 0
    ? `${deals.length} total deals. ${activeDeals.length} active (pipeline: ${fmtCents(pipelineValue)}). ${wonDeals.length} won (${fmtCents(wonValue)}). ${lostDeals.length} lost. Active: ${dealBrands || 'none'}.`
    : 'No deals yet.';

  // Invoices summary
  const now = new Date();
  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const paidThisMonth = paidInvoices.filter((i) => i.paid_at && new Date(i.paid_at).getMonth() === now.getMonth() && new Date(i.paid_at).getFullYear() === now.getFullYear());
  const revenueMTD = paidThisMonth.reduce((s, i) => s + (i.amount_cents ?? 0), 0);
  const totalRevenue = paidInvoices.reduce((s, i) => s + (i.amount_cents ?? 0), 0);
  const overdueInvoices = invoices.filter((i) => i.status === 'sent' && i.due_date && new Date(i.due_date) < now);
  const draftInvoices = invoices.filter((i) => i.status === 'draft');
  const invoiceSummary = invoices.length > 0
    ? `${invoices.length} invoices. Revenue MTD: ${fmtCents(revenueMTD)}. All-time revenue: ${fmtCents(totalRevenue)}. ${overdueInvoices.length} overdue. ${draftInvoices.length} drafts unsent.`
    : 'No invoices yet.';

  // Posts summary
  const publishedPosts = posts.filter((p) => p.published_at);
  const draftPosts = posts.filter((p) => p.status === 'draft');
  const scheduledPosts = posts.filter((p) => p.status === 'scheduled');
  const lastPublished = publishedPosts[0]?.published_at;
  const daysSinceLastPost = lastPublished ? Math.floor((Date.now() - new Date(lastPublished).getTime()) / 86400000) : null;

  // Top performing post
  let topPostInfo = '';
  if (publishedPosts.length > 0) {
    const scored = publishedPosts.map((p) => ({
      ...p,
      engagement: (p.views ?? 0) + (p.likes ?? 0) * 5 + (p.comments ?? 0) * 10 + (p.shares ?? 0) * 15 + (p.saves ?? 0) * 8,
    })).sort((a, b) => b.engagement - a.engagement);
    const top = scored[0];
    topPostInfo = `Best post: "${top.hook ?? 'Untitled'}" on ${top.platform} — ${(top.views ?? 0).toLocaleString()} views, ${(top.likes ?? 0).toLocaleString()} likes, ${(top.comments ?? 0).toLocaleString()} comments, ${(top.shares ?? 0).toLocaleString()} shares.`;
  }

  const postsSummary = `${posts.length} total posts. ${publishedPosts.length} published, ${draftPosts.length} drafts, ${scheduledPosts.length} scheduled. ${daysSinceLastPost !== null ? `Last post: ${daysSinceLastPost} days ago.` : 'No published posts yet.'} ${topPostInfo}`;

  // Growth trend from snapshots
  let growthTrend = '';
  if (snapshots.length >= 2) {
    const newest = snapshots[0].follower_count ?? 0;
    const oldest = snapshots[snapshots.length - 1].follower_count ?? 0;
    const diff = newest - oldest;
    const pct = oldest > 0 ? ((diff / oldest) * 100).toFixed(1) : '0';
    growthTrend = `Recent follower trend: ${diff >= 0 ? '+' : ''}${diff.toLocaleString()} (${pct}%) over last ${snapshots.length} snapshots.`;
  }

  // Profile completeness
  const profileComplete = !!(profile?.display_name && profile?.bio && profile?.avatar_url);
  const profileSummary = `Profile: ${profileComplete ? 'complete' : 'incomplete — missing ' + [!profile?.display_name && 'display name', !profile?.bio && 'bio', !profile?.avatar_url && 'avatar'].filter(Boolean).join(', ')}. Handle: ${profile?.handle || 'not set'}. Media kit: ${hasMediaKit ? 'created' : 'not created'}.`;

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

  const systemPrompt = `You are Virall AI, the personal social media strategist inside Go Virall. You have full access to the creator's real-time data below. Your job: give sharp, specific, data-backed advice. Never guess or make up numbers — only reference the actual data provided.

=== CREATOR DATA ===
Name: ${profile?.display_name ?? 'Creator'}
Mission: ${profile?.mission ?? 'not set'}
Plan: ${profile?.subscription_tier ?? 'free'}
${profileSummary}

PLATFORMS (${platforms.length} connected):
${platformSummary || 'None connected yet.'}
Total followers: ${totalFollowers.toLocaleString()}. Following: ${totalFollowing.toLocaleString()}.
${growthTrend}

${smoSummary}

CONTENT:
${postsSummary}

DEALS & PIPELINE:
${dealsSummary}

INVOICES & REVENUE:
${invoiceSummary}

=== CONVERSATION HISTORY ===
${chatHistory || '(first message)'}

=== RULES ===
1. Be concise: 2-4 sentences max unless the creator asks for detail.
2. Be specific: reference EXACT numbers from the data above (follower counts, scores, deal values, post stats). Never round or approximate — use the real figures.
3. Be actionable: every response should include something the creator can do RIGHT NOW.
4. Prioritize the weakest area: if their Consistency score is ${smo?.factor_consistency ?? '?'} and they haven't posted in ${daysSinceLastPost ?? '?'} days, tell them that directly.
5. Guide to app features: Compose (write posts), Studio > Ideas/Captions/Scripts/Bio (AI content), Audience (analytics), Revenue (deals & invoices), Settings (connect platforms), SMO Score (optimization analysis).
6. Plain text only. No markdown, no asterisks, no hashtags, no bullet lists, no backticks. Write like a knowledgeable friend texting.
7. Never hallucinate data. If something is 0 or not available, say so honestly.

User message: ${message}`;

  const response = await aiChat(systemPrompt, {
    temperature: 0.6,
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
