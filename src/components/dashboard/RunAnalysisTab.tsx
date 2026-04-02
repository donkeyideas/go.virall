"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { ProfileSelector } from "./ProfileSelector";
import { AnalysisResultRenderer } from "./AnalysisResultRenderer";
import { Play, Loader2, RefreshCw } from "lucide-react";
import { runAnalysis } from "@/lib/actions/analyses";
import { trackEvent } from "@/lib/analytics/track";
import type { SocialProfile, AnalysisType } from "@/types";

interface RunAnalysisTabProps {
  profiles: SocialProfile[];
  analysisType: AnalysisType;
  title: string;
  description: string;
  buttonLabel?: string;
  /** Cached results keyed by profileId, loaded from DB on page render */
  cachedResults?: Record<string, Record<string, unknown>>;
}

const ANALYSIS_META: Record<
  AnalysisType,
  { estimatedSeconds: number; steps: string[] }
> = {
  growth: {
    estimatedSeconds: 30,
    steps: [
      "Collecting profile data",
      "Analyzing engagement patterns",
      "Benchmarking against niche averages",
      "Generating growth strategies",
      "Prioritizing recommendations",
    ],
  },
  content_strategy: {
    estimatedSeconds: 35,
    steps: [
      "Analyzing posting history",
      "Evaluating content performance",
      "Mapping optimal posting times",
      "Building content mix recommendations",
      "Creating weekly calendar",
    ],
  },
  hashtags: {
    estimatedSeconds: 20,
    steps: [
      "Scanning niche hashtags",
      "Analyzing reach potential",
      "Categorizing by strategy",
      "Generating optimized sets",
    ],
  },
  competitors: {
    estimatedSeconds: 30,
    steps: [
      "Gathering competitor data",
      "Comparing engagement metrics",
      "Identifying market gaps",
      "Building competitive analysis",
      "Generating recommendations",
    ],
  },
  insights: {
    estimatedSeconds: 35,
    steps: [
      "Analyzing profile metrics",
      "Identifying trends and patterns",
      "Evaluating strategic position",
      "Generating deep insights",
      "Compiling action items",
    ],
  },
  earnings_forecast: {
    estimatedSeconds: 30,
    steps: [
      "Evaluating monetization factors",
      "Calculating audience value",
      "Modeling revenue scenarios",
      "Building earnings projections",
      "Generating monetization tips",
    ],
  },
  thirty_day_plan: {
    estimatedSeconds: 40,
    steps: [
      "Assessing current position",
      "Setting weekly milestones",
      "Planning daily actions",
      "Optimizing content calendar",
      "Building your 30-day roadmap",
    ],
  },
  smo_score: {
    estimatedSeconds: 25,
    steps: [
      "Auditing profile completeness",
      "Measuring content quality",
      "Evaluating posting consistency",
      "Scoring engagement metrics",
      "Calculating overall SMO score",
    ],
  },
  audience: {
    estimatedSeconds: 30,
    steps: [
      "Analyzing follower demographics",
      "Estimating audience interests",
      "Mapping geographic distribution",
      "Scoring audience quality",
      "Assessing growth potential",
    ],
  },
  network: {
    estimatedSeconds: 25,
    steps: [
      "Mapping creator network",
      "Identifying collaboration opportunities",
      "Evaluating influence reach",
      "Generating networking strategies",
    ],
  },
  campaign_ideas: {
    estimatedSeconds: 35,
    steps: [
      "Analyzing brand alignment",
      "Researching campaign formats",
      "Estimating ROI potential",
      "Building campaign blueprints",
      "Generating implementation steps",
    ],
  },
  content_generator: {
    estimatedSeconds: 25,
    steps: [
      "Analyzing your profile and niche",
      "Crafting content ideas",
      "Optimizing for engagement",
      "Generating final content",
    ],
  },
  recommendations: {
    estimatedSeconds: 60,
    steps: [
      "Collecting all analysis data",
      "Cross-referencing findings",
      "Applying platform algorithm knowledge",
      "Synthesizing recommendations",
      "Calculating growth projections",
      "Prioritizing by impact and effort",
    ],
  },
};

