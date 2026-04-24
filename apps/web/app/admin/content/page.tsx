import { createAdminClient } from '@govirall/db/admin';
import { ContentClient } from './content-client';

export default async function AdminContentPage() {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from('site_content')
    .select('id, page, section, content, sort_order, is_active, updated_at')
    .order('page', { ascending: true })
    .order('sort_order', { ascending: true });

  return (
    <ContentClient
      rows={(rows ?? []).map((r) => ({
        id: r.id,
        page: r.page,
        section: r.section,
        content: r.content,
        sortOrder: r.sort_order,
        isActive: r.is_active,
        updatedAt: r.updated_at,
      }))}
    />
  );
}
