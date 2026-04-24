import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.govirall.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/onboarding', '/dashboard/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
