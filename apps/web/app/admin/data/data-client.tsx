'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Props = {
  smoBuckets: Array<{ range: string; count: number }>;
  tierCounts: Record<string, number>;
  topEvents: Array<{ name: string; count: number }>;
};

type EventRow = { id: string; name: string; count: number; pct: number };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SECTION_LABEL: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 11,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--admin-muted, #6b6e7b)',
};

const CARD: React.CSSProperties = {
  background: 'var(--admin-surface, #1a1b20)',
  border: '1px solid var(--admin-border, #2a2b33)',
  borderRadius: 4,
  padding: '24px 28px',
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DataClient({ smoBuckets, tierCounts, topEvents }: Props) {
  const totalEvents = useMemo(() => topEvents.reduce((s, e) => s + e.count, 0), [topEvents]);
  const totalTierUsers = useMemo(
    () => Object.values(tierCounts).reduce((s, c) => s + c, 0),
    [tierCounts],
  );

  /* -- Top events table -- */
  const eventRows: EventRow[] = useMemo(
    () =>
      topEvents.map((e) => ({
        id: e.name,
        name: e.name,
        count: e.count,
        pct: totalEvents > 0 ? Math.round((e.count / totalEvents) * 100) : 0,
      })),
    [topEvents, totalEvents],
  );

  const eventColumns: AdminColumn<EventRow>[] = [
    {
      key: 'name',
      header: 'Event',
      render: (row) => (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: 'var(--fg, #e2e4ea)',
          }}
        >
          {row.name}
        </span>
      ),
    },
    {
      key: 'count',
      header: 'Count',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
          {row.count.toLocaleString()}
        </span>
      ),
      width: '100px',
    },
    {
      key: 'pct',
      header: '% of Total',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: 'var(--admin-surface-3, #282a35)',
            }}
          >
            <div
              style={{
                width: `${row.pct}%`,
                height: '100%',
                borderRadius: 3,
                background: 'var(--admin-red, #c0392b)',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: 'var(--admin-muted, #6b6e7b)',
              minWidth: 30,
            }}
          >
            {row.pct}%
          </span>
        </div>
      ),
      width: '200px',
    },
  ];

  /* -- Tier distribution sorted -- */
  const tierEntries = useMemo(
    () =>
      Object.entries(tierCounts).sort(
        (a, b) => b[1] - a[1],
      ),
    [tierCounts],
  );
  const maxTier = useMemo(
    () => Math.max(...tierEntries.map(([, c]) => c), 1),
    [tierEntries],
  );

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
            color: 'var(--fg, #e2e4ea)',
            letterSpacing: '-0.02em',
          }}
        >
          Data Intelligence
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
          SMO score distributions, user tiers, and event analytics
        </p>
      </div>

      {/* Two-column charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        {/* SMO Score Distribution - Recharts BarChart */}
        <div style={CARD}>
          <h3 style={SECTION_LABEL}>SMO Score Distribution</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={smoBuckets}
                margin={{ top: 4, right: 4, left: -10, bottom: 4 }}
              >
                <XAxis
                  dataKey="range"
                  tick={{ fill: '#6b6e7b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: '#2a2b33' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b6e7b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a1b20',
                    border: '1px solid #2a2b33',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#e2e4ea',
                  }}
                  labelStyle={{ color: '#6b6e7b', fontSize: 10 }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {smoBuckets.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index < 3 ? '#c0392b' : index < 7 ? '#e67e22' : '#27ae60'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution - Horizontal bars */}
        <div style={CARD}>
          <h3 style={SECTION_LABEL}>User Tier Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
            {tierEntries.map(([tier, count]) => {
              const pct =
                totalTierUsers > 0 ? Math.round((count / totalTierUsers) * 100) : 0;
              const barWidth = maxTier > 0 ? Math.round((count / maxTier) * 100) : 0;
              return (
                <div key={tier}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      fontSize: 13,
                    }}
                  >
                    <span
                      style={{
                        textTransform: 'capitalize',
                        color: 'var(--fg, #e2e4ea)',
                        fontWeight: 500,
                      }}
                    >
                      {tier}
                    </span>
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                        color: 'var(--admin-muted, #6b6e7b)',
                      }}
                    >
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: 'var(--admin-surface-3, #282a35)',
                    }}
                  >
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        borderRadius: 4,
                        background: 'var(--admin-red, #c0392b)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {tierEntries.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
                No user data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Events Table */}
      <h3 style={{ ...SECTION_LABEL, marginBottom: 12 }}>Top Events</h3>
      <AdminTable
        columns={eventColumns}
        data={eventRows}
        emptyMessage="No events recorded"
      />
    </div>
  );
}
