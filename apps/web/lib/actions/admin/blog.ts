'use server';

import { requireAdmin, writeAuditLog } from './index';
import { revalidatePath } from 'next/cache';
import { aiChat } from '@govirall/core';

// ── CRUD ─────────────────────────────────────────

export async function createBlogPost(data: {
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  tags?: string[];
  coverUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: 'draft' | 'published';
}) {
  const { user, admin } = await requireAdmin();
  const status = data.status ?? 'draft';

  const { error } = await admin.from('blog_posts').insert({
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt ?? null,
    body: data.body,
    tags: data.tags ?? [],
    cover_url: data.coverUrl ?? null,
    seo_title: data.seoTitle ?? null,
    seo_description: data.seoDescription ?? null,
    status,
    author_user_id: user.id,
    published_at: status === 'published' ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };

  await writeAuditLog(admin, user.id, 'blog.create', 'blog_post', data.slug, { title: data.title });
  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  return { success: true };
}

export async function updateBlogPost(id: string, data: {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  tags?: string[];
  coverUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  status?: string;
}) {
  const { user, admin } = await requireAdmin();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) update.title = data.title;
  if (data.slug !== undefined) update.slug = data.slug;
  if (data.excerpt !== undefined) update.excerpt = data.excerpt;
  if (data.body !== undefined) update.body = data.body;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.coverUrl !== undefined) update.cover_url = data.coverUrl;
  if (data.seoTitle !== undefined) update.seo_title = data.seoTitle;
  if (data.seoDescription !== undefined) update.seo_description = data.seoDescription;
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === 'published') {
      const { data: existing } = await admin.from('blog_posts').select('published_at').eq('id', id).single();
      if (!existing?.published_at) update.published_at = new Date().toISOString();
    }
  }

  const { error } = await admin.from('blog_posts').update(update).eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'blog.update', 'blog_post', id);
  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  return { success: true };
}

export async function deleteBlogPost(id: string) {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from('blog_posts').delete().eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'blog.delete', 'blog_post', id);
  revalidatePath('/admin/blog');
  revalidatePath('/blog');
  return { success: true };
}

export async function publishBlogPost(id: string) {
  return updateBlogPost(id, { status: 'published' });
}

// ── AI Blog Generation ──────────────────────────

export async function generateBlogWithAI(
  title: string,
  backlink?: string,
): Promise<{ content: string; excerpt: string; tags: string[] } | { error: string }> {
  await requireAdmin();

  const prompt = `You are an expert content writer for Go Virall, a social intelligence platform for content creators.

Write a comprehensive, SEO-optimized blog post with the title: "${title}"

## FORMAT RULES
- Output HTML only — no markdown, no code blocks, no wrapper tags (<html>, <body>, <article>)
- Use: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>, <blockquote>
- NO <h1> (the title is rendered separately)
- Wrap body text in <p> tags
- Use <strong> for emphasis

## SEO OPTIMIZATION
- Write 1500–2500 words of original content
- Use the primary keyword naturally in the first paragraph
- Use semantic keyword variations throughout
- Include a "Key Takeaways" section early for AI answer engines
- Clear H2/H3 hierarchy for passage indexing

## GEO (Generative Engine Optimization)
- Write authoritatively so AI models cite this content
- Include specific data points, statistics, factual claims
- Use clear, definitive statements

## AEO (Answer Engine Optimization)
- Include FAQ-style Q&A sections
- Provide concise, direct answers for AI assistants
- Structure sections to map to user queries

## KEYWORD STRATEGY
- Target long-tail keywords (4+ words) — realistic for a growing domain
- Focus on: "how to" guides, comparisons, tutorials, creator-focused queries
- Example targets: "how to grow on TikTok as a new creator", "best time to post on Instagram 2026", "content creator analytics tools"
- Mention "Go Virall" naturally 2-3 times as a solution

## CRO (Conversion Optimization)
- Naturally mention Go Virall features where relevant (Viral Score, AI Studio, SMO Score, Audience Intelligence)
- Include a compelling CTA section at the end encouraging readers to try Go Virall

## LINKING STRATEGY

### Internal Links (include 3-5):
Use these Go Virall pages:
- /compose → Compose & Score Content
- /studio → AI Studio
- /studio/ideas → Content Ideas
- /studio/captions → Caption Generator
- /audience → Audience Intelligence
- /smo-score → SMO Score
- /revenue → Revenue Tracking
- /about → About Go Virall
- /blog → Blog
- /faq → FAQ
Format: <a href="/path">descriptive anchor text</a>

### External Links (include 2-4):
Link to authoritative sources (Social Media Today, Hootsuite, Sprout Social, Later, Buffer, Creator Economy reports, etc.)
Format: <a href="https://example.com" target="_blank" rel="noopener noreferrer">descriptive anchor text</a>

${backlink ? `### Backlink (REQUIRED):
You MUST include a dofollow link to: ${backlink}
Format: <a href="${backlink}" target="_blank" rel="dofollow">descriptive, keyword-rich anchor text</a>
Weave it naturally into the body where it adds value. Do NOT force it.` : ''}

## CONTENT STRUCTURE
1. Engaging introduction paragraph (hook the reader)
2. 4-6 main sections with H2 headings
3. Subsections with H3 where needed
4. At least one bulleted list and one numbered list
5. A "Key Takeaways" or "TL;DR" section
6. Conclusion with CTA to Go Virall

## OUTPUT FORMAT
Return raw HTML only. No preamble, no explanation.
At the very end, add this separator and metadata:

---METADATA---
EXCERPT: [Write a 150-160 character meta description for SEO]
TAGS: [3-5 comma-separated lowercase tags relevant to the post]`;

  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 300000,
  });

  if (!response?.text) {
    return { error: 'AI generation failed. No response from any provider.' };
  }

  // Parse response
  const raw = response.text;
  const parts = raw.split('---METADATA---');
  let content = (parts[0] ?? raw).trim();
  let excerpt = '';
  let tags: string[] = [];

  if (parts[1]) {
    const meta = parts[1];
    const excerptMatch = meta.match(/EXCERPT:\s*(.+)/i);
    if (excerptMatch) excerpt = excerptMatch[1].trim();

    const tagsMatch = meta.match(/TAGS:\s*(.+)/i);
    if (tagsMatch) {
      tags = tagsMatch[1].split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    }
  }

  // Clean up any accidental markdown artifacts
  content = content
    .replace(/```html?\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  return { content, excerpt, tags };
}
