"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Chart styling constants                                             */
/* ------------------------------------------------------------------ */

const tooltipStyle = {
  backgroundColor: "#2A1B54",
  border: "1px solid rgba(139,92,246,0.15)",
  borderRadius: 8,
  fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  fontSize: 11,
  color: "#F0ECF8",
};
const axisTick = { fontSize: 11, fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", fill: "#6B5D8E" };
const PIE_COLORS = [
  "#8B5CF6",
  "#FFB84D",
  "#4ade80",
  "#5b9cf5",
  "#a78bfa",
  "#f59e0b",
  "#34d399",
  "#6366f1",
];

const AREA_COLORS = {
  users: "#5b9cf5",
  orgs: "#4ade80",
  profiles: "#FFB84D",
};

/* ------------------------------------------------------------------ */
/* Plan color mapping                                                  */
/* ------------------------------------------------------------------ */

const PLAN_COLORS: Record<string, string> = {
  free: "text-ink-muted",
  pro: "text-editorial-gold",
  business: "text-editorial-green",
  enterprise: "text-editorial-red",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AnalyticsClient({
  metrics,
  growth,
  usage,
  apiUsage,
  billing,
}: {
  metrics: {
    mrr: number;
    arr: number;
    arpu: number;
    totalOrgs: number;
    paidOrgs: number;
    freeOrgs: number;
    churnRate: number;
  };
  growth: Array<{
    month: string;
    users: number;
    orgs: number;
    profiles: number;
    analyses: number;
  }>;
  usage: {
    totalProfiles: number;
    totalAnalyses: number;
    totalCompetitors: number;
    totalDeals: number;
    totalCampaigns: number;
  };
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
}) {
  /* ---- Derived data ---- */
  const pieData = Object.entries(billing.planDistribution).map(
    ([name, value]) => ({ name, value }),
  );

  const paidRatio =
    billing.totalOrgs > 0
      ? ((billing.paidOrgs / billing.totalOrgs) * 100).toFixed(1)
      : "0.0";

  /* ---- KPI hero data ---- */
  const heroKPIs = [
    { label: "MRR", value: `$${metrics.mrr.toLocaleString()}` },
    { label: "ARR", value: `$${metrics.arr.toLocaleString()}` },
    { label: "Total Customers", value: metrics.totalOrgs.toLocaleString() },
    {
      label: "Paid Customers",
      value: metrics.paidOrgs.toLocaleString(),
      accent: "text-editorial-green",
    },
    { label: "ARPU", value: `$${metrics.arpu.toFixed(2)}` },
    {
      label: "Churn Rate",
      value: `${(metrics.churnRate * 100).toFixed(1)}%`,
      accent:
        metrics.churnRate > 0.1
          ? "text-editorial-red"
          : "text-editorial-green",
    },
    { label: "API Cost (30d)", value: `$${apiUsage.totalCost.toFixed(2)}` },
    {
      label: "API Success Rate",
      value: `${(apiUsage.successRate * 100).toFixed(1)}%`,
      accent:
        apiUsage.successRate >= 0.95
          ? "text-editorial-green"
          : "text-editorial-red",
    },
  ];

  return (
    <div>
      {/* ============================================================ */}
      {/* Page Heading                                                  */}
      {/* ============================================================ */}
      <h1 className="font-serif text-3xl font-bold text-ink mb-8">
        Analytics
      </h1>

      {/* ============================================================ */}
      {/* 1. KPI Hero Cards (2 rows of 4)                              */}
      {/* ============================================================ */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Investor Metrics
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        {heroKPIs.map((m) => (
          <div
            key={m.label}
            className="border border-rule bg-surface-card p-4 text-center"
          >
            <div
              className={`font-mono text-xl font-bold ${m.accent ?? "text-ink"}`}
            >
              {m.value}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 2. Growth Chart (AreaChart)                                   */}
      {/* ============================================================ */}
      <div className="border border-rule bg-surface-card mb-8">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Growth Over Time
          </span>
        </div>
        <div className="p-4">
          {growth.length === 0 ? (
            <div className="text-center text-sm text-ink-muted py-8">
              No growth data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={growth}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={AREA_COLORS.users}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={AREA_COLORS.users}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gradOrgs" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={AREA_COLORS.orgs}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={AREA_COLORS.orgs}
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="gradProfiles"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={AREA_COLORS.profiles}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={AREA_COLORS.profiles}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-rule, #ddd)"
                />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke={AREA_COLORS.users}
                  strokeWidth={2}
                  fill="url(#gradUsers)"
                  name="Users"
                />
                <Area
                  type="monotone"
                  dataKey="orgs"
                  stroke={AREA_COLORS.orgs}
                  strokeWidth={2}
                  fill="url(#gradOrgs)"
                  name="Orgs"
                />
                <Area
                  type="monotone"
                  dataKey="profiles"
                  stroke={AREA_COLORS.profiles}
                  strokeWidth={2}
                  fill="url(#gradProfiles)"
                  name="Profiles"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. Revenue & Plan Mix (two columns)                          */}
      {/* ============================================================ */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Revenue &amp; Plan Mix
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Left: Pie Chart */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Plan Distribution
            </span>
          </div>
          <div className="p-4 flex justify-center">
            {pieData.length === 0 ? (
              <div className="text-center text-sm text-ink-muted py-8">
                No plan data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={false}
                    labelLine={false}
                    stroke="none"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    wrapperStyle={{
                      fontSize: 11,
                      fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Unit Economics Cards */}
        <div className="space-y-3">
          <div className="border border-rule bg-surface-card p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Average Revenue Per User
            </div>
            <div className="font-mono text-2xl font-bold text-ink">
              ${metrics.arpu.toFixed(2)}
            </div>
          </div>

          <div className="border border-rule bg-surface-card p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Monthly Churn Rate
            </div>
            <div
              className={`font-mono text-2xl font-bold ${metrics.churnRate > 0.1 ? "text-editorial-red" : "text-editorial-green"}`}
            >
              {(metrics.churnRate * 100).toFixed(1)}%
            </div>
          </div>

          <div className="border border-rule bg-surface-card p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Paid vs Free Ratio
            </div>
            <div className="font-mono text-2xl font-bold text-ink">
              {paidRatio}% paid
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-mono text-editorial-green">
                {billing.paidOrgs} paid
              </span>
              <span className="text-sm font-mono text-ink-muted">
                {billing.freeOrgs} free
              </span>
            </div>
          </div>

          <div className="border border-rule bg-surface-card p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Monthly Recurring Revenue
            </div>
            <div className="font-mono text-2xl font-bold text-ink">
              ${metrics.mrr.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. Platform Usage Strip                                      */}
      {/* ============================================================ */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Platform Usage
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-8">
        {[
          { label: "Social Profiles", value: usage.totalProfiles },
          { label: "Analyses", value: usage.totalAnalyses },
          { label: "Competitors", value: usage.totalCompetitors },
          { label: "Deals", value: usage.totalDeals },
          { label: "Campaigns", value: usage.totalCampaigns },
        ].map((item) => (
          <div
            key={item.label}
            className="border border-rule bg-surface-card p-4 text-center"
          >
            <div className="font-mono text-2xl font-bold text-ink">
              {item.value.toLocaleString()}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* ============================================================ */}
      {/* 5. Monthly Growth Table                                      */}
      {/* ============================================================ */}
      <div className="border border-rule mb-8">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Monthly Growth Table
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-5 gap-2 px-4 py-2 border-b border-rule bg-surface-raised">
          {["Month", "Users", "Orgs", "Profiles", "Analyses"].map(
            (heading) => (
              <span
                key={heading}
                className="text-[11px] font-bold uppercase tracking-widest text-ink-muted"
              >
                {heading}
              </span>
            ),
          )}
        </div>

        {growth.length === 0 ? (
          <div className="p-4 text-center text-sm text-ink-muted">
            No growth data available
          </div>
        ) : (
          growth.map((row) => (
            <div
              key={row.month}
              className="grid grid-cols-5 gap-2 px-4 py-2.5 border-b border-rule last:border-b-0"
            >
              <span className="font-mono text-sm text-ink-secondary">
                {row.month}
              </span>
              <span className="font-mono text-sm text-ink font-bold">
                {row.users.toLocaleString()}
              </span>
              <span className="font-mono text-sm text-ink font-bold">
                {row.orgs.toLocaleString()}
              </span>
              <span className="font-mono text-sm text-ink font-bold">
                {row.profiles.toLocaleString()}
              </span>
              <span className="font-mono text-sm text-ink font-bold">
                {row.analyses.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
