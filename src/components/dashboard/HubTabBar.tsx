"use client";

import { cn } from "@/lib/utils";

interface HubTabBarProps {
  tabs: { key: string; label: string }[];
  activeKey: string;
  onSwitch: (key: string) => void;
}

export function HubTabBar({ tabs, activeKey, onSwitch }: HubTabBarProps) {
  return (
    <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-rule">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onSwitch(tab.key)}
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
  );
}
