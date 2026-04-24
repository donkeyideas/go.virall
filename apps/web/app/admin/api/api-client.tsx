'use client';

import { useState, useCallback, useMemo } from 'react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminModal } from '../_components/AdminModal';
import { setApiConfig, clearApiConfig, rotateApiConfig, addApiConfig } from '../../../lib/actions/admin/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Config = {
  key: string;
  label: string;
  description: string | null;
  isSet: boolean;
  category: string;
  updatedAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  lastError: string | null;
  lastRotatedAt: string | null;
};

type ErrorEntry = {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: string;
};

type Props = {
  configs: Array<{
    key: string;
    label: string;
    description: string | null;
    isSet: boolean;
    category: string;
    updatedAt: string | null;
    lastUsedAt: string | null;
    usageCount: number;
    lastError: string | null;
    lastRotatedAt: string | null;
  }>;
  recentErrors: Array<{
    id: string;
    action: string;
    metadata: unknown;
    createdAt: string;
  }>;
};

type Toast = { message: string; type: 'success' | 'error' };

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const SECTION_LABEL: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 11,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--admin-muted, #6b6e7b)',
};

const INPUT_STYLE: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 12,
  background: 'var(--admin-surface-2, #1f2128)',
  border: '1px solid var(--admin-border, #2a2b33)',
  borderRadius: 4,
  color: 'var(--fg, #e2e4ea)',
  fontFamily: 'JetBrains Mono, monospace',
  outline: 'none',
  flex: 1,
};

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

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'JetBrains Mono, monospace',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--admin-muted, #6b6e7b)',
  marginBottom: 6,
};

