"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Eye,
  Heart,
  TrendingUp,
  Target,
  Handshake,
  Megaphone,
  DollarSign,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";

interface Deal {
  id: string;
  brand_name: string;
  total_value: number | null;
  paid_amount: number | null;
  status: string;
  pipeline_stage: string;
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  total_amount: number | null;
  proposal_type: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  deals: Deal[];
  campaigns: Campaign[];
  proposals: Proposal[];
}

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  outreach: "Outreach",
  negotiating: "Negotiating",
  contracted: "Contracted",
  in_progress: "In Progress",
  delivered: "Delivered",
  invoiced: "Invoiced",
  paid: "Paid",
  completed: "Completed",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "#6B7280",
  outreach: "#3B82F6",
  negotiating: "#F59E0B",
  contracted: "#4B9CD3",
  in_progress: "#F59E0B",
  delivered: "#10B981",
  invoiced: "#3B82F6",
  paid: "#10B981",
  completed: "#4B9CD3",
};

const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  accepted: "#10B981",
  declined: "#EF4444",
  countered: "#3B82F6",
  expired: "#6B7280",
  withdrawn: "#6B7280",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function BrandAnalyticsClient({ deals, campaigns, proposals }: Props) {
  // ─── Computed metrics ─────────────────────────────────────
  const totalPipelineValue = useMemo(
    () => deals.reduce((sum, d) => sum + (d.total_value ?? 0), 0),
    [deals],
  );
  const totalPaid = useMemo(
    () => deals.reduce((sum, d) => sum + (d.paid_amount ?? 0), 0),
    [deals],
  );
  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === "active").length,
    [campaigns],
  );
  const totalBudget = useMemo(
    () => campaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0),
    [campaigns],
  );
  const activeDeals = useMemo(
    () => deals.filter((d) => d.status === "active").length,
    [deals],
  );
  const uniqueCreators = useMemo(
    () => new Set(deals.map((d) => d.brand_name)).size,
    [deals],
  );
  const conversionRate = useMemo(() => {
    if (proposals.length === 0) return 0;
    const accepted = proposals.filter((p) => p.status === "accepted").length;
    return Math.round((accepted / proposals.length) * 100);
  }, [proposals]);

  // ─── Deal pipeline chart data ─────────────────────────────
  const pipelineData = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    for (const d of deals) {
      const stage = d.pipeline_stage;
      if (!counts[stage]) counts[stage] = { count: 0, value: 0 };
      counts[stage].count++;
      counts[stage].value += d.total_value ?? 0;
    }
    return Object.entries(STAGE_LABELS)
      .filter(([key]) => counts[key])
      .map(([key, label]) => ({
        name: label,
        count: counts[key].count,
        value: counts[key].value,
        fill: STAGE_COLORS[key] ?? "#4B9CD3",
      }));
  }, [deals]);

  // ─── Proposal status breakdown ────────────────────────────
  const proposalPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of proposals) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      fill: PROPOSAL_STATUS_COLORS[status] ?? "#6B7280",
    }));
  }, [proposals]);

  // ─── Monthly spend timeline ───────────────────────────────
  const monthlySpend = useMemo(() => {
    const months: Record<string, { value: number; deals: number }> = {};
    for (const d of deals) {
      const date = new Date(d.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { value: 0, deals: 0 };
      months[key].value += d.total_value ?? 0;
      months[key].deals++;
    }

    // Ensure at least 3 months for a proper area chart
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { value: 0, deals: 0 };
    }

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => {
        const [y, m] = key.split("-");
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
        return { name: label, value: data.value, deals: data.deals };
      });
  }, [deals]);

  // ─── Campaign budget breakdown ────────────────────────────
  const campaignBudgetData = useMemo(() => {
    // Deduplicate by name, summing budgets
    const byName = new Map<string, { budget: number; status: string }>();
    for (const c of campaigns) {
      if ((c.budget ?? 0) <= 0) continue;
      const existing = byName.get(c.name);
      if (existing) {
        existing.budget += c.budget ?? 0;
      } else {
        byName.set(c.name, { budget: c.budget ?? 0, status: c.status });
      }
    }
    return [...byName.entries()]
      .slice(0, 8)
      .map(([name, data]) => ({
        name: name.length > 18 ? name.slice(0, 18) + "…" : name,
        budget: data.budget,
        fill: data.status === "active" ? "#10B981" : data.status === "completed" ? "#4B9CD3" : "#6B7280",
      }));
  }, [campaigns]);

  const hasData = deals.length > 0 || campaigns.length > 0 || proposals.length > 0;

  // ─── Overview metrics ─────────────────────────────────────
  const overviewMetrics = [
    {
      label: "Pipeline Value",
      value: fmt(totalPipelineValue),
      sub: `${activeDeals} active deals`,
      icon: DollarSign,
      color: "rgba(75,156,211,0.9)",
      gradient: "linear-gradient(135deg, rgba(75,156,211,0.15), rgba(75,156,211,0.05))",
    },
    {
      label: "Total Paid",
      value: fmt(totalPaid),
      sub: `${deals.filter((d) => d.pipeline_stage === "paid" || d.pipeline_stage === "completed").length} completed`,
      icon: Target,
      color: "#10B981",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))",
    },
    {
      label: "Active Campaigns",
      value: String(activeCampaigns),
      sub: `${fmt(totalBudget)} total budget`,
      icon: Megaphone,
      color: "var(--color-editorial-red)",
      gradient: "linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))",
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      sub: `${proposals.filter((p) => p.status === "accepted").length}/${proposals.length} proposals`,
      icon: TrendingUp,
      color: "#F59E0B",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))",
    },
  ];

  return (
    <div style={{ fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)", margin: 0, letterSpacing: -0.5 }}>
          Analytics
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", marginTop: 6, fontWeight: 500 }}>
          Measure campaign performance and creator ROI
        </p>
      </div>

      {/* Overview metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {overviewMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              style={{
                background: metric.gradient,
                border: "1px solid rgba(75,156,211,0.12)",
                borderRadius: 14,
                padding: "18px 20px",
                position: "relative",
              }}
            >
              <div style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: 8, background: "rgba(75,156,211,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} style={{ color: metric.color }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                {metric.label}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)", letterSpacing: -0.5 }}>
                {metric.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
                {metric.sub}
              </div>
            </div>
          );
        })}
      </div>

      {!hasData ? (
        <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.12)", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(75,156,211,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <BarChart3 size={28} style={{ color: "rgba(75,156,211,0.7)" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 8px" }}>
            No analytics data yet
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
            Analytics will populate as you send proposals, close deals, and run campaigns with creators.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {/* Deal Pipeline */}
          <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.12)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(75,156,211,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Handshake size={16} style={{ color: "rgba(75,156,211,0.7)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                  Deal Pipeline
                </h3>
                <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", margin: 0 }}>
                  {deals.length} total deals
                </p>
              </div>
            </div>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineData} barSize={24}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-ink-secondary)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.2)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--color-ink)", fontWeight: 700 }}
                    formatter={(value, name) => {
                      const v = Number(value) || 0;
                      if (name === "value") return [fmt(v), "Value"];
                      return [v, "Deals"];
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pipelineData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-ink-secondary)", fontSize: 12 }}>
                No deals yet
              </div>
            )}
          </div>

          {/* Proposal Conversion */}
          <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.12)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(75,156,211,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={16} style={{ color: "rgba(75,156,211,0.7)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                  Proposal Outcomes
                </h3>
                <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", margin: 0 }}>
                  {proposals.length} total proposals
                </p>
              </div>
            </div>
            {proposalPieData.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={proposalPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {proposalPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.2)", borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  {proposalPieData.map((entry) => (
                    <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: entry.fill, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "var(--color-ink-secondary)", flex: 1 }}>{entry.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-ink-secondary)", fontSize: 12 }}>
                No proposals yet
              </div>
            )}
          </div>

          {/* Monthly Deal Activity */}
          <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.12)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(75,156,211,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={16} style={{ color: "rgba(75,156,211,0.7)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                  Monthly Deal Value
                </h3>
                <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", margin: 0 }}>
                  Last 6 months
                </p>
              </div>
            </div>
            {monthlySpend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlySpend}>
                  <defs>
                    <linearGradient id="brandSpendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(75,156,211,0.9)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="rgba(75,156,211,0.9)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-ink-secondary)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.2)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--color-ink)", fontWeight: 700 }}
                    formatter={(value, name) => {
                      const v = Number(value) || 0;
                      if (name === "value") return [fmt(v), "Deal Value"];
                      return [v, "Deals"];
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="rgba(75,156,211,0.9)" strokeWidth={2} fill="url(#brandSpendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-ink-secondary)", fontSize: 12 }}>
                No deal history yet
              </div>
            )}
          </div>

          {/* Campaign Budget Allocation */}
          <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.12)", borderRadius: 14, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(75,156,211,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Megaphone size={16} style={{ color: "rgba(75,156,211,0.7)" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                  Campaign Budgets
                </h3>
                <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", margin: 0 }}>
                  {campaigns.length} campaigns
                </p>
              </div>
            </div>
            {campaignBudgetData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={campaignBudgetData} layout="vertical" barSize={16}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--color-ink-secondary)" }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.2)", borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => [fmt(Number(value) || 0), "Budget"]}
                  />
                  <Bar dataKey="budget" radius={[0, 4, 4, 0]}>
                    {campaignBudgetData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-ink-secondary)", fontSize: 12 }}>
                No campaign budgets set
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
