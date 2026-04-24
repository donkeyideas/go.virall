'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminTabs } from '../_components/AdminTabs';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminStatusBadge } from '../_components/AdminStatusBadge';

type Subscription = {
  id: string;
  userId: string;
  handle: string;
  email: string;
  tier: string;
  status: string;
  amountCents: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
};

type StripeEvent = {
  id: string;
  eventType: string;
  processed: boolean;
  error: string | null;
  createdAt: string;
};

type Props = {
  subscriptions: Subscription[];
  stripeEvents: StripeEvent[];
  mrr: number;
  activeSubs: number;
  churned30d: number;
  revenueByTier: Record<string, number>;
};

/* ---------- helpers ---------- */

function fmt(n: number) {
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ---------- constants ---------- */

const TABS = [
  { key: 'revenue', label: 'Revenue Overview' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'stripe', label: 'Stripe Events' },
];

const TIER_COLORS: Record<string, string> = {
  creator: '#3498db',
  pro: '#e67e22',
  agency: '#c0392b',
};

/* ---------- table columns ---------- */

const subColumns: AdminColumn<Subscription>[] = [
  {
    key: 'user',
    header: 'User',
    render: (row) => (
      <div>
        <div style={{ fontWeight: 500, color: 'var(--fg)' }}>
          @{row.handle}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--admin-muted)',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          {row.email}
        </div>
      </div>
    ),
  },
  {
    key: 'tier',
    header: 'Tier',
    render: (row) => <AdminStatusBadge status={row.tier} />,
    width: '90px',
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <AdminStatusBadge status={row.status} />,
    width: '100px',
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (row) => (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          color: 'var(--fg)',
        }}
      >
        {fmt(row.amountCents / 100)}/mo
      </span>
    ),
    width: '120px',
  },
  {
    key: 'periodStart',
    header: 'Period Start',
    render: (row) => (
      <span
        style={{
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--admin-muted)',
        }}
      >
        {fmtDate(row.currentPeriodStart)}
      </span>
    ),
    width: '130px',
  },
  {
    key: 'periodEnd',
    header: 'Period End',
    render: (row) => (
      <span
        style={{
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--admin-muted)',
        }}
      >
        {fmtDate(row.currentPeriodEnd)}
      </span>
    ),
    width: '130px',
  },
];

const eventColumns: AdminColumn<StripeEvent>[] = [
  {
    key: 'eventType',
    header: 'Event Type',
    render: (row) => (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          color: 'var(--fg)',
        }}
      >
        {row.eventType}
      </span>
    ),
  },
  {
    key: 'processed',
    header: 'Processed',
    render: (row) => (
      <AdminStatusBadge status={row.processed ? 'active' : 'pending'} />
    ),
    width: '100px',
  },
  {
    key: 'error',
    header: 'Error',
    render: (row) =>
      row.error ? (
        <span style={{ fontSize: 12, color: 'var(--admin-red, #c0392b)' }}>
          {row.error.length > 80 ? row.error.slice(0, 80) + '...' : row.error}
        </span>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--admin-muted)' }}>
          {'\u2014'}
        </span>
      ),
  },
  {
    key: 'createdAt',
    header: 'Created At',
    render: (row) => (
      <span
        style={{
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--admin-muted)',
        }}
      >
        {fmtDateTime(row.createdAt)}
      </span>
    ),
    width: '150px',
  },
];

/* ---------- custom tooltip ---------- */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--admin-surface, #1a1b20)',
        border: '1px solid var(--admin-border, #2a2b33)',
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div
        style={{
          color: 'var(--admin-muted)',
          marginBottom: 4,
          textTransform: 'capitalize' as const,
        }}
      >
        {label}
      </div>
      <div style={{ color: 'var(--fg)', fontWeight: 600 }}>
        {fmt(payload[0].value)}
      </div>
    </div>
  );
}

/* ---------- component ---------- */

