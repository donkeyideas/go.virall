import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getPostsPerformance, getPlatformGrowthComparison } from "@/lib/dal/analytics";
import { getCachedResultsBatch, getCachedResults, getAnalysisStatus } from "@/lib/dal/analyses";
import { getTrustScore, getTrustScoreHistory } from "@/lib/dal/trust";
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
  const tab = params.tab || "metrics";
  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);

  /* ── Strategy ── */
  if (tab === "strategy") {
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

  /* ── Intelligence ── */
  if (tab === "intelligence") {
    const [audience, competitors, network] = await Promise.all([
      getCachedResults(ids, "audience"),
      getCachedResults(ids, "competitors"),
      getCachedResults(ids, "network"),
    ]);
    return (
      <Suspense>
        <AnalyticsHubClient
          activeTab="intelligence"
          profiles={profiles}
          intelligenceCache={{ audience, competitors, network }}
        />
      </Suspense>
    );
  }

  /* ── SMO Score ── */
  if (tab === "smo-score") {
    const smoCache = await getCachedResults(ids, "smo_score");
    return (
      <Suspense>
        <AnalyticsHubClient
          activeTab="smo-score"
          profiles={profiles}
          smoCache={smoCache}
        />
      </Suspense>
    );
  }

  /* ── Trust Score ── */
  if (tab === "trust-score") {
    const [trustScore, trustHistory] = await Promise.all([
      getTrustScore(user.id),
      getTrustScoreHistory(user.id),
    ]);
    return (
      <Suspense>
        <AnalyticsHubClient
          activeTab="trust-score"
          profiles={profiles}
          trustScore={trustScore}
          trustHistory={trustHistory}
        />
      </Suspense>
    );
  }

  /* ── Recommendations ── */
  if (tab === "recommendations") {
    const [cachedResults, ...statusResults] = await Promise.all([
      getCachedResults(ids, "recommendations"),
      ...ids.map((id) => getAnalysisStatus(id)),
    ]);
    const analysisStatusMap: Record<string, Awaited<ReturnType<typeof getAnalysisStatus>>> = {};
    ids.forEach((id, i) => {
      analysisStatusMap[id] = statusResults[i];
    });
    return (
      <Suspense>
        <AnalyticsHubClient
          activeTab="recommendations"
          profiles={profiles}
          recommendationsCache={cachedResults}
          analysisStatus={analysisStatusMap}
        />
      </Suspense>
    );
  }

  /* ── Metrics (default) ── */
  const [posts, platformGrowth, batch] = await Promise.all([
    getPostsPerformance(),
    getPlatformGrowthComparison(),
    getCachedResultsBatch(ids, ["earnings_forecast", "competitors"]),
  ]);

  return (
    <Suspense>
      <AnalyticsHubClient
        activeTab="metrics"
        profiles={profiles}
        posts={posts}
        platformGrowth={platformGrowth}
        earningsResults={batch.earnings_forecast}
        competitorResults={batch.competitors}
      />
    </Suspense>
  );
}
