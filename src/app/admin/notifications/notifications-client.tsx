"use client";

import { useState } from "react";
import { Users, CreditCard, Activity, Mail, Inbox } from "lucide-react";
import type { AdminNotification } from "@/types";

const FILTER_OPTIONS = ["All", "Signup", "Billing", "Audit", "Contact"] as const;
type FilterType = (typeof FILTER_OPTIONS)[number];

const TYPE_CONFIG: Record<
  AdminNotification["type"],
  {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    colorClass: string;
  }
> = {
  signup: { icon: Users, colorClass: "text-editorial-green" },
  billing: { icon: CreditCard, colorClass: "text-editorial-gold" },
  audit: { icon: Activity, colorClass: "text-ink-secondary" },
  contact: { icon: Mail, colorClass: "text-editorial-red" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationsClient({
  notifications,
}: {
  notifications: AdminNotification[];
}) {
  const [filter, setFilter] = useState<FilterType>("All");

  const filtered =
    filter === "All"
      ? notifications
      : notifications.filter(
          (n) => n.type === filter.toLowerCase(),
        );

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-4">
        Notifications
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{notifications.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{notifications.filter(n => n.type === 'signup').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Signups</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">{notifications.filter(n => n.type === 'billing').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Billing</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{notifications.filter(n => n.type === 'audit').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Audit</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-red">{notifications.filter(n => n.type === 'contact').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Contacts</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
              filter === opt
                ? "border-ink bg-ink text-surface-cream"
                : "border-rule bg-surface-card text-ink-muted hover:text-ink hover:border-ink"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Notification Feed */}
      <div className="border border-rule">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Activity Feed
          </span>
          <span className="ml-2 font-mono text-sm text-ink-muted">
            ({filtered.length})
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ink-muted">
            <Inbox size={28} className="mb-3 text-ink-faint" />
            <p className="text-xs">No notifications found</p>
            <p className="mt-1 text-sm text-ink-muted">
              {filter !== "All"
                ? `No ${filter.toLowerCase()} notifications to display`
                : "All clear -- nothing to see here"}
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className="flex items-start gap-3 border-b border-rule px-4 py-3 last:border-b-0 hover:bg-surface-raised transition-colors"
              >
                <div className={`mt-0.5 shrink-0 ${cfg.colorClass}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                      {n.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-ink">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-secondary">
                    {n.description}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-sm text-ink-muted">
                  {timeAgo(n.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
