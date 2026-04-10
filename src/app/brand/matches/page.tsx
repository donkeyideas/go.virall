import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getMatches } from "@/lib/ai/brand-matching";
import { BrandMatchSuggestions } from "@/components/brand/BrandMatchSuggestions";

export const dynamic = "force-dynamic";

export interface CreatorSocialStats {
  totalFollowers: number;
  avgEngagement: number;
  platforms: Array<{
    platform: string;
    handle: string;
    followers: number;
    engagement: number | null;
    verified: boolean;
  }>;
  topPlatform: string | null;
  bio: string | null;
  postsCount: number;
}

export default async function BrandMatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialMatches = await getMatches(user.id, "brand");

  // Fetch social stats for all matched creators
  const creatorIds = initialMatches
    .map((m) => m.creator_profile_id)
    .filter(Boolean);

  const socialStatsMap: Record<string, CreatorSocialStats> = {};

  if (creatorIds.length > 0) {
    const admin = createAdminClient();

    // Get organization_ids for all creators
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, organization_id, bio")
      .in("id", creatorIds);

    const orgToCreator: Record<string, { creatorId: string; bio: string | null }> = {};
    for (const p of profiles ?? []) {
      if (p.organization_id) {
        orgToCreator[p.organization_id] = { creatorId: p.id, bio: p.bio };
      }
    }

    const orgIds = Object.keys(orgToCreator);

    if (orgIds.length > 0) {
      const { data: socials } = await admin
        .from("social_profiles")
        .select("organization_id, platform, handle, followers_count, engagement_rate, verified, posts_count")
        .in("organization_id", orgIds)
        .order("followers_count", { ascending: false });

      // Aggregate per creator
      for (const sp of socials ?? []) {
        const mapping = orgToCreator[sp.organization_id];
        if (!mapping) continue;
        const cid = mapping.creatorId;

        if (!socialStatsMap[cid]) {
          socialStatsMap[cid] = {
            totalFollowers: 0,
            avgEngagement: 0,
            platforms: [],
            topPlatform: null,
            bio: mapping.bio,
            postsCount: 0,
          };
        }

        socialStatsMap[cid].totalFollowers += sp.followers_count ?? 0;
        socialStatsMap[cid].postsCount += sp.posts_count ?? 0;
        socialStatsMap[cid].platforms.push({
          platform: sp.platform,
          handle: sp.handle,
          followers: sp.followers_count ?? 0,
          engagement: sp.engagement_rate,
          verified: sp.verified ?? false,
        });
      }

      // Calculate avg engagement and top platform
      for (const cid of Object.keys(socialStatsMap)) {
        const stats = socialStatsMap[cid];
        const engagements = stats.platforms
          .map((p) => p.engagement)
          .filter((e): e is number => e !== null);
        stats.avgEngagement =
          engagements.length > 0
            ? engagements.reduce((a, b) => a + b, 0) / engagements.length
            : 0;
        stats.topPlatform =
          stats.platforms.length > 0 ? stats.platforms[0].platform : null;
      }
    }

    // For creators without org → social profiles, at least set bio
    for (const p of profiles ?? []) {
      if (!socialStatsMap[p.id]) {
        socialStatsMap[p.id] = {
          totalFollowers: 0,
          avgEngagement: 0,
          platforms: [],
          topPlatform: null,
          bio: p.bio,
          postsCount: 0,
        };
      }
    }
  }

  return (
    <div
      style={{
        fontFamily:
          "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--color-ink)",
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Creator Matches
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-secondary)",
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          AI-powered creator recommendations based on your brand profile,
          industry, and campaign goals
        </p>
      </div>

      <BrandMatchSuggestions
        initialMatches={initialMatches}
        socialStats={socialStatsMap}
      />
    </div>
  );
}
