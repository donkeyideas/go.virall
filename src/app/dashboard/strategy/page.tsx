import { Suspense } from "react";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults } from "@/lib/dal/analyses";
import { GroupedAnalysisPage, type TabDef } from "@/components/dashboard/GroupedAnalysisPage";

const STRATEGY_TABS: TabDef[] = [
  {
    key: "growth",
    label: "Growth",
    analysisType: "growth",
    title: "Growth Tips",
    description:
      "Click 'Generate Growth Tips' to get personalized growth recommendations for your profile.",
    buttonLabel: "Generate Growth Tips",
  },
  {
    key: "content-strategy",
    label: "Content Strategy",
    analysisType: "content_strategy",
    title: "Content Strategy",
    description:
      "Click 'Run Content Strategy' to get personalized posting schedules, content mix recommendations, and a weekly content calendar.",
    buttonLabel: "Run Content Strategy",
  },
  {
    key: "30-day-plan",
    label: "30-Day Plan",
    analysisType: "thirty_day_plan",
    title: "30-Day Plan",
    description:
      "Click 'Generate Plan' to get a day-by-day action plan with weekly milestones, content calendar, and growth targets.",
    buttonLabel: "Generate Plan",
  },
  {
    key: "hashtags",
    label: "Hashtags",
    analysisType: "hashtags",
    title: "Hashtags",
    description:
      "Click 'Generate Hashtags' to get optimized hashtag sets organized by niche, growth, community, and trending categories.",
    buttonLabel: "Generate Hashtags",
  },
];

export default async function StrategyPage() {
  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);

  const [growth, contentStrategy, thirtyDayPlan, hashtags] = await Promise.all([
    getCachedResults(ids, "growth"),
    getCachedResults(ids, "content_strategy"),
    getCachedResults(ids, "thirty_day_plan"),
    getCachedResults(ids, "hashtags"),
  ]);

  return (
    <Suspense>
      <GroupedAnalysisPage
        profiles={profiles}
        tabs={STRATEGY_TABS}
        cachedResultsByTab={{
          growth,
          "content-strategy": contentStrategy,
          "30-day-plan": thirtyDayPlan,
          hashtags,
        }}
        defaultTab="growth"
      />
    </Suspense>
  );
}
