import { handleRoute, ApiError } from '../../_lib/handler';

// POST /api/invoices/[id]?action=send|mark-paid|cancel
export const POST = handleRoute(async ({ req, userId, params, supabase }) => {
  const action = req.nextUrl.searchParams.get('action');

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', params!.id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !invoice) throw ApiError.notFound('Invoice not found');

  let newStatus: string;

  switch (action) {
    case 'send':
      if (invoice.status !== 'draft') throw ApiError.badRequest('Can only send draft invoices');
      newStatus = 'sent';
      break;
    case 'mark-paid':
      if (!['sent', 'viewed', 'overdue'].includes(invoice.status))
        throw ApiError.badRequest('Invoice must be sent, viewed, or overdue to mark as paid');
      newStatus = 'paid';
      break;
    case 'cancel':
      if (invoice.status === 'paid') throw ApiError.badRequest('Cannot cancel a paid invoice');
      newStatus = 'cancelled';
      break;
    default:
      throw ApiError.badRequest('Invalid action. Use send, mark-paid, or cancel.');
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (action === 'send') updates.sent_at = new Date().toISOString();
  if (action === 'mark-paid') updates.paid_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', params!.id)
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
