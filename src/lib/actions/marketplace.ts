"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { CreatorMarketplaceProfile, EnrichedCreatorProfile } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchCreatorsFilters {
  query?: string;
  niches?: string[];
  platforms?: string[];
  followerMin?: number;
  followerMax?: number;
  engagementMin?: number;
  engagementMax?: number;
  aqsMin?: number;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  contentTypes?: string[];
  sortBy?: "relevance" | "followers" | "engagement" | "aqs";
  page?: number;
  limit?: number;
}

export interface SearchCreatorsResult {
  creators: CreatorMarketplaceProfile[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Search Creators ──────────────────────────────────────────────────────────

export async function searchCreators(
  filters: SearchCreatorsFilters,
): Promise<{ success?: SearchCreatorsResult; error?: string }> {
  try {
    const admin = createAdminClient();
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    // Build query - select marketplace profiles joined with profiles
    let query = admin
      .from("creator_marketplace_profiles")
      .select(
        "*, profile:profiles!creator_marketplace_profiles_profile_id_fkey(id, full_name, avatar_url, bio, niche, location)",
        { count: "exact" },
      )
      .eq("is_listed", true);

    // Filter by niche (using the joined profile niche or categories)
    if (filters.niches && filters.niches.length > 0) {
      query = query.overlaps("categories", filters.niches);
    }

    // Filter by platform
    if (filters.platforms && filters.platforms.length > 0) {
      query = query.overlaps(
        "platforms_active",
        filters.platforms.map((p) => p.toLowerCase()),
      );
    }

    // Filter by follower range
    if (filters.followerMin !== undefined && filters.followerMin > 0) {
      query = query.gte("total_followers", filters.followerMin);
    }
    if (filters.followerMax !== undefined && filters.followerMax > 0) {
      query = query.lte("total_followers", filters.followerMax);
    }

    // Filter by engagement rate
    if (filters.engagementMin !== undefined && filters.engagementMin > 0) {
      query = query.gte("avg_engagement_rate", filters.engagementMin);
    }
    if (filters.engagementMax !== undefined && filters.engagementMax > 0) {
      query = query.lte("avg_engagement_rate", filters.engagementMax);
    }

    // Filter by AQS minimum
    if (filters.aqsMin !== undefined && filters.aqsMin > 0) {
      query = query.gte("audience_quality_score", filters.aqsMin);
    }

    // Filter by minimum budget
    if (filters.budgetMin !== undefined && filters.budgetMin > 0) {
      query = query.gte("minimum_budget", filters.budgetMin);
    }
    if (filters.budgetMax !== undefined && filters.budgetMax > 0) {
      query = query.lte("minimum_budget", filters.budgetMax);
    }

    // Filter by content types
    if (filters.contentTypes && filters.contentTypes.length > 0) {
      query = query.overlaps("content_types", filters.contentTypes);
    }

    // Sort
    switch (filters.sortBy) {
      case "followers":
        query = query.order("total_followers", { ascending: false });
        break;
      case "engagement":
        query = query.order("avg_engagement_rate", { ascending: false });
        break;
      case "aqs":
        query = query.order("audience_quality_score", { ascending: false, nullsFirst: false });
        break;
      default:
        // "relevance" — sort by AQS then followers
        query = query
          .order("audience_quality_score", { ascending: false, nullsFirst: false })
          .order("total_followers", { ascending: false });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("searchCreators error:", error);
      return { error: "Failed to search creators." };
    }

    const creators = (data ?? []) as CreatorMarketplaceProfile[];
    const total = count ?? 0;

    // Apply text search filter client-side for query (name, bio, niche)
    let filtered = creators;
    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      filtered = creators.filter((c) => {
        const name = c.profile?.full_name?.toLowerCase() ?? "";
        const bio = c.profile?.bio?.toLowerCase() ?? "";
        const niche = c.profile?.niche?.toLowerCase() ?? "";
        const location = c.profile?.location?.toLowerCase() ?? "";
        const cats = c.categories.join(" ").toLowerCase();
        return (
          name.includes(q) ||
          bio.includes(q) ||
          niche.includes(q) ||
          location.includes(q) ||
          cats.includes(q)
        );
      });
    }

    // Apply location filter client-side (text match on profile location)
    if (filters.location && filters.location.trim()) {
      const loc = filters.location.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const creatorLocation = c.profile?.location?.toLowerCase() ?? "";
        return creatorLocation.includes(loc);
      });
    }

