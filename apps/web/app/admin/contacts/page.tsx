import { createAdminClient } from '@govirall/db/admin';
import { ContactsClient } from './contacts-client';

export default async function AdminContactsPage() {
  const admin = createAdminClient();

  const [ticketsRes, openRes, inProgressRes, resolvedRes, urgentRes] = await Promise.all([
    admin
      .from('contact_tickets')
      .select('id, from_name, from_email, subject, body, status, priority, created_at, resolved_at')
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('contact_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    admin
      .from('contact_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'in_progress'),
    admin
      .from('contact_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'resolved'),
    admin
      .from('contact_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('priority', 'urgent'),
  ]);

  return (
    <ContactsClient
      tickets={(ticketsRes.data ?? []).map((t) => ({
        id: t.id,
        fromName: t.from_name,
        fromEmail: t.from_email,
        subject: t.subject,
        body: t.body,
        status: t.status,
        priority: t.priority,
        createdAt: t.created_at,
        resolvedAt: t.resolved_at ?? null,
      }))}
      openCount={openRes.count ?? 0}
      inProgressCount={inProgressRes.count ?? 0}
      resolvedCount={resolvedRes.count ?? 0}
      urgentCount={urgentRes.count ?? 0}
    />
  );
}
