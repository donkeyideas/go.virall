"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { ProfileSelector } from "./ProfileSelector";
import {
  Play,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  TrendingUp,
  Target,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { runRecommendations } from "@/lib/actions/analyses";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/track";
import type { SocialProfile, AnalysisType } from "@/types";

/* ─── Types ─── */

interface RecommendationsClientProps {
  profiles: SocialProfile[];
  cachedResults: Record<string, Record<string, unknown>>;
  analysisStatus: Record<
    string,
    Record<AnalysisType, { hasData: boolean; createdAt: string | null }>
  >;
}

/** The 11 analyses that feed into recommendations */
const INPUT_TYPES: {
  type: AnalysisType;
  label: string;
}[] = [
  { type: "growth", label: "Growth Tips" },
  { type: "content_strategy", label: "Content Strategy" },
  { type: "hashtags", label: "Hashtags" },
  { type: "competitors", label: "Competitors" },
  { type: "insights", label: "Insights" },
  { type: "earnings_forecast", label: "Earnings Forecast" },
  { type: "thirty_day_plan", label: "30-Day Plan" },
  { type: "smo_score", label: "SMO Score" },
  { type: "audience", label: "Audience" },
  { type: "network", label: "Network" },
  { type: "campaign_ideas", label: "Campaign Ideas" },
];

/* ─── Processing Animation ─── */

function ProcessingAnimation() {
  const steps = [
    "Collecting all analysis data",
    "Cross-referencing findings",
    "Applying platform algorithm knowledge",
    "Synthesizing recommendations",
    "Calculating growth projections",
    "Prioritizing by impact and effort",
  ];
  const estimatedSeconds = 60;
  const [elapsed, setElapsed] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stepDuration = (estimatedSeconds / steps.length) * 1000;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, stepDuration);
    return () => clearInterval(timer);
  }, [steps.length]);

  const progress = Math.min((elapsed / estimatedSeconds) * 100, 95);
  const remaining = Math.max(estimatedSeconds - elapsed, 0);

  return (
    <div className="border border-rule bg-surface-card p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <svg className="-rotate-90 h-10 w-10" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" className="text-surface-raised" strokeWidth="3" />
            <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" className="text-editorial-red transition-all duration-1000" strokeWidth="3" strokeDasharray={`${progress} ${100 - progress}`} strokeLinecap="round" />
          </svg>
          <Loader2 size={16} className="absolute inset-0 m-auto animate-spin text-editorial-red" />
        </div>
        <div>
          <h3 className="font-serif text-base font-bold text-ink">
            Generating Recommendations
          </h3>
          <p className="text-[11px] text-ink-muted">
            Synthesizing all your analyses
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-[10px] text-ink-muted">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full rounded-full bg-editorial-red transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mb-5 space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {i < currentStep ? (
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-editorial-green">
                  <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : i === currentStep ? (
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <div className="h-2 w-2 animate-pulse rounded-full bg-editorial-red" />
              </div>
            ) : (
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-ink-muted/30" />
              </div>
            )}
            <span className={i < currentStep ? "text-xs text-ink-secondary line-through decoration-ink-muted/30" : i === currentStep ? "text-xs font-medium text-ink" : "text-xs text-ink-muted"}>
              {step}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-rule pt-3">
        <div className="flex items-center gap-4 text-[10px] text-ink-muted">
          <span>Elapsed: <span className="font-mono text-ink">{elapsed}s</span></span>
          {remaining > 0 && (
            <span>Est. remaining: <span className="font-mono text-ink">~{remaining}s</span></span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider text-ink-muted">Powered by Go Virall</span>
      </div>
    </div>
  );
}

/* ─── Health Check Grid ─── */

