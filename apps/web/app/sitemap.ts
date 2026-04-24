import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.govirall.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  /* Static pages */
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/signin`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/child-safety`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/delete-account`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  return staticPages;
}
