"use client";

import { useState, useTransition, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  Mail,
  MailOpen,
} from "lucide-react";
import type { ContactSubmission } from "@/types";
import { updateContactStatus } from "@/lib/actions/admin";

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ContactStatusBadge({ status }: { status: string }) {
  const color =
    status === "new"
      ? "text-editorial-red"
      : status === "replied"
        ? "text-editorial-green"
        : status === "archived"
          ? "text-ink-muted"
          : "text-ink-secondary";
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-widest ${color}`}
    >
      {status}
    </span>
  );
}

const STATUSES = ["new", "read", "replied", "archived"] as const;

export function ContactsClient({
  contacts,
  unreadCount,
}: {
  contacts: ContactSubmission[];
  unreadCount: number;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = contacts;
    if (filterStatus !== "all") {
      result = result.filter((c) => c.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.subject ?? "").toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q),
      );
    }
    return result;
  }, [contacts, search, filterStatus]);

  function handleStatusChange(id: string, status: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateContactStatus(id, status);
      if (result.error) setActionError(result.error);
    });
  }

  function handleMarkAsRead(id: string) {
    handleStatusChange(id, "read");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-bold text-ink">
            Contact Submissions
          </h1>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 border border-editorial-red bg-editorial-red/5 px-2 py-0.5">
              <Mail size={10} className="text-editorial-red" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-editorial-red">
                {unreadCount} unread
              </span>
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {contacts.length} total submission
        {contacts.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{contacts.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-red">{unreadCount}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Unread</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{contacts.filter(c => c.status === 'new').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">New</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{contacts.filter(c => c.status === 'replied').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Replied</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink-muted">{contacts.filter(c => c.status === 'archived').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Archived</div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, subject, message..."
            className="w-full border border-rule bg-transparent py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-rule bg-transparent px-3 py-2.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
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
                Subject
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Status
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Date
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  {search || filterStatus !== "all"
                    ? "No contacts match your filters."
                    : "No contact submissions yet."}
                </td>
              </tr>
            ) : (
              filtered.map((contact) => {
                const isExpanded = expandedId === contact.id;
                return (
                  <tbody key={contact.id}>
                    <tr
                      onClick={() =>
                        setExpandedId(isExpanded ? null : contact.id)
                      }
                      className={`border-b border-rule hover:bg-surface-raised/50 cursor-pointer transition-colors ${contact.status === "new" ? "bg-editorial-red/[0.02]" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-ink-muted">
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-ink whitespace-nowrap">
                        {contact.name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                        {contact.email}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-ink-secondary max-w-[200px] truncate">
                        {contact.subject ?? "--"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <ContactStatusBadge status={contact.status} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                        {timeAgo(contact.created_at)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {contact.status === "new" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(contact.id);
                            }}
                            disabled={isPending}
                            className="flex items-center gap-1 text-ink-muted hover:text-ink transition-colors disabled:opacity-40"
                            title="Mark as Read"
                          >
                            <MailOpen size={20} />
                            <span className="text-[11px] font-bold uppercase tracking-widest">
                              Mark Read
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={7}
                          className="border-b border-rule bg-surface-raised px-6 py-4"
                        >
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {/* Message */}
                            <div className="sm:col-span-2">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                                Full Message
                              </p>
                              <div className="border border-rule bg-surface-card p-3">
                                <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
                                  {contact.message}
                                </p>
                              </div>
                              <p className="mt-2 font-mono text-sm text-ink-muted">
                                Received: {formatDate(contact.created_at)}
                              </p>
                            </div>

                            {/* Status Management */}
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                                Update Status
                              </p>
                              <div className="space-y-2">
                                <select
                                  value={contact.status}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      contact.id,
                                      e.target.value,
                                    )
                                  }
                                  disabled={isPending}
                                  className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink disabled:opacity-50"
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                                {isPending && (
                                  <div className="flex items-center gap-1 text-ink-muted">
                                    <Loader2
                                      size={10}
                                      className="animate-spin"
                                    />
                                    <span className="text-xs">
                                      Updating...
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-3">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                                  Contact Info
                                </p>
                                <p className="text-sm text-ink">
                                  {contact.name}
                                </p>
                                <p className="font-mono text-sm text-ink-secondary">
                                  {contact.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <div className="mt-4">
        <p className="text-xs text-ink-muted font-mono">
          Showing {filtered.length} of {contacts.length} submissions
        </p>
      </div>
    </div>
  );
}
