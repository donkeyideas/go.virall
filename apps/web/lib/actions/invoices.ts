'use server';

import { createServerClient } from '@govirall/db/server';

export async function createInvoice(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const brandName = formData.get('brand_name') as string;
  const brandEmail = formData.get('brand_email') as string;
  const dollarStr = formData.get('amount') as string;
  const amountCents = dollarStr ? Math.round(parseFloat(dollarStr) * 100) : 0;

  if (!brandName || !brandEmail || !amountCents) {
    return { error: 'Brand name, email, and amount are required' };
  }

  // Generate invoice number
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      user_id: user.id,
      deal_id: (formData.get('deal_id') as string) || null,
      invoice_number: invoiceNumber,
      brand_name: brandName,
      brand_email: brandEmail,
      notes: (formData.get('notes') as string) || '',
      amount_cents: amountCents,
      currency: (formData.get('currency') as string) || 'USD',
      due_date: (formData.get('due_date') as string) || new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'draft',
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data };
}

export async function sendInvoice(invoiceId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('user_id', user.id)
    .eq('status', 'draft');

  if (error) return { error: error.message };
  return { success: true };
}

export async function markInvoicePaid(invoiceId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
