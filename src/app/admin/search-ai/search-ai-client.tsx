"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ---------------------------------------------------------- */
/* Helpers                                                     */
/* ---------------------------------------------------------- */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatCostUsd(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

/* ---------------------------------------------------------- */
/* Chart styling constants                                     */
/* ---------------------------------------------------------- */

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

/* ---------------------------------------------------------- */
/* Component                                                   */
/* ---------------------------------------------------------- */

export function SearchAIClient({
  overview,
  aiUsage,
}: {
  overview: {
    totalAnalyses: number;
    byType: Record<string, number>;
    recentAnalyses: Array<{
      id: string;
      analysis_type: string;
      ai_provider: string | null;
      tokens_used: number;
      cost_cents: number;
      created_at: string;
    }>;
  };
  aiUsage: Record<
    string,
    {
      calls: number;
      tokens: number;
      cost: number;
      avg_response_ms: number;
      success_rate: number;
    }
  >;
}) {
  /* ---- Derived KPIs ---- */
  const totalAnalyses = overview.totalAnalyses;
  const analysisTypes = Object.keys(overview.byType).length;
  const totalAICalls = Object.values(aiUsage).reduce(
    (s, d) => s + d.calls,
    0
  );
  const totalAITokens = Object.values(aiUsage).reduce(
    (s, d) => s + d.tokens,
    0
  );
  const totalAICost = Object.values(aiUsage).reduce(
    (s, d) => s + d.cost,
    0
  );

  /* ---- Chart data: Analysis by type (bar chart) ---- */
  const typeBreakdown = useMemo(
    () =>
      Object.entries(overview.byType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    [overview.byType]
  );

  /* ---- Chart data: AI usage by feature (pie + table) ---- */
  const aiUsageSorted = useMemo(
    () =>
      Object.entries(aiUsage)
        .map(([feature, data]) => ({ feature, ...data }))
        .sort((a, b) => b.calls - a.calls),
    [aiUsage]
  );

  /* ---- Pie chart data: cost distribution by feature ---- */
  const costPieData = useMemo(
    () =>
      Object.entries(aiUsage)
        .map(([feature, data]) => ({ feature, cost: data.cost }))
        .filter((d) => d.cost > 0)
        .sort((a, b) => b.cost - a.cost),
    [aiUsage]
  );

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-4">
        Search &amp; AI
      </h1>

      {/* KPI Strip - 5 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {totalAnalyses.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total Analyses
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {analysisTypes}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Analysis Types
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {totalAICalls.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total AI Calls
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {totalAITokens.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            AI Tokens Used
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            ${totalAICost.toFixed(2)}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total AI Cost
          </div>
        </div>
      </div>

      {/* Analysis by Type - Bar chart */}
      <div className="border border-rule mb-6">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Analysis by Type
          </span>
        </div>
        <div className="p-4">
          {typeBreakdown.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">
              No analyses recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={typeBreakdown}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-rule, #ddd)"
                />
                <XAxis
                  dataKey="type"
                  tick={axisTick}
                  stroke="var(--color-rule, #ddd)"
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={axisTick}
                  stroke="var(--color-rule, #ddd)"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [
                    Number(value ?? 0).toLocaleString(),
                    "Count",
                  ]}
                />
                <Bar dataKey="count" maxBarSize={48}>
                  {typeBreakdown.map((_, idx) => (
                    <Cell
                      key={`type-bar-${idx}`}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Usage by Feature - Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        {/* Left: Pie chart of cost distribution */}
        <div className="border border-rule">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              AI Cost Distribution by Feature
            </span>
          </div>
          <div className="p-4">
            {costPieData.length === 0 ? (
              <div className="p-6 text-center text-sm text-ink-muted">
                No AI cost data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="cost"
                    nameKey="feature"
                    label={false}
                    labelLine={true}
                    style={{ fontSize: 10, fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
                  >
                    {costPieData.map((_, idx) => (
                      <Cell
                        key={`pie-cell-${idx}`}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      formatCostUsd(Number(value ?? 0)),
                      "Cost",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Feature breakdown table */}
        <div className="border border-rule">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              AI Usage by Feature (Last 30 Days)
            </span>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 border-b border-rule bg-surface-card text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            <span>Feature</span>
            <span className="text-right">Calls</span>
            <span className="text-right">Tokens</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Avg ms</span>
            <span className="text-right">Success</span>
          </div>

          {aiUsageSorted.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">
              No AI usage data available
            </div>
          ) : (
            aiUsageSorted.map((row) => (
              <div
                key={row.feature}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 border-b border-rule last:border-b-0 items-center"
              >
                <span className="text-sm font-medium text-ink">
                  {row.feature}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {row.calls.toLocaleString()}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {row.tokens.toLocaleString()}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {formatCostUsd(row.cost)}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {row.avg_response_ms}ms
                </span>
                <span
                  className={`font-mono text-xs text-right ${
                    row.success_rate >= 0.95
                      ? "text-editorial-green"
                      : row.success_rate >= 0.8
                        ? "text-editorial-gold"
                        : "text-editorial-red"
                  }`}
                >
                  {(row.success_rate * 100).toFixed(1)}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Analyses Table */}
      <div className="border border-rule">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Recent Analyses
          </span>
        </div>

        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-2 px-4 py-2 border-b border-rule bg-surface-card text-[11px] font-bold uppercase tracking-widest text-ink-muted">
          <span>Type</span>
          <span>Provider</span>
          <span className="text-right">Tokens</span>
          <span className="text-right">Cost</span>
          <span className="text-right">Date</span>
        </div>

        {overview.recentAnalyses.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-muted">
            No recent analyses
          </div>
        ) : (
          overview.recentAnalyses.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-2 px-4 py-2.5 border-b border-rule last:border-b-0 items-center"
            >
              <span className="text-sm font-medium text-ink">
                {row.analysis_type}
              </span>
              <span className="font-mono text-sm text-ink-secondary">
                {row.ai_provider ?? "--"}
              </span>
              <span className="font-mono text-sm text-ink-secondary text-right">
                {row.tokens_used.toLocaleString()}
              </span>
              <span className="font-mono text-sm text-ink-secondary text-right">
                {formatCost(row.cost_cents)}
              </span>
              <span className="font-mono text-xs text-ink-muted text-right">
                {formatDate(row.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
