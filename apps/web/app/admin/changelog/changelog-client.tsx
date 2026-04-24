'use client';

import { useState, useCallback, useMemo } from 'react';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminModal } from '../_components/AdminModal';
import {
  createChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
} from '../../../lib/actions/admin/changelog';

/* ---------- types ---------- */

type Entry = {
  id: string;
  version: string;
  title: string;
  body: string;
  category: string;
  publishedAt: string;
  createdAt: string;
};

type Props = { entries: Entry[] };

const CATEGORIES = ['feature', 'improvement', 'fix', 'security', 'deprecation'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  feature: 'NEW',
  improvement: 'IMP',
  fix: 'FIX',
  security: 'SEC',
  deprecation: 'DEP',
};

const CATEGORY_COLORS: Record<string, { bg: string; fg: string }> = {
  feature: { bg: 'rgba(52,152,219,0.15)', fg: '#3498db' },
  improvement: { bg: 'rgba(39,174,96,0.15)', fg: '#27ae60' },
  fix: { bg: 'rgba(230,126,34,0.15)', fg: '#e67e22' },
  security: { bg: 'rgba(155,89,182,0.15)', fg: '#9b59b6' },
  deprecation: { bg: 'rgba(192,57,43,0.15)', fg: '#c0392b' },
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

/* ---------- category badge ---------- */

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? { bg: 'rgba(107,110,123,0.15)', fg: '#6b6e7b' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 3,
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: colors.bg,
        color: colors.fg,
        textTransform: 'capitalize' as const,
      }}
    >
      {category}
    </span>
  );
}

/* ---------- component ---------- */

export function ChangelogClient({ entries: initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [showCreate, setShowCreate] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ version: '', title: '', body: '', category: 'feature' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ---------- category counts ---------- */

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) counts[cat] = 0;
    for (const e of entries) {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    return counts;
  }, [entries]);

  /* ---------- handlers ---------- */

  const handleCreate = async () => {
    setLoading(true);
    const result = await createChangelogEntry(form);
    setLoading(false);

    if (result.success) {
      setEntries((prev) => [
        {
          id: crypto.randomUUID(),
          ...form,
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowCreate(false);
      setForm({ version: '', title: '', body: '', category: 'feature' });
      showToast('Changelog entry created', 'success');
    } else {
      showToast(result.error ?? 'Failed to create entry', 'error');
    }
  };

  const openEdit = (entry: Entry) => {
    setEditEntry(entry);
    setForm({
      version: entry.version,
      title: entry.title,
      body: entry.body,
      category: entry.category,
    });
  };

  const handleUpdate = async () => {
    if (!editEntry) return;
    setLoading(true);
    const result = await updateChangelogEntry(editEntry.id, form);
    setLoading(false);

    if (result.success) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editEntry.id
            ? { ...e, version: form.version, title: form.title, body: form.body, category: form.category }
            : e,
        ),
      );
      setEditEntry(null);
      setForm({ version: '', title: '', body: '', category: 'feature' });
      showToast('Changelog entry updated', 'success');
    } else {
      showToast(result.error ?? 'Failed to update entry', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteChangelogEntry(id);
    if (result.success) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setConfirmDelete(null);
      showToast('Changelog entry deleted', 'success');
    } else {
      showToast(result.error ?? 'Failed to delete entry', 'error');
    }
  };

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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--admin-muted)',
    marginBottom: 6,
  };

  /* ---------- form content (shared between create and edit) ---------- */

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={labelStyle}>Version</label>
        <input
          placeholder="e.g., 5.2.0"
          value={form.version}
          onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Title</label>
        <input
          placeholder="Entry title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Category</label>
        <select
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Body</label>
        <textarea
          placeholder="Describe the change (markdown supported)"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={6}
          style={{
            ...inputStyle,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            resize: 'vertical',
          }}
        />
      </div>
      <button
        onClick={editEntry ? handleUpdate : handleCreate}
        disabled={loading || !form.version || !form.title}
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
          opacity: loading || !form.version || !form.title ? 0.6 : 1,
        }}
      >
        {loading ? (editEntry ? 'Saving...' : 'Creating...') : editEntry ? 'Save Changes' : 'Create Entry'}
      </button>
    </div>
  );

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
            Changelog
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
            {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'} published
          </p>
        </div>
        <button
          onClick={() => {
            setEditEntry(null);
            setForm({ version: '', title: '', body: '', category: 'feature' });
            setShowCreate(true);
          }}
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
          New Entry
        </button>
      </div>

      {/* Category Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
        {CATEGORIES.map((cat) => (
          <AdminStatCard
            key={cat}
            label={cat.charAt(0).toUpperCase() + cat.slice(1)}
            value={(categoryCounts[cat] ?? 0).toString()}
            icon={CATEGORY_LABELS[cat]}
          />
        ))}
      </div>

      {/* Timeline View */}
      {entries.length === 0 ? (
        <div
          style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: 'var(--admin-muted)',
            fontSize: 13,
            background: 'var(--admin-surface)',
            border: '1px solid var(--admin-border)',
            borderRadius: 4,
          }}
        >
          No changelog entries yet
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 28 }}>
          {/* Timeline line */}
          <div
            style={{
              position: 'absolute',
              left: 7,
              top: 6,
              bottom: 6,
              width: 2,
              background: 'var(--admin-border)',
            }}
          />

          {entries.map((entry, i) => (
            <div
              key={entry.id}
              style={{
                position: 'relative',
                marginBottom: i < entries.length - 1 ? 20 : 0,
              }}
            >
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: -24,
                  top: 8,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: (CATEGORY_COLORS[entry.category]?.fg) ?? 'var(--admin-muted)',
                  border: '2px solid var(--admin-surface)',
                }}
              />

              {/* Entry card */}
              <div
                style={{
                  background: 'var(--admin-surface)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 4,
                  padding: '16px 20px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--admin-surface-3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--admin-border)';
                }}
              >
                {/* Top row: version badge, category badge, date */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 10px',
                      borderRadius: 3,
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: 'var(--fg)',
                      background: 'var(--admin-surface-2)',
                      border: '1px solid var(--admin-border)',
                    }}
                  >
                    v{entry.version}
                  </span>
                  <CategoryBadge category={entry.category} />
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--admin-muted)',
                    }}
                  >
                    {new Date(entry.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Title */}
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--fg)',
                    marginBottom: 6,
                    lineHeight: 1.4,
                  }}
                >
                  {entry.title}
                </div>

                {/* Body preview */}
                {entry.body && (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--admin-muted)',
                      lineHeight: 1.5,
                      marginBottom: 10,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {entry.body}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => openEdit(entry)}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      background: 'var(--admin-surface-2)',
                      color: 'var(--fg)',
                      border: '1px solid var(--admin-border)',
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(entry.id)}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      background: 'transparent',
                      color: 'var(--admin-red)',
                      border: '1px solid var(--admin-red)',
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <AdminModal title="New Changelog Entry" onClose={() => setShowCreate(false)}>
          {formContent}
        </AdminModal>
      )}

      {/* Edit Modal */}
      {editEntry && (
        <AdminModal
          title="Edit Changelog Entry"
          onClose={() => {
            setEditEntry(null);
            setForm({ version: '', title: '', body: '', category: 'feature' });
          }}
        >
          {formContent}
        </AdminModal>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <AdminModal title="Confirm Delete" onClose={() => setConfirmDelete(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}>
              Are you sure you want to delete this changelog entry? This action cannot be undone.
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
                Delete Entry
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
