import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResultsBatch } from "@/lib/dal/analyses";
import { GroupedAnalysisPage } from "@/components/dashboard/GroupedAnalysisPage";

export const dynamic = "force-dynamic";

const STRATEGY_TABS = [
  {
    key: "growth",
    label: "Growth",
    analysisType: "growth" as const,
    title: "Growth Tips",
    description: "Click 'Generate Growth Tips' to get personalized growth recommendations for your profile.",
    buttonLabel: "Generate Growth Tips",
  },
  {
    key: "content-strategy",
    label: "Content Strategy",
    analysisType: "content_strategy" as const,
    title: "Content Strategy",
    description: "Click 'Run Content Strategy' to get personalized posting schedules, content mix recommendations, and a weekly content calendar.",
    buttonLabel: "Run Content Strategy",
  },
  {
    key: "30-day-plan",
    label: "30-Day Plan",
    analysisType: "thirty_day_plan" as const,
    title: "30-Day Plan",
    description: "Click 'Generate Plan' to get a day-by-day action plan with weekly milestones, content calendar, and growth targets.",
    buttonLabel: "Generate Plan",
  },
  {
    key: "hashtags",
    label: "Hashtags",
    analysisType: "hashtags" as const,
    title: "Hashtags",
    description: "Click 'Generate Hashtags' to get optimized hashtag sets organized by niche, growth, community, and trending categories.",
    buttonLabel: "Generate Hashtags",
  },
];

export default async function StrategyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);
  const batch = await getCachedResultsBatch(ids, [
    "growth",
    "content_strategy",
    "thirty_day_plan",
    "hashtags",
  ]);

  return (
    <Suspense>
      <GroupedAnalysisPage
        profiles={profiles}
        tabs={STRATEGY_TABS}
        cachedResultsByTab={{
          growth: batch.growth,
          "content-strategy": batch.content_strategy,
          "30-day-plan": batch.thirty_day_plan,
          hashtags: batch.hashtags,
        }}
        defaultTab="growth"
        paramName="stab"
      />
    </Suspense>
  );
}
