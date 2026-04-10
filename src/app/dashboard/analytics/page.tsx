import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getPostsPerformance, getPlatformGrowthComparison } from "@/lib/dal/analytics";
import { getCachedResultsBatch } from "@/lib/dal/analyses";
import { AnalyticsHubClient } from "./AnalyticsHubClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const tab = params.tab || "analytics";
  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);

  if (tab === "strategy") {
    // Strategy only — 1 batched query instead of 4 separate
    const batch = await getCachedResultsBatch(ids, [
      "growth",
      "content_strategy",
      "thirty_day_plan",
      "hashtags",
    ]);
    return (
      <Suspense>
        <AnalyticsHubClient
          activeTab="strategy"
          profiles={profiles}
          strategyCache={{
            growth: batch.growth,
            "content-strategy": batch.content_strategy,
            "30-day-plan": batch.thirty_day_plan,
            hashtags: batch.hashtags,
          }}
        />
      </Suspense>
    );
  }

  // Analytics tab (default) — 1 batched query + 2 analytics queries
  const [posts, platformGrowth, batch] = await Promise.all([
    getPostsPerformance(),
    getPlatformGrowthComparison(),
    getCachedResultsBatch(ids, ["earnings_forecast", "competitors"]),
  ]);

  return (
    <Suspense>
      <AnalyticsHubClient
        activeTab="analytics"
        profiles={profiles}
        posts={posts}
        platformGrowth={platformGrowth}
        earningsResults={batch.earnings_forecast}
        competitorResults={batch.competitors}
      />
    </Suspense>
  );
}
