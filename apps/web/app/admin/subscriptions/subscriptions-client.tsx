'use client';

import { useState, useMemo, useCallback } from 'react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminStatusBadge } from '../_components/AdminStatusBadge';
import { AdminTabs } from '../_components/AdminTabs';
import { AdminModal } from '../_components/AdminModal';
import { updatePlan } from '../../../lib/actions/admin/plans';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Plan = {
  tier: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  tagline: string;
  features: string[];
  maxPlatforms: number;
  maxAnalyses: number;
  maxContentGens: number;
  maxAiMessages: number;
  isActive: boolean;
  sortOrder: number;
};

type Sub = {
  id: string;
  handle: string;
  email: string;
  tier: string;
  status: string;
  amountCents: number;
  createdAt: string;
};

type Props = {
  plans: Plan[];
  tierCounts: Record<string, number>;
  subscriptions: Sub[];
};

type Toast = { message: string; type: 'success' | 'error' };

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--admin-muted, #6b6e7b)',
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  background: 'var(--admin-surface-2, #1f2128)',
  border: '1px solid var(--admin-border, #2a2b33)',
  borderRadius: 4,
  color: 'var(--fg, #e2e4ea)',
  fontFamily: 'inherit',
  outline: 'none',
};

/* ------------------------------------------------------------------ */
/*  Tier filter tabs                                                   */
/* ------------------------------------------------------------------ */

