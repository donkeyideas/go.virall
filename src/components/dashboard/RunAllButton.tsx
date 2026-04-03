"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Play, Loader2, CheckCircle } from "lucide-react";
import { runAllAnalyses } from "@/lib/actions/analyses";
import { ANALYSIS_TYPES } from "@/types";
import { cn } from "@/lib/utils";

interface RunAllButtonProps {
  profileId: string;
  /** When provided, runs analyses for ALL profiles sequentially */
  allProfileIds?: string[];
  className?: string;
}

// Recommendations excluded — user runs it manually after Run All completes
const RUN_ALL_TYPES = ANALYSIS_TYPES.filter((a) => a.type !== "recommendations");

function RunAllProcessing() {
  const totalSteps = RUN_ALL_TYPES.length;
  const estimatedSeconds = 120;
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
    const stepDuration = (estimatedSeconds / totalSteps) * 1000;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < totalSteps - 1 ? prev + 1 : prev));
    }, stepDuration);
    return () => clearInterval(timer);
  }, [totalSteps]);

  const progress = Math.min((elapsed / estimatedSeconds) * 100, 95);
  const remaining = Math.max(estimatedSeconds - elapsed, 0);

  function formatTime(secs: number): string {
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  return (
    <div className="mt-4 border border-rule bg-surface-card p-6">
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
            Running All Analyses
          </h3>
          <p className="text-[11px] text-ink-muted">
            Processing {RUN_ALL_TYPES.length} analysis types
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-[10px] text-ink-muted">
          <span>Overall Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden bg-surface-raised">
          <div
            className="h-full bg-editorial-red transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mb-5 grid gap-1.5 sm:grid-cols-2">
        {RUN_ALL_TYPES.map((analysis, i) => (
          <div key={analysis.type} className="flex items-center gap-2">
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
              {analysis.label}
            </span>
          </div>
        ))}
      </div>

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

export function RunAllButton({ profileId, allProfileIds, className }: RunAllButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const ids = allProfileIds ?? [profileId];
      let totalCompleted = 0;
      let totalCount = 0;

      // Run profiles in batches of 2 to avoid AI rate limits
      for (let i = 0; i < ids.length; i += 2) {
        const batch = ids.slice(i, i + 2);
        const batchResults = await Promise.allSettled(
          batch.map((id) => runAllAnalyses(id)),
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled") {
            totalCompleted += r.value.completed;
            totalCount += r.value.total;
          }
        }
      }

      setResult({ completed: totalCompleted, total: totalCount });
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 bg-editorial-red px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-70",
          className,
        )}
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Running Analyses...
          </>
        ) : result ? (
          <>
            <CheckCircle size={14} />
            {result.completed}/{result.total} Complete
          </>
        ) : (
          <>
            <Play size={14} />
            Run All Analyses
          </>
        )}
      </button>

      {isPending && <RunAllProcessing />}
    </div>
  );
}
