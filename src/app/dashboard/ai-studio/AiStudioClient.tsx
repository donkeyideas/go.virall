"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ContentGenerator } from "@/components/dashboard/ContentGenerator";
import { RunAnalysisTab } from "@/components/dashboard/RunAnalysisTab";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/track";
import type { SocialProfile } from "@/types";

interface AiStudioClientProps {
  profiles: SocialProfile[];
  cachedInsights: Record<string, Record<string, unknown>>;
}

const TABS = [
  { key: "content", label: "Content Generator" },
  { key: "strategic", label: "Strategic Analysis" },
] as const;

export function AiStudioClient({
  profiles,
  cachedInsights,
}: AiStudioClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeKey = searchParams.get("tab") || "content";

  useEffect(() => {
    trackEvent("page_view", "ai-studio");
  }, []);

  function switchTab(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-rule">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors",
              activeKey === tab.key
                ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-secondary hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab */}
      {activeKey === "content" ? (
        <ContentGenerator profiles={profiles} />
      ) : (
        <RunAnalysisTab
          profiles={profiles}
          analysisType="insights"
          title="Strategic Analysis"
          description="Click 'Generate Insights' to get deep strategic AI analysis covering trends, opportunities, and personalized recommendations."
          buttonLabel="Generate Insights"
          cachedResults={cachedInsights}
        />
      )}
    </div>
  );
}
