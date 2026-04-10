"use client";

import { useState, useTransition, useEffect } from "react";
import { cn } from "@/lib/utils";
import { RunAnalysisTab } from "@/components/dashboard/RunAnalysisTab";
import { AudienceQualityScore as AQSComponent } from "@/components/dashboard/AudienceQualityScore";
import { ProfileSelector } from "@/components/dashboard/ProfileSelector";
import { calculateAQS, getLatestAQS } from "@/lib/ai/audience-quality";
import type { SocialProfile, AudienceQualityScore } from "@/types";

interface SmoScoreClientProps {
  profiles: SocialProfile[];
  cachedResults: Record<string, Record<string, unknown>>;
}

type Tab = "smo" | "aqs";

export function SmoScoreClient({
  profiles,
  cachedResults,
}: SmoScoreClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("smo");

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-rule">
        {(
          [
            { key: "smo", label: "SMO Score" },
            { key: "aqs", label: "Audience Quality (AQS)" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "relative px-5 py-3 text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors",
              activeTab === tab.key
                ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-secondary hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-4">
        {activeTab === "smo" && (
          <RunAnalysisTab
            profiles={profiles}
            analysisType="smo_score"
            title="SMO Score"
            description="Click 'Calculate SMO Score' to get a Social Media Optimization score based on 6 factors: profile completeness, content quality, posting consistency, engagement, growth trajectory, and monetization readiness."
            buttonLabel="Calculate SMO Score"
            cachedResults={cachedResults}
          />
        )}

        {activeTab === "aqs" && (
          <AQSTab profiles={profiles} />
        )}
      </div>
    </div>
  );
}

// ── AQS Tab ──

function AQSTab({ profiles }: { profiles: SocialProfile[] }) {
  const defaultId = profiles[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [aqsScore, setAqsScore] = useState<AudienceQualityScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Fetch existing AQS on mount / profile change
  useEffect(() => {
    if (!selectedId) {
      setInitialLoading(false);
      return;
    }
    setInitialLoading(true);
    setAqsScore(null);
    getLatestAQS(selectedId).then((data) => {
      setAqsScore(data);
      setInitialLoading(false);
    }).catch(() => {
      setInitialLoading(false);
    });
  }, [selectedId]);

  function handleRecalculate() {
    if (!selectedId) return;
    setLoading(true);

    startTransition(async () => {
      const result = await calculateAQS(selectedId);
      if (result.success) {
        setAqsScore(result.data);
      }
      setLoading(false);
    });
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">
          Add a social profile to calculate your Audience Quality Score.
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
          setAqsScore(null);
        }}
      />

      <div className="mt-4">
        {initialLoading ? (
          <div className="flex items-center justify-center gap-2 py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-editorial-red border-t-transparent" />
            <span className="text-sm text-ink-muted">
              Loading AQS data...
            </span>
          </div>
        ) : (
          <AQSComponent
            score={aqsScore}
            onRecalculate={handleRecalculate}
            loading={loading || isPending}
          />
        )}
      </div>
    </>
  );
}