export function BillingClient({
  subscriptions,
  stripeEvents,
  mrr,
  activeSubs,
  churned30d,
  revenueByTier,
}: Props) {
  const [tab, setTab] = useState('revenue');

  const arr = mrr * 12;
  const arpu = activeSubs > 0 ? mrr / activeSubs : 0;

  // Prepare chart data from revenueByTier
  const tierChartData = Object.entries(revenueByTier).map(([tier, revenue]) => ({
    tier: tier.charAt(0).toUpperCase() + tier.slice(1),
    revenue,
    fill: TIER_COLORS[tier] ?? '#6b6e7b',
  }));

  // Revenue summary for the overview tab
  const totalMonthlyRevenue = Object.values(revenueByTier).reduce(
    (sum, v) => sum + v,
    0
  );

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontFamily: 'Fraunces, serif',
            fontWeight: 700,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
          }}
        >
          Billing & Revenue
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'var(--admin-muted)',
          }}
        >
          Financial metrics and subscription management
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <AdminStatCard label="MRR" value={fmt(mrr)} icon="$" accent="green" />
        <AdminStatCard label="ARR" value={fmt(arr)} icon="$" />
        <AdminStatCard
          label="Active Subs"
          value={activeSubs.toString()}
          icon="#"
          accent="green"
        />
        <AdminStatCard
          label="Churned (30d)"
          value={churned30d.toString()}
          icon="!"
          accent={churned30d > 0 ? 'red' : 'default'}
        />
        <AdminStatCard label="ARPU" value={fmt(arpu)} icon="~" />
      </div>

      {/* Tabs */}
      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {/* Revenue Overview Tab */}
      {tab === 'revenue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Bar Chart */}
          <div
            style={{
              background: 'var(--admin-surface, #1a1b20)',
              border: '1px solid var(--admin-border, #2a2b33)',
              borderRadius: 4,
              padding: '24px 28px',
            }}
          >
            <h3
              style={{
                margin: '0 0 20px',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: 'var(--admin-muted)',
              }}
            >
              Monthly Revenue by Tier
            </h3>
            {tierChartData.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--admin-muted)' }}>
                No revenue data yet
              </p>
            ) : (
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={tierChartData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--admin-border, #2a2b33)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="tier"
                      tick={{
                        fill: 'var(--admin-muted, #6b6e7b)',
                        fontSize: 12,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      axisLine={{ stroke: 'var(--admin-border, #2a2b33)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{
                        fill: 'var(--admin-muted, #6b6e7b)',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                      axisLine={{ stroke: 'var(--admin-border, #2a2b33)' }}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${v}`}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{
                        fill: 'rgba(255,255,255,0.03)',
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={64}
                    >
                      {tierChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Revenue Summary */}
          <div
            style={{
              background: 'var(--admin-surface, #1a1b20)',
              border: '1px solid var(--admin-border, #2a2b33)',
              borderRadius: 4,
              padding: '24px 28px',
            }}
          >
            <h3
              style={{
                margin: '0 0 20px',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: 'var(--admin-muted)',
              }}
            >
              Revenue Summary
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              {Object.entries(revenueByTier).map(([tier, revenue]) => (
                <div
                  key={tier}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--admin-surface-2, #1f2128)',
                    borderRadius: 4,
                    border: '1px solid var(--admin-border, #2a2b33)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: TIER_COLORS[tier] ?? 'var(--admin-muted)',
                      marginBottom: 8,
                    }}
                  >
                    {tier}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontFamily: 'Fraunces, serif',
                      fontWeight: 700,
                      color: 'var(--fg)',
                      letterSpacing: '-0.02em',
                      marginBottom: 4,
                    }}
                  >
                    {fmt(revenue)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--admin-muted)',
                    }}
                  >
                    {totalMonthlyRevenue > 0
                      ? ((revenue / totalMonthlyRevenue) * 100).toFixed(1)
                      : '0.0'}
                    % of total
                  </div>
                </div>
              ))}
              <div
                style={{
                  padding: '16px 20px',
                  background: 'var(--admin-surface-2, #1f2128)',
                  borderRadius: 4,
                  border: '1px solid var(--admin-green, #27ae60)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--admin-green, #27ae60)',
                    marginBottom: 8,
                  }}
                >
                  Total Monthly
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontFamily: 'Fraunces, serif',
                    fontWeight: 700,
                    color: 'var(--fg)',
                    letterSpacing: '-0.02em',
                    marginBottom: 4,
                  }}
                >
                  {fmt(totalMonthlyRevenue)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--admin-muted)',
                  }}
                >
                  across {activeSubs} active subscription
                  {activeSubs !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {tab === 'subscriptions' && (
        <AdminTable
          columns={subColumns}
          data={subscriptions}
          emptyMessage="No subscriptions found"
        />
      )}

      {/* Stripe Events Tab */}
      {tab === 'stripe' && (
        <AdminTable
          columns={eventColumns}
          data={stripeEvents}
          emptyMessage="No Stripe events found"
        />
      )}
    </div>
  );
}
