"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  CohortRow,
  FunnelStep,
  FeatureAdoption,
  RevenueWaterfall,
  UserEngagement,
  ChurnRisk,
  PlatformBenchmarkRow,
  ContentPattern,
  PlatformDistribution,
} from "@/lib/dal/admin-analytics";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Chart styling constants                                             */
/* ------------------------------------------------------------------ */

const tooltipStyle = {
  backgroundColor: "#112240",
  border: "1px solid rgba(75,156,211,0.15)",
  borderRadius: 8,
  fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  fontSize: 11,
  color: "#E8F0FA",
};
const axisTick = { fontSize: 11, fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", fill: "#6B5D8E" };
const PIE_COLORS = [
  "#4B9CD3",
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
  creatorUsers: "#22c55e",
  brandUsers: "#4B9CD3",
  creatorOrgs: "#86efac",
  brandOrgs: "#93c5fd",
};

/* ------------------------------------------------------------------ */
/* Plan color mapping                                                  */
/* ------------------------------------------------------------------ */

const PLAN_COLORS: Record<string, string> = {
  free: "text-ink-muted",
  pro: "text-editorial-gold",
  business: "text-editorial-green",
  enterprise: "text-editorial-blue",
  brand_starter: "text-editorial-gold",
  brand_growth: "text-editorial-green",
  brand_enterprise: "text-editorial-blue",
};

/* Human-readable labels for event_type codes */
const FEATURE_LABELS: Record<string, string> = {
  page_view: "Page View",
  chat_message: "Chat Message",
  analysis_run: "Analysis Run",
  profile_sync: "Profile Sync",
  profile_sync_all: "Sync All Profiles",
  content_generated: "Content Generated",
  competitor_added: "Competitor Added",
  competitor_analysis: "Competitor Analysis",
  deal_created: "Deal Created",
  deal_updated: "Deal Updated",
  campaign_created: "Campaign Created",
  settings_updated: "Settings Updated",
  billing_checkout: "Billing Checkout",
  export_data: "Data Export",
  media_kit_view: "Media Kit View",
  hashtag_search: "Hashtag Search",
  strategy_generated: "Strategy Generated",
  login: "Login",
  signup: "Signup",
};

function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function AccountBadge({ type }: { type: "creator" | "brand" }) {
  return (
    <span className={cn(
      "text-[10px] font-bold uppercase tracking-wider",
      type === "brand" ? "text-editorial-blue" : "text-ink-muted",
    )}>
      {type}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const TIERS = [
  { key: "investor", label: "Investor Metrics" },
  { key: "business", label: "Business Intelligence" },
  { key: "behavior", label: "User Behavior" },
  { key: "social", label: "Social Intelligence" },
] as const;
type TierKey = (typeof TIERS)[number]["key"];

export function AnalyticsClient({
  metrics,
  growth,
  usage,
  apiUsage,
  billing,
  cohorts,
  funnel,
  featureAdoption,
  waterfall,
  engagementScores,
  churnRisk,
  benchmarks,
  contentPatterns,
  platformDist,
}: {
  metrics: {
    mrr: number;
    arr: number;
    arpu: number;
    totalOrgs: number;
    paidOrgs: number;
    freeOrgs: number;
    churnRate: number;
    creatorMrr: number;
    brandMrr: number;
    creatorUsers: number;
    brandUsers: number;
    creatorOrgs: number;
    brandOrgs: number;
    creatorPaidOrgs: number;
    brandPaidOrgs: number;
  };
  growth: Array<{
    month: string;
    users: number;
    orgs: number;
    profiles: number;
    analyses: number;
    creatorUsers: number;
    brandUsers: number;
    creatorOrgs: number;
    brandOrgs: number;
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
    creatorPlanDistribution: Record<string, number>;
    brandPlanDistribution: Record<string, number>;
    creatorPaidOrgs: number;
    brandPaidOrgs: number;
  };
  cohorts: CohortRow[];
  funnel: FunnelStep[];
  featureAdoption: FeatureAdoption[];
  waterfall: RevenueWaterfall;
  engagementScores: UserEngagement[];
  churnRisk: ChurnRisk[];
  benchmarks: PlatformBenchmarkRow[];
  contentPatterns: ContentPattern[];
  platformDist: PlatformDistribution[];
}) {
  /* ---- Derived data ---- */
  const paidRatio =
    billing.totalOrgs > 0
      ? ((billing.paidOrgs / billing.totalOrgs) * 100).toFixed(1)
      : "0.0";

  /* ---- KPI hero data ---- */
  const heroKPIs = [
    { label: "MRR", value: `$${metrics.mrr.toLocaleString()}` },
    { label: "ARR", value: `$${metrics.arr.toLocaleString()}` },
    { label: "Creator MRR", value: `$${metrics.creatorMrr.toLocaleString()}`, accent: "text-editorial-green" },
    { label: "Brand MRR", value: `$${metrics.brandMrr.toLocaleString()}`, accent: "text-editorial-gold" },
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
  ];

  const [activeTier, setActiveTier] = useState<TierKey>("investor");

  return (
    <div>
      {/* ============================================================ */}
      {/* Page Heading + Tier Tabs                                      */}
      {/* ============================================================ */}
      <h1 className="font-serif text-3xl font-bold text-ink mb-4">
        Analytics
      </h1>

      <div className="mb-8 flex items-center gap-1 overflow-x-auto border-b border-rule">
        {TIERS.map((tier) => (
          <button
            key={tier.key}
            onClick={() => setActiveTier(tier.key)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors",
              activeTier === tier.key
                ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-secondary hover:text-ink",
            )}
          >
            {tier.label}
          </button>
        ))}
      </div>

      {activeTier === "investor" && (<div>

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

      {/* Account Type Breakdown */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Account Type Breakdown
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 mb-8">
        {[
          { label: "Creator Users", value: metrics.creatorUsers, accent: "text-editorial-green" },
          { label: "Brand Users", value: metrics.brandUsers, accent: "text-editorial-blue" },
          { label: "Creator Orgs", value: metrics.creatorOrgs, accent: "text-editorial-green" },
          { label: "Brand Orgs", value: metrics.brandOrgs, accent: "text-editorial-blue" },
          { label: "Creator Paid", value: metrics.creatorPaidOrgs, accent: "text-editorial-green" },
          { label: "Brand Paid", value: metrics.brandPaidOrgs, accent: "text-editorial-blue" },
        ].map((m) => (
          <div key={m.label} className="border border-rule bg-surface-card p-3 text-center">
            <div className={`font-mono text-lg font-bold ${m.accent}`}>
              {m.value.toLocaleString()}
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
        <div className="p-4 min-w-0">
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
                    <stop offset="5%" stopColor={AREA_COLORS.users} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={AREA_COLORS.users} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOrgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS.orgs} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={AREA_COLORS.orgs} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradProfiles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS.profiles} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={AREA_COLORS.profiles} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCreatorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS.creatorUsers} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={AREA_COLORS.creatorUsers} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBrandUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AREA_COLORS.brandUsers} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={AREA_COLORS.brandUsers} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis tick={axisTick} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                  }}
                />
                <Area type="monotone" dataKey="users" stroke={AREA_COLORS.users} strokeWidth={2} fill="url(#gradUsers)" name="Total Users" />
                <Area type="monotone" dataKey="creatorUsers" stroke={AREA_COLORS.creatorUsers} strokeWidth={1.5} fill="url(#gradCreatorUsers)" name="Creator Users" strokeDasharray="5 3" />
                <Area type="monotone" dataKey="brandUsers" stroke={AREA_COLORS.brandUsers} strokeWidth={1.5} fill="url(#gradBrandUsers)" name="Brand Users" strokeDasharray="5 3" />
                <Area type="monotone" dataKey="orgs" stroke={AREA_COLORS.orgs} strokeWidth={2} fill="url(#gradOrgs)" name="Total Orgs" />
                <Area type="monotone" dataKey="profiles" stroke={AREA_COLORS.profiles} strokeWidth={2} fill="url(#gradProfiles)" name="Profiles" />
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
        {/* Left: Creator Plans + Brand Plans */}
        <div className="space-y-4">
          {/* Creator Plans */}
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-editorial-green">
                Creator Plans
              </span>
            </div>
            <div className="p-4 space-y-3">
              {Object.entries(billing.creatorPlanDistribution).map(([plan, count]) => {
                const total = billing.totalOrgs || 1;
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
                      <div className="h-2 rounded-full bg-editorial-green" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(billing.creatorPlanDistribution).length === 0 && (
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
              {Object.entries(billing.brandPlanDistribution).map(([plan, count]) => {
                const total = billing.totalOrgs || 1;
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
              {Object.keys(billing.brandPlanDistribution).length === 0 && (
                <span className="text-sm text-ink-muted">No brand plans</span>
              )}
            </div>
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
                {billing.creatorPaidOrgs} creator
              </span>
              <span className="text-sm font-mono text-editorial-blue">
                {billing.brandPaidOrgs} brand
              </span>
              <span className="text-sm font-mono text-ink-muted">
                {billing.freeOrgs} free
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-rule bg-surface-card p-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                Creator MRR
              </div>
              <div className="font-mono text-xl font-bold text-editorial-green">
                ${metrics.creatorMrr.toLocaleString()}
              </div>
            </div>
            <div className="border border-rule bg-surface-card p-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                Brand MRR
              </div>
              <div className="font-mono text-xl font-bold text-editorial-gold">
                ${metrics.brandMrr.toLocaleString()}
              </div>
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
      <div className="border border-rule mb-8 overflow-x-auto">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Monthly Growth Table
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[0.8fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.5fr] gap-3 px-4 py-2.5 border-b border-rule min-w-[900px]">
          {["Month", "Users", "Creator", "Brand", "Orgs", "Creator", "Brand", "Analyses"].map(
            (heading, i) => (
              <span
                key={`${heading}-${i}`}
                className={cn(
                  "text-[11px] font-bold uppercase tracking-widest",
                  (i === 2 || i === 5) ? "text-editorial-green" : (i === 3 || i === 6) ? "text-editorial-blue" : "text-ink-muted",
                )}
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
              className="grid grid-cols-[0.8fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.6fr_0.5fr] gap-3 px-4 py-3 border-b border-rule last:border-b-0 min-w-[900px]"
            >
              <span className="font-mono text-sm text-ink-secondary">{row.month}</span>
              <span className="font-mono text-sm text-ink font-bold">{row.users.toLocaleString()}</span>
              <span className="font-mono text-sm text-editorial-green">{row.creatorUsers.toLocaleString()}</span>
              <span className="font-mono text-sm text-editorial-blue">{row.brandUsers.toLocaleString()}</span>
              <span className="font-mono text-sm text-ink font-bold">{row.orgs.toLocaleString()}</span>
              <span className="font-mono text-sm text-editorial-green">{row.creatorOrgs.toLocaleString()}</span>
              <span className="font-mono text-sm text-editorial-blue">{row.brandOrgs.toLocaleString()}</span>
              <span className="font-mono text-sm text-ink font-bold">{row.analyses.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>)}

      {/* ============================================================ */}
      {/* TIER 1 — Business Intelligence                               */}
      {/* ============================================================ */}
      {activeTier === "business" && (
        <div>
          {/* Conversion Funnel */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Conversion Funnel
          </p>
          <div className="border border-rule bg-surface-card mb-8">
            {funnel.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-muted">No funnel data yet</div>
            ) : (
              <div className="p-4 space-y-3">
                {funnel.map((step, i) => (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans text-sm font-semibold text-ink">{step.label}</span>
                      <div className="flex items-center gap-3">
                        {(step.creatorCount > 0 || step.brandCount > 0) && (
                          <span className="text-[10px] text-ink-muted">
                            <span className="text-editorial-green">{step.creatorCount} creator</span>
                            {" · "}
                            <span className="text-editorial-blue">{step.brandCount} brand</span>
                          </span>
                        )}
                        <span className="font-mono text-sm text-ink-secondary">
                          {step.count.toLocaleString()} ({step.pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-surface-raised)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${step.pct}%`,
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue Waterfall */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Revenue Waterfall (30 Days)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-8">
            {[
              { label: "New MRR", value: waterfall.newMRR, color: "text-editorial-green" },
              { label: "Expansion", value: waterfall.expansionMRR, color: "text-editorial-green" },
              { label: "Contraction", value: -waterfall.contractionMRR, color: "text-editorial-red" },
              { label: "Churn", value: -waterfall.churnMRR, color: "text-editorial-red" },
              { label: "Net New MRR", value: waterfall.netNewMRR, color: waterfall.netNewMRR >= 0 ? "text-editorial-green" : "text-editorial-red" },
            ].map((item) => (
              <div key={item.label} className="border border-rule bg-surface-card p-4 text-center">
                <div className={`font-mono text-xl font-bold ${item.color}`}>
                  {item.value >= 0 ? "+" : ""}${Math.abs(item.value).toLocaleString()}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Cohort Retention */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Cohort Retention
          </p>
          <div className="border border-rule mb-8 overflow-x-auto">
            <div className="grid grid-cols-6 gap-4 px-4 py-2.5 border-b border-rule min-w-[600px]">
              {["Cohort", "Signups", "Week 1", "Week 2", "Week 4", "Week 8"].map((h) => (
                <span key={h} className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
              ))}
            </div>
            {cohorts.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-muted">
                No cohort data yet. Events tracking needs to collect data first.
              </div>
            ) : (
              cohorts.map((c) => (
                <div key={c.cohort} className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-rule last:border-b-0 min-w-[600px]">
                  <span className="font-mono text-sm text-ink-secondary">{c.cohort}</span>
                  <span className="font-mono text-sm text-ink font-bold">{c.signupCount}</span>
                  <span className={cn("font-mono text-sm font-bold", retentionColor(c.week1))}>{c.week1}%</span>
                  <span className={cn("font-mono text-sm font-bold", retentionColor(c.week2))}>{c.week2}%</span>
                  <span className={cn("font-mono text-sm font-bold", retentionColor(c.week4))}>{c.week4}%</span>
                  <span className={cn("font-mono text-sm font-bold", retentionColor(c.week8))}>{c.week8}%</span>
                </div>
              ))
            )}
          </div>

          {/* Feature Adoption */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Feature Adoption
          </p>
          <div className="border border-rule mb-8">
            <div className="grid grid-cols-3 gap-4 px-4 py-2.5 border-b border-rule">
              {["Feature", "Unique Users", "Total Events"].map((h) => (
                <span key={h} className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
              ))}
            </div>
            {featureAdoption.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-muted">No event data yet</div>
            ) : (
              featureAdoption.slice(0, 15).map((f) => (
                <div key={f.feature} className="grid grid-cols-3 gap-4 px-4 py-3 border-b border-rule last:border-b-0">
                  <span className="font-sans text-sm text-ink font-medium">{featureLabel(f.feature)}</span>
                  <span className="font-mono text-sm text-ink font-bold">{f.users.toLocaleString()}</span>
                  <span className="font-mono text-sm text-ink-secondary">{f.totalEvents.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TIER 2 — User Behavior Intelligence                          */}
      {/* ============================================================ */}
      {activeTier === "behavior" && (
        <div>
          {/* Engagement Scores */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Top Engaged Users (30 Days)
          </p>
          <div className="border border-rule mb-8 overflow-x-auto">
            <div className="grid grid-cols-7 gap-4 px-4 py-2.5 border-b border-rule min-w-[800px]">
              {["User", "Email", "Type", "Plan", "Score", "Events", "Last Active"].map((h) => (
                <span key={h} className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
              ))}
            </div>
            {engagementScores.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-muted">No engagement data yet</div>
            ) : (
              engagementScores.slice(0, 20).map((u) => (
                <div key={u.userId} className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-rule last:border-b-0 min-w-[800px]">
                  <span className="font-sans text-sm text-ink truncate">{u.name || "Unknown"}</span>
                  <span className="font-mono text-xs text-ink-secondary truncate">{u.email || "—"}</span>
                  <span><AccountBadge type={u.accountType} /></span>
                  <span className={cn("font-sans text-sm font-semibold capitalize", PLAN_COLORS[u.plan] ?? "text-ink")}>{u.plan}</span>
                  <span className={cn("font-mono text-sm font-bold", u.score >= 70 ? "text-editorial-green" : u.score >= 40 ? "text-editorial-gold" : "text-ink-muted")}>{u.score}</span>
                  <span className="font-mono text-sm text-ink">{u.eventCount.toLocaleString()}</span>
                  <span className="font-mono text-xs text-ink-secondary">{u.lastActive?.split("T")[0] ?? "—"}</span>
                </div>
              ))
            )}
          </div>

          {/* Churn Risk */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Churn Risk (Paid &amp; Cancelled Users)
          </p>
          <div className="border border-rule mb-8 overflow-x-auto">
            <div className="grid grid-cols-7 gap-4 px-4 py-2.5 border-b border-rule min-w-[800px]">
              {["User", "Type", "Plan", "Risk", "Days Inactive", "Prev Month", "This Month"].map((h) => (
                <span key={h} className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
              ))}
            </div>
            {churnRisk.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-muted">No churn risks detected</div>
            ) : (
              churnRisk.map((u) => (
                <div key={u.userId} className="grid grid-cols-7 gap-4 px-4 py-3 border-b border-rule last:border-b-0 min-w-[800px]">
                  <span className="font-sans text-sm text-ink truncate">{u.name || u.email || "Unknown"}</span>
                  <span><AccountBadge type={u.accountType} /></span>
                  <span className={cn("font-sans text-sm font-semibold capitalize", PLAN_COLORS[u.plan] ?? "text-ink")}>{u.plan}</span>
                  <span className={cn(
                    "font-sans text-xs font-bold uppercase tracking-wider",
                    u.riskLevel === "high" ? "text-editorial-red" : "text-editorial-gold",
                  )}>{u.riskLevel}</span>
                  <span className="font-mono text-sm text-ink">{u.daysSinceLastActive}d</span>
                  <span className="font-mono text-sm text-ink-secondary">{u.previousMonthEvents}</span>
                  <span className={cn("font-mono text-sm font-bold", u.currentMonthEvents < u.previousMonthEvents ? "text-editorial-red" : "text-ink")}>{u.currentMonthEvents}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TIER 3 — Aggregate Social Intelligence                       */}
      {/* ============================================================ */}
      {activeTier === "social" && (
        <div>
          {/* Platform Distribution */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Platform Distribution
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-8">
            {platformDist.map((pd) => (
              <div key={pd.platform} className="border border-rule bg-surface-card p-4 text-center">
                <div className="font-mono text-xl font-bold text-ink">{pd.profileCount}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1 capitalize">{pd.platform}</div>
                <div className="mt-2 text-xs text-ink-secondary">
                  {pd.totalFollowers.toLocaleString()} followers
                </div>
                <div className="text-xs text-ink-secondary">
                  {pd.avgEngagement}% avg eng.
                </div>
                {(pd.creatorCount > 0 || pd.brandCount > 0) && (
                  <div className="mt-1 flex items-center justify-center gap-2 text-[10px]">
                    <span className="text-editorial-green">{pd.creatorCount} creator</span>
                    <span className="text-editorial-blue">{pd.brandCount} brand</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Content Patterns */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Trending Content Patterns
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
            {contentPatterns.map((cp) => (
              <div key={cp.contentType} className="border border-rule bg-surface-card p-4">
                <div className="font-sans text-sm font-bold text-ink">{cp.contentType}</div>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">Avg Engagement</div>
                    <div className="font-mono text-lg font-bold text-editorial-red">{cp.avgEngagement}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">Posts Analyzed</div>
                    <div className="font-mono text-lg font-bold text-ink">{cp.postCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-ink-muted">Top Platform</div>
                    <div className="font-mono text-lg font-bold text-ink capitalize">{cp.topPlatform}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cross-Platform Benchmarks */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Cross-Platform Benchmarks
          </p>
          <div className="border border-rule mb-8 overflow-x-auto">
            <div className="grid grid-cols-6 gap-4 px-4 py-2.5 border-b border-rule min-w-[700px]">
              {["Platform", "Bracket", "Avg Eng.", "Avg Growth", "Posts/Week", "Sample"].map((h) => (
                <span key={h} className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
              ))}
            </div>
            {benchmarks.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-muted">Not enough data to compute benchmarks yet</div>
            ) : (
              benchmarks.slice(0, 25).map((b, i) => (
                <div key={`${b.platform}-${b.followerBracket}-${i}`} className="grid grid-cols-6 gap-4 px-4 py-3 border-b border-rule last:border-b-0 min-w-[700px]">
                  <span className="font-sans text-sm text-ink capitalize">{b.platform}</span>
                  <span className="font-mono text-sm text-ink-secondary">{b.followerBracket}</span>
                  <span className="font-mono text-sm font-bold text-editorial-red">{b.avgEngagement}%</span>
                  <span className={cn("font-mono text-sm font-bold", b.avgGrowth >= 0 ? "text-editorial-green" : "text-editorial-red")}>{b.avgGrowth >= 0 ? "+" : ""}{b.avgGrowth}%</span>
                  <span className="font-mono text-sm text-ink">{b.avgPostsPerWeek.toLocaleString()}</span>
                  <span className="font-mono text-sm text-ink-muted">{b.sampleSize}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function retentionColor(pct: number): string {
  if (pct >= 50) return "text-editorial-green";
  if (pct >= 25) return "text-editorial-gold";
  if (pct > 0) return "text-editorial-red";
  return "text-ink-muted";
}
