'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function upsertEmailTemplate(data: {
  id?: string;
  key: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables?: string[];
  category?: string;
}) {
  const { user, admin } = await requireAdmin();

  const row = {
    key: data.key,
    name: data.name,
    subject: data.subject,
    html_body: data.htmlBody,
    text_body: data.textBody ?? null,
    variables: data.variables ?? [],
    category: data.category ?? 'transactional',
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = data.id
    ? await admin.from('email_templates').update(row).eq('id', data.id)
    : await admin.from('email_templates').insert(row);

  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, data.id ? 'update_email_template' : 'create_email_template', 'email_template', data.key);
  return { success: true };
}

export async function toggleTemplate(id: string, active: boolean) {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from('email_templates').update({ active }).eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'toggle_email_template', 'email_template', id, { active });
  return { success: true };
}
