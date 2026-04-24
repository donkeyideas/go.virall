'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AdminStatCard } from './_components/AdminStatCard';

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeSubs: number;
  mrr: number;
  totalPosts: number;
  aiTokens: number;
  aiCost: number;
  connectedPlatforms: number;
  recentSignups: Array<{
    id: string;
    displayName: string;
    email: string;
    createdAt: string;
    tier: string;
  }>;
  dailyUsers: Array<{ date: string; count: number }>;
  tierDistribution: Record<string, number>;
};

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'k';
  return n.toString();
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMRR(n: number): string {
  if (n >= 1_000) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatAxisDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Tier colors ─────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  free: '#6b7280',
  creator: '#3b82f6',
  pro: '#8b5cf6',
  agency: '#f59e0b',
};

const TIER_ORDER = ['free', 'creator', 'pro', 'agency'];

// ─── Tier badge ──────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  const color = TIER_COLORS[tier] ?? '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 3,
        fontSize: 11,
        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: `${color}22`,
        color: color,
        textTransform: 'capitalize',
      }}
    >
      {tier}
    </span>
  );
}

// ─── Custom tooltip for AreaChart ────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
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
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          color: 'var(--admin-muted, #6b6e7b)',
          marginBottom: 4,
        }}
      >
        {label ? formatAxisDate(label) : ''}
      </div>
      <div
        style={{
          fontSize: 18,
          fontFamily: 'var(--font-display, Fraunces, serif)',
          fontWeight: 700,
          color: 'var(--fg, #e2e4ea)',
        }}
      >
        {payload[0].value}
      </div>
      <div
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          color: 'var(--admin-muted, #6b6e7b)',
          marginTop: 2,
        }}
      >
        new users
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function OverviewClient({
  totalUsers,
  newUsers7d,
  newUsers30d,
  activeSubs,
  mrr,
  totalPosts,
  aiTokens,
  aiCost,
  connectedPlatforms,
  recentSignups,
  dailyUsers,
  tierDistribution,
}: Props) {
  // Prepare tier entries in consistent order
  const tierEntries = TIER_ORDER
    .map((t) => [t, tierDistribution[t] ?? 0] as [string, number])
    .filter(([, count]) => count > 0 || true); // show all tiers even if 0
  const totalSubs = tierEntries.reduce((s, [, c]) => s + c, 0);

  // Admin-red for the chart gradient
  const chartColor = 'var(--admin-red, #c0392b)';
  const chartColorRaw = '#c0392b';

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontFamily: 'var(--font-display, Fraunces, serif)',
            fontWeight: 700,
            color: 'var(--fg, #e2e4ea)',
            letterSpacing: '-0.02em',
          }}
        >
          Dashboard
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'var(--admin-muted, #6b6e7b)',
          }}
        >
          Platform overview and key metrics
        </p>
      </div>

      {/* ── KPI Grid: 4x2 ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <AdminStatCard
          label="Total Users"
          value={formatNumber(totalUsers)}
          icon="&#x2662;"
          sub={`+${newUsers30d} this month`}
          accent="green"
        />
        <AdminStatCard
          label="New Users (7d)"
          value={formatNumber(newUsers7d)}
          icon="&#x25B3;"
          sub={`of ${formatNumber(totalUsers)} total`}
          accent="green"
        />
        <AdminStatCard
          label="Active Subs"
          value={formatNumber(activeSubs)}
          icon="&#x2B21;"
          sub={`${totalUsers > 0 ? Math.round((activeSubs / totalUsers) * 100) : 0}% conversion`}
          accent="green"
        />
        <AdminStatCard
          label="MRR"
          value={formatMRR(mrr)}
          icon="&#x229B;"
          sub={`${activeSubs} paying users`}
          accent="green"
        />
        <AdminStatCard
          label="Total Posts"
          value={formatNumber(totalPosts)}
          icon="&#x229E;"
          sub={`across ${connectedPlatforms} platforms`}
        />
        <AdminStatCard
          label="AI Tokens Used"
          value={formatTokens(aiTokens)}
          icon="&#x2B22;"
          sub={`${formatCurrency(aiCost)} spent`}
          accent="amber"
        />
        <AdminStatCard
          label="AI Cost"
          value={formatCurrency(aiCost)}
          icon="&#x25C7;"
          sub={`${formatTokens(aiTokens)} tokens`}
          accent="amber"
        />
        <AdminStatCard
          label="Connected Platforms"
          value={formatNumber(connectedPlatforms)}
          icon="&#x25C8;"
          sub="linked accounts"
        />
      </div>

      {/* ── New Users Chart (AreaChart, last 30d) ── */}
      <div
        style={{
          background: 'var(--admin-surface, #1a1b20)',
          border: '1px solid var(--admin-border, #2a2b33)',
          borderRadius: 4,
          padding: '20px 22px 16px',
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            margin: '0 0 16px',
            fontSize: 11,
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--admin-muted, #6b6e7b)',
          }}
        >
          New Users &mdash; Last 30 Days
        </h3>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyUsers} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColorRaw} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chartColorRaw} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--admin-border, #2a2b33)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDate}
                tick={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fill: '#6b6e7b',
                }}
                axisLine={{ stroke: 'var(--admin-border, #2a2b33)' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  fill: '#6b6e7b',
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: 'var(--admin-border, #2a2b33)', strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={chartColorRaw}
                strokeWidth={2}
                fill="url(#userGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: chartColorRaw,
                  stroke: 'var(--admin-surface, #1a1b20)',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom row: Tier distribution + Recent signups ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: 20,
        }}
      >
        {/* Tier Distribution */}
        <div
          style={{
            background: 'var(--admin-surface, #1a1b20)',
            border: '1px solid var(--admin-border, #2a2b33)',
            borderRadius: 4,
            padding: '20px 22px',
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              fontSize: 11,
              fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--admin-muted, #6b6e7b)',
            }}
          >
            Subscription Tiers
          </h3>

          {totalSubs === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
              No active subscriptions yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {tierEntries.map(([tier, count]) => {
                const pct = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
                const color = TIER_COLORS[tier] ?? '#6b7280';
                return (
                  <div key={tier}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          textTransform: 'capitalize',
                          color: 'var(--fg, #e2e4ea)',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: color,
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        {tier}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                          fontSize: 12,
                          color: 'var(--admin-muted, #6b6e7b)',
                        }}
                      >
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--admin-surface-3, #242630)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          minWidth: count > 0 ? 4 : 0,
                          height: '100%',
                          borderRadius: 3,
                          background: color,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary line */}
          {totalSubs > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 12,
                borderTop: '1px solid var(--admin-border, #2a2b33)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                color: 'var(--admin-muted, #6b6e7b)',
              }}
            >
              <span>Total active</span>
              <span style={{ color: 'var(--fg, #e2e4ea)', fontWeight: 600 }}>{totalSubs}</span>
            </div>
          )}
        </div>

        {/* Recent Signups Table */}
        <div
          style={{
            background: 'var(--admin-surface, #1a1b20)',
            border: '1px solid var(--admin-border, #2a2b33)',
            borderRadius: 4,
            padding: '20px 22px',
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              fontSize: 11,
              fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--admin-muted, #6b6e7b)',
            }}
          >
            Recent Signups
          </h3>

          {recentSignups.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
              No users have signed up yet
            </p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {['Name', 'Email', 'Tier', 'Joined'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '0 12px 10px 0',
                        fontSize: 10,
                        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--admin-muted, #6b6e7b)',
                        borderBottom: '1px solid var(--admin-border, #2a2b33)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((user) => (
                  <tr key={user.id}>
                    {/* Name */}
                    <td
                      style={{
                        padding: '10px 12px 10px 0',
                        borderBottom: '1px solid var(--admin-border, #2a2b33)',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'var(--admin-surface-3, #242630)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--fg, #e2e4ea)',
                            flexShrink: 0,
                          }}
                        >
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--fg, #e2e4ea)' }}>
                          {user.displayName}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td
                      style={{
                        padding: '10px 12px 10px 0',
                        borderBottom: '1px solid var(--admin-border, #2a2b33)',
                        verticalAlign: 'middle',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                        color: 'var(--admin-muted, #6b6e7b)',
                      }}
                    >
                      {user.email}
                    </td>

                    {/* Tier */}
                    <td
                      style={{
                        padding: '10px 12px 10px 0',
                        borderBottom: '1px solid var(--admin-border, #2a2b33)',
                        verticalAlign: 'middle',
                      }}
                    >
                      <TierBadge tier={user.tier} />
                    </td>

                    {/* Joined */}
                    <td
                      style={{
                        padding: '10px 0 10px 0',
                        borderBottom: '1px solid var(--admin-border, #2a2b33)',
                        verticalAlign: 'middle',
                        fontSize: 12,
                        fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                        color: 'var(--admin-muted, #6b6e7b)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {relativeTime(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
