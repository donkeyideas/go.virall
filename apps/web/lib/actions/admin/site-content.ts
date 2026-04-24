'use server';

import { requireAdmin, writeAuditLog } from './index';
import { revalidatePath } from 'next/cache';

const PAGE_PATH_MAP: Record<string, string> = {
  homepage: '/',
  about: '/about',
  faq: '/faq',
  global: '/',
};

export async function updateSiteContent(
  page: string,
  section: string,
  content: unknown,
) {
  try {
    const { user, admin } = await requireAdmin();

    const { error } = await admin
      .from('site_content')
      .update({
        content,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('page', page)
      .eq('section', section);

    if (error) return { error: error.message };

    await writeAuditLog(admin, user.id, 'site_content.update', 'site_content', `${page}/${section}`, {
      page,
      section,
    });

    // Revalidate the public page this content belongs to
    const publicPath = PAGE_PATH_MAP[page];
    if (publicPath) revalidatePath(publicPath);

    // Always revalidate admin content page
    revalidatePath('/admin/content');

    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
