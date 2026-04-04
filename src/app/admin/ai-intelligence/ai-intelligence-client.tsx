"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  AreaChart,
  Area,
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
import type { AIInteraction } from "@/types";

/* ---------------------------------------------------------- */
/* Helpers                                                     */
/* ---------------------------------------------------------- */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
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
/* Tabs                                                        */
/* ---------------------------------------------------------- */

const TABS = [
  "Knowledge Base",
  "Usage Analytics",
  "Provider Performance",
  "Cost Optimization",
] as const;

type Tab = (typeof TABS)[number];

/* ---------------------------------------------------------- */
/* Component                                                   */
/* ---------------------------------------------------------- */

export function AIIntelligenceClient({
  interactions,
  byFeature,
  providerPerf,
  costTrend,
}: {
  interactions: { data: AIInteraction[]; count: number };
  byFeature: Record<
    string,
    {
      calls: number;
      tokens: number;
      cost: number;
      avg_response_ms: number;
      success_rate: number;
    }
  >;
  providerPerf: Record<
    string,
    {
      calls: number;
      cost: number;
      avg_response_ms: number;
      success_rate: number;
      errors: number;
    }
  >;
  costTrend: Array<{ date: string; cost: number; calls: number }>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Knowledge Base");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---- Derived data ---- */
  const totalInteractions = interactions.count;
  const totalCost30d = costTrend.reduce((s, d) => s + d.cost, 0);
  const totalTokens30d = Object.values(byFeature).reduce(
    (s, d) => s + d.tokens,
    0
  );
  const avgResponseTime = useMemo(() => {
    const vals = Object.values(byFeature);
    if (vals.length === 0) return 0;
    return Math.round(
      vals.reduce((s, d) => s + d.avg_response_ms, 0) / vals.length
    );
  }, [byFeature]);

  /* ---- Feature data for charts ---- */
  const featureData = useMemo(
    () =>
      Object.entries(byFeature)
        .map(([feature, d]) => ({
          feature,
          calls: d.calls,
          tokens: d.tokens,
          cost: d.cost,
          avg_response_ms: d.avg_response_ms,
          success_rate: d.success_rate,
        }))
        .sort((a, b) => b.calls - a.calls),
    [byFeature]
  );

  /* ---- Cost by feature for pie chart & horizontal bar ---- */
  const costByFeature = useMemo(
    () =>
      Object.entries(byFeature)
        .map(([feature, d]) => ({
          feature,
          cost: d.cost,
          calls: d.calls,
          tokens: d.tokens,
        }))
        .sort((a, b) => b.cost - a.cost),
    [byFeature]
  );

  /* ---- Filtered interactions for knowledge base ---- */
  const filteredInteractions = useMemo(() => {
    if (!searchQuery.trim()) return interactions.data;
    const q = searchQuery.toLowerCase();
    return interactions.data.filter(
      (row) =>
        row.feature.toLowerCase().includes(q) ||
        (row.sub_type && row.sub_type.toLowerCase().includes(q)) ||
        row.provider.toLowerCase().includes(q) ||
        row.prompt_text.toLowerCase().includes(q) ||
        (row.response_text && row.response_text.toLowerCase().includes(q))
    );
  }, [interactions.data, searchQuery]);

  /* ---- Cost trend chart data ---- */
  const costTrendChart = useMemo(
    () =>
      costTrend.map((d) => ({
        ...d,
        label: formatShortDate(d.date),
      })),
    [costTrend]
  );

  /* ---- Provider data for table ---- */
  const providerData = useMemo(
    () =>
      Object.entries(providerPerf)
        .map(([provider, d]) => ({ provider, ...d }))
        .sort((a, b) => b.calls - a.calls),
    [providerPerf]
  );

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-4">
        AI Intelligence
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {totalInteractions.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total Interactions
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            ${totalCost30d.toFixed(2)}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total Cost (30d)
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {totalTokens30d.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total Tokens (30d)
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {avgResponseTime}ms
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Avg Response Time
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-rule mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? "text-ink border-b-2 border-ink"
                : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* Tab 1: Knowledge Base                                         */}
      {/* ============================================================ */}
      {activeTab === "Knowledge Base" && (
        <div className="border border-rule">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              AI Interactions
            </span>
            <span className="font-mono text-sm text-ink-muted">
              {filteredInteractions.length} of {interactions.count} total
            </span>
          </div>

          {/* Search bar */}
          <div className="px-4 py-3 border-b border-rule bg-surface-card">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by feature, provider, prompt, or response..."
                className="w-full pl-9 pr-3 py-2 border border-rule bg-surface-cream text-sm font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
              />
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 px-4 py-2.5 border-b border-rule text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            <span>Feature</span>
            <span>Sub Type</span>
            <span>Provider</span>
            <span className="text-right">Tokens</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Response</span>
            <span className="text-center">Status</span>
            <span className="text-right">Date</span>
          </div>

          {filteredInteractions.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">
              {searchQuery
                ? "No matching interactions found"
                : "No AI interactions recorded"}
            </div>
          ) : (
            filteredInteractions.map((row) => {
              const isExpanded = expandedRows.has(row.id);
              return (
                <div key={row.id}>
                  <button
                    onClick={() => toggleRow(row.id)}
                    className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 px-4 py-3 border-b border-rule text-left hover:bg-surface-raised transition-colors items-center"
                  >
                    <span className="flex items-center gap-1.5 text-xs text-ink font-medium">
                      {isExpanded ? (
                        <ChevronDown
                          size={14}
                          className="text-ink-muted shrink-0"
                        />
                      ) : (
                        <ChevronRight
                          size={14}
                          className="text-ink-muted shrink-0"
                        />
                      )}
                      {row.feature}
                    </span>
                    <span className="font-mono text-sm text-ink-secondary truncate">
                      {row.sub_type ?? "--"}
                    </span>
                    <span className="font-mono text-sm text-ink-secondary">
                      {row.provider}
                    </span>
                    <span className="font-mono text-sm text-ink-secondary text-right">
                      {row.total_tokens.toLocaleString()}
                    </span>
                    <span className="font-mono text-sm text-ink-secondary text-right">
                      {formatCost(row.cost_usd)}
                    </span>
                    <span className="font-mono text-sm text-ink-secondary text-right">
                      {row.response_time_ms != null
                        ? `${row.response_time_ms}ms`
                        : "--"}
                    </span>
                    <span className="text-center">
                      {row.is_success ? (
                        <span className="text-[11px] font-bold uppercase tracking-widest text-editorial-green">
                          OK
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold uppercase tracking-widest text-editorial-red">
                          Fail
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-xs text-ink-muted text-right">
                      {formatDate(row.created_at)}
                    </span>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 py-3 border-b border-rule bg-surface-card">
                      <div className="mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                          Prompt
                        </p>
                        <pre className="font-mono text-sm text-ink-secondary whitespace-pre-wrap max-h-40 overflow-y-auto border border-rule p-2">
                          {row.prompt_text}
                        </pre>
                      </div>
                      {row.response_text && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                            Response
                          </p>
                          <pre className="font-mono text-sm text-ink-secondary whitespace-pre-wrap max-h-40 overflow-y-auto border border-rule p-2">
                            {row.response_text}
                          </pre>
                        </div>
                      )}
                      {row.error_message && (
                        <div className="mt-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-editorial-red mb-1">
                            Error
                          </p>
                          <p className="font-mono text-xs text-editorial-red">
                            {row.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab 2: Usage Analytics                                        */}
      {/* ============================================================ */}
      {activeTab === "Usage Analytics" && (
        <div className="space-y-6">
          {/* Bar chart: Calls by feature */}
          <div className="border border-rule">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Calls by Feature
              </span>
            </div>
            <div className="p-4 min-w-0">
              {featureData.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-muted">
                  No usage data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={featureData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-rule, #ddd)"
                    />
                    <XAxis
                      dataKey="feature"
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
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="calls" fill="#8B5CF6" maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Two-column: Pie chart + Feature table */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pie chart: Cost distribution */}
            <div className="border border-rule">
              <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Cost Distribution by Feature
                </span>
              </div>
              <div className="p-4 min-w-0">
                {costByFeature.length === 0 ? (
                  <div className="p-6 text-center text-sm text-ink-muted">
                    No cost data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={costByFeature}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="cost"
                        nameKey="feature"
                        label={false}
                        labelLine={true}
                        style={{ fontSize: 10, fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
                      >
                        {costByFeature.map((_, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value) => [
                          formatCost(Number(value ?? 0)),
                          "Cost",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Feature breakdown table */}
            <div className="border border-rule">
              <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                  Feature Breakdown
                </span>
              </div>

              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-rule text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                <span>Feature</span>
                <span className="text-right">Calls</span>
                <span className="text-right">Tokens</span>
                <span className="text-right">Cost</span>
                <span className="text-right">Avg ms</span>
                <span className="text-right">Success</span>
              </div>

              {featureData.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-muted">
                  No feature data available
                </div>
              ) : (
                featureData.map((row) => (
                  <div
                    key={row.feature}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-rule last:border-b-0 items-center"
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
                      {formatCost(row.cost)}
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
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab 3: Provider Performance                                   */}
      {/* ============================================================ */}
      {activeTab === "Provider Performance" && (
        <div className="border border-rule">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              Provider Comparison (Last 30 Days)
            </span>
          </div>

          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2.5 border-b border-rule text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            <span>Provider</span>
            <span className="text-right">Calls</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Avg Latency</span>
            <span className="text-right">Success Rate</span>
            <span className="text-right">Errors</span>
            <span className="text-right">Cost/Call</span>
          </div>

          {providerData.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-muted">
              No provider data available
            </div>
          ) : (
            providerData.map((row) => (
              <div
                key={row.provider}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 border-b border-rule last:border-b-0 items-center"
              >
                <span className="text-sm font-medium text-ink">
                  {row.provider}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {row.calls.toLocaleString()}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {formatCost(row.cost)}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {row.avg_response_ms}ms
                </span>
                <span
                  className={`font-mono text-sm text-right ${
                    row.success_rate >= 0.95
                      ? "text-editorial-green"
                      : row.success_rate >= 0.8
                        ? "text-editorial-gold"
                        : "text-editorial-red"
                  }`}
                >
                  {(row.success_rate * 100).toFixed(1)}%
                </span>
                <span
                  className={`font-mono text-sm text-right ${
                    row.errors > 0 ? "text-editorial-red" : "text-editorial-green"
                  }`}
                >
                  {row.errors}
                </span>
                <span className="font-mono text-sm text-ink-secondary text-right">
                  {row.calls > 0 ? formatCost(row.cost / row.calls) : "--"}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab 4: Cost Optimization                                      */}
      {/* ============================================================ */}
      {activeTab === "Cost Optimization" && (
        <div className="space-y-6">
          {/* Area chart: Daily cost trend with gradient */}
          <div className="border border-rule">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Daily Cost Trend (30 Days)
              </span>
            </div>
            <div className="p-4 min-w-0">
              {costTrendChart.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-muted">
                  No cost trend data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart
                    data={costTrendChart}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="costGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8B5CF6"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-rule, #ddd)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={axisTick}
                      stroke="var(--color-rule, #ddd)"
                    />
                    <YAxis
                      tick={axisTick}
                      stroke="var(--color-rule, #ddd)"
                      tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => {
                        const v = Number(value ?? 0);
                        if (name === "cost") return [`$${v.toFixed(4)}`, "Cost"];
                        return [v.toLocaleString(), "Calls"];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      fill="url(#costGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Horizontal bar chart: Cost per feature */}
          <div className="border border-rule">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Cost per Feature
              </span>
            </div>
            <div className="p-4 min-w-0">
              {costByFeature.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-muted">
                  No feature cost data available
                </div>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(costByFeature.length * 44, 200)}
                >
                  <BarChart
                    data={costByFeature}
                    layout="vertical"
                    margin={{ top: 8, right: 32, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-rule, #ddd)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={axisTick}
                      stroke="var(--color-rule, #ddd)"
                      tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      tick={axisTick}
                      stroke="var(--color-rule, #ddd)"
                      width={140}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [
                        formatCost(Number(value ?? 0)),
                        "Cost",
                      ]}
                    />
                    <Bar dataKey="cost" maxBarSize={28}>
                      {costByFeature.map((_, idx) => (
                        <Cell
                          key={`bar-${idx}`}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
