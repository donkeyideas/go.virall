'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Globe,
  Info,
  HelpCircle,
  Settings,
  ChevronDown,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react';
import { updateSiteContent } from '../../../lib/actions/admin/site-content';

// ── Types ──────────────────────────────────────────

type SiteContentRow = {
  id: string;
  page: string;
  section: string;
  content: unknown;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string | null;
};

type Props = { rows: SiteContentRow[] };

type Toast = { message: string; type: 'success' | 'error' };

// ── Page config ────────────────────────────────────

const PAGE_TABS = [
  { key: 'homepage', label: 'Homepage', icon: Globe },
  { key: 'about', label: 'About', icon: Info },
  { key: 'faq', label: 'FAQ', icon: HelpCircle },
  { key: 'global', label: 'Global', icon: Settings },
] as const;

// ── Helpers ────────────────────────────────────────

function friendlyLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bCta\b/g, 'CTA')
    .replace(/\bUrl\b/g, 'URL')
    .replace(/\bHref\b/g, 'Link')
    .replace(/\bOg\b/g, 'OG')
    .replace(/\bSeo\b/g, 'SEO')
    .replace(/\bAi\b/g, 'AI');
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isLinkObject(val: unknown): val is { href: string; text: string } {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
  const keys = Object.keys(val);
  return keys.includes('href') && keys.includes('text') && keys.length === 2;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── Shared styles ──────────────────────────────────

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 13,
  background: 'var(--admin-surface)',
  border: '1px solid var(--admin-border)',
  borderRadius: 6,
  color: 'var(--fg)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaBase: React.CSSProperties = {
  ...inputBase,
  minHeight: 80,
  resize: 'vertical' as const,
  fontFamily: 'var(--font-mono, monospace)',
  lineHeight: 1.5,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--admin-muted)',
  marginBottom: 4,
  fontFamily: 'var(--font-mono, monospace)',
};

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 500,
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'opacity 0.15s',
};

// ── Visual Editor (recursive) ──────────────────────

