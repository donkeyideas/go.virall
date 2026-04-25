'use client';

import { useState, useTransition } from 'react';
import { Input, Badge } from '@govirall/ui-web';
import { STAGE_LABELS, type DealStage } from '@govirall/core';
import { createDeal, updateDealStage, deleteDeal } from '@/lib/actions/deals';
import { createInvoice, sendInvoice, markInvoicePaid, deleteInvoice } from '@/lib/actions/invoices';
import { useRouter } from 'next/navigation';

type Deal = {
  id: string;
  brand_name: string;
  title: string;
  brand_contact_email: string | null;
  amount_cents: number;
  currency: string;
  stage: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  brand_name: string;
  brand_email: string;
  notes: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
};

const STAGES: DealStage[] = [
  'lead', 'outreach', 'negotiation', 'contract', 'production', 'review', 'live', 'done', 'lost',
];

const INVOICE_STATUS_COLOR: Record<string, 'default' | 'good' | 'warn' | 'bad'> = {
  draft: 'default',
  sent: 'warn',
  viewed: 'warn',
  paid: 'good',
  overdue: 'bad',
  cancelled: 'default',
};

type Props = {
  theme: string;
  deals: Deal[];
  invoices: Invoice[];
  totalRevenue: number;
  thisMonth: number;
  thisYear: number;
  totalPipeline: number;
};

