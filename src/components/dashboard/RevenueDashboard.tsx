"use client";

import { useMemo, useCallback } from "react";
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
import {
  DollarSign,
  TrendingUp,
  Clock,
  PiggyBank,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import type {
  RevenueStats,
  RevenueBySource,
  MonthlyRevenue,
  DealRevenueRow,
  PaymentHistoryRow,
  RevenueForecast,
} from "@/lib/dal/revenue";

// ── Style constants ──

const CARD_STYLE: React.CSSProperties = {
  background: "var(--color-surface-card)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 12,
  padding: 20,
};

const ACCENT_COLORS = {
  red: "var(--color-editorial-red)",
  blue: "var(--color-editorial-blue)",
  green: "var(--color-editorial-green)",
  gold: "var(--color-editorial-gold)",
};

// ── Helpers ──

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(
  status: string
): { bg: string; text: string; label: string } {
  switch (status) {
    case "completed":
    case "paid":
      return {
        bg: "rgba(46,204,113,0.15)",
        text: "var(--color-editorial-green)",
        label: status.charAt(0).toUpperCase() + status.slice(1),
      };
    case "active":
    case "processing":
    case "in_progress":
      return {
        bg: "rgba(91,156,245,0.15)",
        text: "var(--color-editorial-blue)",
        label: status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1),
      };
    case "pending":
    case "inquiry":
    case "negotiation":
      return {
        bg: "rgba(245,158,11,0.15)",
        text: "var(--color-editorial-gold)",
        label: status.charAt(0).toUpperCase() + status.slice(1),
      };
    case "failed":
    case "cancelled":
      return {
        bg: "rgba(239,68,68,0.15)",
        text: "var(--color-modern-error, #EF4444)",
        label: status.charAt(0).toUpperCase() + status.slice(1),
      };
    case "refunded":
      return {
        bg: "rgba(var(--accent-rgb),0.15)",
        text: "var(--color-editorial-blue)",
        label: "Refunded",
      };
    default:
      return {
        bg: "rgba(var(--accent-rgb),0.1)",
        text: "var(--color-ink-muted)",
        label: status,
      };
  }
}