const TIER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'creator', label: 'Creator' },
  { key: 'pro', label: 'Pro' },
  { key: 'agency', label: 'Agency' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPrice(cents: number): string {
  return '$' + (cents / 100).toFixed(0);
}

function fmtLimit(val: number): string {
  return val === -1 ? 'Unlimited' : String(val);
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SubscriptionsClient({ plans: initialPlans, tierCounts, subscriptions }: Props) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [tierFilter, setTierFilter] = useState('all');
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  /* Edit form state */
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editPriceMonthly, setEditPriceMonthly] = useState('');
  const [editPriceYearly, setEditPriceYearly] = useState('');
  const [editFeatures, setEditFeatures] = useState('');
  const [editMaxPlatforms, setEditMaxPlatforms] = useState('');
  const [editMaxAnalyses, setEditMaxAnalyses] = useState('');
  const [editMaxContentGens, setEditMaxContentGens] = useState('');
  const [editMaxAiMessages, setEditMaxAiMessages] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const openEdit = useCallback((plan: Plan) => {
    setEditing(plan);
    setEditName(plan.name);
    setEditTagline(plan.tagline);
    setEditPriceMonthly(String(plan.priceMonthly / 100));
    setEditPriceYearly(String(plan.priceYearly / 100));
    setEditFeatures(plan.features.join('\n'));
    setEditMaxPlatforms(String(plan.maxPlatforms));
    setEditMaxAnalyses(String(plan.maxAnalyses));
    setEditMaxContentGens(String(plan.maxContentGens));
    setEditMaxAiMessages(String(plan.maxAiMessages));
  }, []);

  const closeEdit = useCallback(() => setEditing(null), []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setSaving(true);

    const features = editFeatures.split('\n').map((f) => f.trim()).filter(Boolean);
    const updates = {
      name: editName,
      tagline: editTagline,
      priceMonthly: Math.round(parseFloat(editPriceMonthly || '0') * 100),
      priceYearly: Math.round(parseFloat(editPriceYearly || '0') * 100),
      features,
      maxPlatforms: parseInt(editMaxPlatforms) || -1,
      maxAnalyses: parseInt(editMaxAnalyses) || -1,
      maxContentGens: parseInt(editMaxContentGens) || -1,
      maxAiMessages: parseInt(editMaxAiMessages) || -1,
    };

    const result = await updatePlan(editing.tier, updates);
    setSaving(false);

    if ('error' in result && result.error) {
      showToast(result.error, 'error');
    } else {
      setPlans((prev) => prev.map((p) => (p.tier === editing.tier ? { ...p, ...updates } : p)));
      showToast('Plan updated', 'success');
      closeEdit();
    }
  }, [editing, editName, editTagline, editPriceMonthly, editPriceYearly, editFeatures, editMaxPlatforms, editMaxAnalyses, editMaxContentGens, editMaxAiMessages, showToast, closeEdit]);

  const filtered = useMemo(
    () => (tierFilter === 'all' ? subscriptions : subscriptions.filter((s) => s.tier === tierFilter)),
    [subscriptions, tierFilter],
  );

  const columns: AdminColumn<Sub>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--fg, #e2e4ea)' }}>@{row.handle}</div>
          <div style={{ fontSize: 11, color: 'var(--admin-muted, #6b6e7b)', fontFamily: 'JetBrains Mono, monospace' }}>{row.email}</div>
        </div>
      ),
    },
    { key: 'tier', header: 'Tier', render: (row) => <AdminStatusBadge status={row.tier} />, width: '90px' },
    { key: 'status', header: 'Status', render: (row) => <AdminStatusBadge status={row.status} />, width: '100px' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--fg, #e2e4ea)' }}>
          {fmtMoney(row.amountCents)}/mo
        </span>
      ),
      width: '120px',
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => (
        <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--admin-muted, #6b6e7b)' }}>
          {new Date(row.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
        </span>
      ),
      width: '100px',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg, #e2e4ea)', letterSpacing: '-0.02em' }}>
          Subscription Plans
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
          Plan configuration and subscriber overview
        </p>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 4)}, 1fr)`, gap: 16, marginBottom: 32 }}>
        {plans.map((plan) => (
          <div
            key={plan.tier}
            style={{
              background: 'var(--admin-surface, #1a1b20)',
              border: '1px solid var(--admin-border, #2a2b33)',
              borderRadius: 4,
              padding: '22px 24px',
              position: 'relative',
            }}
          >
            <button
              onClick={() => openEdit(plan)}
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'var(--admin-surface-2, #1f2128)',
                border: '1px solid var(--admin-border, #2a2b33)',
                borderRadius: 4, padding: '4px 10px', fontSize: 11,
                color: 'var(--admin-muted, #6b6e7b)', cursor: 'pointer',
                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em',
              }}
            >
              Edit
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingRight: 50 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 600, color: 'var(--fg, #e2e4ea)' }}>
                {plan.name}
              </h3>
              <span style={{ fontSize: 16, fontFamily: 'JetBrains Mono, monospace', color: 'var(--fg, #e2e4ea)', fontWeight: 600 }}>
                {fmtPrice(plan.priceMonthly)}
                <span style={{ fontSize: 11, color: 'var(--admin-muted, #6b6e7b)' }}>/mo</span>
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--admin-muted, #6b6e7b)' }}>
                {tierCounts[plan.tier] ?? 0} active subscriber{(tierCounts[plan.tier] ?? 0) !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 24, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg, #e2e4ea)', lineHeight: 1 }}>
                {tierCounts[plan.tier] ?? 0}
              </span>
            </div>

            <div style={LABEL_STYLE}>Limits</div>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--admin-muted, #6b6e7b)', marginBottom: 16, lineHeight: 1.8 }}>
              Platforms: {fmtLimit(plan.maxPlatforms)} | Analyses: {fmtLimit(plan.maxAnalyses)}<br />
              Content: {fmtLimit(plan.maxContentGens)} | AI Msgs: {fmtLimit(plan.maxAiMessages)}
            </div>

            <div style={LABEL_STYLE}>Features</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--admin-muted, #6b6e7b)', lineHeight: 1.8 }}>
              {plan.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* Subscribers Table */}
      <AdminTabs tabs={TIER_TABS} active={tierFilter} onChange={setTierFilter} />
      <AdminTable columns={columns} data={filtered} emptyMessage="No subscriptions found" />

      {/* Edit Modal */}
      {editing && (
        <AdminModal title={`Edit Plan: ${editing.name}`} onClose={closeEdit} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL_STYLE}>Plan Name</div>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <div style={LABEL_STYLE}>Tagline</div>
                <input type="text" value={editTagline} onChange={(e) => setEditTagline(e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={LABEL_STYLE}>Monthly Price ($)</div>
                <input type="number" value={editPriceMonthly} onChange={(e) => setEditPriceMonthly(e.target.value)} style={INPUT_STYLE} min="0" step="1" />
              </div>
              <div>
                <div style={LABEL_STYLE}>Yearly Price ($)</div>
                <input type="number" value={editPriceYearly} onChange={(e) => setEditPriceYearly(e.target.value)} style={INPUT_STYLE} min="0" step="1" />
              </div>
            </div>

            <div>
              <div style={LABEL_STYLE}>Plan Limits (-1 = unlimited)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { label: 'Platforms', value: editMaxPlatforms, set: setEditMaxPlatforms },
                  { label: 'Analyses/mo', value: editMaxAnalyses, set: setEditMaxAnalyses },
                  { label: 'Content/mo', value: editMaxContentGens, set: setEditMaxContentGens },
                  { label: 'AI Msgs/day', value: editMaxAiMessages, set: setEditMaxAiMessages },
                ].map((f) => (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, color: 'var(--admin-muted, #6b6e7b)', marginBottom: 4 }}>{f.label}</div>
                    <input type="number" value={f.value} onChange={(e) => f.set(e.target.value)} style={{ ...INPUT_STYLE, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={LABEL_STYLE}>Features (one per line)</div>
              <textarea value={editFeatures} onChange={(e) => setEditFeatures(e.target.value)} rows={6} style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.6 }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--admin-border, #2a2b33)', paddingTop: 16 }}>
              <button onClick={closeEdit} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, color: 'var(--fg, #e2e4ea)', background: 'var(--admin-surface-2, #1f2128)', border: '1px solid var(--admin-border, #2a2b33)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editName.trim()}
                style={{ padding: '8px 24px', fontSize: 13, fontWeight: 500, background: 'var(--admin-red, #c0392b)', color: '#fff', border: 'none', borderRadius: 4, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}
              >
                {saving ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000, padding: '12px 20px', borderRadius: 4, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10, background: toast.type === 'success' ? 'rgba(39,174,96,0.15)' : 'rgba(192,57,43,0.15)', border: `1px solid ${toast.type === 'success' ? 'var(--admin-green, #27ae60)' : 'var(--admin-red, #c0392b)'}`, color: toast.type === 'success' ? 'var(--admin-green, #27ae60)' : 'var(--admin-red, #c0392b)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>x</button>
        </div>
      )}
    </div>
  );
}
