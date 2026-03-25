"use client";

import { useState } from "react";
import {
  Server,
  Zap,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Settings2,
  List,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PlatformApiConfig, APICallLog } from "@/types";

const tooltipStyle = {
  backgroundColor: "#2A1B54",
  border: "1px solid rgba(139,92,246,0.15)",
  borderRadius: 8,
  fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  fontSize: 11,
  color: "#F0ECF8",
};
const axisTick = { fontSize: 11, fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif", fill: "#6B5D8E" };

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

type Tab = "usage" | "providers" | "history";

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "usage", label: "Usage & Charts", icon: BarChart3 },
  { key: "providers", label: "Provider Configs", icon: Settings2 },
  { key: "history", label: "Call History", icon: List },
];

export function APIClient({
  configs,
  usage,
  callLog,
}: {
  configs: PlatformApiConfig[];
  usage: {
    totalCalls: number;
    totalCost: number;
    successRate: number;
    byProvider: Record<
      string,
      { calls: number; cost: number; successRate: number }
    >;
    dailyAggregates: Array<{ date: string; calls: number; cost: number }>;
  };
  callLog: APICallLog[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("usage");

  // Prepare chart data: last 14 days from dailyAggregates
  const chartData = usage.dailyAggregates.slice(-14).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  // Provider breakdown data for horizontal bars
  const providerData = Object.entries(usage.byProvider)
    .map(([name, data]) => ({
      name,
      calls: data.calls,
      cost: data.cost,
      successRate: data.successRate,
    }))
    .sort((a, b) => b.calls - a.calls);

  const maxProviderCalls = Math.max(...providerData.map((p) => p.calls), 1);

  // Compute extra KPIs
  const avgResponseTime =
    callLog.length > 0
      ? Math.round(
          callLog.reduce((sum, c) => sum + (c.response_time_ms ?? 0), 0) /
            callLog.filter((c) => c.response_time_ms != null).length || 0,
        )
      : 0;
  const failedCalls = callLog.filter((c) => !c.is_success).length;

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-6">
        API Management
      </h1>

      {/* KPI Cards */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Usage Overview (30 days)
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
        <div className="border border-rule bg-surface-card p-4 text-center">
          <Zap size={20} className="mx-auto mb-2 text-ink-muted" />
          <div className="font-mono text-2xl font-bold text-ink">
            {usage.totalCalls.toLocaleString()}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Total Calls
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <DollarSign size={20} className="mx-auto mb-2 text-ink-muted" />
          <div className="font-mono text-2xl font-bold text-ink">
            ${usage.totalCost.toFixed(2)}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Total Cost
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <CheckCircle size={20} className="mx-auto mb-2 text-ink-muted" />
          <div className="font-mono text-2xl font-bold text-ink">
            {(usage.successRate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Success Rate
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <Clock size={20} className="mx-auto mb-2 text-ink-muted" />
          <div className="font-mono text-2xl font-bold text-ink">
            {avgResponseTime}ms
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Avg Response
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <XCircle size={20} className="mx-auto mb-2 text-ink-muted" />
          <div className="font-mono text-2xl font-bold text-editorial-red">
            {failedCalls}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Failed Calls
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-rule mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: Usage & Charts */}
      {activeTab === "usage" && (
        <div>
          {/* Daily API Activity Bar Chart */}
          {chartData.length > 0 && (
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
                Daily API Activity (Last 14 Days)
              </p>
              <div className="border border-rule bg-surface-card p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-rule, #ddd)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={axisTick}
                      axisLine={{ stroke: "var(--color-rule, #ddd)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={axisTick}
                      axisLine={{ stroke: "var(--color-rule, #ddd)" }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-surface-raised, #f5f5f5)" }} />
                    <Bar
                      dataKey="calls"
                      name="API Calls"
                      fill="#8B5CF6"
                      radius={0}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Provider Breakdown - Horizontal Bars */}
          {providerData.length > 0 && (
            <div className="mb-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
                Provider Breakdown
              </p>
              <div className="border border-rule bg-surface-card divide-y divide-rule">
                {providerData.map((provider) => {
                  const pct = (provider.calls / maxProviderCalls) * 100;
                  return (
                    <div key={provider.name} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-ink">
                          {provider.name}
                        </span>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[11px] text-ink-secondary">
                            {provider.calls.toLocaleString()} calls
                          </span>
                          <span className="font-mono text-[11px] text-ink-secondary">
                            ${provider.cost.toFixed(4)}
                          </span>
                          <span
                            className={`font-mono text-[11px] ${
                              provider.successRate >= 0.95
                                ? "text-editorial-green"
                                : provider.successRate >= 0.8
                                  ? "text-editorial-gold"
                                  : "text-editorial-red"
                            }`}
                          >
                            {(provider.successRate * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-surface-raised h-2">
                        <div
                          className="h-2 bg-ink transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Usage Table */}
          {usage.dailyAggregates.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
                Daily Usage Table
              </p>
              <div className="border border-rule mb-8 max-h-[300px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0">
                    <tr className="border-b border-rule bg-surface-raised">
                      <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Calls
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.dailyAggregates.map((day) => (
                      <tr
                        key={day.date}
                        className="border-b border-rule last:border-b-0"
                      >
                        <td className="px-4 py-2 font-mono text-[11px] text-ink">
                          {day.date}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-secondary">
                          {day.calls.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-secondary">
                          ${day.cost.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: Provider Configs */}
      {activeTab === "providers" && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            API Providers
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {configs.map((cfg) => (
              <div
                key={cfg.id}
                className="border border-rule bg-surface-card p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Server size={18} className="text-ink-muted" />
                    <span className="text-sm font-medium text-ink">
                      {cfg.display_name}
                    </span>
                  </div>
                  <span
                    className={`border px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest ${
                      cfg.is_active
                        ? "border-editorial-green/30 text-editorial-green"
                        : "border-rule text-ink-muted"
                    }`}
                  >
                    {cfg.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                      Provider
                    </span>
                    <span className="font-mono text-[11px] text-ink-secondary">
                      {cfg.provider}
                    </span>
                  </div>
                  {cfg.base_url && (
                    <div className="flex justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Base URL
                      </span>
                      <span className="font-mono text-[11px] text-ink-secondary truncate ml-2 max-w-[160px]">
                        {cfg.base_url}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                      API Key
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {cfg.api_key ? "********" : "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {configs.length === 0 && (
              <div className="col-span-full border border-rule bg-surface-card p-8 text-center text-sm text-ink-muted">
                No API providers configured
              </div>
            )}
          </div>

          {/* By-Provider Table */}
          {Object.keys(usage.byProvider).length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
                By Provider (30 days)
              </p>
              <div className="border border-rule mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-rule bg-surface-raised">
                      <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Provider
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Calls
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Cost
                      </th>
                      <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Success Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(usage.byProvider).map(
                      ([provider, data]) => (
                        <tr
                          key={provider}
                          className="border-b border-rule last:border-b-0"
                        >
                          <td className="px-4 py-2 text-sm font-medium text-ink">
                            {provider}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-secondary">
                            {data.calls.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-secondary">
                            ${data.cost.toFixed(4)}
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-[11px]">
                            <span
                              className={
                                data.successRate >= 0.95
                                  ? "text-editorial-green"
                                  : data.successRate >= 0.8
                                    ? "text-editorial-gold"
                                    : "text-editorial-red"
                              }
                            >
                              {(data.successRate * 100).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: Call History */}
      {activeTab === "history" && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Recent API Calls
          </p>
          <div className="border border-rule overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-rule bg-surface-raised">
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Provider
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Endpoint
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Response
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Cost
                  </th>
                  <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Result
                  </th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {callLog.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-sm text-ink-muted"
                    >
                      No API calls recorded
                    </td>
                  </tr>
                ) : (
                  callLog.map((call) => (
                    <tr
                      key={call.id}
                      className="border-b border-rule last:border-b-0"
                    >
                      <td className="px-4 py-2 text-sm font-medium text-ink">
                        {call.provider}
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-ink-secondary truncate max-w-[180px]">
                        {call.endpoint ?? "--"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-secondary">
                        {call.status_code ?? "--"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} className="text-ink-muted" />
                          {call.response_time_ms != null
                            ? `${call.response_time_ms}ms`
                            : "--"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[11px] text-ink-secondary">
                        {call.cost_usd != null
                          ? `$${call.cost_usd.toFixed(4)}`
                          : "--"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {call.is_success ? (
                          <span className="inline-flex items-center gap-1 border border-editorial-green/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-editorial-green">
                            <CheckCircle size={10} />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 border border-editorial-red/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-editorial-red">
                            <XCircle size={10} />
                            Fail
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm text-ink-muted">
                        {timeAgo(call.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
