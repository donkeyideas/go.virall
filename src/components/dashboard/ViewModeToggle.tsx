"use client";

import { useViewMode } from "@/lib/contexts/view-mode";
import { cn } from "@/lib/utils";

export function ViewModeToggle({ className }: { className?: string }) {
  const { viewMode, setViewMode } = useViewMode();

  return (
    <button
      onClick={() =>
        setViewMode(viewMode === "modern" ? "editorial" : "modern")
      }
      className={cn(
        "inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors",
        className,
      )}
    >
      {viewMode === "modern" ? "Editorial" : "Modern"}
    </button>
  );
}
