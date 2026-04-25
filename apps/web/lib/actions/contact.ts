'use server';

import { createAdminClient } from '@govirall/db/admin';

export async function submitCustomPlanRequest(formData: {
  name: string;
  email: string;
  company?: string;
  message: string;
}) {
  const { name, email, company, message } = formData;

  if (!name || !email || !message) {
    return { error: 'Name, email, and message are required.' };
  }

  const admin = createAdminClient();

  const body = company
    ? `Company: ${company}\n\n${message}`
    : message;

  const { error } = await admin.from('contact_tickets').insert({
    from_name: name,
    from_email: email,
    subject: 'Custom Plan Request',
    body,
    status: 'open',
    priority: 'normal',
    tags: ['custom-plan'],
  });

  if (error) return { error: error.message };
  return { success: true };
}
