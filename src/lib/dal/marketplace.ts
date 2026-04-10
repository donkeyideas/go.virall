"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CreatorMarketplaceProfile } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given profile IDs, return a map of profileId → has any ownership_verified social profile.
 * Goes through profiles → organization_id → social_profiles.ownership_verified.
 */
async function getOwnershipVerifiedMap(
  admin: ReturnType<typeof createAdminClient>,
  profileIds: string[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (profileIds.length === 0) return result;

  // Get org IDs for each profile
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, organization_id")
    .in("id", profileIds);

  if (!profiles || profiles.length === 0) return result;

  const orgIds = profiles.map((p) => p.organization_id).filter(Boolean) as string[];
  const profileOrgMap = new Map(profiles.map((p) => [p.id, p.organization_id]));

  if (orgIds.length === 0) return result;

  // Check which orgs have any ownership_verified social profile
  const { data: verified } = await admin
    .from("social_profiles")
    .select("organization_id")
    .in("organization_id", orgIds)
    .eq("ownership_verified", true);

  const verifiedOrgIds = new Set((verified ?? []).map((v) => v.organization_id));

  for (const pid of profileIds) {
    const oid = profileOrgMap.get(pid);
    result.set(pid, oid ? verifiedOrgIds.has(oid) : false);
  }

  return result;
}

// ─── Marketplace Stats ────────────────────────────────────────────────────────

export interface MarketplaceStats {
  totalListed: number;
  avgEngagement: number;
  categoriesCount: number;
  totalFollowers: number;
}

export async function getMarketplaceStats(): Promise<MarketplaceStats> {
  const admin = createAdminClient();

  const { data, count } = await admin
    .from("creator_marketplace_profiles")
    .select("avg_engagement_rate, categories, total_followers", { count: "exact" })
    .eq("is_listed", true);

  const rows = data ?? [];
  const totalListed = count ?? 0;

  // Calculate average engagement
  const avgEngagement =
    rows.length > 0
      ? rows.reduce((sum, r) => sum + (r.avg_engagement_rate ?? 0), 0) / rows.length
      : 0;

  // Count unique categories
  const allCategories = new Set<string>();
  for (const row of rows) {
    if (Array.isArray(row.categories)) {
      for (const cat of row.categories) {
        allCategories.add(cat);
      }
    }
  }

  // Total followers across all listed creators
  const totalFollowers = rows.reduce((sum, r) => sum + (r.total_followers ?? 0), 0);

  return {
    totalListed,
    avgEngagement: Math.round(avgEngagement * 100) / 100,
    categoriesCount: allCategories.size,
    totalFollowers,
  };
}

// ─── Featured Creators ────────────────────────────────────────────────────────

export async function getFeaturedCreators(
  limit = 8,
): Promise<CreatorMarketplaceProfile[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("creator_marketplace_profiles")
    .select(
      "*, profile:profiles!creator_marketplace_profiles_profile_id_fkey(id, full_name, avatar_url, bio, niche, location)",
    )
    .eq("is_listed", true)
    .order("audience_quality_score", { ascending: false, nullsFirst: false })
    .order("total_followers", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getFeaturedCreators error:", error);
    return [];
  }

  // If marketplace has profiles, enrich with ownership verification
  if (data && data.length > 0) {
    const profileIds = data.map((d) => (d.profile as { id?: string })?.id ?? d.profile_id).filter(Boolean);
    const verifiedMap = await getOwnershipVerifiedMap(admin, profileIds);
    return data.map((d) => ({
      ...d,
      has_verified_profiles: verifiedMap.get((d.profile as { id?: string })?.id ?? d.profile_id) ?? false,
    })) as CreatorMarketplaceProfile[];
  }

  // Fallback: show creator profiles directly when no marketplace profiles exist
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, bio, niche, location, organization_id")
    .eq("account_type", "creator")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = profiles ?? [];

  // Enrich with real social data
  const orgIds = rows.map((p) => p.organization_id ?? p.id).filter(Boolean);
  const socialMap: Record<string, { followers: number; engagement: number; platforms: string[]; hasVerified: boolean }> = {};

  if (orgIds.length > 0) {
    const { data: allSocials } = await admin
      .from("social_profiles")
      .select("organization_id, platform, followers_count, engagement_rate, ownership_verified")
      .in("organization_id", orgIds);

    if (allSocials) {
      for (const sp of allSocials) {
        const oid = sp.organization_id;
        if (!socialMap[oid]) {
          socialMap[oid] = { followers: 0, engagement: 0, platforms: [], hasVerified: false };
        }
        socialMap[oid].followers += sp.followers_count ?? 0;
        socialMap[oid].platforms.push(sp.platform);
        if (sp.ownership_verified) socialMap[oid].hasVerified = true;
      }
      // Compute avg engagement per org
      for (const oid of Object.keys(socialMap)) {
        const orgSocials = allSocials.filter(
          (s) => s.organization_id === oid && s.engagement_rate != null,
        );
        if (orgSocials.length > 0) {
          socialMap[oid].engagement =
            orgSocials.reduce((sum, s) => sum + (s.engagement_rate ?? 0), 0) / orgSocials.length;
        }
      }
    }
  }

  return rows.map((p) => {
    const oid = p.organization_id ?? p.id;
    const social = socialMap[oid];
    return {
      id: p.id,
      profile_id: p.id,
      is_listed: true,
      is_verified: false,
      has_verified_profiles: social?.hasVerified ?? false,
      categories: p.niche ? [p.niche] : [],
      platforms_active: social?.platforms ?? [],
      total_followers: social?.followers ?? 0,
      avg_engagement_rate: social ? Math.round(social.engagement * 100) / 100 : 0,
      audience_quality_score: null,
      minimum_budget: null,
      content_types: [],
      portfolio_links: [],
      languages: [],
      rate_card: null,
      highlight_reel: null,
      past_brands: [],
      created_at: "",
      updated_at: "",
      profile: {
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        bio: p.bio,
        niche: p.niche,
        location: p.location,
      },
    };
  }) as unknown as CreatorMarketplaceProfile[];
}

// ─── Category Counts ──────────────────────────────────────────────────────────

export interface CategoryCount {
  name: string;
  count: number;
  icon: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Fitness: "dumbbell",
  Beauty: "sparkles",
  Tech: "cpu",
  Food: "utensils",
  Travel: "plane",
  Gaming: "gamepad-2",
  Fashion: "shirt",
  Lifestyle: "heart",
  Education: "graduation-cap",
  Music: "music",
  Finance: "trending-up",
  Art: "palette",
  Photography: "camera",
  Sports: "trophy",
  Health: "activity",
  Business: "briefcase",
};

export async function getCategoryCounts(): Promise<CategoryCount[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("creator_marketplace_profiles")
    .select("categories")
    .eq("is_listed", true);

  const countMap = new Map<string, number>();
  for (const row of data ?? []) {
    if (Array.isArray(row.categories)) {
      for (const cat of row.categories) {
        countMap.set(cat, (countMap.get(cat) ?? 0) + 1);
      }
    }
  }

  // Sort by count descending, take top categories
  const sorted = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return sorted.map(([name, count]) => ({
    name,
    count,
    icon: CATEGORY_ICONS[name] ?? "tag",
  }));
}

// ─── Get Creator by Username/Slug ─────────────────────────────────────────────

export async function getCreatorByUsername(
  username: string,
): Promise<CreatorMarketplaceProfile | null> {
  const admin = createAdminClient();

  // Use ilike pattern matching to avoid full table scan
  // Convert slug back to search pattern: "john-doe" → "%john%doe%"
  const searchPattern = username.toLowerCase().replace(/-/g, "%");

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, bio, niche, location")
    .ilike("full_name", `%${searchPattern}%`)
    .limit(20);

  if (!profiles || profiles.length === 0) return null;

  // Find exact slug match from the filtered set
  const matchedProfile = profiles.find((p) => {
    if (!p.full_name) return false;
    const slug = p.full_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return slug === username.toLowerCase();
  });

  if (!matchedProfile) return null;

  // Fetch marketplace profile
  const { data, error } = await admin
    .from("creator_marketplace_profiles")
    .select(
      "*, profile:profiles!creator_marketplace_profiles_profile_id_fkey(id, full_name, avatar_url, bio, niche, location)",
    )
    .eq("profile_id", matchedProfile.id)
    .eq("is_listed", true)
    .single();

  if (error || !data) return null;

  // Enrich with ownership verification status
  const verifiedMap = await getOwnershipVerifiedMap(admin, [matchedProfile.id]);
  return {
    ...data,
    has_verified_profiles: verifiedMap.get(matchedProfile.id) ?? false,
  } as CreatorMarketplaceProfile;
}