export function RevenueClient({
  theme,
  deals: initialDeals,
  invoices: initialInvoices,
  totalRevenue,
  thisMonth,
  thisYear,
  totalPipeline,
}: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [dealError, setDealError] = useState('');
  const [invoiceError, setInvoiceError] = useState('');

  const cardStyle: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 24 }
    : isNeumorphic
    ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 24, boxShadow: 'var(--out-md)' }
    : {
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: 'none',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      };

  const sectionHeading = (marginBottom = 16): React.CSSProperties => ({
    fontFamily: 'var(--font-display)',
    fontWeight: isEditorial ? 900 : 500,
    fontStyle: isEditorial ? 'italic' : 'normal',
    fontSize: isEditorial ? 26 : 20,
    color: isEditorial ? 'var(--ink)' : 'var(--fg)',
    marginBottom,
  });

  const dealsByStage = (stage: string) => initialDeals.filter((d) => d.stage === stage);

  const fmt = (cents: number) => {
    const dollars = cents / 100;
    return dollars % 1 === 0
      ? `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
      : `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  async function handleCreateDeal(formData: FormData) {
    setDealError('');
    const result = await createDeal(formData);
    if (result.error) {
      setDealError(result.error);
    } else {
      setShowNewDeal(false);
      startTransition(() => router.refresh());
    }
  }

  async function handleMoveDeal(dealId: string, newStage: string) {
    const result = await updateDealStage(dealId, newStage);
    if (result.error) {
      alert(result.error);
    } else {
      startTransition(() => router.refresh());
    }
  }

  async function handleDeleteDeal(dealId: string) {
    if (!confirm('Delete this deal?')) return;
    const result = await deleteDeal(dealId);
    if (!result.error) {
      startTransition(() => router.refresh());
    }
  }

  async function handleCreateInvoice(formData: FormData) {
    setInvoiceError('');
    const result = await createInvoice(formData);
    if (result.error) {
      setInvoiceError(result.error);
    } else {
      setShowNewInvoice(false);
      startTransition(() => router.refresh());
    }
  }

  async function handleSendInvoice(invoiceId: string) {
    const result = await sendInvoice(invoiceId);
    if (!result.error) {
      startTransition(() => router.refresh());
    }
  }

  async function handleMarkPaid(invoiceId: string) {
    const result = await markInvoicePaid(invoiceId);
    if (!result.error) {
      startTransition(() => router.refresh());
    }
  }

  async function handleDeleteInvoice(invoiceId: string) {
    if (!confirm('Delete this invoice?')) return;
    const result = await deleteInvoice(invoiceId);
    if (!result.error) {
      startTransition(() => router.refresh());
    }
  }

  // KPI data
  const kpis = [
    { label: 'All time', value: totalRevenue > 0 ? fmt(totalRevenue) : '$0', color: isEditorial ? 'var(--ink)' : undefined },
    { label: 'This month', value: thisMonth > 0 ? fmt(thisMonth) : '$0', color: isEditorial ? 'var(--lime, #c8ff00)' : 'var(--color-good, #22c55e)' },
    { label: 'YTD', value: thisYear > 0 ? fmt(thisYear) : '$0', color: undefined },
    { label: 'Pipeline', value: totalPipeline > 0 ? fmt(totalPipeline) : '$0', color: isEditorial ? 'var(--hot, #ff5c3a)' : 'var(--amber, #f59e0b)' },
  ];

  return (
    <>
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            WORKSPACE · REVENUE
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: isEditorial ? 300 : 400,
            fontStyle: isEditorial ? 'italic' : 'normal',
            fontSize: isEditorial ? 'clamp(40px, 5vw, 60px)' : 'clamp(32px, 4vw, 48px)',
            lineHeight: 0.95,
            letterSpacing: '-.025em',
            color: isEditorial ? 'var(--ink)' : 'var(--fg)',
          }}
        >
          {isEditorial ? (
            <>Revenue <span style={{ fontWeight: 900, fontStyle: 'normal' }}>&amp; Deals.</span></>
          ) : (
            'Revenue & Deals'
          )}
        </h1>
      </div>

      {/* KPI hero row */}
      <div className="grid-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isEditorial ? 18 : 16, marginBottom: 32 }}>
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            style={{
              ...(isEditorial
                ? {
                    border: '1.5px solid var(--ink)',
                    borderRadius: 20,
                    padding: '20px 22px',
                    background: i === 1 ? 'var(--lime, #c8ff00)' : i === 3 ? 'var(--hot, #ff5c3a)' : 'var(--paper)',
                    ...(i === 3 ? { color: '#fff' } : {}),
                  }
                : isNeumorphic
                ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: '20px 22px', boxShadow: 'var(--out-md)' }
                : {
                    background: 'var(--glass, rgba(255,255,255,.06))',
                    backdropFilter: 'blur(24px) saturate(1.2)',
                    border: 'none',
                    borderRadius: 20,
                    padding: '20px 22px',
                    boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
                  }),
            }}
          >
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '.15em',
              textTransform: 'uppercase' as const,
              color: i === 3 && isEditorial ? 'rgba(255,255,255,.7)' : 'var(--muted)',
              marginBottom: 8,
            }}>
              {kpi.label}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: isEditorial ? 900 : 600,
                fontSize: isEditorial ? 32 : 26,
                letterSpacing: '-.03em',
                color: i === 3 && isEditorial ? '#fff' : i === 1 && isEditorial ? 'var(--ink)' : 'var(--fg)',
                lineHeight: 1,
                ...(!(isEditorial) && kpi.color ? {
                  background: `linear-gradient(135deg, ${kpi.color}, var(--fg))`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                } : {}),
              }}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={sectionHeading(0)}>
            Pipeline{isEditorial ? '.' : ''}
          </h2>
          <button
            onClick={() => setShowNewDeal(true)}
            style={{
              height: 36,
              padding: '0 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: isNeumorphic ? 14 : 12,
              border: 'none',
              cursor: 'pointer',
              transition: 'all .15s',
              ...(isEditorial
                ? { background: 'var(--ink)', color: 'var(--bg)' }
                : isNeumorphic
                ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
            }}
          >
            New deal
          </button>
        </div>

        {/* New deal form */}
        {showNewDeal && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>New Deal</h3>
            {dealError && (
              <p style={{ fontSize: 13, color: 'var(--color-bad)', marginBottom: 10 }}>{dealError}</p>
            )}
            <form action={handleCreateDeal} className="grid-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input name="brand_name" placeholder="Brand name *" required />
              <Input name="title" placeholder="Deal title *" required />
              <Input name="brand_contact_email" type="email" placeholder="Contact email" />
              <Input name="amount" type="number" step="0.01" min="0" placeholder="Amount ($)" />
              <textarea
                name="description"
                placeholder="Description..."
                rows={2}
                style={{
                  gridColumn: 'span 2',
                  width: '100%',
                  borderRadius: 14,
                  padding: '12px 16px',
                  font: 'inherit',
                  fontSize: 14,
                  color: 'var(--fg)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  boxShadow: 'var(--input-shadow, none)',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  style={{
                    height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                    borderRadius: isNeumorphic ? 14 : 12, border: 'none', cursor: 'pointer',
                    ...(isEditorial
                      ? { background: 'var(--ink)', color: 'var(--bg)' }
                      : isNeumorphic
                      ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                      : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
                  }}
                >
                  Create Deal
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewDeal(false)}
                  style={{
                    height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                    borderRadius: isNeumorphic ? 14 : 12, cursor: 'pointer',
                    background: 'transparent', color: 'var(--muted)',
                    border: '1px solid var(--line)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Kanban board */}
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 12, minWidth: 'max-content', paddingBottom: 8 }}>
            {STAGES.map((stage) => {
              const stageDeals = dealsByStage(stage);
              return (
                <div key={stage} style={{ width: 240, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>
                      {STAGE_LABELS[stage]}
                    </span>
                    <Badge variant="default">{stageDeals.length}</Badge>
                  </div>
                  <div
                    style={{
                      minHeight: 200,
                      borderRadius: isNeumorphic ? 20 : 16,
                      padding: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      ...(isEditorial
                        ? { background: 'var(--paper-2, rgba(0,0,0,.03))', border: '1px solid var(--rule, rgba(0,0,0,.1))' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
                        : { background: 'rgba(255,255,255,.03)' }),
                    }}
                  >
                    {stageDeals.length > 0 ? (
                      stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          theme={theme}
                          onMove={handleMoveDeal}
                          onDelete={handleDeleteDeal}
                          fmt={fmt}
                        />
                      ))
                    ) : (
                      <div style={{ padding: '32px 0', textAlign: 'center' }}>
                        <p style={{ fontSize: 11, color: 'var(--muted)' }}>No deals</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Invoices */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={sectionHeading(0)}>
            Invoices{isEditorial ? '.' : ''}
          </h2>
          <button
            onClick={() => setShowNewInvoice(true)}
            style={{
              height: 36,
              padding: '0 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: isNeumorphic ? 14 : 12,
              border: 'none',
              cursor: 'pointer',
              transition: 'all .15s',
              ...(isEditorial
                ? { background: 'var(--ink)', color: 'var(--bg)' }
                : isNeumorphic
                ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
            }}
          >
            Create invoice
          </button>
        </div>

        {/* New invoice form */}
        {showNewInvoice && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>New Invoice</h3>
            {invoiceError && (
              <p style={{ fontSize: 13, color: 'var(--color-bad)', marginBottom: 10 }}>{invoiceError}</p>
            )}
            <form action={handleCreateInvoice} className="grid-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input name="brand_name" placeholder="Brand name *" required />
              <Input name="brand_email" type="email" placeholder="Brand email *" required />
              <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount ($) *" required />
              <Input name="due_date" type="date" />
              <Input name="notes" placeholder="Notes" style={{ gridColumn: 'span 2' }} />
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  style={{
                    height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                    borderRadius: isNeumorphic ? 14 : 12, border: 'none', cursor: 'pointer',
                    ...(isEditorial
                      ? { background: 'var(--ink)', color: 'var(--bg)' }
                      : isNeumorphic
                      ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                      : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
                  }}
                >
                  Create Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewInvoice(false)}
                  style={{
                    height: 36, padding: '0 20px', fontSize: 13, fontWeight: 600,
                    borderRadius: isNeumorphic ? 14 : 12, cursor: 'pointer',
                    background: 'transparent', color: 'var(--muted)',
                    border: '1px solid var(--line)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {initialInvoices.length > 0 ? (
          <div style={cardStyle}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${isEditorial ? 'var(--ink)' : 'var(--line)'}` }}>
                    {['#', 'Brand', 'Amount', 'Status', 'Due', ''].map((h, i) => (
                      <th
                        key={h || 'actions'}
                        style={{
                          textAlign: i === 5 ? 'right' : 'left',
                          padding: '8px 12px',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '.15em',
                          textTransform: 'uppercase' as const,
                          color: 'var(--muted)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {initialInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--fg)', fontWeight: 500, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--fg)' }}>{inv.brand_name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--fg)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(inv.amount_cents)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant={INVOICE_STATUS_COLOR[inv.status] ?? 'default'}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '--'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          {inv.status === 'draft' && (
                            <button
                              onClick={() => handleSendInvoice(inv.id)}
                              style={{
                                height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
                                borderRadius: isNeumorphic ? 10 : 8, border: 'none', cursor: 'pointer',
                                ...(isEditorial
                                  ? { background: 'var(--ink)', color: 'var(--bg)' }
                                  : isNeumorphic
                                  ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                                  : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
                              }}
                            >
                              Send
                            </button>
                          )}
                          {(inv.status === 'sent' || inv.status === 'viewed') && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              style={{
                                height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
                                borderRadius: isNeumorphic ? 10 : 8, border: 'none', cursor: 'pointer',
                                ...(isEditorial
                                  ? { background: 'var(--ink)', color: 'var(--bg)' }
                                  : isNeumorphic
                                  ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                                  : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
                              }}
                            >
                              Mark paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            style={{
                              height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
                              borderRadius: isNeumorphic ? 10 : 8, cursor: 'pointer',
                              background: 'transparent', color: 'var(--color-bad, #ef4444)',
                              border: '1px solid var(--color-bad, #ef4444)',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              No invoices yet. Create one to start tracking payments.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function DealCard({
  deal,
  theme,
  onMove,
  onDelete,
  fmt,
}: {
  deal: Deal;
  theme: string;
  onMove: (dealId: string, stage: string) => void;
  onDelete: (dealId: string) => void;
  fmt: (n: number) => string;
}) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';
  const [showActions, setShowActions] = useState(false);
  const currentStage = deal.stage as DealStage;

  const stageIdx = STAGES.indexOf(currentStage);
  const nextStage = currentStage !== 'done' && currentStage !== 'lost' && stageIdx < STAGES.length - 2
    ? STAGES[stageIdx + 1]
    : null;

  return (
    <div
      onClick={() => setShowActions(!showActions)}
      style={{
        padding: '12px 14px',
        borderRadius: isNeumorphic ? 16 : 12,
        cursor: 'pointer',
        transition: 'all .15s',
        ...(isEditorial
          ? { background: 'var(--paper)', border: '1px solid var(--ink)' }
          : isNeumorphic
          ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-sm)' }
          : { background: 'rgba(255,255,255,.06)', border: 'none' }),
      }}
    >
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {deal.brand_name}
      </p>
      {deal.amount_cents ? (
        <p style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-primary)', marginTop: 2 }}>
          {fmt(deal.amount_cents)}
        </p>
      ) : null}
      {deal.title && (
        <p style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
          {deal.title}
        </p>
      )}

      {showActions && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {nextStage && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(deal.id, nextStage); }}
              style={{
                height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
                borderRadius: isNeumorphic ? 10 : 8, border: 'none', cursor: 'pointer',
                ...(isEditorial
                  ? { background: 'var(--ink)', color: 'var(--bg)' }
                  : isNeumorphic
                  ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                  : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
              }}
            >
              {STAGE_LABELS[nextStage]}
            </button>
          )}
          {currentStage !== 'lost' && currentStage !== 'done' && (
            <button
              onClick={(e) => { e.stopPropagation(); onMove(deal.id, 'lost'); }}
              style={{
                height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
                borderRadius: isNeumorphic ? 10 : 8, cursor: 'pointer',
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--line)',
              }}
            >
              Lost
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(deal.id); }}
            style={{
              height: 28, padding: '0 12px', fontSize: 11, fontWeight: 600,
              borderRadius: isNeumorphic ? 10 : 8, cursor: 'pointer',
              background: 'transparent', color: 'var(--color-bad, #ef4444)',
              border: '1px solid var(--color-bad, #ef4444)',
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
