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

  /* Dynamic blog posts */
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data: posts } = await admin
      .from('blog_posts')
      .select('slug, published_at, updated_at')
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
    }
  } catch {
    // Sitemap should not break if DB is unreachable
  }

  return [...staticPages, ...blogPages];
}