function FieldEditor({
  fieldKey,
  value,
  onChange,
  depth = 0,
}: {
  fieldKey: string;
  value: unknown;
  onChange: (v: unknown) => void;
  depth?: number;
}) {
  const label = friendlyLabel(fieldKey);

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--admin-green)' }}
          />
          {label}
        </label>
      </div>
    );
  }

  // Number
  if (typeof value === 'number') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          style={{ ...inputBase, maxWidth: 200, fontFamily: 'var(--font-mono, monospace)' }}
        />
      </div>
    );
  }

  // String
  if (typeof value === 'string') {
    const isLong = value.length >= 80;
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        {isLong ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={textareaBase}
            rows={Math.min(10, Math.max(3, Math.ceil(value.length / 80)))}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={inputBase}
          />
        )}
      </div>
    );
  }

  // Link object { href, text }
  if (isLinkObject(value)) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          padding: 10,
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 6,
        }}>
          <div>
            <label style={{ ...labelStyle, fontSize: 10 }}>Text</label>
            <input
              type="text"
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              style={inputBase}
            />
          </div>
          <div>
            <label style={{ ...labelStyle, fontSize: 10 }}>URL</label>
            <input
              type="text"
              value={value.href}
              onChange={(e) => onChange({ ...value, href: e.target.value })}
              style={{ ...inputBase, fontFamily: 'var(--font-mono, monospace)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Array of strings
  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string')) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label} (one per line)</label>
        <textarea
          value={value.join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          style={textareaBase}
          rows={Math.min(12, Math.max(3, value.length + 1))}
        />
      </div>
    );
  }

  // Array of objects
  if (Array.isArray(value)) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>{label} ({value.length} items)</label>
          <button
            onClick={() => {
              const template = value.length > 0 ? createEmptyTemplate(value[0]) : '';
              onChange([...value, template]);
            }}
            style={{ ...btnBase, background: 'transparent', color: 'var(--admin-green)', border: '1px solid var(--admin-green)', padding: '4px 10px', fontSize: 11 }}
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {value.map((item, idx) => (
          <div
            key={idx}
            style={{
              position: 'relative',
              padding: 12,
              marginBottom: 8,
              background: depth % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)',
              border: '1px solid var(--admin-border)',
              borderRadius: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--admin-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
                Item {idx + 1}
              </span>
              <button
                onClick={() => {
                  const next = [...value];
                  next.splice(idx, 1);
                  onChange(next);
                }}
                style={{ ...btnBase, background: 'transparent', color: 'var(--admin-red)', border: '1px solid var(--admin-red)', padding: '3px 8px', fontSize: 10 }}
              >
                <Trash2 size={11} /> Remove
              </button>
            </div>
            {typeof item === 'object' && item !== null ? (
              Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                <FieldEditor
                  key={k}
                  fieldKey={k}
                  value={v}
                  depth={depth + 1}
                  onChange={(newVal) => {
                    const next = deepClone(value);
                    (next[idx] as Record<string, unknown>)[k] = newVal;
                    onChange(next);
                  }}
                />
              ))
            ) : (
              <FieldEditor
                fieldKey={String(idx)}
                value={item}
                depth={depth + 1}
                onChange={(newVal) => {
                  const next = [...value];
                  next[idx] = newVal;
                  onChange(next);
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Nested object (generic)
  if (typeof value === 'object' && value !== null) {
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>{label}</label>
        <div style={{
          padding: 12,
          background: depth % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)',
          border: '1px solid var(--admin-border)',
          borderRadius: 6,
        }}>
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <FieldEditor
              key={k}
              fieldKey={k}
              value={v}
              depth={depth + 1}
              onChange={(newVal) => {
                onChange({ ...(value as Record<string, unknown>), [k]: newVal });
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Fallback: render as JSON string
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle}>{label} (raw JSON)</label>
      <textarea
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            // keep current value if parse fails
          }
        }}
        style={{ ...textareaBase, fontFamily: 'var(--font-mono, monospace)' }}
        rows={4}
      />
    </div>
  );
}

function createEmptyTemplate(example: unknown): unknown {
  if (typeof example === 'string') return '';
  if (typeof example === 'number') return 0;
  if (typeof example === 'boolean') return false;
  if (Array.isArray(example)) return [];
  if (typeof example === 'object' && example !== null) {
    const template: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(example as Record<string, unknown>)) {
      template[k] = createEmptyTemplate(v);
    }
    return template;
  }
  return '';
}

// ── Section Card ───────────────────────────────────

function SectionCard({
  row,
  onSave,
}: {
  row: SiteContentRow;
  onSave: (page: string, section: string, content: unknown) => Promise<{ success?: boolean; error?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editContent, setEditContent] = useState<unknown>(() => deepClone(row.content));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const originalRef = useRef<unknown>(deepClone(row.content));

  // Sync when row.content changes from parent (after save revalidation)
  useEffect(() => {
    const incoming = deepClone(row.content);
    originalRef.current = incoming;
    setEditContent(incoming);
    setDirty(false);
  }, [row.content]);

  const handleContentChange = useCallback((newContent: unknown) => {
    setEditContent(newContent);
    setDirty(!deepEqual(newContent, originalRef.current));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(row.page, row.section, editContent);
    setSaving(false);
    if (result.success) {
      originalRef.current = deepClone(editContent);
      setDirty(false);
    }
    return result;
  };

  return (
    <div
      style={{
        background: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
        borderColor: dirty ? 'var(--admin-green)' : 'var(--admin-border)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--fg)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {expanded ? <ChevronDown size={16} style={{ color: 'var(--admin-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--admin-muted)' }} />}
          <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display, Fraunces, serif)' }}>
            {friendlyLabel(row.section)}
          </span>
          {dirty && (
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 10,
              background: 'var(--admin-green)',
              color: '#fff',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}>
              Unsaved
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--admin-muted)', fontFamily: 'var(--font-mono, monospace)' }}>
          Updated {formatDate(row.updatedAt)}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '4px 18px 18px' }}>
          <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: 16 }}>
            {/* Render editor for the content */}
            {typeof editContent === 'object' && editContent !== null && !Array.isArray(editContent) ? (
              // Object: render each key as a field
              Object.entries(editContent as Record<string, unknown>).map(([k, v]) => (
                <FieldEditor
                  key={k}
                  fieldKey={k}
                  value={v}
                  onChange={(newVal) => {
                    const next = { ...(editContent as Record<string, unknown>), [k]: newVal };
                    handleContentChange(next);
                  }}
                />
              ))
            ) : Array.isArray(editContent) ? (
              // Array: render as array editor
              <FieldEditor
                fieldKey={row.section}
                value={editContent}
                onChange={handleContentChange}
              />
            ) : (
              // Primitive or null: render directly
              <FieldEditor
                fieldKey={row.section}
                value={editContent}
                onChange={handleContentChange}
              />
            )}

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                style={{
                  ...btnBase,
                  background: dirty ? 'var(--admin-green)' : 'var(--admin-border)',
                  color: dirty ? '#fff' : 'var(--admin-muted)',
                  cursor: saving || !dirty ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  padding: '8px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Section'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────

export function ContentClient({ rows }: Props) {
  const [activeTab, setActiveTab] = useState('homepage');
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const handleSave = useCallback(async (page: string, section: string, content: unknown) => {
    const result = await updateSiteContent(page, section, content);
    if ('success' in result && result.success) {
      showToast({ message: `Saved ${friendlyLabel(section)} successfully`, type: 'success' });
    } else {
      showToast({ message: ('error' in result ? result.error : 'Save failed') as string, type: 'error' });
    }
    return result;
  }, [showToast]);

  const pageRows = rows
    .filter((r) => r.page === activeTab)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const totalSections = rows.length;
  const pageCount = new Set(rows.map((r) => r.page)).size;

  return (
    <div>
      {/* Keyframes for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          margin: 0,
          fontSize: 28,
          fontFamily: 'var(--font-display, Fraunces, serif)',
          fontWeight: 700,
          color: 'var(--fg)',
          letterSpacing: '-0.02em',
        }}>
          Site Content
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
          {totalSections} sections across {pageCount} pages
        </p>
      </div>

      {/* Page Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        marginBottom: 24,
        borderBottom: '1px solid var(--admin-border)',
        paddingBottom: 0,
      }}>
        {PAGE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = rows.filter((r) => r.page === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--fg)' : 'var(--admin-muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--fg)' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'color 0.15s, border-color 0.15s',
                marginBottom: -1,
              }}
            >
              <Icon size={14} />
              {tab.label}
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono, monospace)',
                padding: '1px 6px',
                borderRadius: 8,
                background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                color: 'var(--admin-muted)',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Section Cards */}
      {pageRows.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 0',
          color: 'var(--admin-muted)',
          fontSize: 14,
        }}>
          No sections found for this page.
        </div>
      ) : (
        pageRows.map((row) => (
          <SectionCard key={row.id} row={row} onSave={handleSave} />
        ))
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: '#fff',
            background: toast.type === 'success' ? 'var(--admin-green)' : 'var(--admin-red)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            zIndex: 9999,
            animation: 'toastIn 0.25s ease-out',
          }}
        >
          {toast.type === 'success' ? (
            <Save size={14} />
          ) : (
            <Info size={14} />
          )}
          {toast.message}
        </div>
      )}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
