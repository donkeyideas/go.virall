'use server';

import { requireAdmin, writeAuditLog } from './index';
import { revalidatePath } from 'next/cache';
import { aiChat } from '@govirall/core';

// ── CRUD ─────────────────────────────────────────

export async function createSocialPost(data: {
  platform: string;
  caption: string;
  mediaUrl?: string;
  scheduledAt?: string;
  tags?: string[];
}) {
  const { user, admin } = await requireAdmin();
  const status = data.scheduledAt ? 'scheduled' : 'draft';

  const { error } = await admin.from('social_posts').insert({
    platform: data.platform,
    caption: data.caption,
    media_url: data.mediaUrl ?? null,
    scheduled_at: data.scheduledAt ?? null,
    status,
    tags: data.tags ?? [],
    author_user_id: user.id,
  });

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'social.create', 'social_post', undefined, {
    platform: data.platform,
  });
  revalidatePath('/admin/social');
  return { success: true };
}

export async function updateSocialPost(
  id: string,
  data: {
    platform?: string;
    caption?: string;
    mediaUrl?: string;
    scheduledAt?: string;
    status?: string;
    tags?: string[];
  },
) {
  const { user, admin } = await requireAdmin();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.platform !== undefined) update.platform = data.platform;
  if (data.caption !== undefined) update.caption = data.caption;
  if (data.mediaUrl !== undefined) update.media_url = data.mediaUrl;
  if (data.scheduledAt !== undefined) update.scheduled_at = data.scheduledAt;
  if (data.status !== undefined) update.status = data.status;
  if (data.tags !== undefined) update.tags = data.tags;

  const { error } = await admin.from('social_posts').update(update).eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'social.update', 'social_post', id);
  revalidatePath('/admin/social');
  return { success: true };
}

export async function deleteSocialPost(id: string) {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from('social_posts').delete().eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'social.delete', 'social_post', id);
  revalidatePath('/admin/social');
  return { success: true };
}

// ── AI Caption Generation ────────────────────────

const CHAR_LIMITS: Record<string, number> = {
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200,
  youtube: 2200,
  facebook: 2200,
  twitch: 2200,
};

export async function generateSocialCaption(
  platform: string,
  topic: string,
): Promise<{ caption: string; hashtags: string[] } | { error: string }> {
  await requireAdmin();

  const charLimit = CHAR_LIMITS[platform] ?? 2200;
  const platformName = platform === 'x' ? 'X (Twitter)' : platform.charAt(0).toUpperCase() + platform.slice(1);

  const prompt = `You are a social media expert for Go Virall, a social intelligence platform for content creators.

Generate a high-performing ${platformName} caption about: "${topic}"

## RULES
- Stay within ${charLimit} characters total (including hashtags)
- Write in a tone appropriate for ${platformName}:
${platform === 'linkedin' ? '  - Professional, thought-leadership style\n  - Use line breaks for readability\n  - Open with a hook statement' : ''}
${platform === 'instagram' ? '  - Engaging, visual storytelling\n  - Use line breaks and spacing\n  - Open with a hook, end with a CTA' : ''}
${platform === 'tiktok' ? '  - Short, punchy, trend-aware\n  - Use casual/Gen-Z friendly language\n  - Hook in the first line' : ''}
${platform === 'x' ? '  - Concise, witty, thought-provoking\n  - Must be under 280 characters total\n  - No fluff' : ''}
${platform === 'youtube' ? '  - Descriptive for video context\n  - Include key timestamps or topics\n  - SEO-friendly keywords' : ''}
${platform === 'facebook' ? '  - Conversational, community-oriented\n  - Ask a question or encourage discussion\n  - Moderate length' : ''}
${platform === 'twitch' ? '  - Hype-oriented, community-focused\n  - Reference streaming culture\n  - Energetic tone' : ''}
- Include 3-6 relevant hashtags
- The caption should be ready to post as-is
- Do NOT include any markdown formatting

## OUTPUT FORMAT (JSON)
Return a JSON object with exactly these fields:
{
  "caption": "The full caption text WITHOUT hashtags at the end",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}

Return only valid JSON. No preamble, no explanation.`;

  const response = await aiChat(prompt, {
    temperature: 0.8,
    maxTokens: 1024,
    timeout: 60000,
    jsonMode: true,
  });

  if (!response?.text) {
    return { error: 'AI generation failed. No response from any provider.' };
  }

  try {
    const parsed = JSON.parse(response.text);
    const caption = typeof parsed.caption === 'string' ? parsed.caption.trim() : '';
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags
          .map((h: unknown) => {
            if (typeof h !== 'string') return '';
            return h.startsWith('#') ? h.slice(1).trim() : h.trim();
          })
          .filter(Boolean)
      : [];

    if (!caption) {
      return { error: 'AI returned an empty caption.' };
    }

    return { caption, hashtags };
  } catch {
    // Fallback: try to extract from raw text
    const raw = response.text.trim();
    return { caption: raw, hashtags: [] };
  }
}
