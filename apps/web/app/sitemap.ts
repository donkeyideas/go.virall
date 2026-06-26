import type { MetadataRoute } from 'next';
import { createAdminClient } from '@govirall/db/admin';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.govirall.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /* Static pages */
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/product`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/intelligence`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/creators`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/pricing`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/stories`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/signin`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/child-safety`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/delete-account`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  /* Dynamic blog posts + topic-cluster tag pages */
  let blogPages: MetadataRoute.Sitemap = [];
  let tagPages: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data: posts } = await admin
      .from('blog_posts')
      .select('slug, tags, published_at, updated_at')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false });

    if (posts) {
      blogPages = posts.map((post) => ({
        url: `${BASE}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at ?? post.published_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

      /* Distinct lowercased tags -> /blog/tag/[tag] cluster pages */
      const tags = new Set<string>();
      for (const post of posts as { tags: string[] | null }[]) {
        for (const t of post.tags ?? []) {
          if (t.trim()) tags.add(t.toLowerCase());
        }
      }
      tagPages = Array.from(tags).map((tag) => ({
        url: `${BASE}/blog/tag/${encodeURIComponent(tag)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // Sitemap should not break if DB is unreachable
  }

  return [...staticPages, ...blogPages, ...tagPages];
}
