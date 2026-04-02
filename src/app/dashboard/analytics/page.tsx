import { Suspense } from "react";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getPostsPerformance, getPlatformGrowthComparison } from "@/lib/dal/analytics";
import { getCachedResults } from "@/lib/dal/analyses";
import { AnalyticsClient } from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [profiles, posts, platformGrowth] = await Promise.all([
    getSocialProfiles(),
    getPostsPerformance(),
    getPlatformGrowthComparison(),
  ]);

  const ids = profiles.map((p) => p.id);
  const [earningsResults, competitorResults] = await Promise.all([
    getCachedResults(ids, "earnings_forecast"),
    getCachedResults(ids, "competitors"),
  ]);

  return (
    <Suspense>
      <AnalyticsClient
        profiles={profiles}
        posts={posts}
        platformGrowth={platformGrowth}
        earningsResults={earningsResults}
        competitorResults={competitorResults}
      />
    </Suspense>
  );
}
