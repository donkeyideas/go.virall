"use client";

import {
  HeartPulse,
  AlertTriangle,
  Zap,
  XCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import type { APICallLog } from "@/types";

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

function getHealthColor(errorRate: number): {
  label: string;
  colorClass: string;
  bgClass: string;
} {
  if (errorRate < 0.05) {
    return {
      label: "Healthy",
      colorClass: "text-editorial-green",
      bgClass: "border-editorial-green/30",
    };
  }
  if (errorRate < 0.15) {
    return {
      label: "Degraded",
      colorClass: "text-editorial-gold",
      bgClass: "border-editorial-gold/30",
    };
  }
  return {
    label: "Unhealthy",
    colorClass: "text-editorial-red",
    bgClass: "border-editorial-red/30",
  };
}

export function HealthClient({
  health,
  recentCalls,
}: {
  health: {
    failedAPICalls24h: number;
    totalAPICalls24h: number;
    errorRate: number;
  };
  recentCalls: APICallLog[];
}) {
  const status = getHealthColor(health.errorRate);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-6">
        System Health
      </h1>

      {/* Health Score Indicator */}
      <div
        className={`border ${status.bgClass} bg-surface-card p-6 mb-8 flex items-center gap-6`}
      >
        <div className={`${status.colorClass}`}>
          <HeartPulse size={36} />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`font-serif text-xl font-bold ${status.colorClass}`}
            >
              {status.label}
            </span>
            <span
              className={`border ${status.bgClass} px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest ${status.colorClass}`}
            >
              {(health.errorRate * 100).toFixed(1)}% error rate
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">
            {health.errorRate < 0.05
              ? "All systems operating within normal parameters."
              : health.errorRate < 0.15
                ? "Elevated error rate detected. Some services may be experiencing issues."
                : "High error rate. Immediate investigation recommended."}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Last 24 Hours
      </p>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-rule bg-surface-card p-4 text-center">
          <XCircle size={20} className="mx-auto mb-2 text-editorial-red" />
          <div className="font-mono text-2xl font-bold text-ink">
            {health.failedAPICalls24h}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Failed API Calls
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <Zap size={20} className="mx-auto mb-2 text-ink-muted" />
          <div className="font-mono text-2xl font-bold text-ink">
            {health.totalAPICalls24h}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Total API Calls
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-4 text-center">
          <AlertTriangle
            size={20}
            className={`mx-auto mb-2 ${status.colorClass}`}
          />
          <div className={`font-mono text-2xl font-bold ${status.colorClass}`}>
            {(health.errorRate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
            Error Rate
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Recent API Calls
      </p>
      <div className="border border-rule overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-rule">
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Provider
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Endpoint
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Status
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Response
              </th>
              <th className="px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Result
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Error
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {recentCalls.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  No API calls recorded
                </td>
              </tr>
            ) : (
              recentCalls.map((call) => (
                <tr
                  key={call.id}
                  className={`border-b border-rule last:border-b-0 ${
                    !call.is_success ? "bg-editorial-red/[0.03]" : ""
                  }`}
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
                  <td className="px-4 py-2 text-[11px] text-editorial-red truncate max-w-[180px]">
                    {call.error_message ?? ""}
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
  );
}
