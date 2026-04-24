import { createAdminClient } from '@govirall/db/admin';
import { ChangelogClient } from './changelog-client';

export default async function AdminChangelogPage() {
  const admin = createAdminClient();

  const { data: entries } = await admin
    .from('changelog_entries')
    .select('id, version, title, body, category, published_at, created_at')
    .order('published_at', { ascending: false });

  return (
    <ChangelogClient
      entries={(entries ?? []).map((e) => ({
        id: e.id,
        version: e.version,
        title: e.title,
        body: e.body,
        category: e.category,
        publishedAt: e.published_at,
        createdAt: e.created_at,
      }))}
    />
  );
}
