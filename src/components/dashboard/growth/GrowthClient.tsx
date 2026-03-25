"use client";

import { useState, useTransition, useEffect } from "react";
import { ProfileSelector } from "../ProfileSelector";
import { Play, Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { runAnalysis } from "@/lib/actions/analyses";
import { cn } from "@/lib/utils";
import type { SocialProfile, AnalysisType } from "@/types";

interface GrowthTip {
  title: string;
  description: string;
  priority: string;
  category: string;
  estimatedImpact?: string;
}

interface GrowthClientProps {
  profiles: SocialProfile[];
}

export function GrowthClient({ profiles }: GrowthClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    profiles[0]?.id ?? null,
  );
  const [tips, setTips] = useState<GrowthTip[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await runAnalysis(selectedId, "growth");
      if (result.error) {
        setError(result.error);
      } else {
        // Refresh the page to show new data
        window.location.reload();
      }
    });
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">Add a social profile to see growth tips.</p>
      </div>
    );
  }

  const priorityColor: Record<string, string> = {
    high: "text-editorial-red border-rule bg-surface-raised",
    medium: "text-editorial-gold border-rule bg-surface-raised",
    low: "text-editorial-green border-rule bg-surface-raised",
  };

  return (
    <>
      <ProfileSelector
        profiles={profiles}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-ink">Growth Tips</h2>
          <button
            onClick={handleRun}
            disabled={isPending || !selectedId}
            className="flex items-center gap-2 bg-editorial-red px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-70"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play size={14} />
                Generate Tips
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="border border-rule bg-surface-raised px-4 py-3 text-sm text-editorial-red">
            {error}
          </div>
        )}

        {tips.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="border border-rule bg-surface-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-sm font-bold text-ink">
                    {tip.title}
                  </h3>
                  <span
                    className={cn(
                      "border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      priorityColor[tip.priority] ?? "text-ink-muted",
                    )}
                  >
                    {tip.priority}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-secondary leading-relaxed">
                  {tip.description}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">
                    {tip.category}
                  </span>
                  {tip.estimatedImpact && (
                    <span className="text-[9px] text-editorial-green">
                      +{tip.estimatedImpact}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-rule bg-surface-card px-6 py-12 text-center">
            <p className="text-sm text-ink-secondary">
              Click &quot;Generate Tips&quot; to get personalized growth
              recommendations for your profile.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
