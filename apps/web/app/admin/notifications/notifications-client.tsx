'use client';

import { useState, useCallback } from 'react';
import { Send, BellOff, CheckCircle } from 'lucide-react';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminStatusBadge } from '../_components/AdminStatusBadge';
import { AdminModal } from '../_components/AdminModal';
import {
  adminSendNotification,
  adminDeleteNotification,
} from '../../../lib/actions/admin/notifications';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Notification = {
  id: string;
  userHandle: string;
  kind: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type Props = {
  notifications: Notification[];
  totalSent: number;
  unreadCount: number;
};

type TargetType = 'all' | 'user' | 'tier';

type FormState = {
  targetType: TargetType;
  targetValue: string;
  kind: string;
  title: string;
  body: string;
};

const INITIAL_FORM: FormState = {
  targetType: 'all',
  targetValue: '',
  kind: 'info',
  title: '',
  body: '',
};

/* ------------------------------------------------------------------ */
/*  Toast component                                                    */
/* ------------------------------------------------------------------ */

function Toast({
  message,
  variant,
  onDismiss,
}: {
  message: string;
  variant: 'success' | 'error';
  onDismiss: () => void;
}) {
  const bg =
    variant === 'success'
      ? 'rgba(39,174,96,0.14)'
      : 'rgba(192,57,43,0.14)';
  const border =
    variant === 'success'
      ? 'rgba(39,174,96,0.4)'
      : 'rgba(192,57,43,0.4)';
  const fg =
    variant === 'success'
      ? 'var(--admin-green, #27ae60)'
      : 'var(--admin-red, #c0392b)';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 20px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        color: fg,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'inherit',
        boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        animation: 'fadeInUp 0.25s ease-out',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: fg,
          cursor: 'pointer',
          fontSize: 15,
          lineHeight: 1,
          padding: '2px 4px',
          opacity: 0.7,
        }}
      >
        x
      </button>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */

export function NotificationsClient({
  notifications: initialNotifications,
  totalSent: initialTotalSent,
  unreadCount: initialUnreadCount,
}: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [totalSent, setTotalSent] = useState(initialTotalSent);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [showSend, setShowSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [toast, setToast] = useState<{
    message: string;
    variant: 'success' | 'error';
  } | null>(null);

  const readCount = totalSent - unreadCount;
  const readRate = totalSent > 0 ? Math.round((readCount / totalSent) * 100) : 0;

  /* ------ Toast helper ------ */
  const showToast = useCallback(
    (message: string, variant: 'success' | 'error') => {
      setToast({ message, variant });
      setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  /* ------ Send ------ */
  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    const result = await adminSendNotification({
      targetType: form.targetType,
      targetValue: form.targetValue || undefined,
      kind: form.kind,
      title: form.title.trim(),
      body: form.body.trim(),
    });
    setSending(false);

    if ('error' in result && result.error) {
      showToast(result.error, 'error');
      return;
    }

    if ('success' in result && result.success) {
      const count = 'count' in result ? (result.count as number) : 0;
      showToast(`Notification sent to ${count} user(s)`, 'success');
      setTotalSent((prev) => prev + count);
      setUnreadCount((prev) => prev + count);
      setForm(INITIAL_FORM);
      setShowSend(false);
    }
  };

  /* ------ Delete ------ */
  const handleDelete = async (id: string) => {
    const row = notifications.find((n) => n.id === id);
    const result = await adminDeleteNotification(id);

    if ('error' in result && result.error) {
      showToast(result.error, 'error');
      return;
    }

    if ('success' in result && result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalSent((prev) => Math.max(0, prev - 1));
      if (row && !row.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      showToast('Notification deleted', 'success');
    }
  };

  /* ------ Table columns ------ */
  const columns: AdminColumn<Notification>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: 'var(--fg)',
          }}
        >
          @{row.userHandle}
        </span>
      ),
      width: '130px',
    },
    {
      key: 'kind',
      header: 'Kind',
      render: (row) => <AdminStatusBadge status={row.kind} />,
      width: '100px',
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--fg)' }}>
          {row.title}
        </span>
      ),
      width: '200px',
    },
    {
      key: 'body',
      header: 'Body',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            color: 'var(--admin-muted)',
            display: 'block',
            maxWidth: 260,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={row.body}
        >
          {row.body}
        </span>
      ),
    },
    {
      key: 'read',
      header: 'Read',
      render: (row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: row.isRead
                ? 'var(--admin-green, #27ae60)'
                : 'var(--admin-muted, #6b6e7b)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: row.isRead
                ? 'var(--admin-green, #27ae60)'
                : 'var(--admin-muted, #6b6e7b)',
            }}
          >
            {row.isRead ? 'Yes' : 'No'}
          </span>
        </span>
      ),
      width: '70px',
    },
    {
      key: 'sent',
      header: 'Sent',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--admin-muted)',
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
      width: '140px',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row.id);
          }}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            background: 'transparent',
            color: 'var(--admin-red, #c0392b)',
            border: '1px solid var(--admin-red, #c0392b)',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500,
          }}
        >
          Delete
        </button>
      ),
      width: '80px',
    },
  ];

  /* ------ Shared input styles ------ */
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
    fontSize: 11,
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--admin-muted)',
    marginBottom: 4,
  };

  const canSend = form.title.trim().length > 0 && form.body.trim().length > 0;

  /* ------ Render ------ */
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 28,
        }}
      >
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
            Notifications
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: 'var(--admin-muted)',
            }}
          >
            Manage and send platform notifications
          </p>
        </div>
        <button
          onClick={() => setShowSend(true)}
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
          Send Notification
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <AdminStatCard label="Total Sent" value={totalSent.toLocaleString()} icon={<Send size={18} />} />
        <AdminStatCard
          label="Unread"
          value={unreadCount.toLocaleString()}
          icon={<BellOff size={18} />}
          accent="amber"
        />
        <AdminStatCard
          label="Read Rate"
          value={readRate + '%'}
          icon={<CheckCircle size={18} />}
          accent={readRate >= 50 ? 'green' : 'amber'}
        />
      </div>

      {/* Notifications Table */}
      <AdminTable
        columns={columns}
        data={notifications}
        emptyMessage="No notifications sent yet"
      />

      {/* Send Notification Modal */}
      {showSend && (
        <AdminModal title="Send Notification" onClose={() => setShowSend(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Target */}
            <div>
              <div style={labelStyle}>Target</div>
              <select
                value={form.targetType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    targetType: e.target.value as TargetType,
                    targetValue: '',
                  }))
                }
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="all">All Users</option>
                <option value="user">Specific User (by ID)</option>
                <option value="tier">By Tier</option>
              </select>
            </div>

            {/* Target value (conditional) */}
            {form.targetType === 'user' && (
              <div>
                <div style={labelStyle}>User ID</div>
                <input
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={form.targetValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetValue: e.target.value }))
                  }
                  style={{
                    ...inputStyle,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                  }}
                />
              </div>
            )}
            {form.targetType === 'tier' && (
              <div>
                <div style={labelStyle}>Tier</div>
                <select
                  value={form.targetValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetValue: e.target.value }))
                  }
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Select a tier</option>
                  <option value="free">Free</option>
                  <option value="creator">Creator</option>
                  <option value="pro">Pro</option>
                  <option value="agency">Agency</option>
                </select>
              </div>
            )}

            {/* Kind */}
            <div>
              <div style={labelStyle}>Kind</div>
              <select
                value={form.kind}
                onChange={(e) =>
                  setForm((f) => ({ ...f, kind: e.target.value }))
                }
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="alert">Alert</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <div style={labelStyle}>Title</div>
              <input
                placeholder="Notification title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                style={inputStyle}
              />
            </div>

            {/* Body */}
            <div>
              <div style={labelStyle}>Body</div>
              <textarea
                placeholder="Notification body"
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSend}
              disabled={sending || !canSend}
              style={{
                alignSelf: 'flex-end',
                padding: '8px 24px',
                fontSize: 13,
                fontWeight: 500,
                background: 'var(--admin-red)',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: sending ? 'wait' : 'pointer',
                opacity: sending || !canSend ? 0.6 : 1,
              }}
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </AdminModal>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