const MODAL_INPUT: React.CSSProperties = {
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

export function ApiClient({ configs: initialConfigs, recentErrors }: Props) {
  const [configs, setConfigs] = useState<Config[]>(initialConfigs);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  /* -- Add API Key modal state -- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [addKey, setAddKey] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCategory, setAddCategory] = useState('integration');

  /* -- Rotate state -- */
  const [rotatingKey, setRotatingKey] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState('');

  /* -- Toast helper -- */
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* -- Group configs by category -- */
  const categories = useMemo(
    () => [...new Set(configs.map((c) => c.category))],
    [configs],
  );

  /* -- Save config value -- */
  const handleSave = useCallback(
    async (key: string) => {
      if (!editValue.trim()) return;
      setSaving(true);
      const result = await setApiConfig(key, editValue);
      setSaving(false);
      if (result.success) {
        setConfigs((prev) =>
          prev.map((c) =>
            c.key === key
              ? { ...c, isSet: true, updatedAt: new Date().toISOString() }
              : c,
          ),
        );
        setEditingKey(null);
        setEditValue('');
        showToast(`${key} has been set`, 'success');
      } else {
        showToast(result.error ?? 'Failed to save config', 'error');
      }
    },
    [editValue, showToast],
  );

  /* -- Clear config value -- */
  const handleClear = useCallback(
    async (key: string) => {
      const result = await clearApiConfig(key);
      if (result.success) {
        setConfigs((prev) =>
          prev.map((c) =>
            c.key === key ? { ...c, isSet: false, updatedAt: new Date().toISOString() } : c,
          ),
        );
        showToast(`${key} has been cleared`, 'success');
      } else {
        showToast(result.error ?? 'Failed to clear config', 'error');
      }
    },
    [showToast],
  );

  /* -- Rotate config value -- */
  const handleRotate = useCallback(
    async (key: string) => {
      if (!rotateValue.trim()) return;
      setSaving(true);
      const result = await rotateApiConfig(key, rotateValue);
      setSaving(false);
      if (result.success) {
        setConfigs((prev) =>
          prev.map((c) =>
            c.key === key
              ? { ...c, isSet: true, lastRotatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
              : c,
          ),
        );
        setRotatingKey(null);
        setRotateValue('');
        showToast(`${key} has been rotated`, 'success');
      } else {
        showToast(result.error ?? 'Failed to rotate key', 'error');
      }
    },
    [rotateValue, showToast],
  );

  /* -- Add new API config -- */
  const handleAddConfig = useCallback(async () => {
    if (!addKey.trim() || !addLabel.trim()) return;
    setSaving(true);
    const result = await addApiConfig({
      key: addKey,
      label: addLabel,
      description: addDescription || undefined,
      category: addCategory,
    });
    setSaving(false);
    if (result.success) {
      setConfigs((prev) => [
        ...prev,
        {
          key: addKey,
          label: addLabel,
          description: addDescription || null,
          isSet: false,
          category: addCategory,
          updatedAt: new Date().toISOString(),
          lastUsedAt: null,
          usageCount: 0,
          lastError: null,
          lastRotatedAt: null,
        },
      ]);
      setShowAddModal(false);
      setAddKey('');
      setAddLabel('');
      setAddDescription('');
      setAddCategory('integration');
      showToast(`${addKey} config added`, 'success');
    } else {
      showToast(result.error ?? 'Failed to add config', 'error');
    }
  }, [addKey, addLabel, addDescription, addCategory, showToast]);

  /* -- Error table columns -- */
  const errorColumns: AdminColumn<ErrorEntry>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: 'var(--fg, #e2e4ea)',
          }}
        >
          {row.action}
        </span>
      ),
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (row) => {
        const meta = row.metadata as Record<string, unknown> | null;
        const msg = meta?.message ?? meta?.error ?? '';
        return (
          <span
            style={{
              fontSize: 12,
              color: 'var(--admin-muted, #6b6e7b)',
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
          >
            {String(msg || '--')}
          </span>
        );
      },
    },
    {
      key: 'created',
      header: 'Time',
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
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      ),
      width: '150px',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
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
            API Management
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
            {configs.length} keys configured &middot; {configs.filter((c) => c.isSet).length} active
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--admin-red, #c0392b)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + Add API Key
        </button>
      </div>

      {/* Config Cards grouped by category */}
      {categories.map((category) => (
        <div key={category} style={{ marginBottom: 32 }}>
          <h3 style={SECTION_LABEL}>{category}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {configs
              .filter((c) => c.category === category)
              .map((config) => (
                <div
                  key={config.key}
                  style={{
                    background: 'var(--admin-surface, #1a1b20)',
                    border: '1px solid var(--admin-border, #2a2b33)',
                    borderRadius: 4,
                    padding: '18px 20px',
                  }}
                >
                  {/* Label + Status badge */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--fg, #e2e4ea)',
                      }}
                    >
                      {config.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 3,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        background: config.isSet
                          ? 'rgba(39,174,96,0.15)'
                          : 'rgba(192,57,43,0.15)',
                        color: config.isSet
                          ? 'var(--admin-green, #27ae60)'
                          : 'var(--admin-red, #c0392b)',
                      }}
                    >
                      {config.isSet ? 'SET' : 'NOT SET'}
                    </span>
                  </div>

                  {/* Description */}
                  {config.description && (
                    <p
                      style={{
                        margin: '0 0 10px',
                        fontSize: 12,
                        color: 'var(--admin-muted, #6b6e7b)',
                        lineHeight: 1.5,
                      }}
                    >
                      {config.description}
                    </p>
                  )}

                  {/* Key display */}
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--admin-muted, #6b6e7b)',
                      marginBottom: 8,
                    }}
                  >
                    Key: {config.key}
                  </div>

                  {/* Usage stats */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--admin-muted, #6b6e7b)',
                      marginBottom: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    {config.updatedAt && (
                      <span>
                        Updated:{' '}
                        {new Date(config.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {config.usageCount > 0 && (
                      <span>Uses: {config.usageCount.toLocaleString()}</span>
                    )}
                    {config.lastUsedAt && (
                      <span>
                        Last used:{' '}
                        {new Date(config.lastUsedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                    {config.lastRotatedAt && (
                      <span>
                        Rotated:{' '}
                        {new Date(config.lastRotatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  {/* Last error */}
                  {config.lastError && (
                    <div
                      style={{
                        fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: 'var(--admin-red, #c0392b)',
                        marginBottom: 10,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Error: {config.lastError}
                    </div>
                  )}

                  {/* Rotate inline */}
                  {rotatingKey === config.key ? (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="password"
                        placeholder="New value..."
                        value={rotateValue}
                        onChange={(e) => setRotateValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRotate(config.key);
                        }}
                        style={INPUT_STYLE}
                        autoFocus
                      />
                      <button
                        onClick={() => handleRotate(config.key)}
                        disabled={saving || !rotateValue.trim()}
                        style={{
                          padding: '6px 14px',
                          fontSize: 11,
                          fontWeight: 500,
                          background: 'var(--admin-green, #27ae60)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: saving ? 'wait' : 'pointer',
                          opacity: saving || !rotateValue.trim() ? 0.6 : 1,
                          fontFamily: 'inherit',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setRotatingKey(null); setRotateValue(''); }}
                        style={{
                          padding: '6px 14px',
                          fontSize: 11,
                          background: 'transparent',
                          color: 'var(--admin-muted, #6b6e7b)',
                          border: '1px solid var(--admin-border, #2a2b33)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}

                  {/* Edit or action buttons */}
                  {editingKey === config.key ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="password"
                        placeholder="Enter value..."
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(config.key);
                        }}
                        style={INPUT_STYLE}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSave(config.key)}
                        disabled={saving || !editValue.trim()}
                        style={{
                          padding: '6px 14px',
                          fontSize: 11,
                          fontWeight: 500,
                          background: 'var(--admin-green, #27ae60)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          cursor: saving ? 'wait' : 'pointer',
                          opacity: saving || !editValue.trim() ? 0.6 : 1,
                          fontFamily: 'inherit',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingKey(null);
                          setEditValue('');
                        }}
                        style={{
                          padding: '6px 14px',
                          fontSize: 11,
                          background: 'transparent',
                          color: 'var(--admin-muted, #6b6e7b)',
                          border: '1px solid var(--admin-border, #2a2b33)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditingKey(config.key);
                          setEditValue('');
                        }}
                        style={{
                          padding: '6px 14px',
                          fontSize: 11,
                          fontWeight: 500,
                          background: 'var(--admin-surface-2, #1f2128)',
                          color: 'var(--fg, #e2e4ea)',
                          border: '1px solid var(--admin-border, #2a2b33)',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {config.isSet ? 'Update' : 'Set Value'}
                      </button>
                      {config.isSet && (
                        <>
                          <button
                            onClick={() => {
                              setRotatingKey(config.key);
                              setRotateValue('');
                            }}
                            style={{
                              padding: '6px 14px',
                              fontSize: 11,
                              fontWeight: 500,
                              background: 'transparent',
                              color: 'var(--fg, #e2e4ea)',
                              border: '1px solid var(--admin-border, #2a2b33)',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Rotate
                          </button>
                          <button
                            onClick={() => handleClear(config.key)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 11,
                              fontWeight: 500,
                              background: 'transparent',
                              color: 'var(--admin-red, #c0392b)',
                              border: '1px solid var(--admin-red, #c0392b)',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}

      {configs.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--admin-muted, #6b6e7b)',
            fontSize: 13,
          }}
        >
          No API configurations found. Add entries to the api_configs table to manage them here.
        </div>
      )}

      {/* Recent API Errors */}
      {recentErrors.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={SECTION_LABEL}>Recent API Errors</h3>
          <AdminTable
            columns={errorColumns}
            data={recentErrors}
            emptyMessage="No recent errors"
          />
        </div>
      )}

      {/* Add API Key Modal */}
      {showAddModal && (
        <AdminModal title="Add API Key" onClose={() => setShowAddModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={LABEL_STYLE}>Key</div>
              <input
                type="text"
                value={addKey}
                onChange={(e) => setAddKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                style={{ ...MODAL_INPUT, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                placeholder="my_api_key"
              />
            </div>
            <div>
              <div style={LABEL_STYLE}>Label</div>
              <input
                type="text"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                style={MODAL_INPUT}
                placeholder="My API Key"
              />
            </div>
            <div>
              <div style={LABEL_STYLE}>Description</div>
              <input
                type="text"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                style={MODAL_INPUT}
                placeholder="What this key is used for"
              />
            </div>
            <div>
              <div style={LABEL_STYLE}>Category</div>
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                style={{ ...MODAL_INPUT, cursor: 'pointer' }}
              >
                <option value="ai_provider">AI Provider</option>
                <option value="payments">Payments</option>
                <option value="email">Email</option>
                <option value="platform_oauth">Platform OAuth</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="integration">Integration</option>
              </select>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                justifyContent: 'flex-end',
                borderTop: '1px solid var(--admin-border, #2a2b33)',
                paddingTop: 16,
                marginTop: 4,
              }}
            >
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--fg, #e2e4ea)',
                  background: 'var(--admin-surface-2, #1f2128)',
                  border: '1px solid var(--admin-border, #2a2b33)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddConfig}
                disabled={saving || !addKey.trim() || !addLabel.trim()}
                style={{
                  padding: '8px 24px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'var(--admin-red, #c0392b)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving || !addKey.trim() || !addLabel.trim() ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Adding...' : 'Add Key'}
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
