import { getSocialProfiles } from "@/lib/dal/profiles";
import { getAnalysisStatus } from "@/lib/dal/analyses";
import { getCachedPosts } from "@/lib/cache/posts-cache";
import { OverviewClient } from "@/components/dashboard/overview/OverviewClient";
import type { RecentPost } from "@/types";

export default async function ProfilesPage() {
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

  // Fetch analysis status for ALL profiles
  const analysisStatusMap: Record<
    string,
    Record<string, { hasData: boolean; createdAt: string | null }>
  > = {};

  for (const profile of profiles) {
    try {
      const status = await getAnalysisStatus(profile.id);
      if (status) {
        analysisStatusMap[profile.id] = status;
      }
    } catch {
      // continue
    }
  }

  return (
    <OverviewClient
      profiles={profiles}
      recentPostsMap={recentPostsMap}
      analysisStatusMap={analysisStatusMap}
    />
  );
}
