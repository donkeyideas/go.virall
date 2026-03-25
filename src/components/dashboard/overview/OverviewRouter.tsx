"use client";

import { useViewMode } from "@/lib/contexts/view-mode";
import { SocialIntelligenceOverview } from "./SocialIntelligenceOverview";
import { ModernOverview } from "./ModernOverview";
import type { OverviewProps } from "./use-overview-data";

export function OverviewRouter(props: OverviewProps) {
  const { viewMode } = useViewMode();

  if (viewMode === "modern") {
    return <ModernOverview {...props} />;
  }

  return <SocialIntelligenceOverview {...props} />;
}