function HealthCheckGrid({
  status,
}: {
  status: Record<AnalysisType, { hasData: boolean; createdAt: string | null }>;
}) {
  const now = Date.now();
  const STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  let available = 0;
  for (const t of INPUT_TYPES) {
    if (status[t.type]?.hasData) available++;
  }

  return (
    <div className="border border-rule bg-surface-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-sm font-bold text-ink">Analysis Coverage</h3>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          {available} of {INPUT_TYPES.length} available
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {INPUT_TYPES.map((t) => {
          const s = status[t.type];
          const hasData = s?.hasData ?? false;
          const isStale = hasData && s?.createdAt
            ? now - new Date(s.createdAt).getTime() > STALE_MS
            : false;

          return (
            <div
              key={t.type}
              className={cn(
                "flex items-center gap-2 border px-3 py-2",
                hasData
                  ? isStale
                    ? "border-editorial-gold/30 bg-editorial-gold/5"
                    : "border-editorial-green/30 bg-editorial-green/5"
                  : "border-rule bg-surface-raised",
              )}
            >
              {hasData ? (
                isStale ? (
                  <Clock size={12} className="shrink-0 text-editorial-gold" />
                ) : (
                  <CheckCircle size={12} className="shrink-0 text-editorial-green" />
                )
              ) : (
                <XCircle size={12} className="shrink-0 text-ink-muted/40" />
              )}
              <span className={cn("text-xs", hasData ? "text-ink" : "text-ink-muted")}>
                {t.label}
              </span>
              {isStale && (
                <span className="ml-auto text-[8px] font-bold uppercase tracking-wider text-editorial-gold">
                  Stale
                </span>
              )}
            </div>
          );
        })}
      </div>
      {available < 3 && (
        <div className="mt-4 flex items-start gap-2 border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-editorial-gold" />
          <div>
            <p className="text-xs font-medium text-ink">
              Run at least 3 analyses for meaningful recommendations
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              The more analyses available, the smarter and more accurate the recommendations will be.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Score Bar ─── */

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 70
      ? "bg-editorial-green"
      : score >= 40
        ? "bg-editorial-gold"
        : "bg-editorial-red";

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          {label}
        </span>
        <span className="font-mono text-sm font-bold text-ink">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Effort/Impact Badge ─── */

function Badge({
  label,
  variant,
}: {
  label: string;
  variant: "critical" | "high" | "medium" | "low";
}) {
  const colors: Record<string, string> = {
    critical: "text-editorial-red border-rule bg-surface-raised",
    high: "text-editorial-red border-rule bg-surface-raised",
    medium: "text-editorial-gold border-rule bg-surface-raised",
    low: "text-editorial-green border-rule bg-surface-raised",
  };
  return (
    <span
      className={cn(
        "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        colors[variant] || colors.medium,
      )}
    >
      {label}
    </span>
  );
}

/* ─── Collapsible Section ─── */

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-rule bg-surface-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <h4 className="font-serif text-sm font-bold text-ink">{title}</h4>
        {open ? (
          <ChevronUp size={14} className="text-ink-muted" />
        ) : (
          <ChevronDown size={14} className="text-ink-muted" />
        )}
      </button>
      {open && <div className="border-t border-rule px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

/* ─── Recommendations Renderer ─── */

function RecommendationsRenderer({
  data,
}: {
  data: Record<string, unknown>;
}) {
  // Robustly extract JSON from various wrapper formats
  function tryParseString(text: string): Record<string, unknown> | null {
    // Strategy 1: direct parse
    try {
      const v = JSON.parse(text.trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch { /* continue */ }
    // Strategy 2: extract outermost {...}
    const braceMatch = text.match(/(\{[\s\S]*\})/);
    if (braceMatch) {
      try {
        const v = JSON.parse(braceMatch[1].trim());
        if (v && typeof v === "object") return v as Record<string, unknown>;
      } catch { /* continue */ }
    }
    // Strategy 3: code block extraction
    const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      try {
        const v = JSON.parse(codeMatch[1].trim());
        if (v && typeof v === "object") return v as Record<string, unknown>;
      } catch { /* continue */ }
    }
    return null;
  }

  let parsed: Record<string, unknown> = data;

  // Unwrap { raw: "..." } — the string may need multi-strategy parsing
  if (typeof parsed.raw === "string") {
    const attempt = tryParseString(parsed.raw);
    if (attempt) parsed = attempt;
  }
  // Handle double-wrapped raw
  if (typeof parsed.raw === "string") {
    const attempt = tryParseString(parsed.raw);
    if (attempt) parsed = attempt;
  }
  // Handle { result: "..." } wrapper
  if (typeof parsed.result === "string") {
    const attempt = tryParseString(parsed.result);
    if (attempt) parsed = attempt;
  }

  const rec = (parsed.recommendations ?? parsed) as Record<string, unknown>;
  const platformContext = rec.platformContext as Record<string, unknown> | undefined;
  const healthScore = rec.healthScore as Record<string, unknown> | undefined;
  const topPriorities = (rec.topPriorities ?? []) as Record<string, unknown>[];
  const detailed = (rec.detailedRecommendations ?? []) as Record<string, unknown>[];
  const quickWins = (rec.quickWins ?? []) as Record<string, unknown>[];
  const avoidList = (rec.avoidList ?? []) as Record<string, unknown>[];
  const projections = rec.projections as Record<string, unknown> | undefined;
  const dataGaps = (rec.dataGaps ?? []) as string[];
  const breakdown = (healthScore?.breakdown ?? {}) as Record<string, number>;

  // Fallback for raw/unparsed data
  if (!platformContext && !healthScore && !topPriorities.length) {
    return (
      <div className="border border-rule bg-surface-card p-4">
        <p className="mb-2 text-xs font-semibold text-ink-muted">Could not parse recommendations. Try clicking Regenerate.</p>
        <details>
          <summary className="cursor-pointer text-[10px] text-ink-muted">Show raw data</summary>
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs text-ink-secondary">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Disclaimer */}
      <div className="flex items-start gap-3 border border-rule bg-surface-raised px-4 py-3">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-ink-muted" />
        <p className="text-[11px] leading-relaxed text-ink-muted">
          These recommendations are generated based on available data and
          general platform algorithm knowledge. Actual results will vary based on
          content quality, consistency, audience response, and platform algorithm
          changes. Nothing here is a guarantee of specific outcomes. Always test
          strategies with your own audience and iterate based on real performance
          data.
        </p>
      </div>

      {/* 2. Platform Context */}
      {platformContext && (
        <div className="border border-rule bg-surface-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              Platform
            </span>
            <span className="font-serif text-sm font-bold capitalize text-ink">
              {platformContext.platform as string}
            </span>
            {!!platformContext.creatorTier && (
              <span className="ml-auto border border-rule px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-secondary">
                {platformContext.creatorTier as string}
              </span>
            )}
          </div>
          {!!platformContext.algorithmSummary && (
            <p className="text-xs leading-relaxed text-ink-secondary">
              {platformContext.algorithmSummary as string}
            </p>
          )}
          {!!platformContext.competitivePosition && (
            <p className="mt-2 text-xs text-ink-muted">
              {platformContext.competitivePosition as string}
            </p>
          )}
        </div>
      )}

      {/* 3. Health Score */}
      {healthScore && (
        <div className="border border-rule bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Overall Score
              </p>
              <p className="font-serif text-4xl font-bold text-ink">
                {healthScore.overall as number}
              </p>
            </div>
            {!!healthScore.summary && (
              <p className="flex-1 text-xs leading-relaxed text-ink-secondary">
                {healthScore.summary as string}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {["content", "growth", "engagement", "monetization", "optimization"].map(
              (key) =>
                breakdown[key] != null && (
                  <ScoreBar
                    key={key}
                    label={key}
                    score={breakdown[key]}
                  />
                ),
            )}
          </div>
        </div>
      )}

      {/* 4. Top 3 Priorities */}
      {topPriorities.length > 0 && (
        <div>
          <h3 className="mb-3 font-serif text-sm font-bold text-ink">
            Top Priorities
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {topPriorities.map((p, i) => (
              <div key={i} className="border border-rule bg-surface-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-editorial-red text-[11px] font-bold text-white">
                    {p.rank as number}
                  </span>
                  <h4 className="font-serif text-sm font-bold text-ink">
                    {p.title as string}
                  </h4>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-ink-secondary">
                  {p.description as string}
                </p>
                <div className="mb-2 border border-editorial-green/20 bg-editorial-green/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-editorial-green">
                    Expected Result
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-ink">
                    {p.expectedResult as string}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    label={`${p.effort as string} effort`}
                    variant={p.effort as "low" | "medium" | "high"}
                  />
                  <Badge
                    label={`${p.impact as string} impact`}
                    variant={p.impact as "critical" | "high" | "medium" | "low"}
                  />
                  {!!p.timeframe && (
                    <span className="flex items-center gap-1 text-[10px] text-ink-muted">
                      <Clock size={9} />
                      {p.timeframe as string}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Quick Wins */}
      {quickWins.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-serif text-sm font-bold text-ink">
            <Zap size={14} className="text-editorial-gold" />
            Quick Wins
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {quickWins.map((qw, i) => (
              <div
                key={i}
                className="flex items-start gap-3 border border-rule bg-surface-card p-3"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-editorial-gold/10 text-[10px] font-bold text-editorial-gold">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink">
                    {qw.action as string}
                  </p>
                  <p className="mt-1 text-[11px] text-editorial-green">
                    {qw.expectedResult as string}
                  </p>
                  {!!qw.timeToImplement && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-muted">
                      <Clock size={8} />
                      {qw.timeToImplement as string}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Detailed Recommendations by Category */}
      {detailed.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-sm font-bold text-ink">
            Detailed Recommendations
          </h3>
          {detailed.map((cat, ci) => {
            const items = (cat.items ?? []) as Record<string, unknown>[];
            if (!items.length) return null;
            return (
              <CollapsibleSection
                key={ci}
                title={cat.categoryLabel as string}
                defaultOpen={ci < 2}
              >
                <div className="space-y-4">
                  {items.map((item, ii) => (
                    <div key={ii} className="border-b border-rule pb-4 last:border-0 last:pb-0">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h5 className="text-xs font-semibold text-ink">
                          {item.title as string}
                        </h5>
                        <div className="flex shrink-0 items-center gap-1">
                          <Badge
                            label={item.effort as string}
                            variant={item.effort as "low" | "medium" | "high"}
                          />
                          <Badge
                            label={item.impact as string}
                            variant={item.impact as "low" | "medium" | "high"}
                          />
                        </div>
                      </div>
                      <p className="mb-2 text-xs leading-relaxed text-ink-secondary">
                        {item.description as string}
                      </p>
                      {!!item.expectedResult && (
                        <p className="mb-2 text-xs font-medium text-editorial-green">
                          Expected: {item.expectedResult as string}
                        </p>
                      )}
                      {!!item.algorithmTip && (
                        <div className="mb-2 border-l-2 border-editorial-gold bg-editorial-gold/5 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-editorial-gold">
                            Algorithm Tip
                          </p>
                          <p className="mt-0.5 text-[11px] text-ink-secondary">
                            {item.algorithmTip as string}
                          </p>
                        </div>
                      )}
                      {(item.steps as string[])?.length > 0 && (
                        <ol className="mt-2 space-y-1">
                          {(item.steps as string[]).map((step, si) => (
                            <li key={si} className="flex gap-2 text-[11px] text-ink-secondary">
                              <span className="shrink-0 font-mono font-bold text-ink-muted">
                                {si + 1}.
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      )}
                      {!!item.timeframe && (
                        <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-muted">
                          <Clock size={8} />
                          {item.timeframe as string}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            );
          })}
        </div>
      )}

      {/* 7. Avoid List */}
      {avoidList.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-serif text-sm font-bold text-ink">
            <ShieldAlert size={14} className="text-editorial-red" />
            Common Mistakes to Avoid
          </h3>
          <div className="space-y-2">
            {avoidList.map((item, i) => (
              <div
                key={i}
                className="border border-editorial-red/20 bg-editorial-red/5 px-4 py-3"
              >
                <p className="text-xs font-semibold text-ink">
                  {item.mistake as string}
                </p>
                <p className="mt-1 text-[11px] text-ink-secondary">
                  {item.reason as string}
                </p>
                {!!item.algorithmPenalty && (
                  <p className="mt-1 text-[10px] font-medium text-editorial-red">
                    Algorithm penalty: {item.algorithmPenalty as string}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Projections */}
      {projections && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-serif text-sm font-bold text-ink">
            <TrendingUp size={14} className="text-editorial-green" />
            Growth Projections
            <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Projected</span>
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {["thirtyDay", "ninetyDay"].map((key) => {
              const p = projections[key] as Record<string, string> | undefined;
              if (!p) return null;
              return (
                <div key={key} className="border border-rule bg-surface-card p-4">
                  <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                    {key === "thirtyDay" ? "30-Day Projection" : "90-Day Projection"}
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: "Followers", value: p.followers },
                      { label: "Engagement Rate", value: p.engagementRate },
                      { label: "Reach", value: p.reach },
                      { label: "Revenue Potential", value: p.revenue },
                    ].map(
                      (row) =>
                        row.value && (
                          <div
                            key={row.label}
                            className="flex items-center justify-between border-b border-rule/50 pb-1.5 last:border-0 last:pb-0"
                          >
                            <span className="text-xs text-ink-secondary">
                              {row.label}
                            </span>
                            <span className="font-mono text-xs font-bold text-ink">
                              {row.value}
                            </span>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!!projections.assumptions && (
            <p className="mt-2 text-[10px] text-ink-muted">
              Assumptions: {projections.assumptions as string}
            </p>
          )}
        </div>
      )}

      {/* 9. Data Gaps */}
      {dataGaps.length > 0 && (
        <div className="border border-rule bg-surface-raised px-4 py-3">
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink">
            <Target size={12} className="text-ink-muted" />
            Run These Analyses for Better Recommendations
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {dataGaps.map((gap, i) => (
              <span
                key={i}
                className="border border-rule bg-surface-card px-2 py-0.5 text-[10px] text-ink-secondary"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LocalStorage Cache ─── */

const LS_KEY = "govirall_recommendations_";

function saveToLocalCache(profileId: string, data: Record<string, unknown>) {
  try {
    localStorage.setItem(
      LS_KEY + profileId,
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch { /* quota exceeded — ignore */ }
}

function loadFromLocalCache(profileId: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LS_KEY + profileId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire after 7 days
    if (Date.now() - parsed.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed.data as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ─── Main Component ─── */

export function RecommendationsClient({
  profiles,
  cachedResults,
  analysisStatus,
}: RecommendationsClientProps) {
  const defaultId = profiles[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Initialize from server cache (DB) first, fall back to localStorage
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(
    defaultId ? cachedResults[defaultId] ?? null : null,
  );

  // On mount, check localStorage if no server-cached data
  useEffect(() => {
    if (!resultData && defaultId) {
      const local = loadFromLocalCache(defaultId);
      if (local) setResultData(local);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const status = selectedId
    ? analysisStatus[selectedId] ?? ({} as Record<AnalysisType, { hasData: boolean; createdAt: string | null }>)
    : ({} as Record<AnalysisType, { hasData: boolean; createdAt: string | null }>);

  useEffect(() => {
    trackEvent("page_view", "recommendations");
  }, []);

  function handleGenerate() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await runRecommendations(selectedId);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setResultData(result.data);
        saveToLocalCache(selectedId, result.data);
        trackEvent("recommendations_generated", "recommendations");
      }
    });
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">
          Add a social profile to use Recommendations.
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
          setResultData(cachedResults[id] ?? loadFromLocalCache(id));
          setError(null);
        }}
      />

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Recommendations
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Action plan synthesized from all your analyses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={isPending || !selectedId}
              className="flex items-center gap-2 bg-editorial-red px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </>
              ) : resultData ? (
                <>
                  <RefreshCw size={14} />
                  Regenerate
                </>
              ) : (
                <>
                  <Play size={14} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Health Check */}
        <HealthCheckGrid status={status} />

        {/* Error */}
        {error && (
          <div className="border border-rule bg-surface-raised px-4 py-3 text-sm text-editorial-red">
            {error}
          </div>
        )}

        {/* Processing */}
        {isPending && <ProcessingAnimation />}

        {/* Results */}
        {!isPending && resultData && <RecommendationsRenderer data={resultData} />}

        {/* Empty state */}
        {!isPending && !resultData && !error && (
          <div className="border border-rule bg-surface-card px-6 py-12 text-center">
            <p className="text-sm text-ink-secondary">
              Click "Generate" to create personalized recommendations based on
              all your analysis data.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
