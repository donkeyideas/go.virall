import { handleRoute, parseBody, parseQuery, ApiError } from '../_lib/handler';
import { CreateInvoiceInput, ListInvoicesQuery } from '@govirall/api-types';

// GET /api/invoices
export const GET = handleRoute(async ({ req, userId, supabase }) => {
  const query = parseQuery(req, ListInvoicesQuery);

  let q = supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(query.limit);

  if (query.status) q = q.eq('status', query.status);
  if (query.cursor) q = q.lt('created_at', query.cursor);

  const { data, error } = await q;

  if (error) throw ApiError.badRequest(error.message);

  return {
    items: data ?? [],
    cursor: data && data.length === query.limit ? data[data.length - 1].created_at : null,
  };
});

// POST /api/invoices
export const POST = handleRoute(async ({ req, userId, supabase }) => {
  const body = await parseBody(req, CreateInvoiceInput);

  // Generate invoice number
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      deal_id: body.deal_id ?? null,
      invoice_number: invoiceNumber,
      brand_name: body.brand_name,
      brand_email: body.brand_email,
      description: body.description,
      amount: body.amount,
      currency: body.currency,
      due_date: body.due_date,
      line_items: body.line_items,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw ApiError.badRequest(error.message);

  return data;
});
