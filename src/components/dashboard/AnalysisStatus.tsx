"use client";

import { cn } from "@/lib/utils";
import { ANALYSIS_TYPES, type AnalysisType } from "@/types";

interface AnalysisStatusProps {
  status: Record<AnalysisType, { hasData: boolean; createdAt: string | null }>;
}

export function AnalysisStatus({ status }: AnalysisStatusProps) {
  return (
    <div className="border border-rule bg-surface-card p-4">
      <h3 className="font-serif text-sm font-bold text-ink mb-3">Analysis Status</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {ANALYSIS_TYPES.filter(({ type }) => type !== "recommendations").map(({ type, label }) => {
          const s = status[type];
          const hasData = s?.hasData ?? false;
          return (
            <div
              key={type}
              className="flex items-center justify-between bg-surface-raised px-3 py-2"
            >
              <span className="text-xs font-medium text-ink-secondary">
                {label}
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  hasData ? "text-editorial-green" : "text-ink-muted",
                )}
              >
                {hasData ? "Done" : "Not Run"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
