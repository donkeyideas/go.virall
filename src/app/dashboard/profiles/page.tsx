import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getAnalysisStatus, getLatestAnalysis } from "@/lib/dal/analyses";
import { getCachedPosts } from "@/lib/cache/posts-cache";
import { OverviewClient } from "@/components/dashboard/overview/OverviewClient";
import type { RecentPost } from "@/types";

export default async function ProfilesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profiles = await getSocialProfiles();

  // Build recent posts map from DB column + in-memory cache fallback
  const recentPostsMap: Record<string, RecentPost[]> = {};

  for (const profile of profiles) {
    // Try DB column first (Supabase returns JSONB as parsed objects)
    const dbPosts = profile.recent_posts;
    if (dbPosts && Array.isArray(dbPosts) && dbPosts.length > 0) {
      recentPostsMap[profile.id] = dbPosts;
    } else if (typeof dbPosts === "string") {
      // Handle legacy double-encoded JSON strings
      try {
        const parsed = JSON.parse(dbPosts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          recentPostsMap[profile.id] = parsed;
        }
      } catch {
        // ignore parse errors
      }
    }

    // Fall back to in-memory cache
    if (!recentPostsMap[profile.id]) {
      const cached = getCachedPosts(profile.id);
      if (cached.length > 0) {
        recentPostsMap[profile.id] = cached;
      }
    }
  }

  // Fetch analysis status for ALL profiles in parallel
  const analysisStatusMap: Record<
    string,
    Record<string, { hasData: boolean; createdAt: string | null }>
  > = {};

  const statusResults = await Promise.all(
    profiles.map((profile) =>
      getAnalysisStatus(profile.id).catch(() => null),
    ),
  );

  for (let i = 0; i < profiles.length; i++) {
    const status = statusResults[i];
    if (status) {
      analysisStatusMap[profiles[i].id] = status;
    }
  }

  // Fetch est. earnings from the first profile's earnings_forecast analysis
  let estEarnings = 0;
  if (profiles.length > 0) {
    const earningsAnalysis = await getLatestAnalysis(profiles[0].id, "earnings_forecast").catch(() => null);
    if (earningsAnalysis?.result) {
      const result = earningsAnalysis.result as Record<string, unknown>;
      const forecast = (result.forecast ?? result) as Record<string, unknown>;
      const stats = forecast?.summaryStats as { estMonthly?: number } | undefined;
      estEarnings = stats?.estMonthly ?? 0;
    }
  }

  return (
    <OverviewClient
      profiles={profiles}
      recentPostsMap={recentPostsMap}
      analysisStatusMap={analysisStatusMap}
      estEarnings={estEarnings}
    />
  );
}
