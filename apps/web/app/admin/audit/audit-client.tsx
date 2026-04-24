'use client';

import { useState } from 'react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminModal } from '../_components/AdminModal';

type LogEntry = {
  id: string;
  actor: { handle: string; displayName: string };
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
};

type Props = { logs: LogEntry[] };

export function AuditClient({ logs }: Props) {
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [actionFilter, setActionFilter] = useState('');

  const filtered = actionFilter
    ? logs.filter((l) => l.action.toLowerCase().includes(actionFilter.toLowerCase()))
    : logs;

  const columns: AdminColumn<LogEntry>[] = [
    {
      key: 'actor',
      header: 'Actor',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{row.actor.displayName}</div>
          <div style={{ fontSize: 11, color: 'var(--admin-muted)', fontFamily: 'JetBrains Mono, monospace' }}>@{row.actor.handle}</div>
        </div>
      ),
    },
    { key: 'action', header: 'Action', render: (row) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{row.action}</span> },
    { key: 'target', header: 'Target', render: (row) => <span style={{ fontSize: 12, color: 'var(--admin-muted)' }}>{row.targetType ? `${row.targetType}${row.targetId ? ` / ${row.targetId.slice(0, 8)}...` : ''}` : '—'}</span> },
    {
      key: 'ip',
      header: 'IP',
      render: (row) => <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--admin-muted)' }}>{row.ipAddress ?? '—'}</span>,
      width: '120px',
    },
    {
      key: 'time',
      header: 'Time',
      render: (row) => <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--admin-muted)' }}>{new Date(row.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>,
      width: '150px',
    },
  ];

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: 13,
    background: 'var(--admin-surface)',
    border: '1px solid var(--admin-border)',
    borderRadius: 4,
    color: 'var(--fg)',
    fontFamily: 'inherit',
    outline: 'none',
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.02em' }}>Audit Log</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>{logs.length} entries (read-only)</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Filter by action..."
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ ...inputStyle, maxWidth: 320 }}
        />
      </div>

      <AdminTable columns={columns} data={filtered} onRowClick={setSelected} emptyMessage="No audit log entries" />

      {selected && (
        <AdminModal title="Audit Log Detail" onClose={() => setSelected(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', fontSize: 13, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 4 }}>Actor</div>
              <div style={{ color: 'var(--fg)' }}>{selected.actor.displayName} (@{selected.actor.handle})</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 4 }}>Action</div>
              <div style={{ color: 'var(--fg)', fontFamily: 'JetBrains Mono, monospace' }}>{selected.action}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 4 }}>Target</div>
              <div style={{ color: 'var(--fg)' }}>{selected.targetType ?? '—'} {selected.targetId ?? ''}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 4 }}>Timestamp</div>
              <div style={{ color: 'var(--fg)' }}>{new Date(selected.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 4 }}>IP Address</div>
              <div style={{ color: 'var(--fg)', fontFamily: 'JetBrains Mono, monospace' }}>{selected.ipAddress ?? '—'}</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 8 }}>Metadata</div>
            <pre
              style={{
                padding: 16,
                background: 'var(--admin-surface-2)',
                border: '1px solid var(--admin-border)',
                borderRadius: 4,
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--fg)',
                overflowX: 'auto',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(selected.metadata, null, 2)}
            </pre>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
