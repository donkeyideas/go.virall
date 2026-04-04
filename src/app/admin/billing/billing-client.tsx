"use client";

import type { BillingEvent } from "@/types";

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

const PLAN_COLORS: Record<string, string> = {
  free: "text-ink-muted",
  pro: "text-editorial-gold",
  business: "text-editorial-green",
  enterprise: "text-editorial-red",
};

export function BillingClient({
  overview,
  revenue,
}: {
  overview: {
    totalOrgs: number;
    paidOrgs: number;
    freeOrgs: number;
    planDistribution: Record<string, number>;
    recentEvents: BillingEvent[];
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    churnRate: number;
  };
}) {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-6">Billing</h1>

      {/* Revenue Hero Cards */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Revenue Overview
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {[
          { label: "MRR", value: `$${revenue.mrr.toLocaleString()}` },
          { label: "ARR", value: `$${revenue.arr.toLocaleString()}` },
          { label: "ARPU", value: `$${revenue.arpu.toFixed(2)}` },
          {
            label: "Churn Rate",
            value: `${(revenue.churnRate * 100).toFixed(1)}%`,
            accent:
              revenue.churnRate > 0.1
                ? "text-editorial-red"
                : "text-editorial-green",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="border border-rule bg-surface-card p-4 text-center"
          >
            <div
              className={`font-mono text-2xl font-bold ${m.accent ?? "text-ink"}`}
            >
              {m.value}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Plan Distribution */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Plan Distribution
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        {Object.entries(overview.planDistribution).map(([plan, count]) => {
          const total = overview.totalOrgs || 1;
          const pct = ((count / total) * 100).toFixed(1);
          return (
            <div
              key={plan}
              className="border border-rule bg-surface-card p-4"
            >
              <div className="flex items-baseline justify-between mb-2">
                <span
                  className={`text-xs font-bold uppercase tracking-widest ${PLAN_COLORS[plan] ?? "text-ink"}`}
                >
                  {plan}
                </span>
                <span className="font-mono text-sm text-ink-muted">
                  {pct}%
                </span>
              </div>
              <div className="font-mono text-2xl font-bold text-ink">
                {count}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
                Organizations
              </div>
              {/* Distribution bar */}
              <div className="mt-3 h-0.5 w-full bg-surface-raised">
                <div
                  className="h-0.5 bg-ink"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Org Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Orgs", value: overview.totalOrgs },
          { label: "Paid Orgs", value: overview.paidOrgs, accent: "text-editorial-green" },
          { label: "Free Orgs", value: overview.freeOrgs },
        ].map((m) => (
          <div
            key={m.label}
            className="border border-rule bg-surface-card p-3 text-center"
          >
            <div className={`font-mono text-lg font-bold ${m.accent ?? "text-ink"}`}>
              {m.value}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Billing Events */}
      <div className="border border-rule">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Recent Billing Events
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-rule">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Event
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Amount
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Currency
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted text-right">
            Time
          </span>
        </div>

        {overview.recentEvents.length === 0 ? (
          <div className="p-4 text-center text-sm text-ink-muted">
            No billing events recorded
          </div>
        ) : (
          overview.recentEvents.map((event) => (
            <div
              key={event.id}
              className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-rule last:border-b-0"
            >
              <span className="text-sm font-medium text-ink truncate">
                {event.event_type}
              </span>
              <span className="font-mono text-sm text-ink">
                {event.amount_cents > 0
                  ? `$${(event.amount_cents / 100).toFixed(2)}`
                  : "--"}
              </span>
              <span className="font-mono text-sm text-ink-secondary uppercase">
                {event.currency}
              </span>
              <span className="font-mono text-xs text-ink-muted text-right">
                {timeAgo(event.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
