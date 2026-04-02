"use client";

import React, { useState, useTransition, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { updateUserRole } from "@/lib/actions/admin";
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
  isPending,
}: {
  user: UserRow;
  onRoleChange: (userId: string, role: string) => void;
  isPending: boolean;
}) {
  return (
    <tr>
      <td colSpan={8} className="border-b border-rule bg-surface-raised px-6 py-4">
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
                    className="border border-rule bg-transparent px-2 py-1 text-xs font-mono text-ink focus:outline-none focus:border-ink disabled:opacity-50"
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
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.org_name?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.system_role.toLowerCase().includes(q),
    );
  }, [users, search]);

  function handleRoleChange(userId: string, role: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateUserRole(userId, role);
      if (result.error) {
        setActionError(result.error);
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
            <tr className="border-b border-rule bg-surface-raised">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted w-8" />
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Name
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Email
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Org
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Plan
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
                      <td className="px-4 py-2.5 text-sm text-ink-secondary whitespace-nowrap">
                        {user.org_name ?? "--"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <PlanBadge plan={user.org_plan} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                        {user.role}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <RoleBadge role={user.system_role} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                        {user.provider ?? "email"}
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
