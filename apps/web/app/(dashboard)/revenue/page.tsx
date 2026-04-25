import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { computePipelineSummary, type DealStage } from '@govirall/core';
import { RevenueClient } from './revenue-client';

export default async function RevenuePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user!.id;
  const admin = createAdminClient();

  const [profileRes, dealsRes, invoicesRes] = await Promise.all([
    admin
      .from('users')
      .select('theme')
      .eq('id', userId)
      .single(),
    admin
      .from('deals')
      .select('id, brand_name, title, brand_contact_email, amount_cents, currency, stage, description, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    admin
      .from('invoices')
      .select('id, invoice_number, brand_name, brand_email, notes, amount_cents, currency, status, due_date, sent_at, paid_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const theme = profileRes.data?.theme ?? 'glassmorphic';
  const deals = dealsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  const summary = computePipelineSummary(
    deals.map((d) => ({ stage: d.stage as DealStage, value: d.amount_cents ?? 0 })),
  );

  const now = new Date();
  const thisMonth = deals
    .filter((d) => d.stage === 'done' && d.updated_at && new Date(d.updated_at).getMonth() === now.getMonth() && new Date(d.updated_at).getFullYear() === now.getFullYear())
    .reduce((sum, d) => sum + (d.amount_cents ?? 0), 0);

  const thisYear = deals
    .filter((d) => d.stage === 'done' && d.updated_at && new Date(d.updated_at).getFullYear() === now.getFullYear())
    .reduce((sum, d) => sum + (d.amount_cents ?? 0), 0);

  return (
    <RevenueClient
      theme={theme}
      deals={deals}
      invoices={invoices}
      totalRevenue={summary.totalRevenue}
      thisMonth={thisMonth}
      thisYear={thisYear}
      totalPipeline={summary.totalPipeline}
    />
  );
}
