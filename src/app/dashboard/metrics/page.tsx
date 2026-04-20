import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getPostsPerformance, getPlatformGrowthComparison } from "@/lib/dal/analytics";
import { getCachedResultsBatch } from "@/lib/dal/analyses";
import { AnalyticsClient } from "@/app/dashboard/analytics/AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);
  const [posts, platformGrowth, batch] = await Promise.all([
    getPostsPerformance(),
    getPlatformGrowthComparison(),
    getCachedResultsBatch(ids, ["earnings_forecast", "competitors"]),
  ]);

  return (
    <Suspense>
      <AnalyticsClient
        profiles={profiles}
        posts={posts}
        platformGrowth={platformGrowth}
        earningsResults={batch.earnings_forecast}
        competitorResults={batch.competitors}
      />
    </Suspense>
  );
}
