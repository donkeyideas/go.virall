'use client';

import { useState, useCallback } from 'react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminModal } from '../_components/AdminModal';
import { createFlag, toggleFlag, setFlagRollout, deleteFlag } from '../../../lib/actions/admin/flags';

/* ---------- types ---------- */

type Flag = {
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPercent: number;
  createdAt: string;
};

type Props = { flags: Flag[] };

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

export function FlagsClient({ flags: initialFlags }: Props) {
  const [flags, setFlags] = useState(initialFlags);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ key: '', description: '', enabled: false });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ---------- handlers ---------- */

  const handleToggle = async (key: string, enabled: boolean) => {
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
    const result = await toggleFlag(key, enabled);
    if (result.success) {
      showToast(`Flag "${key}" ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } else {
      setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f)));
      showToast(result.error ?? 'Failed to toggle flag', 'error');
    }
  };

  const handleRollout = async (key: string, value: string) => {
    const pct = Math.max(0, Math.min(100, parseInt(value) || 0));
    setFlags((prev) => prev.map((f) => (f.key === key ? { ...f, rolloutPercent: pct } : f)));
    const result = await setFlagRollout(key, pct);
    if (result.error) {
      showToast(result.error, 'error');
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    const result = await createFlag({
      key: form.key,
      description: form.description || undefined,
      enabled: form.enabled,
    });
    setLoading(false);

    if (result.success) {
      setFlags((prev) => [
        {
          key: form.key,
          description: form.description || null,
          enabled: form.enabled,
          rolloutPercent: 0,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowCreate(false);
      setForm({ key: '', description: '', enabled: false });
      showToast(`Flag "${form.key}" created`, 'success');
    } else {
      showToast(result.error ?? 'Failed to create flag', 'error');
    }
  };

  const handleDelete = async (key: string) => {
    const result = await deleteFlag(key);
    if (result.success) {
      setFlags((prev) => prev.filter((f) => f.key !== key));
      setConfirmDelete(null);
      showToast(`Flag "${key}" deleted`, 'success');
    } else {
      showToast(result.error ?? 'Failed to delete flag', 'error');
    }
  };

  /* ---------- columns ---------- */

  const columns: AdminColumn<Flag>[] = [
    {
      key: 'key',
      header: 'Flag Key',
      render: (row) => (
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>
            {row.key}
          </div>
          {row.description && (
            <div style={{ fontSize: 11, color: 'var(--admin-muted)', marginTop: 2 }}>
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'enabled',
      header: 'Enabled',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(row.key, !row.enabled);
          }}
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            background: row.enabled ? 'var(--admin-green)' : 'var(--admin-surface-3)',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: 2,
              left: row.enabled ? 18 : 2,
              transition: 'left 0.2s',
            }}
          />
        </button>
      ),
      width: '70px',
    },
    {
      key: 'rollout',
      header: 'Rollout %',
      render: (row) => (
        <input
          type="number"
          min={0}
          max={100}
          value={row.rolloutPercent}
          onChange={(e) => handleRollout(row.key, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 60,
            padding: '4px 8px',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--admin-surface-2)',
            border: '1px solid var(--admin-border)',
            borderRadius: 4,
            color: 'var(--fg)',
            textAlign: 'center',
          }}
        />
      ),
      width: '100px',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(row.key);
          }}
          style={{
            fontSize: 11,
            padding: '4px 8px',
            background: 'transparent',
            color: 'var(--admin-red)',
            border: '1px solid var(--admin-red)',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      ),
      width: '70px',
    },
  ];

  /* ---------- shared styles ---------- */

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    background: 'var(--admin-surface-2)',
    border: '1px solid var(--admin-border)',
    borderRadius: 4,
    color: 'var(--fg)',
    fontFamily: 'inherit',
    outline: 'none',
  };

  /* ---------- render ---------- */

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
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
            Feature Flags
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
            {flags.length} flag{flags.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 500,
            background: 'var(--admin-red)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          New Flag
        </button>
      </div>

      {/* Flags Table */}
      <AdminTable columns={columns} data={flags} emptyMessage="No feature flags configured" />

      {/* Create Modal */}
      {showCreate && (
        <AdminModal title="New Feature Flag" onClose={() => setShowCreate(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 6 }}>
                Flag Key
              </label>
              <input
                placeholder="e.g., enable_ai_v2"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)', marginBottom: 6 }}>
                Description
              </label>
              <input
                placeholder="Optional description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--admin-muted)' }}>
                Enabled
              </label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  background: form.enabled ? 'var(--admin-green)' : 'var(--admin-surface-3)',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 2,
                    left: form.enabled ? 18 : 2,
                    transition: 'left 0.2s',
                  }}
                />
              </button>
            </div>
            <button
              onClick={handleCreate}
              disabled={loading || !form.key}
              style={{
                alignSelf: 'flex-end',
                padding: '8px 24px',
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--admin-red)',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading || !form.key ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating...' : 'Create Flag'}
            </button>
          </div>
        </AdminModal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <AdminModal title="Confirm Delete" onClose={() => setConfirmDelete(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}>
              Are you sure you want to delete the flag{' '}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--admin-red)' }}>
                {confirmDelete}
              </span>
              ? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  background: 'var(--admin-surface-2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'var(--admin-red)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Delete Flag
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}
