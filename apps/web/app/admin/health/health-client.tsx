'use client';

import { useState, useCallback } from 'react';
import { Database, AlertTriangle, RefreshCw, Users } from 'lucide-react';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { reprocessStripeEvent } from '../../../lib/actions/admin/health';

/* ---------- types ---------- */

type StuckEvent = {
  id: string;
  eventType: string;
  error: string | null;
  receivedAt: string;
};

type SyncError = {
  id: string;
  platform: string;
  handle: string;
  error: string;
  lastSyncedAt: string | null;
};

type Props = {
  dbHealthy: boolean;
  stuckEvents: StuckEvent[];
  syncErrors: SyncError[];
  activeUsersHr: number;
};

/* ---------- toast ---------- */

function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
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
        color: '#fff',
        background: type === 'success' ? 'var(--admin-green, #27ae60)' : 'var(--admin-red, #c0392b)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 15, padding: '0 4px', lineHeight: 1, opacity: 0.7 }}
      >
        x
      </button>
    </div>
  );
}

/* ---------- component ---------- */

export function HealthClient({ dbHealthy, stuckEvents: initialStuckEvents, syncErrors, activeUsersHr }: Props) {
  const [stuckEvents, setStuckEvents] = useState(initialStuckEvents);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const allHealthy = dbHealthy && stuckEvents.length === 0 && syncErrors.length === 0;

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleReprocess = async (id: string) => {
    setProcessing(id);
    const result = await reprocessStripeEvent(id);
    setProcessing(null);

    if (result.success) {
      setStuckEvents((prev) => prev.filter((e) => e.id !== id));
      showToast('Event queued for reprocessing', 'success');
    } else {
      showToast(result.error ?? 'Failed to reprocess event', 'error');
    }
  };

  /* ---------- columns ---------- */

  const eventColumns: AdminColumn<StuckEvent>[] = [
    {
      key: 'eventType',
      header: 'Event Type',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          {row.eventType}
        </span>
      ),
    },
    {
      key: 'error',
      header: 'Error',
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--admin-red)' }}>
          {row.error ?? '\u2014'}
        </span>
      ),
    },
    {
      key: 'receivedAt',
      header: 'Received At',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--admin-muted)',
          }}
        >
          {new Date(row.receivedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      ),
      width: '160px',
    },
    {
      key: 'action',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReprocess(row.id);
          }}
          disabled={processing === row.id}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            background: processing === row.id ? 'var(--admin-surface-3)' : 'var(--admin-surface-2)',
            color: processing === row.id ? 'var(--admin-muted)' : 'var(--fg)',
            border: '1px solid var(--admin-border)',
            borderRadius: 3,
            cursor: processing === row.id ? 'wait' : 'pointer',
            opacity: processing === row.id ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {processing === row.id ? 'Processing...' : 'Reprocess'}
        </button>
      ),
      width: '110px',
    },
  ];

  const syncColumns: AdminColumn<SyncError>[] = [
    {
      key: 'platform',
      header: 'Platform',
      render: (row) => (
        <span style={{ textTransform: 'capitalize' as const, fontWeight: 500 }}>
          {row.platform}
        </span>
      ),
      width: '110px',
    },
    {
      key: 'handle',
      header: 'Handle',
      render: (row) => (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: 'var(--fg)',
          }}
        >
          {row.handle || '\u2014'}
        </span>
      ),
      width: '140px',
    },
    {
      key: 'error',
      header: 'Error',
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--admin-red)' }}>
          {row.error}
        </span>
      ),
    },
    {
      key: 'lastSyncedAt',
      header: 'Last Synced',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--admin-muted)',
          }}
        >
          {row.lastSyncedAt
            ? new Date(row.lastSyncedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : 'Never'}
        </span>
      ),
      width: '160px',
    },
  ];

  /* ---------- render ---------- */

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
          System Health
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
          Infrastructure monitoring and diagnostics
        </p>
      </div>

      {/* Status Banner */}
      <div
        style={{
          padding: '14px 20px',
          borderRadius: 4,
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: allHealthy ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)',
          border: `1px solid ${allHealthy ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}`,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: allHealthy ? 'var(--admin-green)' : 'var(--admin-red)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: allHealthy ? 'var(--admin-green)' : 'var(--admin-red)',
          }}
        >
          {allHealthy ? 'All Systems Operational' : 'Degraded -- issues detected'}
        </span>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <AdminStatCard
          label="DB Status"
          value={dbHealthy ? 'Healthy' : 'Error'}
          icon={<Database size={18} />}
          accent={dbHealthy ? 'green' : 'red'}
        />
        <AdminStatCard
          label="Stuck Events"
          value={stuckEvents.length.toString()}
          icon={<AlertTriangle size={18} />}
          accent={stuckEvents.length > 0 ? 'red' : 'green'}
        />
        <AdminStatCard
          label="Sync Errors"
          value={syncErrors.length.toString()}
          icon={<RefreshCw size={18} />}
          accent={syncErrors.length > 0 ? 'red' : 'green'}
        />
        <AdminStatCard
          label="Active Users/hr"
          value={activeUsersHr.toString()}
          icon={<Users size={18} />}
          accent="green"
        />
      </div>

      {/* Stuck Stripe Events Table */}
      <div style={{ marginBottom: 24 }}>
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--admin-muted)',
          }}
        >
          Stuck Stripe Events
        </h3>
        <AdminTable columns={eventColumns} data={stuckEvents} emptyMessage="No stuck events" />
      </div>

      {/* Platform Sync Errors Table */}
      <div>
        <h3
          style={{
            margin: '0 0 12px',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'var(--admin-muted)',
          }}
        >
          Platform Sync Errors
        </h3>
        <AdminTable columns={syncColumns} data={syncErrors} emptyMessage="No sync errors" />
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
