'use server';

import { requireAdmin, writeAuditLog } from './index';

export async function updateTicket(id: string, data: {
  status?: string;
  priority?: string;
  assignedTo?: string | null;
}) {
  const { user, admin } = await requireAdmin();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === 'resolved') update.resolved_at = new Date().toISOString();
  }
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.assignedTo !== undefined) update.assigned_to = data.assignedTo;

  const { error } = await admin.from('contact_tickets').update(update).eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'update_ticket', 'contact_ticket', id, data);
  return { success: true };
}

export async function resolveTicket(id: string) {
  return updateTicket(id, { status: 'resolved' });
}

export async function deleteTicket(id: string) {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from('contact_tickets').delete().eq('id', id);
  if (error) return { error: error.message };
  await writeAuditLog(admin, user.id, 'delete_ticket', 'contact_ticket', id);
  return { success: true };
}
