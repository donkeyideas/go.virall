"use client";

import { useState, useEffect, useCallback } from "react";
import { RevenueDashboard } from "@/components/dashboard/RevenueDashboard";
import {
  getRevenueStats,
  getRevenueBySources,
  getMonthlyRevenue,
  getDealRevenue,
  getPaymentHistory,
  getRevenueForecast,
} from "@/lib/dal/revenue";
import type {
  RevenueStats,
  RevenueBySource,
  MonthlyRevenue,
  DealRevenueRow,
  PaymentHistoryRow,
  RevenueForecast,
} from "@/lib/dal/revenue";
import { DollarSign } from "lucide-react";

type DateRange = "30d" | "3m" | "6m" | "12m" | "all";
type TabKey = "overview" | "payments" | "deals";

const DATE_RANGES: { key: DateRange; label: string; months: number }[] = [
  { key: "30d", label: "Last 30 Days", months: 1 },
  { key: "3m", label: "3 Months", months: 3 },
  { key: "6m", label: "6 Months", months: 6 },
  { key: "12m", label: "12 Months", months: 12 },
  { key: "all", label: "All Time", months: 60 },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "payments", label: "Payments" },
  { key: "deals", label: "Deals" },
];

interface RevenueClientProps {
  initialStats: RevenueStats;
  initialSources: RevenueBySource[];
  initialMonthly: MonthlyRevenue[];
  initialDeals: DealRevenueRow[];
  initialPayments: PaymentHistoryRow[];
  initialForecast: RevenueForecast;
}

export function RevenueClient({
  initialStats,
  initialSources,
  initialMonthly,
  initialDeals,
  initialPayments,
  initialForecast,
}: RevenueClientProps) {
  const [dateRange, setDateRange] = useState<DateRange>("12m");
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<RevenueStats>(initialStats);
  const [sources, setSources] = useState<RevenueBySource[]>(initialSources);
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>(initialMonthly);
  const [deals, setDeals] = useState<DealRevenueRow[]>(initialDeals);
  const [payments, setPayments] = useState<PaymentHistoryRow[]>(initialPayments);
  const [forecast, setForecast] = useState<RevenueForecast>(initialForecast);

  const fetchData = useCallback(async (months: number) => {
    setLoading(true);
    try {
      const [newStats, newSources, newMonthly, newDeals, newPayments, newForecast] =
        await Promise.all([
          getRevenueStats(),
          getRevenueBySources(),
          getMonthlyRevenue(months),
          getDealRevenue(),
          getPaymentHistory(),
          getRevenueForecast(),
        ]);
      setStats(newStats);
      setSources(newSources);
      setMonthly(newMonthly);
      setDeals(newDeals);
      setPayments(newPayments);
      setForecast(newForecast);
    } catch {
      // Data stays as initial on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const months = DATE_RANGES.find((r) => r.key === dateRange)?.months ?? 12;
    fetchData(months);
  }, [dateRange, fetchData]);

  // Filter data based on date range for deals and payments (client-side)
  const filteredDeals = (() => {
    if (dateRange === "all") return deals;
    const months = DATE_RANGES.find((r) => r.key === dateRange)?.months ?? 12;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return deals.filter((d) => new Date(d.createdAt) >= cutoff);
  })();

  const filteredPayments = (() => {
    if (dateRange === "all") return payments;
    const months = DATE_RANGES.find((r) => r.key === dateRange)?.months ?? 12;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return payments.filter(
      (p) => new Date(p.paidAt ?? p.createdAt) >= cutoff
    );
  })();

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(var(--accent-rgb),0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DollarSign size={20} style={{ color: "var(--color-editorial-green)" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Revenue Dashboard
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-ink-muted)",
                margin: 0,
              }}
            >
              Track your earnings, deals, and payment history
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Date Range Filter */}
          {DATE_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setDateRange(r.key)}
              style={{
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: dateRange === r.key ? 700 : 600,
                color:
                  dateRange === r.key
                    ? "var(--color-editorial-red)"
                    : "var(--color-ink-muted)",
                background:
                  dateRange === r.key
                    ? "rgba(var(--accent-rgb),0.1)"
                    : "transparent",
                border: dateRange === r.key
                  ? "1px solid rgba(var(--accent-rgb),0.2)"
                  : "1px solid transparent",
                borderRadius: 8,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
          marginBottom: 24,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: tab === t.key ? 700 : 600,
              color:
                tab === t.key
                  ? "var(--color-editorial-red)"
                  : "var(--color-ink-muted)",
              background: "transparent",
              border: "none",
              borderBottom:
                tab === t.key
                  ? "2px solid var(--color-editorial-red)"
                  : "2px solid transparent",
              cursor: "pointer",
              position: "relative",
            }}
          >
            {t.label}
          </button>
        ))}
        {loading && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--color-ink-muted)",
              fontWeight: 600,
            }}
          >
            Updating...
          </span>
        )}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <RevenueDashboard
          stats={stats}
          sources={sources}
          monthly={monthly}
          deals={filteredDeals}
          payments={filteredPayments}
          forecast={forecast}
        />
      )}

      {tab === "payments" && (
        <RevenueDashboard
          stats={stats}
          sources={sources}
          monthly={monthly}
          deals={[]}
          payments={filteredPayments}
          forecast={forecast}
        />
      )}

      {tab === "deals" && (
        <RevenueDashboard
          stats={stats}
          sources={sources}
          monthly={monthly}
          deals={filteredDeals}
          payments={[]}
          forecast={forecast}
        />
      )}
    </div>
  );
}
