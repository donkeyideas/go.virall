'use client';

import { useState, useCallback } from 'react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminTabs } from '../_components/AdminTabs';
import { AdminModal } from '../_components/AdminModal';
import { upsertEmailTemplate, toggleTemplate } from '../../../lib/actions/admin/email-templates';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Template = {
  id: string;
  key: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  category: string;
  active: boolean;
  updatedAt: string | null;
};

type Props = {
  templates: Array<{
    id: string;
    key: string;
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    variables: string[];
    category: string;
    active: boolean;
    updatedAt: string | null;
  }>;
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
  marginBottom: 6,
};

const INPUT_STYLE: React.CSSProperties = {
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

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
};

/* ------------------------------------------------------------------ */
/*  Category tabs                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'transactional', label: 'Transactional' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'system', label: 'System' },
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

export function EmailTemplatesClient({ templates: initialTemplates }: Props) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [tab, setTab] = useState('all');
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  /* -- Edit form state -- */
  const [editKey, setEditKey] = useState('');
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editHtmlBody, setEditHtmlBody] = useState('');
  const [editTextBody, setEditTextBody] = useState('');
  const [editVariables, setEditVariables] = useState('');
  const [editCategory, setEditCategory] = useState('transactional');
  const [showPreview, setShowPreview] = useState(false);

  /* -- Toast helper -- */
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* -- Open edit modal -- */
  const openEdit = useCallback((template: Template) => {
    setCreating(false);
    setEditing(template);
    setEditKey(template.key);
    setEditName(template.name);
    setEditSubject(template.subject);
    setEditHtmlBody(template.htmlBody);
    setEditTextBody(template.textBody);
    setEditVariables(template.variables.join(', '));
    setEditCategory(template.category);
    setShowPreview(false);
  }, []);

  /* -- Open create modal -- */
  const openCreate = useCallback(() => {
    setEditing(null);
    setCreating(true);
    setEditKey('');
    setEditName('');
    setEditSubject('');
    setEditHtmlBody('');
    setEditTextBody('');
    setEditVariables('');
    setEditCategory('transactional');
    setShowPreview(false);
  }, []);

  /* -- Close edit modal -- */
  const closeEdit = useCallback(() => {
    setEditing(null);
    setCreating(false);
    setEditKey('');
    setEditName('');
    setEditSubject('');
    setEditHtmlBody('');
    setEditTextBody('');
    setEditVariables('');
    setEditCategory('transactional');
    setShowPreview(false);
  }, []);

  /* -- Filter by category -- */
  const filtered = tab === 'all' ? templates : templates.filter((t) => t.category === tab);

  /* -- Toggle active -- */
  const handleToggle = useCallback(async (id: string, active: boolean) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, active } : t)));
    const result = await toggleTemplate(id, active);
    if (result.error) {
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, active: !active } : t)));
      showToast(result.error, 'error');
    } else {
      showToast(active ? 'Template activated' : 'Template deactivated', 'success');
    }
  }, [showToast]);

  /* -- Save edit or create -- */
  const handleSave = useCallback(async () => {
    if (!editing && !creating) return;
    setSaving(true);
    const variables = editVariables
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    if (creating) {
      const result = await upsertEmailTemplate({
        key: editKey,
        name: editName,
        subject: editSubject,
        htmlBody: editHtmlBody,
        textBody: editTextBody || undefined,
        variables,
        category: editCategory,
      });
      setSaving(false);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        setTemplates((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            key: editKey,
            name: editName,
            subject: editSubject,
            htmlBody: editHtmlBody,
            textBody: editTextBody,
            variables,
            category: editCategory,
            active: true,
            updatedAt: new Date().toISOString(),
          },
        ]);
        showToast('Template created', 'success');
        closeEdit();
      }
    } else if (editing) {
      const result = await upsertEmailTemplate({
        id: editing.id,
        key: editing.key,
        name: editing.name,
        subject: editSubject,
        htmlBody: editHtmlBody,
        textBody: editTextBody || undefined,
        variables,
        category: editCategory,
      });
      setSaving(false);
      if (result.error) {
        showToast(result.error, 'error');
      } else {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editing.id
              ? {
                  ...t,
                  subject: editSubject,
                  htmlBody: editHtmlBody,
                  textBody: editTextBody,
                  variables,
                  category: editCategory,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        );
        showToast('Template updated', 'success');
        closeEdit();
      }
    }
  }, [editing, creating, editKey, editName, editSubject, editHtmlBody, editTextBody, editVariables, editCategory, showToast, closeEdit]);

  /* -- Table columns -- */
  const columns: AdminColumn<Template>[] = [
    {
      key: 'key',
      header: 'Key',
      render: (row) => (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: 'var(--fg, #e2e4ea)',
          }}
        >
          {row.key}
        </span>
      ),
      width: '160px',
    },
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <span style={{ fontWeight: 500, color: 'var(--fg, #e2e4ea)' }}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--admin-muted, #6b6e7b)' }}>
          {row.subject}
        </span>
      ),
    },
    {
      key: 'variables',
      header: 'Variables',
      render: (row) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {row.variables.slice(0, 3).map((v) => (
            <span
              key={v}
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 3,
                background: 'var(--admin-surface-3, #282a35)',
                color: 'var(--admin-muted, #6b6e7b)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {v}
            </span>
          ))}
          {row.variables.length > 3 && (
            <span style={{ fontSize: 10, color: 'var(--admin-muted, #6b6e7b)' }}>
              +{row.variables.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Active',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle(row.id, !row.active);
          }}
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            background: row.active
              ? 'var(--admin-green, #27ae60)'
              : 'var(--admin-surface-3, #282a35)',
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
              left: row.active ? 18 : 2,
              transition: 'left 0.2s',
            }}
          />
        </button>
      ),
      width: '70px',
    },
    {
      key: 'updated',
      header: 'Updated',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--admin-muted, #6b6e7b)',
          }}
        >
          {row.updatedAt
            ? new Date(row.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            : '--'}
        </span>
      ),
      width: '90px',
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
            Email Templates
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
            {templates.length} templates configured
          </p>
        </div>
        <button
          onClick={openCreate}
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
          + New Template
        </button>
      </div>

      {/* Category Tabs */}
      <AdminTabs tabs={CATEGORY_TABS} active={tab} onChange={setTab} />

      {/* Templates Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        onRowClick={openEdit}
        emptyMessage="No email templates found"
      />

      {/* Edit / Create Modal */}
      {(editing || creating) && (
        <AdminModal
          title={creating ? 'New Template' : `Edit Template: ${editing!.name}`}
          onClose={closeEdit}
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Key & Name (create only) */}
            {creating && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={LABEL_STYLE}>Key</div>
                  <input
                    type="text"
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    style={{ ...INPUT_STYLE, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                    placeholder="welcome_email"
                  />
                </div>
                <div>
                  <div style={LABEL_STYLE}>Name</div>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={INPUT_STYLE}
                    placeholder="Welcome Email"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div>
              <div style={LABEL_STYLE}>Subject</div>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                style={INPUT_STYLE}
                placeholder="Email subject line..."
              />
            </div>

            {/* HTML Body */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ ...LABEL_STYLE, marginBottom: 0 }}>HTML Body</div>
                <button
                  onClick={() => setShowPreview(true)}
                  disabled={!editHtmlBody.trim()}
                  style={{
                    padding: '4px 14px',
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    border: '1px solid var(--admin-border, #2a2b33)',
                    borderRadius: 4,
                    cursor: !editHtmlBody.trim() ? 'default' : 'pointer',
                    background: 'var(--admin-surface-2, #1f2128)',
                    color: !editHtmlBody.trim() ? 'var(--admin-muted, #6b6e7b)' : 'var(--fg, #e2e4ea)',
                    opacity: !editHtmlBody.trim() ? 0.5 : 1,
                  }}
                >
                  Preview
                </button>
              </div>
              <textarea
                value={editHtmlBody}
                onChange={(e) => setEditHtmlBody(e.target.value)}
                rows={14}
                style={{
                  ...INPUT_STYLE,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
                placeholder="<html>...</html>"
              />
            </div>

            {/* Plain Text Fallback */}
            <div>
              <div style={LABEL_STYLE}>Plain Text Fallback</div>
              <textarea
                value={editTextBody}
                onChange={(e) => setEditTextBody(e.target.value)}
                rows={3}
                style={{
                  ...INPUT_STYLE,
                  fontSize: 12,
                  resize: 'vertical',
                  lineHeight: 1.5,
                }}
                placeholder="Plain text version for email clients that don't support HTML..."
              />
            </div>

            {/* Variables */}
            <div>
              <div style={LABEL_STYLE}>Variables (comma-separated)</div>
              <input
                type="text"
                value={editVariables}
                onChange={(e) => setEditVariables(e.target.value)}
                style={{ ...INPUT_STYLE, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                placeholder="user_name, reset_link, company_name"
              />
              {editVariables && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {editVariables
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map((v) => (
                      <span
                        key={v}
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          borderRadius: 3,
                          background: 'var(--admin-surface-3, #282a35)',
                          color: 'var(--admin-muted, #6b6e7b)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {'{{' + v + '}}'}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <div style={LABEL_STYLE}>Category</div>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                style={SELECT_STYLE}
              >
                <option value="transactional">Transactional</option>
                <option value="marketing">Marketing</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* Actions */}
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
                onClick={closeEdit}
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
                onClick={handleSave}
                disabled={saving || !editSubject.trim() || (creating && (!editKey.trim() || !editName.trim()))}
                style={{
                  padding: '8px 24px',
                  fontSize: 13,
                  fontWeight: 500,
                  background: 'var(--admin-red, #c0392b)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving || !editSubject.trim() || (creating && (!editKey.trim() || !editName.trim())) ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Saving...' : creating ? 'Create Template' : 'Save Template'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Preview Modal — full overlay showing rendered email */}
      {showPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--admin-bg, #111216)',
              border: '1px solid var(--admin-border, #2a2b33)',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--admin-border, #2a2b33)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--admin-muted, #6b6e7b)',
                    marginBottom: 4,
                  }}
                >
                  Email Preview
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg, #e2e4ea)' }}>
                  {editSubject || 'No subject'}
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--admin-surface-2, #1f2128)',
                  border: '1px solid var(--admin-border, #2a2b33)',
                  borderRadius: 4,
                  color: 'var(--fg, #e2e4ea)',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </div>

            {/* Rendered email */}
            <div style={{ flex: 1, overflow: 'auto', background: '#f4f4f4' }}>
              <iframe
                srcDoc={editHtmlBody || '<p style="color:#999;font-family:sans-serif;text-align:center;padding:60px 20px">No HTML body to preview</p>'}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: 500,
                  border: 'none',
                  display: 'block',
                }}
                sandbox=""
                title="Email preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <ToastNotification toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
