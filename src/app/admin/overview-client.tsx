"use client";

import Link from "next/link";
import {
  Users,
  Building2,
  Share2,
  Handshake,
  DollarSign,
  Activity,
  Sparkles,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  FileSearch,
  Megaphone,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AdminStats, AuditLog } from "@/types";

/* ------------------------------------------------------------------ */
/*  Plan accent colors                                                 */
/* ------------------------------------------------------------------ */
const PLAN_COLORS: Record<string, string> = {
  free: "#6B5D8E",
  pro: "#FFB84D",
  business: "#4ade80",
  enterprise: "#8B5CF6",
};

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: string;
}) {
  return (
    <div className="border border-rule bg-surface-card p-5">
      <div className="flex items-center justify-between mb-3">
        <Icon size={22} className={accent ?? "text-ink-muted"} />
      </div>
      <div className="font-mono text-3xl font-bold text-ink">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section Header                                                     */
/* ------------------------------------------------------------------ */
function SectionHeader({
  title,
  href,
  linkText,
}: {
  title: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
        {title}
      </p>
      {href && (
        <Link
          href={href}
          className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:text-ink transition-colors"
        >
          {linkText ?? "Details"}
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Custom Tooltip                                                     */
/* ------------------------------------------------------------------ */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#2A1B54",
        border: "1px solid rgba(139,92,246,0.2)",
        borderRadius: 8,
        padding: "8px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6B5D8E", marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontSize: 13, fontFamily: "monospace", color: "#F0ECF8" }}>
          <span style={{ color: p.color }}>●</span> {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function OverviewClient({
  stats,
  signups,
  auditLog,
  apiUsage,
  billing,
  metrics,
  usage,
  growth,
}: {
  stats: AdminStats;
  signups: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    org_name: string | null;
    org_plan: string | null;
    created_at: string;
  }>;
  auditLog: AuditLog[];
  apiUsage: {
    totalCalls: number;
    totalCost: number;
    successRate: number;
    byProvider: Record<
      string,
      { calls: number; cost: number; successRate: number }
    >;
    dailyAggregates: Array<{ date: string; calls: number; cost: number }>;
  };
  billing: {
    totalOrgs: number;
    paidOrgs: number;
    freeOrgs: number;
    planDistribution: Record<string, number>;
  };
  metrics: {
    mrr: number;
    arr: number;
    arpu: number;
    churnRate: number;
  };
  usage: {
    totalProfiles: number;
    totalAnalyses: number;
    totalCompetitors: number;
    totalDeals: number;
    totalCampaigns: number;
  };
  growth: Array<{
    month: string;
    users: number;
    orgs: number;
    profiles: number;
    analyses: number;
  }>;
}) {
  /* Computed values */
  const totalPlanOrgs = Object.values(billing.planDistribution).reduce(
    (a, b) => a + b,
    0
  );

  /* Format daily aggregates for chart — show last 14 days for readability */
  const apiChartData = apiUsage.dailyAggregates.slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    calls: d.calls,
    cost: d.cost,
  }));

  /* Format growth data for chart */
  const growthChartData = growth.map((g) => ({
    month: g.month,
    users: g.users,
    orgs: g.orgs,
    profiles: g.profiles,
  }));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-6">Overview</h1>

      {/* ============================================================ */}
      {/* ROW 1: Primary Stat Cards (8 cards, 2 rows of 4)             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
          accent="text-ink"
        />
        <StatCard
          label="Active Orgs"
          value={stats.totalOrgs}
          icon={Building2}
          accent="text-ink"
        />
        <StatCard
          label="Social Profiles"
          value={stats.totalProfiles}
          icon={Share2}
          accent="text-ink"
        />
        <StatCard
          label="Paid Orgs"
          value={billing.paidOrgs}
          icon={DollarSign}
          accent="text-editorial-gold"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard
          label="MRR"
          value={`$${metrics.mrr.toLocaleString()}`}
          icon={TrendingUp}
          accent="text-editorial-green"
        />
        <StatCard
          label="ARR"
          value={`$${metrics.arr.toLocaleString()}`}
          icon={BarChart3}
          accent="text-editorial-green"
        />
        <StatCard
          label="Churn Rate"
          value={`${(metrics.churnRate * 100).toFixed(1)}%`}
          icon={TrendingDown}
          accent="text-editorial-red"
        />
        <StatCard
          label="API Calls (30d)"
          value={apiUsage.totalCalls.toLocaleString()}
          icon={Zap}
          accent="text-ink"
        />
      </div>

      {/* ============================================================ */}
      {/* ROW 2: Charts — API Calls + Growth                           */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* API Calls Chart */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              API Calls — Last 14 Days
            </span>
            <Link
              href="/admin/api"
              className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:text-ink transition-colors"
            >
              Details
            </Link>
          </div>
          <div className="p-4 h-[260px] min-w-0">
            {apiChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apiChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-rule, #ddd)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#6B5D8E" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B5D8E" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="calls"
                    name="Calls"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-ink-muted">
                No API call data available
              </div>
            )}
          </div>
        </div>

        {/* Growth Chart */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Growth — Users &amp; Orgs
            </span>
            <Link
              href="/admin/analytics"
              className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:text-ink transition-colors"
            >
              Details
            </Link>
          </div>
          <div className="p-4 h-[260px] min-w-0">
            {growthChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthChartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-rule, #ddd)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6B5D8E" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B5D8E" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="users"
                    name="Users"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="orgs"
                    name="Orgs"
                    stroke="#FFB84D"
                    fill="#FFB84D"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-ink-muted">
                No growth data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 3: Revenue by Plan + Plan Distribution                   */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* Revenue by Plan */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Revenue Metrics
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-ink">
                  ${metrics.arpu.toFixed(0)}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                  ARPU
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-ink">
                  ${apiUsage.totalCost.toFixed(2)}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                  API Cost
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-ink">
                  {(apiUsage.successRate * 100).toFixed(0)}%
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                  API Success
                </div>
              </div>
            </div>

            <div className="border-t border-rule pt-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
                API Cost by Provider
              </p>
              <div className="space-y-2">
                {Object.entries(apiUsage.byProvider).map(([provider, data]) => {
                  const pct =
                    apiUsage.totalCost > 0
                      ? (data.cost / apiUsage.totalCost) * 100
                      : 0;
                  return (
                    <div key={provider}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-ink capitalize">
                          {provider}
                        </span>
                        <span className="font-mono text-sm text-ink-muted">
                          ${data.cost.toFixed(2)} · {data.calls} calls
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full" style={{ background: 'var(--color-surface-raised)' }}>
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ background: "#8B5CF6", width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(apiUsage.byProvider).length === 0 && (
                  <span className="text-sm text-ink-muted">
                    No provider data
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Plan Distribution
            </span>
            <Link
              href="/admin/billing"
              className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:text-ink transition-colors"
            >
              Details
            </Link>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-ink">
                  {billing.totalOrgs}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                  Total Orgs
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-editorial-gold">
                  {billing.paidOrgs}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                  Paid
                </div>
              </div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-ink-muted">
                  {billing.freeOrgs}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                  Free
                </div>
              </div>
            </div>

            <div className="border-t border-rule pt-4 space-y-3">
              {Object.entries(billing.planDistribution).map(([plan, count]) => {
                const pct =
                  totalPlanOrgs > 0 ? (count / totalPlanOrgs) * 100 : 0;
                const color =
                  PLAN_COLORS[plan.toLowerCase()] ?? PLAN_COLORS.free;
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-ink capitalize">
                        {plan}
                      </span>
                      <span className="font-mono text-sm text-ink-muted">
                        {count} org{count !== 1 ? "s" : ""} ·{" "}
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full" style={{ background: 'var(--color-surface-raised)' }}>
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {Object.keys(billing.planDistribution).length === 0 && (
                <span className="text-sm text-ink-muted">
                  No plan distribution data
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 4: Usage Stats Strip                                     */}
      {/* ============================================================ */}
      <SectionHeader title="Platform Usage" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
        {[
          {
            label: "Social Profiles",
            value: usage.totalProfiles,
            icon: Share2,
          },
          {
            label: "Analyses Run",
            value: usage.totalAnalyses,
            icon: FileSearch,
          },
          {
            label: "Competitors",
            value: usage.totalCompetitors,
            icon: Target,
          },
          {
            label: "Active Deals",
            value: usage.totalDeals,
            icon: Handshake,
          },
          {
            label: "Campaigns",
            value: usage.totalCampaigns,
            icon: Megaphone,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="border border-rule bg-surface-card p-4 flex items-center gap-3"
          >
            <item.icon size={20} className="text-ink-muted shrink-0" />
            <div>
              <div className="font-mono text-lg font-bold text-ink">
                {item.value}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                {item.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* ROW 5: Recent Signups + Recent Activity                      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* Recent Signups */}
        <div className="border border-rule">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Recent Signups
            </span>
            <Link
              href="/admin/users"
              className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:text-ink transition-colors"
            >
              View All
            </Link>
          </div>
          {signups.length === 0 ? (
            <div className="p-4 text-center text-sm text-ink-muted">
              No signups yet
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1fr_80px_90px] gap-4 px-4 py-2.5 border-b border-rule">
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Name
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Organization
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Plan
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted text-right">
                  Date
                </span>
              </div>
              {signups.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[1fr_1fr_80px_90px] gap-4 px-4 py-3 border-b border-rule last:border-b-0"
                >
                  <div className="truncate">
                    <span className="text-sm font-medium text-ink">
                      {s.full_name ?? "Unknown"}
                    </span>
                  </div>
                  <span className="text-sm text-ink-muted truncate">
                    {s.org_name ?? "—"}
                  </span>
                  <span
                    className="text-[11px] font-bold uppercase tracking-widest"
                    style={{
                      color:
                        PLAN_COLORS[(s.org_plan ?? "free").toLowerCase()] ??
                        PLAN_COLORS.free,
                    }}
                  >
                    {s.org_plan ?? "free"}
                  </span>
                  <span className="text-sm text-ink-muted font-mono text-right">
                    {formatDate(s.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="border border-rule">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              System Events
            </span>
            <Link
              href="/admin/health"
              className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:text-ink transition-colors"
            >
              System Health
            </Link>
          </div>
          {auditLog.length === 0 ? (
            <div className="p-4 text-center text-sm text-ink-muted">
              No activity logged
            </div>
          ) : (
            auditLog.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-4 py-2.5 border-b border-rule last:border-b-0"
              >
                <div>
                  <span className="text-sm font-medium text-ink">
                    {a.action}
                  </span>
                  {a.resource_type && (
                    <span className="ml-2 text-sm text-ink-muted">
                      {a.resource_type}
                    </span>
                  )}
                </div>
                <span className="text-sm text-ink-muted font-mono">
                  {timeAgo(a.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* ROW 6: Quick Actions                                         */}
      {/* ============================================================ */}
      <SectionHeader title="Quick Actions" />
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/data-intelligence"
          className="flex items-center gap-2 border border-rule px-4 py-2.5 text-sm font-semibold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          <Sparkles size={20} />
          Generate Insights
        </Link>
        <Link
          href="/admin/analytics"
          className="flex items-center gap-2 border border-rule px-4 py-2.5 text-sm font-semibold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          <BarChart3 size={20} />
          View Analytics
        </Link>
        <Link
          href="/admin/api"
          className="flex items-center gap-2 border border-rule px-4 py-2.5 text-sm font-semibold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          <Activity size={20} />
          Manage API
        </Link>
        <Link
          href="/admin/users"
          className="flex items-center gap-2 border border-rule px-4 py-2.5 text-sm font-semibold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          <Users size={20} />
          Manage Users
        </Link>
      </div>
    </div>
  );
}
