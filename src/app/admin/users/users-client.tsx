"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { updateUserRole, deleteUser } from "@/lib/actions/admin";
import type { UserRow } from "@/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProviderIcon({ provider }: { provider: string | null }) {
  if (provider === "google") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Google
      </span>
    );
  }
  if (provider === "apple") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.31-3.74 4.25z" />
        </svg>
        Apple
      </span>
    );
  }
  return <span>email</span>;
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-ink-muted">--</span>;
  const color =
    plan === "enterprise"
      ? "text-editorial-gold"
      : plan === "business"
        ? "text-editorial-blue"
        : plan === "pro"
          ? "text-editorial-green"
          : "text-ink-muted";
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>
      {plan}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "superadmin"
      ? "text-editorial-red"
      : role === "admin"
        ? "text-editorial-gold"
        : "text-ink-secondary";
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>
      {role}
    </span>
  );
}

function UserExpandedRow({
  user,
  onRoleChange,
  onDelete,
  isPending,
}: {
  user: UserRow;
  onRoleChange: (userId: string, role: string) => void;
  onDelete: (userId: string) => void;
  isPending: boolean;
}) {
  return (
    <tr>
      <td colSpan={9} className="border-b border-rule bg-surface-raised px-6 py-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* User Info */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
              User Details
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-8 w-8 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center bg-surface-inset text-xs font-bold text-ink-muted">
                    {(user.full_name ?? "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-ink">
                    {user.full_name ?? "Unknown"}
                  </p>
                  <p className="font-mono text-sm text-ink-muted">
                    {user.email ?? "No email"}
                  </p>
                </div>
              </div>
              <p className="font-mono text-sm text-ink-muted">
                ID: {user.id.slice(0, 8)}...
              </p>
              <p className="text-sm text-ink-secondary">
                Provider: <span className="font-mono">{user.provider ?? "email"}</span>
              </p>
              <p className="text-sm text-ink-secondary">
                Joined: <span className="font-mono">{formatDate(user.created_at)}</span>
              </p>
            </div>
          </div>

          {/* Organization Info */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
              Organization
            </p>
            <div className="space-y-1.5">
              <p className="text-sm text-ink">
                {user.org_name ?? "No organization"}
              </p>
              {user.org_plan && <PlanBadge plan={user.org_plan} />}
              <p className="text-sm text-ink-secondary">
                Role: <span className="font-mono">{user.role}</span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
              Actions
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  System Role
                </label>
                <div className="flex items-center gap-2">
                  <select
                    defaultValue={user.system_role}
                    onChange={(e) => onRoleChange(user.id, e.target.value)}
                    disabled={isPending}
                    className="border border-rule bg-surface-card px-2 py-1 text-xs font-mono text-ink focus:outline-none focus:border-ink disabled:opacity-50 [&>option]:bg-surface-card [&>option]:text-ink"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                  {isPending && (
                    <Loader2 size={20} className="animate-spin text-ink-muted" />
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete user "${user.full_name ?? user.email}"? This cannot be undone.`)) {
                    onDelete(user.id);
                  }
                }}
                disabled={isPending}
                className="mt-3 flex items-center gap-1.5 border border-editorial-red/30 bg-editorial-red/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-editorial-red hover:bg-editorial-red/20 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} />
                Delete User
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function AccountTypeBadge({ type }: { type: "creator" | "brand" }) {
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-widest ${
        type === "brand" ? "text-editorial-blue" : "text-ink-muted"
      }`}
    >
      {type}
    </span>
  );
}

type AccountFilter = "all" | "creator" | "brand";

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = users;
    if (accountFilter !== "all") {
      result = result.filter((u) => u.account_type === accountFilter);
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.org_name?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.system_role.toLowerCase().includes(q),
    );
  }, [users, search, accountFilter]);

  function handleRoleChange(userId: string, role: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateUserRole(userId, role);
      if (result.error) {
        setActionError(result.error);
      }
    });
  }

  function handleDelete(userId: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.error) {
        setActionError(result.error);
      } else {
        setExpandedId(null);
      }
    });
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-1">Users</h1>
      <p className="text-xs text-ink-muted mb-4">
        {users.length} total user{users.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{users.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Users</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-red">{users.filter(u => u.system_role === 'admin' || u.system_role === 'superadmin').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Admins</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{users.filter(u => u.org_name).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">With Org</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{users.filter(u => !u.provider || u.provider === 'email').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Email Sign-ups</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{users.filter(u => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">New 7d</div>
        </div>
      </div>

      {/* Account Type Filter */}
      <div className="flex items-center gap-1 mb-4">
        {(["all", "creator", "brand"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAccountFilter(tab)}
            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors ${
              accountFilter === tab
                ? "border-ink bg-surface-raised text-ink"
                : "border-rule text-ink-muted hover:text-ink hover:border-ink"
            }`}
          >
            {tab === "all" ? "All" : tab === "creator" ? "Creators" : "Brands"}
            <span className="ml-1.5 font-mono text-[10px]">
              {tab === "all"
                ? users.length
                : users.filter((u) => u.account_type === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, org, role..."
          className="w-full border border-rule bg-transparent py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
        />
      </div>

      {/* Error */}
      {actionError && (
        <div className="mb-4 border border-editorial-red bg-editorial-red/5 px-4 py-2 text-xs text-editorial-red">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="border border-rule overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted w-8" />
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Name
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Email
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Plan
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Type
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Role
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                System Role
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Provider
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  {search ? "No users match your search." : "No users found."}
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const isExpanded = expandedId === user.id;
                return (
                  <React.Fragment key={user.id}>
                    <tr
                      onClick={() =>
                        setExpandedId(isExpanded ? null : user.id)
                      }
                      className="border-b border-rule hover:bg-surface-raised/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-ink-muted">
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-ink whitespace-nowrap">
                        {user.full_name ?? "Unknown"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                        {user.email ?? "--"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <PlanBadge plan={user.org_plan} />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <AccountTypeBadge type={user.account_type} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                        {user.role}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <RoleBadge role={user.system_role} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                        <ProviderIcon provider={user.provider} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                        {timeAgo(user.created_at)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <UserExpandedRow
                        key={`${user.id}-detail`}
                        user={user}
                        onRoleChange={handleRoleChange}
                        onDelete={handleDelete}
                        isPending={isPending}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination placeholder */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-ink-muted font-mono">
          Showing {filtered.length} of {users.length} users
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled
            className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
