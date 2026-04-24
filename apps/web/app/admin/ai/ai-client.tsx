'use client';

import { useState } from 'react';
import { Brain, Cpu, DollarSign, Zap, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminTabs } from '../_components/AdminTabs';

/* ---------- Types ---------- */

type ProviderStats = {
  provider: string;
  calls: number;
  tokens: number;
  costCents: number;
};
type ContentTypeStats = {
  contentType: string;
  calls: number;
  tokens: number;
  costCents: number;
};
type AICall = {
  id: string;
  contentType: string;
  provider: string;
  tokens: number;
  costCents: number;
  createdAt: string;
};
type Props = {
  providers: ProviderStats[];
  contentTypes: ContentTypeStats[];
  recentCalls: AICall[];
  totalCalls: number;
  totalTokens: number;
  totalCostCents: number;
};

/* ---------- Constants ---------- */

const PROVIDER_COLORS: Record<string, string> = {
  deepseek: '#0066FF',
  openai: '#10A37F',
  anthropic: '#D97706',
  gemini: '#4285F4',
};

const TABS = [
  { key: 'providers', label: 'Provider Breakdown' },
  { key: 'types', label: 'Content Types' },
  { key: 'recent', label: 'Recent Calls' },
];

/* ---------- Helpers ---------- */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtCost(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? '#6b6e7b';
}

function formatContentType(raw: string): string {
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---------- Shared inline style fragments ---------- */

const mono: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
};

const monoSmall: React.CSSProperties = {
  ...mono,
  fontSize: 12,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left' as const,
  padding: '12px 16px',
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--admin-muted, #6b6e7b)',
  borderBottom: '1px solid var(--admin-border, #2a2b33)',
  background: 'var(--admin-surface-2, #1f2128)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  color: 'var(--fg, #e2e4ea)',
  verticalAlign: 'middle',
  borderBottom: '1px solid var(--admin-border, #2a2b33)',
};

const tableWrap: React.CSSProperties = {
  background: 'var(--admin-surface, #1a1b20)',
  border: '1px solid var(--admin-border, #2a2b33)',
  borderRadius: 4,
  overflow: 'hidden',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: 13,
};

/* ---------- Custom Tooltip for PieChart ---------- */

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: 'var(--admin-surface, #1a1b20)',
        border: '1px solid var(--admin-border, #2a2b33)',
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--fg, #e2e4ea)',
      }}
    >
      <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: 2 }}>
        {item.name}
      </div>
      <div style={mono}>
        {fmtNum(item.value)} calls
      </div>
    </div>
  );
}

/* ---------- Lucide icon wrapper for AdminStatCard ---------- */

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </span>
  );
}

/* ---------- Main Component ---------- */

