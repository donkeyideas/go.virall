"use client";

import { useTransition, useState, useMemo } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Sparkles,
  Loader2,
  DollarSign,
  Users,
  Building2,
  TrendingDown,
  Cpu,
  PhoneCall,
  Brain,
  Share2,
} from "lucide-react";
import type { PlatformInsight, AdminStats } from "@/types";
import {
  generatePlatformInsights,
  dismissInsightAction,
} from "@/lib/actions/admin-intelligence";

/* ------------------------------------------------------------------ */
/* Severity config                                                     */
/* ------------------------------------------------------------------ */

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: "text-editorial-red",
    bg: "bg-editorial-red/10",
    border: "border-editorial-red/30",
    badge: "bg-editorial-red/10 text-editorial-red border-editorial-red/30",
  },
  warning: {
    icon: AlertCircle,
    color: "text-editorial-gold",
    bg: "bg-editorial-gold/10",
    border: "border-editorial-gold/30",
    badge: "bg-editorial-gold/10 text-editorial-gold border-editorial-gold/30",
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  positive: {
    icon: CheckCircle,
    color: "text-editorial-green",
    bg: "bg-editorial-green/10",
    border: "border-editorial-green/30",
    badge:
      "bg-editorial-green/10 text-editorial-green border-editorial-green/30",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Category icon mapping                                               */
/* ------------------------------------------------------------------ */

const categoryIcons: Record<string, typeof DollarSign> = {
  revenue: DollarSign,
  engagement: Users,
  growth: TrendingDown,
  churn: TrendingDown,
  feature_adoption: Sparkles,
  system: Cpu,
  ai_usage: Brain,
  overall: Info,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

function computeHealthScore(
  metrics: {
    mrr: number;
    churnRate: number;
    paidOrgs: number;
    totalOrgs: number;
  },
  apiUsage: { successRate: number },
  stats: AdminStats,
): number {
  // Weighted composite: revenue health, churn, conversion, API stability, engagement
  const churnScore = Math.max(0, 100 - metrics.churnRate * 1000); // 0% churn = 100, 10% churn = 0
  const conversionScore =
    metrics.totalOrgs > 0
      ? (metrics.paidOrgs / metrics.totalOrgs) * 100
      : 0;
  const apiScore = apiUsage.successRate * 100;
  const engagementScore =
    stats.totalUsers > 0
      ? Math.min(100, (stats.totalAnalyses / stats.totalUsers) * 20)
      : 0;
  const revenueScore = Math.min(100, metrics.mrr / 50); // $5000 MRR = 100

  const score =
    revenueScore * 0.25 +
    churnScore * 0.25 +
    conversionScore * 0.15 +
    apiScore * 0.2 +
    engagementScore * 0.15;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function DataIntelligenceClient({
  insights,
  stats,
  metrics,
  apiUsage,
  aiUsage,
}: {
  insights: PlatformInsight[];
  stats: AdminStats;
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
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /* ---- Derived ---- */
  const totalAICalls = Object.values(aiUsage).reduce(
    (s, v) => s + v.calls,
    0,
  );
  const totalAICost = Object.values(aiUsage).reduce((s, v) => s + v.cost, 0);

  const healthScore = useMemo(
    () => computeHealthScore(metrics, apiUsage, stats),
    [metrics, apiUsage, stats],
  );

  const healthColor =
    healthScore >= 80
      ? "text-editorial-green"
      : healthScore >= 50
        ? "text-editorial-gold"
        : "text-editorial-red";
  const healthRingColor =
    healthScore >= 80
      ? "border-editorial-green"
      : healthScore >= 50
        ? "border-editorial-gold"
        : "border-editorial-red";

  /* ---- Group insights by category ---- */
  const groupedInsights = useMemo(() => {
    const groups: Record<string, PlatformInsight[]> = {};
    const categoryOrder = [
      "revenue",
      "engagement",
      "growth",
      "churn",
      "feature_adoption",
      "system",
      "ai_usage",
      "overall",
    ];
    for (const cat of categoryOrder) {
      const matching = insights.filter((i) => i.category === cat);
      if (matching.length > 0) groups[cat] = matching;
    }
    // Catch any uncategorized
    const knownCats = new Set(categoryOrder);
    for (const insight of insights) {
      if (!knownCats.has(insight.category)) {
        if (!groups[insight.category]) groups[insight.category] = [];
        groups[insight.category].push(insight);
      }
    }
    return groups;
  }, [insights]);

  /* ---- Handlers ---- */
  function handleGenerate() {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await generatePlatformInsights();
      if ("error" in result && result.error) {
        setStatusMessage({ type: "error", text: result.error });
      } else {
        setStatusMessage({
          type: "success",
          text: `Generated ${(result as { count?: number }).count ?? 0} insights successfully.`,
        });
      }
    });
  }

  function handleDismiss(id: string) {
    startTransition(async () => {
      await dismissInsightAction(id);
    });
  }

  /* ---- Key metrics strip data ---- */
  const keyMetrics = [
    {
      label: "MRR",
      value: `$${metrics.mrr.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      label: "Creator MRR",
      value: `$${metrics.creatorMrr.toLocaleString()}`,
      icon: DollarSign,
      accent: "text-editorial-green",
    },
    {
      label: "Brand MRR",
      value: `$${metrics.brandMrr.toLocaleString()}`,
      icon: DollarSign,
      accent: "text-editorial-gold",
    },
    {
      label: "Active Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
    },
    {
      label: "Brand Users",
      value: stats.brandUsers.toLocaleString(),
      icon: Building2,
      accent: "text-editorial-blue",
    },
    {
      label: "Churn",
      value: `${(metrics.churnRate * 100).toFixed(1)}%`,
      icon: TrendingDown,
      accent:
        metrics.churnRate > 0.1
          ? "text-editorial-red"
          : "text-editorial-green",
    },
    {
      label: "API Cost",
      value: `$${apiUsage.totalCost.toFixed(2)}`,
      icon: Cpu,
    },
    {
      label: "AI Cost",
      value: `$${totalAICost.toFixed(2)}`,
      icon: Brain,
    },
  ];

  return (
    <div>
      {/* ============================================================ */}
      {/* Header with Generate button                                   */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Data Intelligence
        </h1>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-2 border border-rule px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Sparkles size={18} />
          )}
          Generate Analysis
        </button>
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div
          className={`border border-rule px-4 py-3 mb-6 text-xs ${
            statusMessage.type === "success"
              ? "bg-editorial-green/10 text-editorial-green"
              : "bg-editorial-red/10 text-editorial-red"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. Platform Health Score Hero                                 */}
      {/* ============================================================ */}
      <div className="border border-rule bg-surface-card mb-8">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
            Platform Health Score
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-10">
          <div
            className={`flex items-center justify-center w-32 h-32 border-4 ${healthRingColor}`}
          >
            <span className={`font-mono text-5xl font-bold ${healthColor}`}>
              {healthScore}
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-4">
            {healthScore >= 80
              ? "Healthy"
              : healthScore >= 50
                ? "Needs Attention"
                : "Critical"}
          </p>
          <p className="text-sm text-ink-secondary mt-1 max-w-md text-center">
            Composite score from revenue, churn, conversion, API stability, and
            engagement metrics.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. Key Metrics Strip (8 cards)                               */}
      {/* ============================================================ */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Key Metrics
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 mb-8">
        {keyMetrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="border border-rule bg-surface-card p-3 text-center"
            >
              <Icon size={16} className="mx-auto mb-1.5 text-ink-muted" />
              <div
                className={`font-mono text-sm font-bold ${m.accent ?? "text-ink"}`}
              >
                {m.value}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
                {m.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 3 & 4. Insights Feed (grouped by category)                   */}
      {/* ============================================================ */}
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Active Insights
      </p>

      {insights.length === 0 ? (
        <div className="border border-rule bg-surface-card p-8 text-center">
          <Info size={24} className="mx-auto mb-3 text-ink-muted" />
          <p className="text-sm text-ink-secondary mb-1">No active insights</p>
          <p className="text-sm text-ink-muted">
            Click &ldquo;Generate Analysis&rdquo; to create platform
            insights.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedInsights).map(
            ([category, categoryInsights]) => {
              const CategoryIcon =
                categoryIcons[category] ?? Info;
              return (
                <div key={category}>
                  {/* Category heading */}
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon size={16} className="text-ink-muted" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                      {category.replace("_", " ")}
                    </span>
                    <span className="text-[11px] font-mono text-ink-muted">
                      ({categoryInsights.length})
                    </span>
                  </div>

                  <div className="space-y-4">
                    {categoryInsights.map((insight) => {
                      const cfg =
                        severityConfig[insight.severity] ??
                        severityConfig.info;
                      const SeverityIcon = cfg.icon;
                      const recommendations =
                        insight.recommendations as Array<{
                          action?: string;
                          impact?: string;
                          effort?: string;
                        }>;

                      return (
                        <div
                          key={insight.id}
                          className="border border-rule bg-surface-card"
                        >
                          {/* Insight header */}
                          <div className="flex items-start justify-between px-4 py-3 border-b border-rule">
                            <div className="flex items-start gap-3">
                              <SeverityIcon
                                size={20}
                                className={`mt-0.5 shrink-0 ${cfg.color}`}
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-serif text-sm font-bold text-ink">
                                    {insight.title}
                                  </h3>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-widest border px-1.5 py-0.5 ${cfg.badge}`}
                                  >
                                    {insight.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-ink-secondary mt-1 max-w-xl">
                                  {insight.description}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDismiss(insight.id)}
                              disabled={isPending}
                              className="ml-4 p-1 text-ink-muted hover:text-ink transition-colors disabled:opacity-50 shrink-0"
                              title="Dismiss"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          {/* Metadata row */}
                          <div className="flex items-center gap-4 px-4 py-2 border-b border-rule flex-wrap">
                            <span className="font-mono text-sm text-ink-secondary">
                              {(insight.confidence * 100).toFixed(0)}%
                              confidence
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted border border-rule px-2 py-0.5">
                              {insight.category.replace("_", " ")}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted border border-rule px-2 py-0.5">
                              {insight.insight_type.replace("_", " ")}
                            </span>
                            <span className="text-xs text-ink-muted font-mono ml-auto">
                              {timeAgo(insight.generated_at)}
                            </span>
                          </div>

                          {/* Recommendations */}
                          {recommendations.length > 0 && (
                            <div className="px-4 py-3">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                                Recommendations
                              </p>
                              <ul className="space-y-1.5">
                                {recommendations.map((rec, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-ink-secondary"
                                  >
                                    <span className="text-editorial-gold mt-px shrink-0">
                                      --
                                    </span>
                                    <span className="flex-1">
                                      {rec.action ?? "No action specified"}
                                    </span>
                                    {rec.impact && (
                                      <span
                                        className={`text-[10px] font-bold uppercase tracking-widest border px-1.5 py-0.5 shrink-0 ${
                                          rec.impact === "high"
                                            ? "text-editorial-red border-editorial-red/30"
                                            : rec.impact === "medium"
                                              ? "text-editorial-gold border-editorial-gold/30"
                                              : "text-ink-muted border-rule"
                                        }`}
                                      >
                                        {rec.impact} impact
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
