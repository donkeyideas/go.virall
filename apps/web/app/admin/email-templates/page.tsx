import { createAdminClient } from '@govirall/db/admin';
import { EmailTemplatesClient } from './email-templates-client';

export default async function AdminEmailTemplatesPage() {
  const admin = createAdminClient();

  const { data: templates } = await admin
    .from('email_templates')
    .select('id, key, name, subject, html_body, text_body, variables, category, active, updated_at')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return (
    <EmailTemplatesClient
      templates={(templates ?? []).map((t) => ({
        id: t.id,
        key: t.key,
        name: t.name,
        subject: t.subject,
        htmlBody: t.html_body ?? '',
        textBody: t.text_body ?? '',
        variables: t.variables ?? [],
        category: t.category ?? 'transactional',
        active: t.active ?? true,
        updatedAt: t.updated_at ?? null,
      }))}
    />
  );
}
