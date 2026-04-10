"use client";

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

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  "invoice.paid": { label: "Payment Received", color: "text-editorial-green" },
  "invoice.payment_failed": { label: "Payment Failed", color: "text-editorial-red" },
  upgrade: { label: "Plan Upgrade", color: "text-editorial-gold" },
  downgrade: { label: "Plan Downgrade", color: "text-editorial-red" },
  plan_change: { label: "Plan Changed", color: "text-editorial-gold" },
  cancellation: { label: "Subscription Cancelled", color: "text-editorial-red" },
  brand_payment: { label: "Brand Payment", color: "text-editorial-blue" },
};

function eventDisplay(type: string) {
  return EVENT_LABELS[type] ?? { label: type.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), color: "text-ink" };
}

type EnrichedEvent = {
  id: string;
  organization_id: string | null;
  event_type: string;
  stripe_event_id: string | null;
  amount_cents: number;
  currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
  org_name: string | null;
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-ink-muted",
  pro: "text-editorial-gold",
  business: "text-editorial-green",
  enterprise: "text-editorial-blue",
  brand_starter: "text-editorial-gold",
  brand_growth: "text-editorial-green",
  brand_enterprise: "text-editorial-blue",
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
    creatorPlanDistribution: Record<string, number>;
    brandPlanDistribution: Record<string, number>;
    creatorPaidOrgs: number;
    brandPaidOrgs: number;
    recentEvents: EnrichedEvent[];
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    churnRate: number;
    creatorMrr: number;
    brandMrr: number;
    creatorArr: number;
    brandArr: number;
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

      {/* Revenue by Account Type */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Revenue by Account Type
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <div className="border border-rule bg-surface-card p-4 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">${revenue.creatorMrr.toLocaleString()}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Creator MRR</div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">${revenue.brandMrr.toLocaleString()}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Brand MRR</div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">${revenue.creatorArr.toLocaleString()}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Creator ARR</div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">${revenue.brandArr.toLocaleString()}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Brand ARR</div>
        </div>
      </div>

      {/* Plan Distribution — Split by Account Type */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* Creator Plans */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Creator Plans
            </span>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(overview.creatorPlanDistribution).map(([plan, count]) => {
              const total = overview.totalOrgs || 1;
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={plan}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${PLAN_COLORS[plan] ?? "text-ink"}`}>
                      {plan}
                    </span>
                    <span className="font-mono text-sm text-ink-muted">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-raised">
                    <div className="h-2 rounded-full bg-ink" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(overview.creatorPlanDistribution).length === 0 && (
              <span className="text-sm text-ink-muted">No creator plans</span>
            )}
          </div>
        </div>

        {/* Brand Plans */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-editorial-blue">
              Brand Plans
            </span>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(overview.brandPlanDistribution).map(([plan, count]) => {
              const total = overview.totalOrgs || 1;
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={plan}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${PLAN_COLORS[plan] ?? "text-editorial-blue"}`}>
                      {plan}
                    </span>
                    <span className="font-mono text-sm text-ink-muted">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-raised">
                    <div className="h-2 rounded-full" style={{ background: "#4B9CD3", width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(overview.brandPlanDistribution).length === 0 && (
              <span className="text-sm text-ink-muted">No brand plans</span>
            )}
          </div>
        </div>
      </div>

      {/* Org Summary — Split by Account Type */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
        {[
          { label: "Total Orgs", value: overview.totalOrgs },
          { label: "Paid Orgs", value: overview.paidOrgs, accent: "text-editorial-green" },
          { label: "Free Orgs", value: overview.freeOrgs },
          { label: "Creator Paid", value: overview.creatorPaidOrgs, accent: "text-editorial-green" },
          { label: "Brand Paid", value: overview.brandPaidOrgs, accent: "text-editorial-blue" },
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
        <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr] gap-4 px-4 py-2.5 border-b border-rule">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Event
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Account
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Amount
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
          overview.recentEvents.map((event) => {
            const { label, color } = eventDisplay(event.event_type);
            const plan = (event.metadata?.plan as string) ?? null;
            return (
              <div
                key={event.id}
                className="grid grid-cols-[1.2fr_1fr_0.8fr_0.6fr] gap-4 px-4 py-3 border-b border-rule last:border-b-0"
              >
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${color} block truncate`}>
                    {label}
                  </span>
                  {plan && (
                    <span className="text-[11px] text-ink-muted uppercase">{plan} plan</span>
                  )}
                </div>
                <span className="text-sm text-ink truncate">
                  {event.org_name ?? <span className="text-ink-muted">--</span>}
                </span>
                <span className="font-mono text-sm text-ink">
                  {event.amount_cents > 0
                    ? `$${(event.amount_cents / 100).toFixed(2)}`
                    : "--"}
                </span>
                <span className="font-mono text-xs text-ink-muted text-right">
                  {timeAgo(event.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
