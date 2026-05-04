'use client';

import { useState, useMemo, useCallback } from 'react';
import { Users, Shield, Search, X, Loader2 } from 'lucide-react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminStatusBadge } from '../_components/AdminStatusBadge';
import { AdminModal } from '../_components/AdminModal';
import { banUser, restoreUser, changeUserRole, grantTier, deleteUser } from '../../../lib/actions/admin/users';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type User = {
  id: string;
  handle: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  tier: string;
  platformCount: number;
  createdAt: string;
  isBanned: boolean;
};

type Props = {
  users: User[];
  roleCounts: Record<string, number>;
};

type Toast = { message: string; type: 'success' | 'error' };

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--admin-muted, #6b6e7b)',
  marginBottom: 4,
};

const INPUT_STYLE: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 13,
  background: 'var(--admin-surface, #1a1b20)',
  border: '1px solid var(--admin-border, #2a2b33)',
  borderRadius: 4,
  color: 'var(--fg, #e2e4ea)',
  outline: 'none',
  fontFamily: 'inherit',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: 'pointer',
  minWidth: 110,
};

/* ------------------------------------------------------------------ */
/*  KPI Card                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--admin-surface, #1a1b20)',
        border: '1px solid var(--admin-border, #2a2b33)',
        borderRadius: 4,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 18,
          width: 36,
          height: 36,
          borderRadius: 4,
          background: 'var(--admin-surface-2, #1f2128)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent ?? 'var(--admin-muted, #6b6e7b)',
        }}
      >
        {icon}
      </div>
      <div style={LABEL_STYLE}>{label}</div>
      <div
        style={{
          fontSize: 38,
          fontFamily: 'var(--font-display, "Fraunces", serif)',
          fontWeight: 700,
          color: 'var(--fg, #e2e4ea)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
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
          display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirmation Dialog                                                */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: 'var(--admin-surface, #1a1b20)',
          border: '1px solid var(--admin-border, #2a2b33)',
          borderRadius: 4,
          padding: 24,
          maxWidth: 400,
          width: '100%',
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: 'var(--fg, #e2e4ea)',
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '7px 16px',
              fontSize: 12,
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
            onClick={onConfirm}
            style={{
              padding: '7px 16px',
              fontSize: 12,
              fontWeight: 500,
              color: '#fff',
              background: 'var(--admin-red, #c0392b)',
              border: '1px solid var(--admin-red, #c0392b)',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action Button                                                      */
/* ------------------------------------------------------------------ */

function ActionBtn({
  label,
  onClick,
  loading,
  accent,
}: {
  label: string;
  onClick: () => void;
  loading: boolean;
  accent?: 'red' | 'green';
}) {
  const color =
    accent === 'red'
      ? 'var(--admin-red, #c0392b)'
      : accent === 'green'
        ? 'var(--admin-green, #27ae60)'
        : 'var(--fg, #e2e4ea)';

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: '7px 14px',
        fontSize: 12,
        fontWeight: 500,
        color,
        background: 'var(--admin-surface-2, #1f2128)',
        border: '1px solid var(--admin-border, #2a2b33)',
        borderRadius: 4,
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
        textAlign: 'left',
        fontFamily: 'inherit',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
      }}
    >
      {loading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function UsersClient({ users: initialUsers, roleCounts }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selected, setSelected] = useState<User | null>(null);
  const [users, setUsers] = useState(initialUsers);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [roleSelect, setRoleSelect] = useState('');
  const [tierSelect, setTierSelect] = useState('');

  /* -- Toast helper -- */
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* -- Counts derived from full user list -- */
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const creatorCount = users.filter((u) => u.role === 'creator').length;
  const bannedCount = users.filter((u) => u.isBanned).length;

  /* -- Filtered list -- */
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (tierFilter !== 'all' && u.tier !== tierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          u.handle.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, search, roleFilter, tierFilter]);

  /* -- Helpers to update local state after action -- */
  const patchUser = useCallback((userId: string, patch: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
    setSelected((s) => (s && s.id === userId ? { ...s, ...patch } : s));
  }, []);

  /* -- Action handler -- */
  const handleAction = useCallback(
    async (action: string, value?: string) => {
      if (!selected) return;
      setActionLoading(true);
      try {
        let result: { success?: boolean; error?: string } | undefined;

        switch (action) {
          case 'ban':
            result = await banUser(selected.id);
            if (result.success) {
              patchUser(selected.id, { isBanned: true });
              showToast(`${selected.displayName} has been banned`, 'success');
            }
            break;

          case 'restore':
            result = await restoreUser(selected.id);
            if (result.success) {
              patchUser(selected.id, { isBanned: false });
              showToast(`${selected.displayName} has been restored`, 'success');
            }
            break;

          case 'changeRole':
            if (!value) break;
            result = await changeUserRole(selected.id, value as 'creator' | 'admin' | 'support');
            if (result.success) {
              patchUser(selected.id, { role: value });
              showToast(`Role changed to ${value}`, 'success');
            }
            break;

          case 'grantTier':
            if (!value) break;
            result = await grantTier(selected.id, value as 'free' | 'creator' | 'pro' | 'agency');
            if (result.success) {
              patchUser(selected.id, { tier: value });
              showToast(`Tier changed to ${value}`, 'success');
            }
            break;

          case 'delete':
            result = await deleteUser(selected.id);
            if (result.success) {
              setUsers((prev) => prev.filter((u) => u.id !== selected.id));
              setSelected(null);
              showToast(`User permanently deleted`, 'success');
            }
            break;
        }

        if (result && 'error' in result && result.error) {
          showToast(result.error, 'error');
        }
      } catch {
        showToast('An unexpected error occurred', 'error');
      } finally {
        setActionLoading(false);
      }
    },
    [selected, patchUser, showToast],
  );

  /* -- Ban with confirmation -- */
  const handleBanClick = useCallback(() => {
    if (!selected) return;
    setConfirmMessage(
      `Are you sure you want to ban ${selected.displayName} (@${selected.handle})? This will soft-delete the account.`,
    );
    setConfirmAction(() => () => {
      handleAction('ban');
      setConfirmAction(null);
    });
  }, [selected, handleAction]);

  /* -- Delete with confirmation -- */
  const handleDeleteClick = useCallback(() => {
    if (!selected) return;
    setConfirmMessage(
      `PERMANENTLY DELETE ${selected.displayName} (@${selected.handle})? This removes the user from auth and all their data. This cannot be undone.`,
    );
    setConfirmAction(() => () => {
      handleAction('delete');
      setConfirmAction(null);
    });
  }, [selected, handleAction]);

  /* -- Table columns -- */
  const columns: AdminColumn<User>[] = [
    {
      key: 'user',
      header: 'User',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {row.avatarUrl ? (
            <img
              src={row.avatarUrl}
              alt=""
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--admin-surface-3, #282a35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--fg, #e2e4ea)',
              }}
            >
              {row.displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 500, color: 'var(--fg, #e2e4ea)' }}>
              {row.displayName}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--admin-muted, #6b6e7b)',
                fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
              }}
            >
              @{row.handle}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--admin-muted, #6b6e7b)' }}>
          {row.email}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <AdminStatusBadge status={row.role} />,
      width: '90px',
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (row) => <AdminStatusBadge status={row.tier} />,
      width: '90px',
    },
    {
      key: 'platforms',
      header: 'Platforms',
      render: (row) => (
        <span
          style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 13,
          }}
        >
          {row.platformCount}
        </span>
      ),
      width: '80px',
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            color: 'var(--admin-muted, #6b6e7b)',
          }}
        >
          {new Date(row.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit',
          })}
        </span>
      ),
      width: '100px',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.isBanned ? (
          <AdminStatusBadge status="banned" />
        ) : (
          <AdminStatusBadge status="active" />
        ),
      width: '90px',
    },
  ];

  /* -- Reset dropdowns when modal opens -- */
  const openUserDetail = useCallback((user: User) => {
    setSelected(user);
    setRoleSelect(user.role);
    setTierSelect(user.tier);
  }, []);

  return (
    <div>
      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontFamily: 'var(--font-display, "Fraunces", serif)',
            fontWeight: 700,
            color: 'var(--fg, #e2e4ea)',
            letterSpacing: '-0.02em',
          }}
        >
          User Management
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
          {Object.entries(roleCounts)
            .map(([r, c]) => `${c} ${r}s`)
            .join(' \u00B7 ')}
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
        <KpiCard
          label="Total Users"
          value={totalUsers}
          icon={<Users size={18} />}
          accent="var(--fg, #e2e4ea)"
        />
        <KpiCard
          label="Admins"
          value={adminCount}
          icon={<Shield size={18} />}
          accent="var(--admin-amber, #e67e22)"
        />
        <KpiCard
          label="Creators"
          value={creatorCount}
          icon={<Users size={18} />}
          accent="var(--admin-green, #27ae60)"
        />
        <KpiCard
          label="Banned"
          value={bannedCount}
          icon={<X size={18} />}
          accent="var(--admin-red, #c0392b)"
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--admin-muted, #6b6e7b)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search handle, email, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...INPUT_STYLE, flex: 1, width: '100%', paddingLeft: 32 }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--admin-muted, #6b6e7b)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={SELECT_STYLE}
        >
          <option value="all">All Roles</option>
          <option value="creator">Creator</option>
          <option value="admin">Admin</option>
          <option value="support">Support</option>
        </select>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          style={SELECT_STYLE}
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="creator">Creator</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>

        <div
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            color: 'var(--admin-muted, #6b6e7b)',
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          }}
        >
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={columns}
        data={filtered}
        onRowClick={openUserDetail}
        emptyMessage="No users match your filters"
      />

      {/* User Detail Modal */}
      {selected && (
        <AdminModal title="User Details" onClose={() => setSelected(null)} wide>
          <div style={{ display: 'flex', gap: 24 }}>
            {/* Left: Profile info */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {selected.avatarUrl ? (
                  <img
                    src={selected.avatarUrl}
                    alt=""
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'var(--admin-surface-3, #282a35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--fg, #e2e4ea)',
                    }}
                  >
                    {selected.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontFamily: 'var(--font-display, "Fraunces", serif)',
                      fontWeight: 600,
                      color: 'var(--fg, #e2e4ea)',
                    }}
                  >
                    {selected.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--admin-muted, #6b6e7b)',
                      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    }}
                  >
                    @{selected.handle}
                  </div>
                </div>
              </div>

              {/* Info grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px 24px',
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={LABEL_STYLE}>Email</div>
                  <div style={{ color: 'var(--fg, #e2e4ea)' }}>{selected.email}</div>
                </div>
                <div>
                  <div style={LABEL_STYLE}>Role</div>
                  <AdminStatusBadge status={selected.role} />
                </div>
                <div>
                  <div style={LABEL_STYLE}>Tier</div>
                  <AdminStatusBadge status={selected.tier} />
                </div>
                <div>
                  <div style={LABEL_STYLE}>Platforms</div>
                  <div style={{ color: 'var(--fg, #e2e4ea)' }}>
                    {selected.platformCount} connected
                  </div>
                </div>
                <div>
                  <div style={LABEL_STYLE}>Joined</div>
                  <div style={{ color: 'var(--fg, #e2e4ea)' }}>
                    {new Date(selected.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div>
                  <div style={LABEL_STYLE}>Status</div>
                  <AdminStatusBadge status={selected.isBanned ? 'banned' : 'active'} />
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div
              style={{
                width: 220,
                borderLeft: '1px solid var(--admin-border, #2a2b33)',
                paddingLeft: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Change Role */}
              <div>
                <div style={LABEL_STYLE}>Change Role</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={roleSelect}
                    onChange={(e) => setRoleSelect(e.target.value)}
                    style={{ ...SELECT_STYLE, flex: 1, minWidth: 0 }}
                  >
                    <option value="creator">Creator</option>
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                  </select>
                  <button
                    onClick={() => handleAction('changeRole', roleSelect)}
                    disabled={actionLoading || roleSelect === selected.role}
                    style={{
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color:
                        roleSelect === selected.role
                          ? 'var(--admin-muted, #6b6e7b)'
                          : 'var(--fg, #e2e4ea)',
                      background: 'var(--admin-surface-2, #1f2128)',
                      border: '1px solid var(--admin-border, #2a2b33)',
                      borderRadius: 4,
                      cursor:
                        actionLoading || roleSelect === selected.role
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: actionLoading || roleSelect === selected.role ? 0.5 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {actionLoading ? (
                      <Loader2
                        size={12}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                    ) : (
                      'Set'
                    )}
                  </button>
                </div>
              </div>

              {/* Grant Tier */}
              <div>
                <div style={LABEL_STYLE}>Grant Tier</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    value={tierSelect}
                    onChange={(e) => setTierSelect(e.target.value)}
                    style={{ ...SELECT_STYLE, flex: 1, minWidth: 0 }}
                  >
                    <option value="free">Free</option>
                    <option value="creator">Creator</option>
                    <option value="pro">Pro</option>
                    <option value="agency">Agency</option>
                  </select>
                  <button
                    onClick={() => handleAction('grantTier', tierSelect)}
                    disabled={actionLoading || tierSelect === selected.tier}
                    style={{
                      padding: '7px 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      color:
                        tierSelect === selected.tier
                          ? 'var(--admin-muted, #6b6e7b)'
                          : 'var(--fg, #e2e4ea)',
                      background: 'var(--admin-surface-2, #1f2128)',
                      border: '1px solid var(--admin-border, #2a2b33)',
                      borderRadius: 4,
                      cursor:
                        actionLoading || tierSelect === selected.tier
                          ? 'not-allowed'
                          : 'pointer',
                      opacity: actionLoading || tierSelect === selected.tier ? 0.5 : 1,
                      fontFamily: 'inherit',
                    }}
                  >
                    {actionLoading ? (
                      <Loader2
                        size={12}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                    ) : (
                      'Set'
                    )}
                  </button>
                </div>
              </div>

              {/* Ban / Restore */}
              <div
                style={{
                  borderTop: '1px solid var(--admin-border, #2a2b33)',
                  paddingTop: 16,
                }}
              >
                <div style={{ ...LABEL_STYLE, marginBottom: 8 }}>Account</div>
                {selected.isBanned ? (
                  <ActionBtn
                    label="Restore User"
                    onClick={() => handleAction('restore')}
                    loading={actionLoading}
                    accent="green"
                  />
                ) : (
                  <ActionBtn
                    label="Ban User"
                    onClick={handleBanClick}
                    loading={actionLoading}
                    accent="red"
                  />
                )}
                <div style={{ marginTop: 8 }}>
                  <ActionBtn
                    label="Delete User"
                    onClick={handleDeleteClick}
                    loading={actionLoading}
                    accent="red"
                  />
                </div>
              </div>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          message={confirmMessage}
          onConfirm={confirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <ToastNotification toast={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
