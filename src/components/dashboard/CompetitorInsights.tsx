"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Loader2,
  RefreshCw,
  Calendar,
  TrendingUp,
  Zap,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Filter,
  Eye,
  Square,
  CheckSquare,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileSelector } from "./ProfileSelector";
import {
  generateCompetitorInsights,
  getCompetitorInsights,
  markInsightRead,
} from "@/lib/ai/competitor-intelligence";
import type {
  SocialProfile,
  CompetitorInsight,
  SocialCompetitor,
} from "@/types";

interface CompetitorInsightsProps {
  profiles: SocialProfile[];
  competitors: Record<string, SocialCompetitor[]>;
}

type FilterMode = "all" | "unread" | "critical" | "high" | "medium" | "info";

// ── Priority Config ──

const PRIORITY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; icon: React.ElementType }
> = {
  critical: {
    color: "text-[#EF4444]",
    bg: "bg-[#EF4444]/10 border-[#EF4444]/20",
    label: "Critical",
    icon: AlertCircle,
  },
  high: {
    color: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/10 border-[#F59E0B]/20",
    label: "High",
    icon: AlertTriangle,
  },
  medium: {
    color: "text-[#3B82F6]",
    bg: "bg-[#3B82F6]/10 border-[#3B82F6]/20",
    label: "Medium",
    icon: Info,
  },
  info: {
    color: "text-ink-muted",
    bg: "bg-surface-raised border-rule",
    label: "Info",
    icon: Info,
  },
};

const INSIGHT_TYPE_ICON: Record<string, React.ElementType> = {
  weekly_summary: Calendar,
  trend_alert: TrendingUp,
  strategy_change: RefreshCw,
  viral_content: Zap,
};

const INSIGHT_TYPE_LABEL: Record<string, string> = {
  weekly_summary: "Weekly Summary",
  trend_alert: "Trend Alert",
  strategy_change: "Strategy Change",
  viral_content: "Viral Content",
};

// ── Insight Card ──

function InsightCard({
  insight,
  competitorName,
  onMarkRead,
}: {
  insight: CompetitorInsight;
  competitorName: string;
  onMarkRead: (id: string) => void;
}) {
  const [tipsChecked, setTipsChecked] = useState<Set<number>>(new Set());
  const priority = PRIORITY_CONFIG[insight.priority] || PRIORITY_CONFIG.info;
  const PriorityIcon = priority.icon;
  const TypeIcon = INSIGHT_TYPE_ICON[insight.insight_type] || Info;
  const typeLabel = INSIGHT_TYPE_LABEL[insight.insight_type] || "Insight";

  function toggleTip(idx: number) {
    setTipsChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div
      className={cn(
        "border bg-surface-card p-5 transition-all",
        insight.is_read ? "border-rule opacity-70" : "border-rule",
      )}
    >
      {/* Header Row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Priority badge */}
          <span
            className={cn(
              "flex items-center gap-1 border px-2 py-0.5 text-[9px] font-bold uppercase",
              priority.bg,
              priority.color,
            )}
          >
            <PriorityIcon size={10} />
            {priority.label}
          </span>
          {/* Type badge */}
          <span className="flex items-center gap-1 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-ink-muted">
            <TypeIcon size={10} />
            {typeLabel}
          </span>
          {/* Competitor name */}
          <span className="text-[10px] font-semibold text-ink-secondary">
            @{competitorName}
          </span>
        </div>

        {/* Mark read button */}
        {!insight.is_read && (
          <button
            onClick={() => onMarkRead(insight.id)}
            className="flex shrink-0 items-center gap-1 border border-rule px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink"
          >
            <Eye size={10} />
            Mark Read
          </button>
        )}
        {insight.is_read && (
          <span className="flex items-center gap-1 text-[10px] text-ink-muted">
            <CheckCircle size={10} />
            Read
          </span>
        )}
      </div>

      {/* Title + Description */}
      <h4 className="mb-1 font-serif text-sm font-bold text-ink">
        {insight.title}
      </h4>
      <p className="mb-3 text-xs leading-relaxed text-ink-secondary">
        {insight.description}
      </p>

      {/* Actionable Tips */}
      {insight.actionable_tips && insight.actionable_tips.length > 0 && (
        <div className="border-t border-rule pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
            Action Items
          </p>
          <div className="space-y-1.5">
            {insight.actionable_tips.map((tip, i) => (
              <button
                key={i}
                onClick={() => toggleTip(i)}
                className="flex w-full items-start gap-2 text-left"
              >
                {tipsChecked.has(i) ? (
                  <CheckSquare
                    size={13}
                    className="mt-0.5 shrink-0 text-[#22C55E]"
                  />
                ) : (
                  <Square
                    size={13}
                    className="mt-0.5 shrink-0 text-ink-muted"
                  />
                )}
                <span
                  className={cn(
                    "text-xs leading-relaxed",
                    tipsChecked.has(i)
                      ? "text-ink-muted line-through"
                      : "text-ink-secondary",
                  )}
                >
                  {tip}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timestamp */}
      <p className="mt-3 text-[10px] text-ink-muted">
        {new Date(insight.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

// ── Main Component ──

export function CompetitorInsights({
  profiles,
  competitors,
}: CompetitorInsightsProps) {
  const defaultId = profiles[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [insights, setInsights] = useState<CompetitorInsight[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const profileCompetitors = selectedId ? competitors[selectedId] ?? [] : [];
  const competitorNameMap: Record<string, string> = {};
  for (const c of profileCompetitors) {
    competitorNameMap[c.id] = c.handle;
  }

  // Load insights on mount / profile change
  useEffect(() => {
    if (!selectedId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getCompetitorInsights(selectedId).then((data) => {
      setInsights(data);
      setIsLoading(false);
    });
  }, [selectedId]);

  function handleGenerate() {
    if (!selectedId) return;
    setError(null);

    startTransition(async () => {
      const res = await generateCompetitorInsights(selectedId);
      if (!res.success) {
        setError(res.error);
      } else {
        // Prepend new insights
        setInsights((prev) => [...res.data, ...prev]);
      }
    });
  }

  async function handleMarkRead(insightId: string) {
    const res = await markInsightRead(insightId);
    if (res.success) {
      setInsights((prev) =>
        prev.map((i) => (i.id === insightId ? { ...i, is_read: true } : i)),
      );
    }
  }

  // Filter insights
  const filteredInsights = insights.filter((i) => {
    if (filter === "unread") return !i.is_read;
    if (filter === "critical") return i.priority === "critical";
    if (filter === "high") return i.priority === "high";
    if (filter === "medium") return i.priority === "medium";
    if (filter === "info") return i.priority === "info";
    return true;
  });

  // Group by competitor
  const grouped: Record<string, CompetitorInsight[]> = {};
  for (const insight of filteredInsights) {
    const key = insight.competitor_id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(insight);
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">
          Add a social profile to view competitor insights.
        </p>
      </div>
    );
  }

  return (
    <>
      <ProfileSelector
        profiles={profiles}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setInsights([]);
          setFilter("all");
          setError(null);
        }}
      />

      <div className="mt-4 space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter size={13} className="shrink-0 text-ink-muted" />
            {(
              [
                { key: "all", label: "All" },
                { key: "unread", label: "Unread" },
                { key: "critical", label: "Critical" },
                { key: "high", label: "High" },
                { key: "medium", label: "Medium" },
                { key: "info", label: "Info" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "whitespace-nowrap px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors",
                  filter === f.key
                    ? "bg-ink text-surface-cream"
                    : "border border-rule text-ink-secondary hover:border-ink-muted hover:text-ink",
                )}
              >
                {f.label}
                {f.key === "unread" && (
                  <span className="ml-1">
                    ({insights.filter((i) => !i.is_read).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isPending || profileCompetitors.length === 0}
            className="flex shrink-0 items-center gap-1.5 bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={12} />
                Generate Insights
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="border border-rule bg-surface-raised px-4 py-3 text-sm text-editorial-red">
            {error}
          </div>
        )}

        {/* Processing */}
        {isPending && (
          <div className="border border-rule bg-surface-card p-6">
            <div className="flex items-center gap-3">
              <Loader2
                size={20}
                className="animate-spin text-editorial-red"
              />
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  Analyzing Competitors
                </h3>
                <p className="text-[11px] text-ink-muted">
                  Comparing your performance against {profileCompetitors.length} competitor
                  {profileCompetitors.length !== 1 ? "s" : ""}...
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden bg-surface-raised">
              <div
                className="h-full animate-pulse bg-editorial-red/60 transition-all"
                style={{ width: "60%" }}
              />
            </div>
          </div>
        )}

        {/* Loading initial data */}
        {isLoading && !isPending && (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 size={16} className="animate-spin text-ink-muted" />
            <span className="text-sm text-ink-muted">Loading insights...</span>
          </div>
        )}

        {/* Empty state: no competitors */}
        {!isLoading &&
          !isPending &&
          profileCompetitors.length === 0 && (
            <div className="border border-rule bg-surface-card px-6 py-12 text-center">
              <Users size={32} className="mx-auto mb-3 text-ink-muted" />
              <h3 className="mb-1 font-serif text-lg font-bold text-ink">
                No Competitors Tracked
              </h3>
              <p className="text-sm text-ink-secondary">
                Add competitors to your profile to get insights about
                their strategies and how to outperform them.
              </p>
            </div>
          )}

        {/* Empty state: no insights */}
        {!isLoading &&
          !isPending &&
          profileCompetitors.length > 0 &&
          insights.length === 0 && (
            <div className="border border-rule bg-surface-card px-6 py-12 text-center">
              <TrendingUp size={32} className="mx-auto mb-3 text-ink-muted" />
              <h3 className="mb-1 font-serif text-lg font-bold text-ink">
                No Insights Yet
              </h3>
              <p className="mb-4 text-sm text-ink-secondary">
                Click "Generate Insights" to get competitive
                intelligence about your {profileCompetitors.length} tracked
                competitor{profileCompetitors.length !== 1 ? "s" : ""}.
              </p>
            </div>
          )}

        {/* Filtered empty */}
        {!isLoading &&
          !isPending &&
          insights.length > 0 &&
          filteredInsights.length === 0 && (
            <div className="border border-rule bg-surface-card px-6 py-8 text-center">
              <p className="text-sm text-ink-secondary">
                No insights match the current filter.
              </p>
            </div>
          )}

        {/* Insight Cards grouped by competitor */}
        {!isLoading &&
          Object.keys(grouped).length > 0 &&
          Object.entries(grouped).map(([competitorId, competitorInsights]) => (
            <div key={competitorId} className="space-y-3">
              <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                <Users size={13} />
                @{competitorNameMap[competitorId] || "Unknown Competitor"}
                <span className="text-[9px] font-normal text-ink-muted/60">
                  ({competitorInsights.length} insight
                  {competitorInsights.length !== 1 ? "s" : ""})
                </span>
              </h3>
              {competitorInsights.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  competitorName={
                    competitorNameMap[insight.competitor_id] || "unknown"
                  }
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          ))}
      </div>
    </>
  );
}
