"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HubTabBar } from "@/components/dashboard/HubTabBar";
import DealsClient from "@/app/dashboard/deals/DealsClient";
import ProposalsClient from "@/app/dashboard/proposals/ProposalsClient";
import { BrandOpportunities } from "@/components/dashboard/BrandOpportunities";
import { GroupedAnalysisPage, type TabDef } from "@/components/dashboard/GroupedAnalysisPage";
import { RevenueClient } from "@/app/dashboard/revenue/RevenueClient";
import { GoalsClient } from "@/components/dashboard/goals/GoalsClient";
import { trackEvent } from "@/lib/analytics/track";
import type { Deal, DealDeliverable, Proposal, SocialProfile, BrandCreatorMatch } from "@/types";
import type {
  RevenueStats,
  RevenueBySource,
  MonthlyRevenue,
  DealRevenueRow,
  PaymentHistoryRow,
  RevenueForecast,
} from "@/lib/dal/revenue";

/* ─── Hub-level tabs ─── */

const TABS = [
  { key: "deals", label: "Deals" },
  { key: "proposals", label: "Proposals" },
  { key: "opportunities", label: "Opportunities" },
  { key: "monetization", label: "Monetization" },
  { key: "revenue", label: "Revenue" },
  { key: "goals", label: "Goals" },
];

/* ─── Monetization sub-tabs (rendered via GroupedAnalysisPage) ─── */

const MONETIZATION_TABS: TabDef[] = [
  {
    key: "revenue",
    label: "Revenue",
    analysisType: "earnings_forecast",
    title: "Revenue & Earnings",
    description:
      "Click 'Run Forecast' to get 3-scenario earnings projections with monetization recommendations and revenue source breakdowns.",
    buttonLabel: "Run Forecast",
  },
  {
    key: "campaigns",
    label: "Campaigns",
    analysisType: "campaign_ideas",
    title: "Campaigns",
    description:
      "Click 'Generate Campaign Ideas' to get campaign recommendations with timelines, budgets, and implementation steps.",
    buttonLabel: "Generate Campaign Ideas",
  },
];

/* ─── Props (all optional per-tab, only active tab data is provided) ─── */

interface BusinessHubClientProps {
  activeTab: string;
  currentUserId: string;
  accountType?: "creator" | "brand";
  // Deals tab
  deals?: (Deal & { deliverables?: DealDeliverable[] })[];
  // Proposals tab
  proposals?: Proposal[];
  // Opportunities tab
  initialMatches?: BrandCreatorMatch[];
  // Monetization tab
  profiles?: SocialProfile[];
  monetizationCache?: Record<string, Record<string, Record<string, unknown>>>;
  // Revenue tab
  revenueStats?: RevenueStats;
  revenueSources?: RevenueBySource[];
  monthlyRevenue?: MonthlyRevenue[];
  dealRevenue?: DealRevenueRow[];
  payments?: PaymentHistoryRow[];
  revenueForecast?: RevenueForecast;
  // Goals tab
  goalsProfiles?: SocialProfile[];
}

/* ─── Component ─── */

export function BusinessHubClient({
  activeTab,
  currentUserId,
  deals,
  proposals,
  initialMatches,
  profiles,
  monetizationCache,
  revenueStats,
  revenueSources,
  monthlyRevenue,
  dealRevenue,
  payments,
  revenueForecast,
  goalsProfiles,
  accountType = "creator",
}: BusinessHubClientProps) {
  const router = useRouter();

  useEffect(() => {
    trackEvent("page_view", "business");
  }, []);

  function switchTab(key: string) {
    router.push(`/dashboard/business?tab=${key}`, { scroll: false });
  }

  return (
    <div>
      <HubTabBar tabs={TABS} activeKey={activeTab} onSwitch={switchTab} />

      {activeTab === "deals" && <DealsClient deals={deals ?? []} accountType={accountType} />}
      {activeTab === "proposals" && (
        <ProposalsClient proposals={proposals ?? []} currentUserId={currentUserId} accountType={accountType} />
      )}
      {activeTab === "opportunities" && (
        <BrandOpportunities initialMatches={initialMatches ?? []} />
      )}
      {activeTab === "monetization" && profiles && (
        <GroupedAnalysisPage
          profiles={profiles}
          tabs={MONETIZATION_TABS}
          cachedResultsByTab={monetizationCache ?? {}}
          defaultTab="revenue"
          paramName="mtab"
        />
      )}
      {activeTab === "revenue" && revenueStats && (
        <RevenueClient
          initialStats={revenueStats}
          initialSources={revenueSources ?? []}
          initialMonthly={monthlyRevenue ?? []}
          initialDeals={dealRevenue ?? []}
          initialPayments={payments ?? []}
          initialForecast={revenueForecast ?? { contractedRevenue: 0, inProgressRevenue: 0, projectedTotal: 0, dealCount: 0, avgDealValue: 0 }}
        />
      )}
      {activeTab === "goals" && (
        <GoalsClient profiles={goalsProfiles ?? profiles ?? []} />
      )}
    </div>
  );
}
