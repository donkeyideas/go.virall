'use client';

import { useState, useCallback, useMemo } from 'react';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminStatusBadge } from '../_components/AdminStatusBadge';
import { AdminModal } from '../_components/AdminModal';
import { AdminTabs } from '../_components/AdminTabs';
import { updateTicket, deleteTicket } from '../../../lib/actions/admin/contacts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Ticket = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
};

type Props = {
  tickets: Array<{
    id: string;
    fromName: string;
    fromEmail: string;
    subject: string;
    body: string;
    status: string;
    priority: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  openCount: number;
  inProgressCount: number;
  resolvedCount: number;
  urgentCount: number;
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
  marginBottom: 4,
};

/* ------------------------------------------------------------------ */
/*  Status filter tabs                                                 */
/* ------------------------------------------------------------------ */

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

/* ------------------------------------------------------------------ */
/*  Toast Component                                                    */
/* ------------------------------------------------------------------ */

function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 10000,
        padding: '12px 20px',
        borderRadius: 4,
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background:
          toast.type === 'success'
            ? 'rgba(39,174,96,0.15)'
            : 'rgba(192,57,43,0.15)',
        border: `1px solid ${
          toast.type === 'success'
            ? 'var(--admin-green, #27ae60)'
            : 'var(--admin-red, #c0392b)'
        }`,
        color:
          toast.type === 'success'
            ? 'var(--admin-green, #27ae60)'
            : 'var(--admin-red, #c0392b)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <span>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: 0,
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        x
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ContactsClient({
  tickets: initialTickets,
  openCount,
  inProgressCount,
  resolvedCount,
  urgentCount,
}: Props) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  /* -- Toast helper -- */
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* -- Filter tickets -- */
  const filtered = useMemo(
    () => (statusFilter === 'all' ? tickets : tickets.filter((t) => t.status === statusFilter)),
    [tickets, statusFilter],
  );

  /* -- Status change -- */
  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      setLoading(true);
      const result = await updateTicket(id, { status });
      setLoading(false);
      if (result.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  resolvedAt: status === 'resolved' ? new Date().toISOString() : t.resolvedAt,
                }
              : t,
          ),
        );
        setSelected((s) =>
          s && s.id === id
            ? {
                ...s,
                status,
                resolvedAt: status === 'resolved' ? new Date().toISOString() : s.resolvedAt,
              }
            : s,
        );
        showToast(`Ticket marked as ${status.replace(/_/g, ' ')}`, 'success');
      } else {
        showToast(result.error ?? 'Failed to update ticket', 'error');
      }
    },
    [showToast],
  );

  /* -- Delete ticket -- */
  const handleDelete = useCallback(
    async (id: string) => {
      setLoading(true);
      const result = await deleteTicket(id);
      setLoading(false);
      if (result.success) {
        setTickets((prev) => prev.filter((t) => t.id !== id));
        setSelected(null);
        showToast('Ticket deleted', 'success');
      } else {
        showToast(result.error ?? 'Failed to delete ticket', 'error');
      }
    },
    [showToast],
  );

  /* -- Table columns -- */
  const columns: AdminColumn<Ticket>[] = [
    {
      key: 'from',
      header: 'From',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--fg, #e2e4ea)' }}>
            {row.fromName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--admin-muted, #6b6e7b)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {row.fromEmail}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--fg, #e2e4ea)' }}>{row.subject}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AdminStatusBadge status={row.status} />,
      width: '100px',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => <AdminStatusBadge status={row.priority} />,
      width: '90px',
    },
    {
      key: 'created',
      header: 'Created',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--admin-muted, #6b6e7b)',
          }}
        >
          {new Date(row.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
      width: '90px',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelected(row);
          }}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            background: 'var(--admin-surface-2, #1f2128)',
            color: 'var(--fg, #e2e4ea)',
            border: '1px solid var(--admin-border, #2a2b33)',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          View
        </button>
      ),
      width: '70px',
    },
  ];

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
          Support Tickets
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
          Contact and support management
        </p>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <AdminStatCard label="Open" value={openCount.toString()} icon="&#9633;" accent="amber" />
        <AdminStatCard
          label="In Progress"
          value={inProgressCount.toString()}
          icon="&#9654;"
          accent="default"
        />
        <AdminStatCard
          label="Resolved"
          value={resolvedCount.toString()}
          icon="&#10003;"
          accent="green"
        />
        <AdminStatCard label="Urgent" value={urgentCount.toString()} icon="&#9873;" accent="red" />
      </div>

      {/* Status Filter Tabs */}
      <AdminTabs tabs={STATUS_TABS} active={statusFilter} onChange={setStatusFilter} />

      {/* Tickets Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        onRowClick={setSelected}
        emptyMessage="No support tickets"
      />

      {/* Ticket Detail Modal */}
      {selected && (
        <AdminModal title="Ticket Details" onClose={() => setSelected(null)} wide>
          <div>
            {/* From */}
            <div style={{ marginBottom: 16 }}>
              <div style={LABEL_STYLE}>From</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg, #e2e4ea)' }}>
                {selected.fromName}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--admin-muted, #6b6e7b)',
                  fontFamily: 'JetBrains Mono, monospace',
                  marginTop: 2,
                }}
              >
                {selected.fromEmail}
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: 16 }}>
              <div style={LABEL_STYLE}>Subject</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg, #e2e4ea)' }}>
                {selected.subject}
              </div>
            </div>

            {/* Body */}
            <div style={{ marginBottom: 16 }}>
              <div style={LABEL_STYLE}>Message</div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--fg, #e2e4ea)',
                  lineHeight: 1.6,
                  padding: 16,
                  background: 'var(--admin-surface-2, #1f2128)',
                  borderRadius: 4,
                  border: '1px solid var(--admin-border, #2a2b33)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selected.body}
              </div>
            </div>

            {/* Status + Priority badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <AdminStatusBadge status={selected.status} />
              <AdminStatusBadge status={selected.priority} />
            </div>

            {/* Timestamps */}
            <div
              style={{
                display: 'flex',
                gap: 24,
                fontSize: 12,
                color: 'var(--admin-muted, #6b6e7b)',
                fontFamily: 'JetBrains Mono, monospace',
                marginBottom: 16,
              }}
            >
              <span>
                Created:{' '}
                {new Date(selected.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              {selected.resolvedAt && (
                <span>
                  Resolved:{' '}
                  {new Date(selected.resolvedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                borderTop: '1px solid var(--admin-border, #2a2b33)',
                paddingTop: 16,
              }}
            >
              {selected.status !== 'in_progress' && selected.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange(selected.id, 'in_progress')}
                  disabled={loading}
                  style={{
                    padding: '7px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    background: 'var(--admin-surface-2, #1f2128)',
                    color: 'var(--fg, #e2e4ea)',
                    border: '1px solid var(--admin-border, #2a2b33)',
                    borderRadius: 4,
                    cursor: loading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Mark In Progress
                </button>
              )}
              {selected.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange(selected.id, 'resolved')}
                  disabled={loading}
                  style={{
                    padding: '7px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    background: 'var(--admin-green, #27ae60)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: loading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Resolve
                </button>
              )}
              {selected.status !== 'closed' && (
                <button
                  onClick={() => handleStatusChange(selected.id, 'closed')}
                  disabled={loading}
                  style={{
                    padding: '7px 16px',
                    fontSize: 12,
                    fontWeight: 500,
                    background: 'var(--admin-surface-2, #1f2128)',
                    color: 'var(--admin-muted, #6b6e7b)',
                    border: '1px solid var(--admin-border, #2a2b33)',
                    borderRadius: 4,
                    cursor: loading ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Close
                </button>
              )}
              <button
                onClick={() => handleDelete(selected.id)}
                disabled={loading}
                style={{
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'transparent',
                  color: 'var(--admin-red, #c0392b)',
                  border: '1px solid var(--admin-red, #c0392b)',
                  borderRadius: 4,
                  cursor: loading ? 'wait' : 'pointer',
                  marginLeft: 'auto',
                  fontFamily: 'inherit',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Toast */}
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
