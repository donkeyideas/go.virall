"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { RunAnalysisTab } from "./RunAnalysisTab";
import { cn } from "@/lib/utils";
import type { SocialProfile, AnalysisType } from "@/types";

export interface TabDef {
  key: string;
  label: string;
  analysisType: AnalysisType;
  title: string;
  description: string;
  buttonLabel: string;
}

interface GroupedAnalysisPageProps {
  profiles: SocialProfile[];
  tabs: TabDef[];
  cachedResultsByTab: Record<string, Record<string, Record<string, unknown>>>;
  defaultTab: string;
}

export function GroupedAnalysisPage({
  profiles,
  tabs,
  cachedResultsByTab,
  defaultTab,
}: GroupedAnalysisPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeKey = searchParams.get("tab") || defaultTab;
  const activeTab = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  function switchTab(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-rule">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors",
              activeTab.key === tab.key
                ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-secondary hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <RunAnalysisTab
        key={activeTab.key}
        profiles={profiles}
        analysisType={activeTab.analysisType}
        title={activeTab.title}
        description={activeTab.description}
        buttonLabel={activeTab.buttonLabel}
        cachedResults={cachedResultsByTab[activeTab.key] ?? {}}
      />
    </div>
  );
}