export function AIClient({
  providers,
  contentTypes,
  recentCalls,
  totalCalls,
  totalTokens,
  totalCostCents,
}: Props) {
  const [tab, setTab] = useState('providers');

  const avgTokensPerCall = totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0;
  const topProvider =
    providers.length > 0
      ? [...providers].sort((a, b) => b.calls - a.calls)[0].provider
      : 'N/A';

  /* Pie chart data */
  const pieData = providers.map((p) => ({
    name: p.provider,
    value: p.calls,
  }));

  return (
    <div>
      {/* ---------- Header ---------- */}
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
          AI Intelligence
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'var(--admin-muted)',
          }}
        >
          AI usage analytics, provider breakdown, and cost tracking
        </p>
      </div>

      {/* ---------- 5 KPI Cards ---------- */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <AdminStatCard
          label="Total AI Calls"
          value={fmtNum(totalCalls)}
          icon={<IconWrap><Brain size={18} /></IconWrap>}
        />
        <AdminStatCard
          label="Total Tokens"
          value={fmtNum(totalTokens)}
          icon={<IconWrap><Cpu size={18} /></IconWrap>}
          accent="amber"
        />
        <AdminStatCard
          label="Total Cost"
          value={fmtCost(totalCostCents)}
          icon={<IconWrap><DollarSign size={18} /></IconWrap>}
          accent="green"
        />
        <AdminStatCard
          label="Avg Tokens/Call"
          value={fmtNum(avgTokensPerCall)}
          icon={<IconWrap><Zap size={18} /></IconWrap>}
        />
        <AdminStatCard
          label="Top Provider"
          value={topProvider}
          icon={<IconWrap><Activity size={18} /></IconWrap>}
          accent="red"
        />
      </div>

      {/* ---------- Tabs ---------- */}
      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ---------- Tab: Provider Breakdown ---------- */}
      {tab === 'providers' && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Pie Chart */}
          <div
            style={{
              ...tableWrap,
              width: 340,
              minWidth: 340,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--admin-muted, #6b6e7b)',
                marginBottom: 16,
                alignSelf: 'flex-start',
              }}
            >
              Calls by Provider
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={providerColor(entry.name)}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--admin-muted, #6b6e7b)',
                  fontSize: 13,
                }}
              >
                No data
              </div>
            )}
            {/* Legend */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                marginTop: 16,
                justifyContent: 'center',
              }}
            >
              {pieData.map((entry) => (
                <div
                  key={entry.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    color: 'var(--fg, #e2e4ea)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: providerColor(entry.name),
                    }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Table */}
          <div style={{ ...tableWrap, flex: 1 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Provider</th>
                  <th style={{ ...thStyle, width: 100 }}>Calls</th>
                  <th style={{ ...thStyle, width: 110 }}>Tokens</th>
                  <th style={{ ...thStyle, width: 100 }}>Cost</th>
                  <th style={{ ...thStyle, width: 120 }}>Avg Cost/Call</th>
                </tr>
              </thead>
              <tbody>
                {providers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: '40px 16px',
                        textAlign: 'center',
                        color: 'var(--admin-muted, #6b6e7b)',
                        fontSize: 13,
                      }}
                    >
                      No AI usage data
                    </td>
                  </tr>
                ) : (
                  [...providers]
                    .sort((a, b) => b.calls - a.calls)
                    .map((p) => {
                      const avgCostPerCall =
                        p.calls > 0 ? p.costCents / p.calls : 0;
                      return (
                        <tr key={p.provider}>
                          <td style={tdStyle}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 2,
                                  background: providerColor(p.provider),
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontWeight: 500,
                                  textTransform: 'capitalize',
                                }}
                              >
                                {p.provider}
                              </span>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, ...monoSmall }}>
                            {fmtNum(p.calls)}
                          </td>
                          <td style={{ ...tdStyle, ...monoSmall }}>
                            {fmtNum(p.tokens)}
                          </td>
                          <td style={{ ...tdStyle, ...monoSmall }}>
                            {fmtCost(p.costCents)}
                          </td>
                          <td style={{ ...tdStyle, ...monoSmall }}>
                            {fmtCost(avgCostPerCall)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------- Tab: Content Types ---------- */}
      {tab === 'types' && (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Content Type</th>
                <th style={{ ...thStyle, width: 100 }}>Calls</th>
                <th style={{ ...thStyle, width: 110 }}>Tokens</th>
                <th style={{ ...thStyle, width: 100 }}>Cost</th>
                <th style={{ ...thStyle, width: 150 }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {contentTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: 'var(--admin-muted, #6b6e7b)',
                      fontSize: 13,
                    }}
                  >
                    No content type data
                  </td>
                </tr>
              ) : (
                contentTypes.map((ct) => {
                  const pct =
                    totalCalls > 0
                      ? Math.round((ct.calls / totalCalls) * 100)
                      : 0;
                  return (
                    <tr key={ct.contentType}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>
                        {formatContentType(ct.contentType)}
                      </td>
                      <td style={{ ...tdStyle, ...monoSmall }}>
                        {fmtNum(ct.calls)}
                      </td>
                      <td style={{ ...tdStyle, ...monoSmall }}>
                        {fmtNum(ct.tokens)}
                      </td>
                      <td style={{ ...tdStyle, ...monoSmall }}>
                        {fmtCost(ct.costCents)}
                      </td>
                      <td style={tdStyle}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 6,
                              borderRadius: 3,
                              background:
                                'var(--admin-surface-3, #25262e)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                borderRadius: 3,
                                background:
                                  'var(--admin-red, #c0392b)',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              ...monoSmall,
                              fontSize: 11,
                              color: 'var(--admin-muted)',
                              minWidth: 30,
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------- Tab: Recent Calls ---------- */}
      {tab === 'recent' && (
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Content Type</th>
                <th style={{ ...thStyle, width: 120 }}>Provider</th>
                <th style={{ ...thStyle, width: 100 }}>Tokens</th>
                <th style={{ ...thStyle, width: 100 }}>Cost</th>
                <th style={{ ...thStyle, width: 160 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: 'var(--admin-muted, #6b6e7b)',
                      fontSize: 13,
                    }}
                  >
                    No recent AI calls
                  </td>
                </tr>
              ) : (
                recentCalls.map((call) => (
                  <tr key={call.id}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      {formatContentType(call.contentType)}
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: providerColor(call.provider),
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            ...monoSmall,
                            textTransform: 'capitalize',
                          }}
                        >
                          {call.provider}
                        </span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, ...monoSmall }}>
                      {fmtNum(call.tokens)}
                    </td>
                    <td style={{ ...tdStyle, ...monoSmall }}>
                      {fmtCost(call.costCents)}
                    </td>
                    <td style={tdStyle}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                        }}
                      >
                        <span style={{ ...monoSmall, fontSize: 12 }}>
                          {formatDate(call.createdAt)}
                        </span>
                        <span
                          style={{
                            ...monoSmall,
                            fontSize: 10,
                            color: 'var(--admin-muted, #6b6e7b)',
                          }}
                        >
                          {formatTime(call.createdAt)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