    // If marketplace profiles exist, return them
    if (filtered.length > 0 || total > 0) {
      return {
        success: {
          creators: filtered,
          total: filters.query || filters.location ? filtered.length : total,
          page,
          totalPages: Math.ceil(
            (filters.query || filters.location ? filtered.length : total) / limit,
          ),
        },
      };
    }

    // Fallback: no marketplace profiles exist yet — show creator profiles directly
    let fallbackQuery = admin
      .from("profiles")
      .select("id, full_name, avatar_url, bio, niche, location, organization_id", { count: "exact" })
      .eq("account_type", "creator");

    if (filters.query && filters.query.trim()) {
      fallbackQuery = fallbackQuery.ilike("full_name", `%${filters.query.trim()}%`);
    }

    fallbackQuery = fallbackQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: fallbackData, count: fallbackCount } = await fallbackQuery;

    // Enrich fallback creators with real social data
    const orgIds = (fallbackData ?? [])
      .map((p) => p.organization_id ?? p.id)
      .filter(Boolean);

    // Fetch all social profiles for these orgs in one query
    let socialMap: Record<string, { followers: number; engagement: number; platforms: string[] }> = {};
    if (orgIds.length > 0) {
      const { data: allSocials } = await admin
        .from("social_profiles")
        .select("organization_id, platform, followers_count, engagement_rate")
        .in("organization_id", orgIds);

      if (allSocials) {
        for (const sp of allSocials) {
          const oid = sp.organization_id;
          if (!socialMap[oid]) {
            socialMap[oid] = { followers: 0, engagement: 0, platforms: [] };
          }
          socialMap[oid].followers += sp.followers_count ?? 0;
          if (sp.engagement_rate != null) {
            // Running average: we'll fix below
            socialMap[oid].platforms.push(sp.platform);
          } else {
            socialMap[oid].platforms.push(sp.platform);
          }
        }
        // Compute avg engagement per org
        for (const sp of allSocials) {
          const oid = sp.organization_id;
          if (sp.engagement_rate != null) {
            const orgSocials = allSocials.filter((s) => s.organization_id === oid && s.engagement_rate != null);
            socialMap[oid].engagement =
              orgSocials.reduce((sum, s) => sum + (s.engagement_rate ?? 0), 0) / orgSocials.length;
          }
        }
      }
    }

    const fallbackCreators = (fallbackData ?? []).map((p) => {
      const oid = p.organization_id ?? p.id;
      const social = socialMap[oid];
      return {
        id: p.id,
        profile_id: p.id,
        is_listed: true,
        is_verified: false,
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

    const fallbackTotal = fallbackCount ?? 0;

    return {
      success: {
        creators: fallbackCreators,
        total: fallbackTotal,
        page,
        totalPages: Math.ceil(fallbackTotal / limit),
      },
    };
  } catch (err) {
    console.error("searchCreators unexpected error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ─── Get Creator Profile ──────────────────────────────────────────────────────

export async function getCreatorProfile(
  profileId: string,
): Promise<{ success?: CreatorMarketplaceProfile; error?: string }> {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("creator_marketplace_profiles")
      .select(
        "*, profile:profiles!creator_marketplace_profiles_profile_id_fkey(id, full_name, avatar_url, bio, niche, location)",
      )
      .eq("profile_id", profileId)
      .eq("is_listed", true)
      .single();

    if (error || !data) {
      return { error: "Creator not found." };
    }

    return { success: data as CreatorMarketplaceProfile };
  } catch (err) {
    console.error("getCreatorProfile error:", err);
    return { error: "Failed to fetch creator profile." };
  }
}

// ─── Get Enriched Creator Profile (for brand decision-making) ────────────────

export async function getEnrichedCreatorProfile(
  profileId: string,
): Promise<{ success?: EnrichedCreatorProfile; error?: string }> {
  try {
    const admin = createAdminClient();

    // 1. Get the creator's profile (always exists) + their org_id
    const { data: profileRow, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, bio, niche, location, organization_id")
      .eq("id", profileId)
      .single();

    if (profileError || !profileRow) {
      return { error: "Creator not found." };
    }

    const orgId = profileRow.organization_id ?? profileId;

    // 2. Try marketplace profile (may not exist for all creators)
    const { data: mp } = await admin
      .from("creator_marketplace_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .single();

    // 3. Social profiles via organization_id (this is where the real data lives)
    const { data: socialProfiles } = await admin
      .from("social_profiles")
      .select("id, platform, handle, followers_count, engagement_rate, posts_count, verified, avatar_url")
      .eq("organization_id", orgId)
      .order("followers_count", { ascending: false });

    const socials = socialProfiles ?? [];
    const socialIds = socials.map((p) => p.id);

    // Compute totals from actual social profiles
    const totalFollowers = socials.reduce((sum, s) => sum + (s.followers_count ?? 0), 0);
    const engagementRates = socials
      .map((s) => s.engagement_rate)
      .filter((r): r is number => r != null);
    const avgEngagement =
      engagementRates.length > 0
        ? engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length
        : 0;
    const platformsActive = socials.map((s) => s.platform);

    // Build the base marketplace profile (use real data if marketplace row exists, otherwise construct from social data)
    const base: CreatorMarketplaceProfile = mp
      ? {
          ...(mp as CreatorMarketplaceProfile),
          // Override with live social data
          total_followers: totalFollowers || (mp as CreatorMarketplaceProfile).total_followers,
          avg_engagement_rate: avgEngagement || (mp as CreatorMarketplaceProfile).avg_engagement_rate,
          platforms_active: platformsActive.length > 0 ? platformsActive : (mp as CreatorMarketplaceProfile).platforms_active,
          profile: {
            id: profileRow.id,
            full_name: profileRow.full_name,
            avatar_url: profileRow.avatar_url,
            bio: profileRow.bio,
            niche: profileRow.niche,
            location: profileRow.location,
          },
        }
      : {
          id: profileId,
          profile_id: profileId,
          is_listed: true,
          is_verified: false,
          categories: profileRow.niche ? [profileRow.niche] : [],
          content_types: [],
          languages: ["English"],
          rate_card: {} as Record<string, number>,
          minimum_budget: null,
          total_followers: totalFollowers,
          avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
          audience_quality_score: null,
          platforms_active: platformsActive,
          highlight_reel: [],
          past_brands: [],
          updated_at: "",
          profile: {
            id: profileRow.id,
            full_name: profileRow.full_name,
            avatar_url: profileRow.avatar_url,
            bio: profileRow.bio,
            niche: profileRow.niche,
            location: profileRow.location,
          },
        };

    // 4. Latest AQS breakdown
    let aqsBreakdown: EnrichedCreatorProfile["aqs_breakdown"] = null;
    if (socialIds.length > 0) {
      const { data: aqsData } = await admin
        .from("audience_quality_scores")
        .select("overall_score, engagement_quality, follower_authenticity, growth_health, content_consistency, grade, risk_flags, audience_demographics")
        .in("social_profile_id", socialIds)
        .order("overall_score", { ascending: false })
        .limit(1);

      if (aqsData && aqsData.length > 0) {
        const aqs = aqsData[0];
        aqsBreakdown = {
          overall_score: aqs.overall_score,
          engagement_quality: aqs.engagement_quality,
          follower_authenticity: aqs.follower_authenticity,
          growth_health: aqs.growth_health,
          content_consistency: aqs.content_consistency,
          grade: aqs.grade,
          risk_flags: aqs.risk_flags ?? [],
          audience_demographics: aqs.audience_demographics ?? {},
        };
        // Update base AQS if we have it
        base.audience_quality_score = aqs.overall_score;
      }
    }

    // 5. Growth metrics — latest + previous per social profile
    const growthMetrics: EnrichedCreatorProfile["growth_metrics"] = [];
    if (socialIds.length > 0) {
      for (const sp of socials) {
        const { data: metrics } = await admin
          .from("social_metrics")
          .select("followers, engagement_rate, avg_likes, avg_comments, avg_views")
          .eq("social_profile_id", sp.id)
          .order("date", { ascending: false })
          .limit(2);

        const current = metrics?.[0];
        const previous = metrics?.[1];
        if (current) {
          growthMetrics.push({
            platform: sp.platform,
            followers_current: current.followers,
            followers_previous: previous?.followers ?? null,
            engagement_current: current.engagement_rate,
            engagement_previous: previous?.engagement_rate ?? null,
            avg_likes: current.avg_likes,
            avg_comments: current.avg_comments,
            avg_views: current.avg_views,
          });
        }
      }
    }

    // 6. SMO score + earnings forecast from analyses
    let smoScore: number | null = null;
    let earningsEstimate: EnrichedCreatorProfile["earnings_estimate"] = null;
    const topContent: EnrichedCreatorProfile["top_content"] = [];

    if (socialIds.length > 0) {
      const { data: smoData } = await admin
        .from("social_analyses")
        .select("result")
        .in("social_profile_id", socialIds)
        .eq("analysis_type", "smo_score")
        .order("created_at", { ascending: false })
        .limit(1);

      if (smoData?.[0]?.result) {
        const r = smoData[0].result as Record<string, unknown>;
        smoScore = typeof r.overall_score === "number" ? r.overall_score : null;
      }

      const { data: earningsData } = await admin
        .from("social_analyses")
        .select("result")
        .in("social_profile_id", socialIds)
        .eq("analysis_type", "earnings_forecast")
        .order("created_at", { ascending: false })
        .limit(1);

      if (earningsData?.[0]?.result) {
        const r = earningsData[0].result as Record<string, unknown>;
        const ranges = r.estimated_ranges as Record<string, unknown> | undefined;
        if (ranges) {
          const monthly = ranges.monthly as Record<string, number> | undefined;
          const perPost = ranges.per_post as Record<string, number> | undefined;
          earningsEstimate = {
            monthly_low: monthly?.low ?? null,
            monthly_high: monthly?.high ?? null,
            per_post_low: perPost?.low ?? null,
            per_post_high: perPost?.high ?? null,
          };
        }
      }

      // Top posts
      const { data: topPostData } = await admin
        .from("social_metrics")
        .select("social_profile_id, top_post_url, top_post_likes")
        .in("social_profile_id", socialIds)
        .not("top_post_url", "is", null)
        .order("top_post_likes", { ascending: false })
        .limit(3);

      if (topPostData) {
        for (const tp of topPostData) {
          const sp = socials.find((p) => p.id === tp.social_profile_id);
          topContent.push({
            platform: sp?.platform ?? "unknown",
            url: tp.top_post_url,
            likes: tp.top_post_likes,
          });
        }
      }
    }

    const enriched: EnrichedCreatorProfile = {
      ...base,
      social_profiles: socials,
      aqs_breakdown: aqsBreakdown,
      growth_metrics: growthMetrics,
      smo_score: smoScore,
      earnings_estimate: earningsEstimate,
      top_content: topContent,
    };

    return { success: enriched };
  } catch (err) {
    console.error("getEnrichedCreatorProfile error:", err);
    return { error: "Failed to fetch enriched creator profile." };
  }
}

// ─── Update Marketplace Profile ───────────────────────────────────────────────

export async function updateMarketplaceProfile(updates: {
  categories?: string[];
  content_types?: string[];
  languages?: string[];
  rate_card?: Record<string, number>;
  minimum_budget?: number | null;
  highlight_reel?: Record<string, unknown>[];
  past_brands?: string[];
}): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  try {
    const admin = createAdminClient();

    // Check if profile exists
    const { data: existing } = await admin
      .from("creator_marketplace_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (existing) {
      // Update existing
      const { error } = await admin
        .from("creator_marketplace_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", user.id);

      if (error) {
        console.error("updateMarketplaceProfile error:", error);
        return { error: "Failed to update marketplace profile." };
      }
    } else {
      // Create new marketplace profile
      const { error } = await admin
        .from("creator_marketplace_profiles")
        .insert({
          profile_id: user.id,
          is_listed: false,
          is_verified: false,
          categories: updates.categories ?? [],
          content_types: updates.content_types ?? [],
          languages: updates.languages ?? ["English"],
          rate_card: updates.rate_card ?? {},
          minimum_budget: updates.minimum_budget ?? null,
          total_followers: 0,
          avg_engagement_rate: 0,
          audience_quality_score: null,
          platforms_active: [],
          highlight_reel: updates.highlight_reel ?? [],
          past_brands: updates.past_brands ?? [],
        });

      if (error) {
        console.error("createMarketplaceProfile error:", error);
        return { error: "Failed to create marketplace profile." };
      }
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/marketplace");
    return { success: true };
  } catch (err) {
    console.error("updateMarketplaceProfile unexpected error:", err);
    return { error: "An unexpected error occurred." };
  }
}

// ─── Toggle Marketplace Listing ───────────────────────────────────────────────

export async function toggleMarketplaceListing(
  isListed: boolean,
): Promise<{ success?: boolean; error?: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  try {
    const admin = createAdminClient();

    // Check if profile exists
    const { data: existing } = await admin
      .from("creator_marketplace_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!existing) {
      // Auto-create a profile when toggling on
      if (isListed) {
        // Fetch user profile data to populate
        const { data: profile } = await admin
          .from("profiles")
          .select("niche, location")
          .eq("id", user.id)
          .single();

        // Fetch social profiles to populate platforms and followers
        const { data: socialProfiles } = await admin
          .from("social_profiles")
          .select("platform, followers_count, engagement_rate")
          .eq("organization_id", user.id);

        const platforms = (socialProfiles ?? []).map((sp) => sp.platform);
        const totalFollowers = (socialProfiles ?? []).reduce(
          (sum, sp) => sum + (sp.followers_count ?? 0),
          0,
        );
        const avgEngagement =
          socialProfiles && socialProfiles.length > 0
            ? (socialProfiles ?? []).reduce(
                (sum, sp) => sum + (sp.engagement_rate ?? 0),
                0,
              ) / socialProfiles.length
            : 0;

        const { error } = await admin
          .from("creator_marketplace_profiles")
          .insert({
            profile_id: user.id,
            is_listed: true,
            is_verified: false,
            categories: profile?.niche ? [profile.niche] : [],
            content_types: [],
            languages: ["English"],
            rate_card: {},
            minimum_budget: null,
            total_followers: totalFollowers,
            avg_engagement_rate: Math.round(avgEngagement * 100) / 100,
            audience_quality_score: null,
            platforms_active: platforms,
            highlight_reel: [],
            past_brands: [],
          });

        if (error) {
          console.error("toggleMarketplaceListing create error:", error);
          return { error: "Failed to create marketplace listing." };
        }
      } else {
        return { error: "No marketplace profile found to update." };
      }
    } else {
      const { error } = await admin
        .from("creator_marketplace_profiles")
        .update({
          is_listed: isListed,
          updated_at: new Date().toISOString(),
        })
        .eq("profile_id", user.id);

      if (error) {
        console.error("toggleMarketplaceListing error:", error);
        return { error: "Failed to update listing status." };
      }
    }

    revalidatePath("/dashboard/settings");
    revalidatePath("/marketplace");
    revalidatePath("/brand/discover");
    return { success: true };
  } catch (err) {
    console.error("toggleMarketplaceListing unexpected error:", err);
    return { error: "An unexpected error occurred." };
  }
}
