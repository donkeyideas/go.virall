'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  deep_link?: string | null;
  read_at?: string | null;
  created_at: string;
};

type Props = {
  theme: string;
};

const KIND_ICONS: Record<string, string> = {
  score_drop: 'M12 2L2 19h20L12 2z',
  new_opportunity: 'M12 2L15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  deal_stage_changed: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  invoice_paid: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  invoice_overdue: 'M12 8v4M12 16h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  platform_sync_error: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15',
  new_collab_match: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  weekly_wins: 'M6 9l6 6 6-6',
  system: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationBell({ theme }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data?.items ?? json.items ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
    setLoaded(true);
  }, []);

  // Fetch on first open
  useEffect(() => {
    if (open && !loaded) fetchNotifications();
  }, [open, loaded, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  async function markOneRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'POST' });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    width: 380,
    maxHeight: 480,
    overflowY: 'auto',
    zIndex: 200,
    borderRadius: isEditorial ? 8 : 16,
    ...(isEditorial
      ? { background: 'var(--paper)', border: '1.5px solid var(--ink)', boxShadow: '5px 5px 0 var(--ink)' }
      : { background: 'var(--bg-mid, #120a27)', border: '1px solid var(--line)', boxShadow: '0 24px 80px -12px rgba(0,0,0,.8)', backdropFilter: 'blur(24px)' }),
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: isEditorial ? 38 : 36,
          height: isEditorial ? 38 : 36,
          display: 'grid',
          placeItems: 'center',
          border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
          borderRadius: isEditorial ? '50%' : 10,
          background: isEditorial ? 'transparent' : 'var(--glass, rgba(255,255,255,.06))',
          cursor: 'pointer',
          transition: 'all .15s',
          color: 'var(--fg)',
          position: 'relative',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6 }}
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {/* Unread dot */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: isEditorial ? 4 : 3,
              right: isEditorial ? 4 : 3,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isEditorial ? 'var(--hot)' : 'var(--rose, #ff71a8)',
              boxShadow: `0 0 8px ${isEditorial ? 'var(--hot)' : 'var(--rose, #ff71a8)'}`,
            }}
          />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px 10px',
              borderBottom: `1px ${isEditorial ? 'solid var(--ink)' : 'solid var(--line)'}`,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: isEditorial ? 900 : 500,
                fontStyle: isEditorial ? 'italic' : 'normal',
                fontSize: isEditorial ? 20 : 16,
                color: 'var(--fg)',
              }}
            >
              Notifications{isEditorial ? '.' : ''}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: isEditorial ? 'var(--ink)' : 'var(--color-primary)',
                  fontWeight: 600,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          {loading && !loaded ? (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <svg
                viewBox="0 0 24 24"
                style={{ width: 32, height: 32, stroke: 'var(--muted)', fill: 'none', strokeWidth: 1.2, margin: '0 auto 12px' }}
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No notifications yet</p>
              <p style={{ fontSize: 11, color: 'var(--subtle, var(--muted))', marginTop: 4 }}>
                You'll see score drops, deal updates, and more here.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.read_at) markOneRead(n.id); }}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 16px',
                    cursor: n.read_at ? 'default' : 'pointer',
                    borderBottom: `1px solid ${isEditorial ? 'var(--rule, rgba(0,0,0,.08))' : 'var(--line)'}`,
                    background: n.read_at
                      ? 'transparent'
                      : isEditorial
                      ? 'rgba(200,255,61,.06)'
                      : 'rgba(139,92,246,.06)',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: isEditorial ? 8 : 10,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      background: isEditorial ? 'var(--paper-2)' : 'rgba(255,255,255,.06)',
                      border: isEditorial ? '1px solid var(--rule)' : 'none',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      style={{ width: 14, height: 14, stroke: 'var(--muted)', fill: 'none', strokeWidth: 1.6 }}
                    >
                      <path d={KIND_ICONS[n.kind] ?? KIND_ICONS.system} />
                    </svg>
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: n.read_at ? 400 : 600, color: 'var(--fg)' }}>
                        {n.title}
                      </span>
                      {!n.read_at && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: isEditorial ? 'var(--hot)' : 'var(--color-primary)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, margin: 0 }}>
                      {n.body}
                    </p>
                    <span style={{ fontSize: 10, color: 'var(--subtle, var(--muted))', marginTop: 4, display: 'block' }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
