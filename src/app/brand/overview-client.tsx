"use client";

import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Megaphone,
  FileText,
  Handshake,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustScore } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BrandStats {
  activeCampaigns: number;
  pendingProposals: number;
  activeDeals: number;
  totalSpent: number;
}

interface DealRow {
  id: string;
  brand_name: string;
  total_value: number | null;
  paid_amount: number | null;
  status: string;
  pipeline_stage: string;
  created_at: string;
  updated_at: string;
}

interface ProposalRow {
  id: string;
  title: string;
  status: string;
  total_amount: number | null;
  proposal_type: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  updated_at: string;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
}

interface BrandOverviewClientProps {
  companyName: string;
  stats: BrandStats;
  deals: DealRow[];
  proposals: ProposalRow[];
  notifications: NotificationRow[];
  campaigns: CampaignRow[];
  trustScore: TrustScore | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}K`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function humanizeType(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PIPELINE_STAGES = [
  { key: "lead", label: "Lead", color: "#94A3B8" },
  { key: "outreach", label: "Outreach", color: "#3B82F6" },
  { key: "negotiating", label: "Negotiating", color: "#F59E0B" },
  { key: "contracted", label: "Contracted", color: "#4B9CD3" },
  { key: "in_progress", label: "In Progress", color: "#F59E0B" },
  { key: "delivered", label: "Delivered", color: "#10B981" },
  { key: "invoiced", label: "Invoiced", color: "#3B82F6" },
  { key: "paid", label: "Paid", color: "#10B981" },
  { key: "completed", label: "Completed", color: "#4B9CD3" },
];

const PROPOSAL_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "#94A3B8", bg: "rgba(148,163,184,0.1)" },
  pending: { label: "Pending", color: "#FFB84D", bg: "rgba(255,184,77,0.1)" },
  negotiating: {
    label: "Negotiating",
    color: "#4B9CD3",
    bg: "rgba(75,156,211,0.1)",
  },
  accepted: {
    label: "Accepted",
    color: "#34D399",
    bg: "rgba(52,211,153,0.1)",
  },
  declined: { label: "Declined", color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  cancelled: {
    label: "Cancelled",
    color: "#6B7280",
    bg: "rgba(107,114,128,0.1)",
  },
  expired: { label: "Expired", color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
};

// ─── Intelligence Brief Generator ───────────────────────────────────────────

interface InsightItem {
  category: string;
  headline: string;
  body: string;
}

function computeInsights(
  deals: DealRow[],
  proposals: ProposalRow[],
  campaigns: CampaignRow[],
  stats: BrandStats,
  trustScore: TrustScore | null,
): InsightItem[] {
  const insights: InsightItem[] = [];
  const pipelineValue = deals.reduce(
    (s, d) => s + (d.total_value ?? 0),
    0,
  );

  // Pipeline health
  const activeStages = new Set([
    "active",
    "negotiation",
    "in_progress",
    "contracted",
    "outreach",
    "negotiating",
  ]);
  const activeDeals = deals.filter((d) => activeStages.has(d.pipeline_stage));
  if (activeDeals.length > 0) {
    const activeValue = activeDeals.reduce(
      (s, d) => s + (d.total_value ?? 0),
      0,
    );
    const completedCount = deals.filter(
      (d) => d.pipeline_stage === "completed" || d.pipeline_stage === "paid",
    ).length;
    insights.push({
      category: "PIPELINE HEALTH",
      headline: `${activeDeals.length} Active Deal${activeDeals.length > 1 ? "s" : ""} Worth ${formatCurrency(activeValue)}`,
      body: `Your deal pipeline is ${activeDeals.length >= 5 ? "robust" : activeDeals.length >= 3 ? "healthy" : "building"}. ${completedCount} deal${completedCount !== 1 ? "s" : ""} completed to date.`,
    });
  }

  // Proposal conversion
  const accepted = proposals.filter((p) => p.status === "accepted").length;
  const total = proposals.length;
  if (total > 0) {
    const rate = Math.round((accepted / total) * 100);
    insights.push({
      category: "CONVERSION",
      headline: `${rate}% Proposal Acceptance Rate`,
      body:
        rate >= 50
          ? `${accepted} of ${total} proposals accepted. Strong conversion — creators respond well to your brand.`
          : rate >= 25
            ? `${accepted} of ${total} proposals accepted. Average conversion. Consider personalizing proposals.`
            : `${accepted} of ${total} proposals accepted. Review your offer terms and creator targeting.`,
    });
  }

  // Pending proposals
  const pending = proposals.filter((p) => p.status === "pending");
  if (pending.length > 0) {
    const oldestDate = pending.reduce((oldest, p) => {
      const d = new Date(p.created_at).getTime();
      return d < oldest ? d : oldest;
    }, Date.now());
    const oldestDays = Math.floor((Date.now() - oldestDate) / 86_400_000);
    insights.push({
      category: "ACTION NEEDED",
      headline: `${pending.length} Proposal${pending.length > 1 ? "s" : ""} Awaiting Response`,
      body:
        oldestDays > 7
          ? `Oldest pending proposal is ${oldestDays} days old. Consider following up — quick responses improve trust scores.`
          : `Oldest pending proposal is ${oldestDays} day${oldestDays !== 1 ? "s" : ""} old. Within normal response timeframe.`,
    });
  }

  // Spending insight
  if (stats.totalSpent > 0 && deals.length > 0) {
    const avgDeal = Math.round(pipelineValue / deals.length);
    const tier =
      avgDeal > 5000
        ? "Premium tier partnerships."
        : avgDeal > 1000
          ? "Mid-market collaborations."
          : "Micro-influencer focused strategy.";
    insights.push({
      category: "SPENDING",
      headline: `Avg Deal Value: ${formatCurrency(avgDeal)}`,
      body: `$${stats.totalSpent.toLocaleString()} invested across ${deals.length} creator collaboration${deals.length !== 1 ? "s" : ""}. ${tier}`,
    });
  }

  // Campaign insight
  const activeCamps = campaigns.filter((c) => c.status === "active");
  if (activeCamps.length > 0) {
    const totalBudget = activeCamps.reduce(
      (s, c) => s + (c.budget ?? 0),
      0,
    );
    insights.push({
      category: "CAMPAIGNS",
      headline: `${activeCamps.length} Active Campaign${activeCamps.length > 1 ? "s" : ""} Running`,
      body: `Total active budget: ${formatCurrency(totalBudget)}. ${activeCamps.length > 3 ? "Consider consolidating for better focus and measurement." : "Good campaign diversity."}`,
    });
  }

  // Trust score insight
  if (trustScore && trustScore.overall_score > 0) {
    const score = trustScore.overall_score;
    insights.push({
      category: "BRAND TRUST",
      headline: `Trust Score: ${score}/100`,
      body:
        score >= 80
          ? "Excellent brand reputation. Creators actively seek partnerships with you."
          : score >= 60
            ? "Good standing. Complete more deals to boost your trust rating."
            : "Building trust. Focus on timely payments and clear communication.",
    });
  }

  // Empty state
  if (insights.length === 0) {
    insights.push({
      category: "GETTING STARTED",
      headline: "Start Building Your Creator Network",
      body: "Discover creators, send proposals, and build partnerships. Your intelligence brief will populate as you grow your brand presence.",
    });
  }

  return insights;
}

// ─── Monthly Chart Data ─────────────────────────────────────────────────────

function computeMonthlyDealData(
  deals: DealRow[],
): Array<{ month: string; value: number; count: number }> {
  const months: Record<string, { value: number; count: number }> = {};

  for (const d of deals) {
    const date = new Date(d.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = { value: 0, count: 0 };
    months[key].value += d.total_value ?? 0;
    months[key].count += 1;
  }

  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    result.push({
      month: label,
      value: months[key]?.value ?? 0,
      count: months[key]?.count ?? 0,
    });
  }
  return result;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function BrandOverviewClient({
  companyName,
  stats,
  deals,
  proposals,
  notifications,
  campaigns,
  trustScore,
}: BrandOverviewClientProps) {
  const pipelineValue = deals.reduce(
    (sum, d) => sum + (d.total_value ?? 0),
    0,
  );
  const totalPaid = deals.reduce(
    (sum, d) => sum + (d.paid_amount ?? 0),
    0,
  );
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  // Pipeline stage counts + values
  const stageCounts = PIPELINE_STAGES.map((s) => ({
    ...s,
    count: deals.filter((d) => d.pipeline_stage === s.key).length,
    value: deals
      .filter((d) => d.pipeline_stage === s.key)
      .reduce((sum, d) => sum + (d.total_value ?? 0), 0),
  })).filter((s) => s.count > 0);
  const totalStageDeals = stageCounts.reduce((sum, s) => sum + s.count, 0);

  // Intelligence brief
  const insights = computeInsights(
    deals,
    proposals,
    campaigns,
    stats,
    trustScore,
  );

  // Monthly deal data for chart
  const monthlyData = computeMonthlyDealData(deals);
  const hasChartData = monthlyData.some((m) => m.value > 0);

  // Proposal stats
  const proposalAccepted = proposals.filter(
    (p) => p.status === "accepted",
  ).length;
  const proposalPending = proposals.filter(
    (p) => p.status === "pending",
  ).length;
  const proposalDeclined = proposals.filter(
    (p) => p.status === "declined",
  ).length;

  return (
    <div>
      {/* ──── Welcome Header ──── */}
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-ink">
          Welcome back, {companyName}
        </h1>
        <p className="mt-1.5 text-[13px] font-medium text-ink-secondary">
          Here&apos;s your brand intelligence overview
        </p>
      </div>

      {/* ──── KPI Grid ──── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          [
            {
              label: "Active Campaigns",
              value: String(stats.activeCampaigns),
              accent: false,
              icon: Megaphone,
              color: "text-[rgba(75,156,211,0.9)]",
            },
            {
              label: "Pending Proposals",
              value: String(stats.pendingProposals),
              accent: true,
              icon: FileText,
              color: "text-editorial-red",
            },
            {
              label: "Active Deals",
              value: String(stats.activeDeals),
              accent: false,
              icon: Handshake,
              color: "text-editorial-green",
            },
            {
              label: "Pipeline Value",
              value: formatCurrency(pipelineValue),
              accent: true,
              icon: DollarSign,
              color: "text-editorial-accent",
            },
            {
              label: "Total Spent",
              value: formatCurrency(stats.totalSpent),
              accent: false,
              icon: TrendingUp,
              color: "text-editorial-blue",
            },
          ] as const
        ).map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-[14px] border border-modern-card-border bg-surface-card p-4"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
                  {stat.label}
                </p>
                <Icon size={14} className={cn("opacity-60", stat.color)} />
              </div>
              <p
                className={cn(
                  "text-[26px] font-extrabold tracking-[-1px]",
                  stat.accent ? "text-editorial-accent" : "text-ink",
                )}
              >
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* ──── Smart Alerts ──── */}
      {(stats.pendingProposals > 0 || unreadNotifs > 0) && (
        <div className="mb-5 flex flex-wrap gap-2.5">
          {stats.pendingProposals > 0 && (
            <Link
              href="/brand/proposals"
              className="flex items-center gap-2 rounded-[10px] border border-editorial-red/15 bg-editorial-red/8 px-4 py-2 text-xs font-semibold text-editorial-red no-underline transition-colors hover:bg-editorial-red/12"
            >
              <FileText size={14} />
              {stats.pendingProposals} pending proposal
              {stats.pendingProposals > 1 ? "s" : ""} awaiting response
              <ArrowRight size={12} />
            </Link>
          )}
          {unreadNotifs > 0 && (
            <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(75,156,211,0.15)] bg-[rgba(75,156,211,0.08)] px-4 py-2 text-xs font-semibold text-[rgba(75,156,211,0.9)]">
              <Bell size={14} />
              {unreadNotifs} unread notification
              {unreadNotifs > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* ──── Three-Column Layout ──── */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr_280px]">
        {/* ════ LEFT COLUMN: Campaign Intelligence Brief ════ */}
        <div>
          <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-ink">
              Campaign Intelligence
            </h2>

            <div className="mt-4 space-y-0">
              {insights.map((item, i) => (
                <article
                  key={i}
                  className="mb-3 border-b border-modern-card-border pb-3 last:mb-0 last:border-0 last:pb-0"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wider text-editorial-red">
                    {item.category}
                  </span>
                  <h4 className="mt-1 text-sm font-bold leading-snug text-ink">
                    {item.headline}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* ════ CENTER COLUMN ════ */}
        <div className="flex flex-col gap-4">
          {/* Deal Pipeline */}
          {stageCounts.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                  Deal Pipeline
                </h3>
                <Link
                  href="/brand/deals"
                  className="flex items-center gap-1 text-[11px] font-semibold text-[rgba(75,156,211,0.7)] no-underline hover:text-[rgba(75,156,211,1)]"
                >
                  View All <ArrowRight size={11} />
                </Link>
              </div>

              {/* Pipeline bar */}
              <div className="mb-3 flex h-7 overflow-hidden rounded-md">
                {stageCounts.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-center transition-all duration-300"
                    style={{
                      flex: s.count / totalStageDeals,
                      backgroundColor: s.color,
                      minWidth: s.count > 0 ? 30 : 0,
                    }}
                    title={`${s.label}: ${s.count} deals ($${s.value.toLocaleString()})`}
                  >
                    <span className="text-[10px] font-extrabold text-white">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3">
                {stageCounts.map((s) => (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[10px] font-semibold text-ink-secondary">
                      {s.label} ({s.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Deal Value Trend */}
          {hasChartData && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                Monthly Deal Value
              </h3>
              <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-muted">
                Last 6 Months
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="brandDealGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-editorial-blue)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-editorial-blue)"
                        stopOpacity={0.03}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-rule)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 9,
                      fill: "var(--color-ink-muted)",
                    }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-rule)" }}
                  />
                  <YAxis
                    tick={{
                      fontSize: 9,
                      fill: "var(--color-ink-muted)",
                    }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    tickFormatter={(v) => formatCurrency(v)}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--color-surface-card)",
                      border: "1px solid var(--color-rule)",
                      borderRadius: "10px",
                      fontSize: "11px",
                      color: "var(--color-ink)",
                    }}
                    formatter={(value) => [
                      `$${Number(value).toLocaleString()}`,
                      "Deal Value",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-editorial-blue)"
                    strokeWidth={2}
                    fill="url(#brandDealGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Charts Grid: Proposal Breakdown + Pipeline Value */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Proposal Status Breakdown */}
            {proposals.length > 0 && (
              <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                  Proposal Breakdown
                </h3>
                <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-muted">
                  Status Distribution
                </p>
                <div className="space-y-3">
                  {Object.entries(
                    proposals.reduce<Record<string, number>>((acc, p) => {
                      acc[p.status] = (acc[p.status] ?? 0) + 1;
                      return acc;
                    }, {}),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .map(([status, count]) => {
                      const conf =
                        PROPOSAL_STATUS_CONFIG[status] ??
                        PROPOSAL_STATUS_CONFIG.draft;
                      const pct = Math.round((count / proposals.length) * 100);
                      return (
                        <div key={status}>
                          <div className="mb-1 flex items-baseline justify-between">
                            <span className="text-xs font-medium capitalize text-ink">
                              {conf.label}
                            </span>
                            <span className="text-sm font-bold text-ink">
                              {count}
                            </span>
                          </div>
                          <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: conf.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Pipeline Value by Stage */}
            {stageCounts.length > 0 && (
              <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                  Pipeline Value
                </h3>
                <p className="mb-3 text-[10px] uppercase tracking-wider text-ink-muted">
                  By Stage
                </p>
                <div className="space-y-3">
                  {[...stageCounts]
                    .sort((a, b) => b.value - a.value)
                    .map((s) => {
                      const maxVal = Math.max(
                        ...stageCounts.map((sc) => sc.value),
                      );
                      const pct =
                        maxVal > 0 ? (s.value / maxVal) * 100 : 0;
                      return (
                        <div key={s.key}>
                          <div className="mb-1 flex items-baseline justify-between">
                            <span className="text-xs font-medium text-ink">
                              {s.label}
                            </span>
                            <span className="text-sm font-bold text-ink">
                              {formatCurrency(s.value)}
                            </span>
                          </div>
                          <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: s.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Recent Proposals Table */}
          {proposals.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                  Recent Proposals
                </h3>
                <Link
                  href="/brand/proposals"
                  className="flex items-center gap-1 text-[11px] font-semibold text-[rgba(75,156,211,0.7)] no-underline hover:text-[rgba(75,156,211,1)]"
                >
                  View All <ArrowRight size={11} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-modern-card-border">
                      <th className="pb-2.5 pr-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Proposal
                      </th>
                      <th className="pb-2.5 pr-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Type
                      </th>
                      <th className="pb-2.5 pr-3 text-right text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Amount
                      </th>
                      <th className="pb-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.slice(0, 6).map((prop) => {
                      const st =
                        PROPOSAL_STATUS_CONFIG[prop.status] ??
                        PROPOSAL_STATUS_CONFIG.draft;
                      return (
                        <tr
                          key={prop.id}
                          className="border-b border-modern-card-border/50 last:border-0"
                        >
                          <td className="max-w-[200px] truncate py-3 pr-3 text-[13px] font-semibold text-ink">
                            {prop.title}
                          </td>
                          <td className="py-3 pr-3 text-[12px] text-ink-secondary">
                            {humanizeType(prop.proposal_type)}
                          </td>
                          <td className="py-3 pr-3 text-right text-[13px] font-bold text-ink">
                            {prop.total_amount != null
                              ? `$${prop.total_amount.toLocaleString()}`
                              : "—"}
                          </td>
                          <td className="py-3 text-right">
                            <span
                              className="text-[10px] font-bold uppercase tracking-[0.5px]"
                              style={{ color: st.color }}
                            >
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Active Campaigns */}
          {campaigns.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                  Campaigns
                </h3>
                <Link
                  href="/brand/campaigns"
                  className="flex items-center gap-1 text-[11px] font-semibold text-[rgba(75,156,211,0.7)] no-underline hover:text-[rgba(75,156,211,1)]"
                >
                  View All <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((camp) => {
                  const statusColors: Record<string, string> = {
                    draft: "#94A3B8",
                    active: "#10B981",
                    paused: "#F59E0B",
                    completed: "#4B9CD3",
                  };
                  const c = statusColors[camp.status] ?? "#94A3B8";
                  return (
                    <div
                      key={camp.id}
                      className="flex items-center gap-3 rounded-[10px] bg-surface-raised px-3 py-2.5"
                    >
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-ink">
                          {camp.name}
                        </div>
                        {camp.start_date && (
                          <div className="mt-0.5 text-[10px] text-ink-muted">
                            {new Date(camp.start_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                            {camp.end_date &&
                              ` — ${new Date(camp.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                          </div>
                        )}
                      </div>
                      {camp.budget != null && (
                        <span className="whitespace-nowrap text-[11px] font-bold text-ink-secondary">
                          {formatCurrency(camp.budget)}
                        </span>
                      )}
                      <span
                        className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.5px]"
                        style={{ color: c }}
                      >
                        {camp.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="flex flex-col gap-4">
          {/* Brand Health (Trust Score) */}
          {trustScore && trustScore.overall_score > 0 && (() => {
            const factors = [
              { name: "Completion Rate", score: trustScore.completion_rate },
              { name: "Response Time", score: trustScore.response_time_score },
              { name: "Consistency", score: trustScore.consistency_score },
              { name: "Deal Volume", score: trustScore.deal_volume_score },
              { name: "Dispute Rate", score: Math.max(0, 100 - trustScore.dispute_rate) },
            ];
            return (
              <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
                <h3 className="text-sm font-extrabold text-ink">Brand Health</h3>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-editorial-red">
                  Trust Assessment
                </p>
                <div className="my-2 flex flex-col items-center">
                  <span className="text-[56px] font-black leading-none text-ink">
                    {trustScore.overall_score}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-ink-muted">
                    out of 100
                  </span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {factors.map((f, i) => (
                    <div key={i}>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-ink-secondary">{f.name}</span>
                        <span
                          className={cn(
                            "font-bold",
                            f.score >= 80
                              ? "text-editorial-green"
                              : f.score >= 60
                                ? "text-editorial-gold"
                                : "text-editorial-red",
                          )}
                        >
                          {f.score}%
                        </span>
                      </div>
                      <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            f.score >= 80
                              ? "bg-editorial-green"
                              : f.score >= 60
                                ? "bg-editorial-gold"
                                : "bg-editorial-red",
                          )}
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Spending Summary */}
          <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
            <h3 className="text-sm font-extrabold text-ink">
              Spending Summary
            </h3>
            <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-editorial-red">
              Financial Overview
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Total Spent",
                  value: formatCurrency(stats.totalSpent),
                  color: "text-editorial-accent",
                },
                {
                  label: "Paid Out",
                  value: formatCurrency(totalPaid),
                  color: "text-editorial-green",
                },
                {
                  label: "Pipeline",
                  value: formatCurrency(pipelineValue),
                  color: "text-editorial-blue",
                },
                {
                  label: "Avg Deal",
                  value:
                    deals.length > 0
                      ? formatCurrency(
                          Math.round(pipelineValue / deals.length),
                        )
                      : "$0",
                  color: "text-ink",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-[10px] bg-surface-raised p-3"
                >
                  <p className="text-[10px] font-semibold uppercase text-ink-muted">
                    {s.label}
                  </p>
                  <p className={cn("text-lg font-extrabold", s.color)}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Deal Velocity */}
          {deals.length >= 2 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Deal Velocity
              </h3>
              <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-editorial-red">
                Pipeline Metrics
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    metric: "Conversion Rate",
                    value: `${proposals.length > 0 ? Math.round((proposalAccepted / proposals.length) * 100) : 0}%`,
                    positive: proposalAccepted > proposalDeclined,
                  },
                  {
                    metric: "Avg Deal Size",
                    value: formatCurrency(
                      deals.length > 0
                        ? Math.round(pipelineValue / deals.length)
                        : 0,
                    ),
                    positive: true,
                  },
                  {
                    metric: "Active Pipeline",
                    value: `${stats.activeDeals} deals`,
                    positive: stats.activeDeals > 0,
                  },
                  {
                    metric: "Response Rate",
                    value: `${proposals.length > 0 ? Math.round(((proposals.length - proposalPending) / proposals.length) * 100) : 0}%`,
                    positive: proposalPending < proposals.length / 2,
                  },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-modern-card-border/50 pb-2 last:border-0"
                  >
                    <span className="text-[10px] text-ink-secondary">
                      {b.metric}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        b.positive ? "text-editorial-green" : "text-ink",
                      )}
                    >
                      {b.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brand Hub */}
          <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
            <h3 className="text-sm font-extrabold text-ink">Brand Hub</h3>
            <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-editorial-red">
              Quick Access
            </p>
            <div className="space-y-1">
              {[
                {
                  label: "Discover",
                  count: 0,
                  code: "DC",
                  bg: "bg-editorial-blue/10",
                  fg: "text-editorial-blue",
                  href: "/brand/discover",
                },
                {
                  label: "Proposals",
                  count: proposals.length,
                  code: "PR",
                  bg: "bg-editorial-red/10",
                  fg: "text-editorial-red",
                  href: "/brand/proposals",
                },
                {
                  label: "Deals",
                  count: deals.length,
                  code: "DL",
                  bg: "bg-editorial-green/10",
                  fg: "text-editorial-green",
                  href: "/brand/deals",
                },
                {
                  label: "Messages",
                  count: 0,
                  code: "MS",
                  bg: "bg-editorial-gold/10",
                  fg: "text-editorial-gold",
                  href: "/brand/messages",
                },
                {
                  label: "Campaigns",
                  count: campaigns.length,
                  code: "CP",
                  bg: "bg-editorial-blue/10",
                  fg: "text-editorial-blue",
                  href: "/brand/campaigns",
                },
                {
                  label: "Matches",
                  count: 0,
                  code: "MT",
                  bg: "bg-editorial-red/10",
                  fg: "text-editorial-red",
                  href: "/brand/matches",
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-modern-card-border bg-surface-raised px-3 py-2 no-underline transition-all hover:border-editorial-red/20 hover:bg-editorial-red/5"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold",
                        item.bg,
                        item.fg,
                      )}
                    >
                      {item.code}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink">
                        {item.label}
                      </p>
                      {item.count > 0 && (
                        <p className="text-[9px] text-ink-muted">
                          {item.count} item{item.count !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-ink-muted">
                    View &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Deals */}
          {deals.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">Recent Deals</h3>
              <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-editorial-red">
                Latest Activity
              </p>
              <div className="space-y-2.5">
                {deals.slice(0, 5).map((deal) => {
                  const stageConf = PIPELINE_STAGES.find(
                    (s) => s.key === deal.pipeline_stage,
                  );
                  return (
                    <div
                      key={deal.id}
                      className="border-b border-modern-card-border/50 pb-2 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <p className="max-w-[140px] truncate text-xs font-bold text-ink">
                          {deal.brand_name}
                        </p>
                        <span
                          className="text-[9px] font-bold uppercase tracking-[0.5px]"
                          style={{
                            color: stageConf?.color ?? "#4B9CD3",
                          }}
                        >
                          {stageConf?.label ?? deal.pipeline_stage}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between">
                        {deal.total_value != null && (
                          <span className="text-[10px] font-bold text-editorial-green">
                            ${deal.total_value.toLocaleString()}
                          </span>
                        )}
                        <span className="text-[10px] text-ink-muted">
                          {timeAgo(deal.updated_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {notifications.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Recent Activity
              </h3>
              <p className="mb-3 text-[9px] font-bold uppercase tracking-wider text-editorial-red">
                Last 7 Days
              </p>
              <div className="space-y-2">
                {notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className="border-b border-modern-card-border/50 pb-2 last:border-0"
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-editorial-red" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-xs text-ink",
                            !n.is_read && "font-semibold",
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-muted">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──── Spending Forecast Hub ──── */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-ink">
          Spending Forecast Hub
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Monthly Avg",
              value: formatCurrency(
                monthlyData.length > 0
                  ? Math.round(
                      monthlyData.reduce((s, m) => s + m.value, 0) /
                        Math.max(
                          monthlyData.filter((m) => m.value > 0).length,
                          1,
                        ),
                    )
                  : 0,
              ),
              color: "text-editorial-green",
              sub: "Based on last 6 months",
            },
            {
              label: "Active Pipeline",
              value: formatCurrency(pipelineValue),
              color: "text-editorial-blue",
              sub: `${stats.activeDeals} active deal${stats.activeDeals !== 1 ? "s" : ""}`,
            },
            {
              label: "YTD Spending",
              value: formatCurrency(stats.totalSpent),
              color: "text-editorial-green",
              sub: `${deals.filter((d) => d.pipeline_stage === "completed" || d.pipeline_stage === "paid").length} deals completed`,
            },
            {
              label: "Campaigns",
              value: String(campaigns.length),
              color: "text-ink",
              sub: `${stats.activeCampaigns} active`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[14px] border border-modern-card-border bg-surface-card p-4"
            >
              <p className="text-[10px] font-semibold uppercase text-ink-muted">
                {stat.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-extrabold",
                  stat.color,
                )}
              >
                {stat.value}
              </p>
              {stat.sub && (
                <p className="text-[10px] text-ink-muted">{stat.sub}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ──── Disclaimer ──── */}
      <div className="mt-6 flex items-start gap-2 rounded-[10px] border border-editorial-gold/15 bg-editorial-gold/6 p-3 text-xs text-ink-secondary">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-editorial-gold)"
          strokeWidth="2"
          className="mt-0.5 shrink-0"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>
          <strong>Disclaimer:</strong> All metrics, spending projections, and
          conversion estimates are calculated from your platform data. They
          should be used for strategic planning purposes only.
        </span>
      </div>
    </div>
  );
}