function pipelineStageName(stage: string): string {
  const map: Record<string, string> = {
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
  return map[stage] ?? stage;
}

// ── Custom tooltip for chart ──

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid rgba(var(--accent-rgb),0.2)",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--color-ink)",
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      {payload.map((entry, i) => (
        <p
          key={i}
          style={{
            fontSize: 12,
            color: entry.color,
            margin: "2px 0",
          }}
        >
          {entry.name}: {fmtCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ── Stats Card ──

function StatCard({
  label,
  value,
  icon: Icon,
  accentColor,
  change,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accentColor: string;
  change?: number;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        ...CARD_STYLE,
        borderLeft: `3px solid ${accentColor}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-ink-muted)",
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${accentColor}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} style={{ color: accentColor }} />
        </div>
      </div>
      <span
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: "var(--color-ink)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {change !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {change > 0 ? (
            <ArrowUpRight size={14} style={{ color: "var(--color-editorial-green)" }} />
          ) : change < 0 ? (
            <ArrowDownRight size={14} style={{ color: "var(--color-editorial-red)" }} />
          ) : (
            <Minus size={14} style={{ color: "var(--color-ink-muted)" }} />
          )}
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color:
                change > 0
                  ? "var(--color-editorial-green)"
                  : change < 0
                    ? "var(--color-editorial-red)"
                    : "var(--color-ink-muted)",
            }}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>vs last month</span>
        </div>
      )}
      {subtitle && (
        <span style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

// ── Main Component ──

interface RevenueDashboardProps {
  stats: RevenueStats;
  sources: RevenueBySource[];
  monthly: MonthlyRevenue[];
  deals: DealRevenueRow[];
  payments: PaymentHistoryRow[];
  forecast: RevenueForecast;
}

export function RevenueDashboard({
  stats,
  sources,
  monthly,
  deals,
  payments,
  forecast,
}: RevenueDashboardProps) {
  // ── CSV Export ──
  const handleExportCSV = useCallback(() => {
    const headers = [
      "Date",
      "Amount",
      "Currency",
      "Platform Fee",
      "Net Amount",
      "Status",
      "Brand",
      "Description",
    ];
    const rows = payments.map((p) => [
      p.paidAt ? fmtDate(p.paidAt) : fmtDate(p.createdAt),
      p.amount.toFixed(2),
      p.currency,
      p.platformFee.toFixed(2),
      p.netAmount.toFixed(2),
      p.status,
      p.brandName ?? "",
      p.description ?? "",
    ]);
    const csv =
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join(
        "\n"
      );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [payments]);

  // ── Pie chart data ──
  const pieData = useMemo(
    () =>
      sources.map((s) => ({
        name: s.source,
        value: s.amount,
        color: s.color,
      })),
    [sources]
  );

  const totalSourceAmount = useMemo(
    () => sources.reduce((sum, s) => sum + s.amount, 0),
    [sources]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Stats Row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Total Earnings"
          value={fmtCurrency(stats.totalEarnings)}
          icon={DollarSign}
          accentColor={ACCENT_COLORS.green}
        />
        <StatCard
          label="This Month"
          value={fmtCurrency(stats.thisMonth)}
          icon={TrendingUp}
          accentColor={ACCENT_COLORS.blue}
          change={stats.thisMonthChange}
        />
        <StatCard
          label="Pending Payments"
          value={fmtCurrency(stats.pendingPayments)}
          icon={Clock}
          accentColor={ACCENT_COLORS.gold}
          subtitle={`${payments.filter((p) => p.status === "pending" || p.status === "processing").length} payments awaiting`}
        />
        <StatCard
          label="Pipeline Value"
          value={fmtCurrency(stats.pipelineValue)}
          icon={PiggyBank}
          accentColor={ACCENT_COLORS.red}
          subtitle={`${forecast.dealCount} active deals`}
        />
      </div>

      {/* ── Charts Row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
        }}
      >
        {/* Revenue Over Time */}
        <div style={CARD_STYLE}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  margin: 0,
                }}
              >
                Revenue Over Time
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-ink-muted)",
                  margin: "4px 0 0 0",
                }}
              >
                Monthly earnings breakdown
              </p>
            </div>
          </div>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthly}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-editorial-blue)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-editorial-blue)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDeals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-editorial-red)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-editorial-red)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(var(--accent-rgb),0.08)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(var(--accent-rgb),0.12)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}K` : `$${v}`)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  name="Total Earnings"
                  stroke="var(--color-editorial-blue)"
                  strokeWidth={2}
                  fill="url(#gradEarnings)"
                />
                <Area
                  type="monotone"
                  dataKey="deals"
                  name="Deal Revenue"
                  stroke="var(--color-editorial-red)"
                  strokeWidth={2}
                  fill="url(#gradDeals)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Source Pie Chart */}
        <div style={CARD_STYLE}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 16px 0",
            }}
          >
            Revenue by Source
          </h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  formatter={(value: string) => (
                    <span style={{ fontSize: 11, color: "var(--color-ink-secondary)" }}>
                      {value}
                    </span>
                  )}
                />
                <Tooltip
                  formatter={(value) => [fmtCurrency(Number(value)), ""]}
                  contentStyle={{
                    background: "var(--color-surface-card)",
                    border: "1px solid rgba(var(--accent-rgb),0.2)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Source breakdown */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {sources.map((s) => (
              <div
                key={s.source}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: s.color,
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                    {s.source}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--color-ink)",
                    }}
                  >
                    {fmtCurrency(s.amount)}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-ink-muted)" }}>
                    {totalSourceAmount > 0
                      ? ((s.amount / totalSourceAmount) * 100).toFixed(0) + "%"
                      : "0%"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pipeline Forecast ── */}
      <div style={CARD_STYLE}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: "0 0 16px 0",
          }}
        >
          Revenue Forecast
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "var(--color-surface-inset)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-ink-muted)",
                margin: "0 0 6px 0",
              }}
            >
              Contracted
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-editorial-green)",
                margin: 0,
              }}
            >
              {fmtCurrency(forecast.contractedRevenue)}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--color-ink-muted)",
                margin: "4px 0 0 0",
              }}
            >
              Confirmed, awaiting payment
            </p>
          </div>
          <div
            style={{
              background: "var(--color-surface-inset)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-ink-muted)",
                margin: "0 0 6px 0",
              }}
            >
              Pipeline (weighted 40%)
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-editorial-blue)",
                margin: 0,
              }}
            >
              {fmtCurrency(forecast.inProgressRevenue)}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--color-ink-muted)",
                margin: "4px 0 0 0",
              }}
            >
              In negotiation, weighted estimate
            </p>
          </div>
          <div
            style={{
              background: "var(--color-surface-inset)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-ink-muted)",
                margin: "0 0 6px 0",
              }}
            >
              Projected Total
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-editorial-red)",
                margin: 0,
              }}
            >
              {fmtCurrency(forecast.projectedTotal)}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--color-ink-muted)",
                margin: "4px 0 0 0",
              }}
            >
              Combined forecast
            </p>
          </div>
          <div
            style={{
              background: "var(--color-surface-inset)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-ink-muted)",
                margin: "0 0 6px 0",
              }}
            >
              Avg Deal Value
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              {fmtCurrency(forecast.avgDealValue)}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--color-ink-muted)",
                margin: "4px 0 0 0",
              }}
            >
              Across {forecast.dealCount} deal{forecast.dealCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* ── Deals Table ── */}
      <div style={CARD_STYLE}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-ink)",
            margin: "0 0 16px 0",
          }}
        >
          Deal Revenue
        </h3>
        {deals.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--color-ink-muted)",
              fontSize: 13,
            }}
          >
            No deals yet. Revenue from brand collaborations will appear here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Brand", "Deal Value", "Paid", "Remaining", "Stage", "Status", "Date"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "var(--color-ink-muted)",
                          padding: "8px 12px",
                          textAlign: "left",
                          borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const badge = statusBadge(deal.status);
                  return (
                    <tr
                      key={deal.id}
                      style={{
                        borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-ink)",
                        }}
                      >
                        {deal.brandName}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          color: "var(--color-ink-secondary)",
                        }}
                      >
                        {fmtCurrency(deal.totalValue)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-editorial-green)",
                        }}
                      >
                        {fmtCurrency(deal.paidAmount)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        {fmtCurrency(deal.totalValue - deal.paidAmount)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--color-ink-secondary)",
                            background: "var(--color-surface-inset)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pipelineStageName(deal.pipelineStage)}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: badge.text,
                            background: badge.bg,
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 12,
                          color: "var(--color-ink-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(deal.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Payments Table ── */}
      <div style={CARD_STYLE}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Payment History
          </h3>
          <button
            onClick={handleExportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--color-ink-secondary)",
              background: "var(--color-surface-inset)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
        {payments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--color-ink-muted)",
              fontSize: 13,
            }}
          >
            No payments recorded yet. Payments from platform deals will appear here.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Date", "Brand", "Amount", "Fee", "Net", "Status", "Description"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: "var(--color-ink-muted)",
                          padding: "8px 12px",
                          textAlign: "left",
                          borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const badge = statusBadge(p.status);
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 12,
                          color: "var(--color-ink-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.paidAt ? fmtDate(p.paidAt) : fmtDate(p.createdAt)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-ink)",
                        }}
                      >
                        {p.brandName ?? "Direct Payment"}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          color: "var(--color-ink-secondary)",
                        }}
                      >
                        {fmtCurrency(p.amount)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 12,
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        -{fmtCurrency(p.platformFee)}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-editorial-green)",
                        }}
                      >
                        {fmtCurrency(p.netAmount)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: badge.text,
                            background: badge.bg,
                            padding: "3px 8px",
                            borderRadius: 6,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontSize: 12,
                          color: "var(--color-ink-muted)",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.description ?? "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
