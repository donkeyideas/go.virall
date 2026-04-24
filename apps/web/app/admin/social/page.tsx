import { createAdminClient } from '@govirall/db/admin';
import { SocialClient } from './social-client';

export default async function AdminSocialPage() {
  const admin = createAdminClient();

  const { data: posts } = await admin
    .from('social_posts')
    .select(
      'id, platform, caption, media_url, status, scheduled_at, published_at, tags, created_at',
    )
    .order('created_at', { ascending: false });

  return (
    <SocialClient
      posts={(posts ?? []).map((p) => ({
        id: p.id,
        platform: p.platform,
        caption: p.caption,
        mediaUrl: p.media_url,
        status: p.status,
        scheduledAt: p.scheduled_at,
        publishedAt: p.published_at,
        tags: p.tags ?? [],
        createdAt: p.created_at,
      }))}
    />
  );
}
