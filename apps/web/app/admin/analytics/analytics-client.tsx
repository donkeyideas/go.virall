'use client';

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
import { Plug, Users, FileText, TrendingUp } from 'lucide-react';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PlatformStats = {
  platform: string;
  connected: number;
  followers: number;
  posts30d: number;
};

type Props = {
  platforms: PlatformStats[];
  totalFollowers: number;
  totalPosts30d: number;
  totalConnected: number;
};

/* ------------------------------------------------------------------ */
/*  Platform colors                                                    */
/* ------------------------------------------------------------------ */

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  x: '#1DA1F2',
  facebook: '#1877F2',
  twitch: '#9146FF',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function computeAvgEngagementRate(platforms: PlatformStats[]): string {
  const totalFollowers = platforms.reduce((s, p) => s + p.followers, 0);
  if (totalFollowers === 0) return '0%';
  // Estimate engagement as posts per 1K followers (activity rate proxy)
  const totalPosts = platforms.reduce((s, p) => s + p.posts30d, 0);
  const rate = (totalPosts / totalFollowers) * 100;
  if (rate < 0.01) return '0%';
  return rate.toFixed(2) + '%';
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--admin-surface-2, #1f2128)',
        border: '1px solid var(--admin-border, #2a2b33)',
        borderRadius: 4,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--fg, #e2e4ea)',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{PLATFORM_LABELS[label ?? ''] ?? label}</div>
      <div style={{ color: 'var(--admin-muted, #6b6e7b)' }}>{payload[0].value} posts</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type PlatformRow = {
  id: string;
  platform: string;
  connected: number;
  followers: number;
  posts30d: number;
};

export function AnalyticsClient({ platforms, totalFollowers, totalPosts30d, totalConnected }: Props) {
  const avgEngagement = computeAvgEngagementRate(platforms);

  const chartData = platforms.map((p) => ({
    name: PLATFORM_LABELS[p.platform] ?? p.platform,
    platform: p.platform,
    posts: p.posts30d,
  }));

  const rows: PlatformRow[] = platforms.map((p) => ({
    id: p.platform,
    platform: p.platform,
    connected: p.connected,
    followers: p.followers,
    posts30d: p.posts30d,
  }));

  const columns: AdminColumn<PlatformRow>[] = [
    {
      key: 'platform',
      header: 'Platform',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: PLATFORM_COLORS[row.platform] ?? 'var(--admin-muted)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 500, fontSize: 14 }}>
            {PLATFORM_LABELS[row.platform] ?? row.platform}
          </span>
        </div>
      ),
    },
    {
      key: 'connected',
      header: 'Connected',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
          {row.connected}
        </span>
      ),
      width: '120px',
    },
    {
      key: 'followers',
      header: 'Followers',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
          {fmtNum(row.followers)}
        </span>
      ),
      width: '120px',
    },
    {
      key: 'posts30d',
      header: 'Posts (30d)',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
          {row.posts30d}
        </span>
      ),
      width: '120px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 3,
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            letterSpacing: '0.04em',
            background: row.connected > 0 ? 'rgba(39,174,96,0.12)' : 'rgba(107,110,123,0.12)',
            color: row.connected > 0 ? 'var(--admin-green, #27ae60)' : 'var(--admin-muted, #6b6e7b)',
          }}
        >
          {row.connected > 0 ? 'Active' : 'None'}
        </span>
      ),
      width: '100px',
    },
  ];

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* Header */}
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
          Platform Analytics
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
          Cross-platform performance overview — last 30 days
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <AdminStatCard label="Total Platforms Connected" value={totalConnected.toString()} icon={<Plug size={18} />} />
        <AdminStatCard label="Total Followers" value={fmtNum(totalFollowers)} icon={<Users size={18} />} accent="green" />
        <AdminStatCard label="Total Posts (30d)" value={totalPosts30d.toString()} icon={<FileText size={18} />} />
        <AdminStatCard label="Avg Engagement Rate" value={avgEngagement} icon={<TrendingUp size={18} />} accent="amber" />
      </div>

      {/* Recharts Bar Chart */}
      <div
        style={{
          background: 'var(--admin-surface, #1a1b20)',
          border: '1px solid var(--admin-border, #2a2b33)',
          borderRadius: 4,
          padding: '24px 28px',
          marginBottom: 24,
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
          Posts by Platform (30d)
        </h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--admin-border, #2a2b33)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{
                  fill: 'var(--admin-muted, #6b6e7b)',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                axisLine={{ stroke: 'var(--admin-border, #2a2b33)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{
                  fill: 'var(--admin-muted, #6b6e7b)',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="posts" radius={[3, 3, 0, 0]} maxBarSize={48}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.platform}
                    fill={PLATFORM_COLORS[entry.platform] ?? '#6b6e7b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {platforms.map((p) => {
          const color = PLATFORM_COLORS[p.platform] ?? '#6b6e7b';
          const label = PLATFORM_LABELS[p.platform] ?? p.platform;

          return (
            <div
              key={p.platform}
              style={{
                background: 'var(--admin-surface, #1a1b20)',
                border: '1px solid var(--admin-border, #2a2b33)',
                borderRadius: 4,
                padding: '20px 22px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Accent bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: color,
                }}
              />

              {/* Platform name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    background: color + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: color,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {label.charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--fg, #e2e4ea)',
                  }}
                >
                  {label}
                </span>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--admin-muted, #6b6e7b)',
                      marginBottom: 4,
                    }}
                  >
                    Connected
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontFamily: 'Fraunces, serif',
                      fontWeight: 700,
                      color: 'var(--fg, #e2e4ea)',
                      lineHeight: 1,
                    }}
                  >
                    {p.connected}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--admin-muted, #6b6e7b)',
                      marginBottom: 4,
                    }}
                  >
                    Followers
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontFamily: 'Fraunces, serif',
                      fontWeight: 700,
                      color: 'var(--fg, #e2e4ea)',
                      lineHeight: 1,
                    }}
                  >
                    {fmtNum(p.followers)}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div
                    style={{
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--admin-muted, #6b6e7b)',
                      marginBottom: 4,
                    }}
                  >
                    Posts (30d)
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontFamily: 'Fraunces, serif',
                      fontWeight: 700,
                      color: 'var(--fg, #e2e4ea)',
                      lineHeight: 1,
                    }}
                  >
                    {p.posts30d}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Platform Table */}
      <AdminTable columns={columns} data={rows} emptyMessage="No platforms connected" />
    </div>
  );
}
