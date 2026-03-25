import { Suspense } from "react";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults } from "@/lib/dal/analyses";
import { GroupedAnalysisPage, type TabDef } from "@/components/dashboard/GroupedAnalysisPage";

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

export default async function MonetizationPage() {
  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);

  const [revenue, campaigns] = await Promise.all([
    getCachedResults(ids, "earnings_forecast"),
    getCachedResults(ids, "campaign_ideas"),
  ]);

  return (
    <Suspense>
      <GroupedAnalysisPage
        profiles={profiles}
        tabs={MONETIZATION_TABS}
        cachedResultsByTab={{ revenue, campaigns }}
        defaultTab="revenue"
      />
    </Suspense>
  );
}