function ProcessingAnimation({
  analysisType,
  title,
}: {
  analysisType: AnalysisType;
  title: string;
}) {
  const meta = ANALYSIS_META[analysisType];
  const [elapsed, setElapsed] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const secs = Math.floor((Date.now() - startTime.current) / 1000);
      setElapsed(secs);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stepDuration = (meta.estimatedSeconds / meta.steps.length) * 1000;
    const timer = setInterval(() => {
      setCurrentStep((prev) =>
        prev < meta.steps.length - 1 ? prev + 1 : prev,
      );
    }, stepDuration);
    return () => clearInterval(timer);
  }, [meta]);

  const progress = Math.min((elapsed / meta.estimatedSeconds) * 100, 95);
  const remaining = Math.max(meta.estimatedSeconds - elapsed, 0);

  function formatTime(secs: number): string {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  return (
    <div className="border border-rule bg-surface-card p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <svg className="-rotate-90 h-10 w-10" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              className="text-surface-raised"
              strokeWidth="3"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              className="text-editorial-red transition-all duration-1000"
              strokeWidth="3"
              strokeDasharray={`${progress} ${100 - progress}`}
              strokeLinecap="round"
            />
          </svg>
          <Loader2
            size={16}
            className="absolute inset-0 m-auto animate-spin text-editorial-red"
          />
        </div>
        <div>
          <h3 className="font-serif text-base font-bold text-ink">
            Analyzing {title}
          </h3>
          <p className="text-[11px] text-ink-muted">
            AI is processing your profile data
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-[10px] text-ink-muted">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden bg-surface-raised">
          <div
            className="h-full bg-editorial-red transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="mb-5 space-y-2">
        {meta.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {i < currentStep ? (
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  className="text-editorial-green"
                >
                  <path
                    d="M2 5l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
            <span
              className={
                i < currentStep
                  ? "text-xs text-ink-secondary line-through decoration-ink-muted/30"
                  : i === currentStep
                    ? "text-xs font-medium text-ink"
                    : "text-xs text-ink-muted"
              }
            >
              {step}
            </span>
          </div>
        ))}
      </div>

      {/* Time info */}
      <div className="flex items-center justify-between border-t border-rule pt-3">
        <div className="flex items-center gap-4 text-[10px] text-ink-muted">
          <span>
            Elapsed:{" "}
            <span className="font-mono text-ink">{formatTime(elapsed)}</span>
          </span>
          {remaining > 0 && (
            <span>
              Est. remaining:{" "}
              <span className="font-mono text-ink">
                ~{formatTime(remaining)}
              </span>
            </span>
          )}
        </div>
        <span className="text-[9px] uppercase tracking-wider text-ink-muted">
          Powered by Go Virall
        </span>
      </div>
    </div>
  );
}

export function RunAnalysisTab({
  profiles,
  analysisType,
  title,
  description,
  buttonLabel,
  cachedResults,
}: RunAnalysisTabProps) {
  const defaultId = profiles[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(
    // Initialize from cached results for the default profile
    (defaultId ? cachedResults?.[defaultId] ?? null : null),
  );

  function handleRun() {
    if (!selectedId) return;
    setError(null);
    trackEvent("analysis_run", "smo-score", { type: analysisType });
    startTransition(async () => {
      const result = await runAnalysis(selectedId, analysisType);
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setResultData(result.data);
      } else {
        // Analysis returned successfully but with no data
        setResultData({});
      }
    });
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">Add a social profile to use {title}.</p>
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
          // Load cached result for the switched-to profile
          setResultData(cachedResults?.[id] ?? null);
        }}
      />

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-ink">{title}</h2>
          <button
            onClick={handleRun}
            disabled={isPending || !selectedId}
            className="flex items-center gap-2 bg-editorial-red px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-70"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Running...
              </>
            ) : resultData ? (
              <>
                <RefreshCw size={14} />
                Re-run
              </>
            ) : (
              <>
                <Play size={14} />
                {buttonLabel ?? `Run ${title}`}
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="border border-rule bg-surface-raised px-4 py-3 text-sm text-editorial-red">
            {error}
          </div>
        )}

        {isPending ? (
          <ProcessingAnimation analysisType={analysisType} title={title} />
        ) : resultData ? (
          <AnalysisResultRenderer type={analysisType} data={resultData} profile={profiles.find(p => p.id === selectedId)} />
        ) : (
          <div className="border border-rule bg-surface-card px-6 py-12 text-center">
            <p className="text-sm text-ink-secondary">{description}</p>
          </div>
        )}
      </div>
    </>
  );
}
