import { createAdminClient } from '@govirall/db/admin';
import { BlogClient } from './blog-client';

export default async function AdminBlogPage() {
  const admin = createAdminClient();

  const { data: posts } = await admin
    .from('blog_posts')
    .select('id, title, slug, excerpt, body, cover_url, status, tags, published_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  return (
    <BlogClient
      posts={(posts ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        body: p.body ?? '',
        coverUrl: p.cover_url,
        status: p.status,
        tags: p.tags ?? [],
        publishedAt: p.published_at,
        createdAt: p.created_at,
      }))}
    />
  );
}
