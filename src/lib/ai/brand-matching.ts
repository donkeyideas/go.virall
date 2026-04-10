/**
 * Go Virall — Brand-Creator Match AI Engine
 * AI-powered matching between brands and creators for optimal partnerships.
 */

import { aiChat } from "./provider";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BrandCreatorMatch } from "@/types";

/* ─── Types ─── */

interface MatchCandidate {
  creator_profile_id: string;
  match_score: number;
  match_reasons: string[];
  creator_strengths: Record<string, unknown>;
}

interface BrandCandidate {
  brand_profile_id: string;
  match_score: number;
  match_reasons: string[];
  brand_interests: Record<string, unknown>;
}

interface AIMatchResponse {
  matches: Array<{
    id: string;
    score: number;
    reasons: string[];
    strengths: Record<string, unknown>;
  }>;
}

/* ─── generateMatches (for brands) ─── */

export async function generateMatches(
  brandProfileId: string,
): Promise<BrandCreatorMatch[]> {
  const admin = createAdminClient();

  // Fetch brand profile
  const { data: brandProfile } = await admin
    .from("profiles")
    .select("id, full_name, company_name, industry, brand_description, niche, account_type")
    .eq("id", brandProfileId)
    .single();

  if (!brandProfile || brandProfile.account_type !== "brand") {
    return [];
  }

  // Fetch listed creators from marketplace
  const { data: marketplaceCreators } = await admin
    .from("creator_marketplace_profiles")
    .select(`
      id,
      profile_id,
      is_listed,
      categories,
      content_types,
      languages,
      rate_card,
      minimum_budget,
      total_followers,
      avg_engagement_rate,
      audience_quality_score,
      platforms_active,
      past_brands,
      profile:profiles!creator_marketplace_profiles_profile_id_fkey(
        id, full_name, avatar_url, bio, niche, location
      )
    `)
    .eq("is_listed", true)
    .limit(100);

  if (!marketplaceCreators || marketplaceCreators.length === 0) {
    // Fallback: fetch creator profiles directly
    const { data: creatorProfiles } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, niche, location, bio, account_type")
      .eq("account_type", "creator")
      .neq("id", brandProfileId)
      .limit(50);

    if (!creatorProfiles || creatorProfiles.length === 0) return [];

    return await matchBrandWithCreatorProfiles(admin, brandProfile, creatorProfiles);
  }

  // Process in batches of 10
  const allMatches: MatchCandidate[] = [];
  const batchSize = 10;

  for (let i = 0; i < marketplaceCreators.length; i += batchSize) {
    const batch = marketplaceCreators.slice(i, i + batchSize);
    const batchMatches = await scoreBrandCreatorBatch(brandProfile, batch);
    allMatches.push(...batchMatches);
  }

  // Sort by score and take top 20
  allMatches.sort((a, b) => b.match_score - a.match_score);
  const topMatches = allMatches.slice(0, 20);

  if (topMatches.length === 0) return [];

  // Store in DB
  const rows = topMatches.map((m) => ({
    brand_profile_id: brandProfileId,
    creator_profile_id: m.creator_profile_id,
    match_score: m.match_score,
    match_reasons: m.match_reasons,
    brand_interests: {
      industry: brandProfile.industry,
      description: brandProfile.brand_description,
      niche: brandProfile.niche,
    },
    creator_strengths: m.creator_strengths,
    status: "suggested" as const,
    is_read: false,
  }));

  // Delete old suggested matches for this brand (not user-acted ones)
  await admin
    .from("brand_creator_matches")
    .delete()
    .eq("brand_profile_id", brandProfileId)
    .eq("status", "suggested");

  const { data: inserted, error } = await admin
    .from("brand_creator_matches")
    .insert(rows)
    .select(`
      *,
      creator:profiles!brand_creator_matches_creator_profile_id_fkey(
        id, full_name, avatar_url, niche, location
      )
    `);

  if (error) {
    console.error("[generateMatches] DB insert error:", error.message);
    return [];
  }

  return (inserted ?? []) as BrandCreatorMatch[];
}

async function matchBrandWithCreatorProfiles(
  admin: ReturnType<typeof createAdminClient>,
  brandProfile: Record<string, unknown>,
  creatorProfiles: Array<Record<string, unknown>>,
): Promise<BrandCreatorMatch[]> {
  const creatorsText = creatorProfiles
    .map(
      (c, i) =>
        `${i + 1}. ID: ${c.id} | Name: ${c.full_name || "Unknown"} | Niche: ${c.niche || "General"} | Location: ${c.location || "Unknown"} | Bio: ${(c.bio as string || "").slice(0, 100)}`,
    )
    .join("\n");

  const prompt = `You are a brand-creator matchmaking AI for an influencer marketing platform.

BRAND PROFILE:
- Company: ${brandProfile.company_name || brandProfile.full_name}
- Industry: ${brandProfile.industry || "Not specified"}
- Description: ${brandProfile.brand_description || "Not provided"}
- Target Niche: ${brandProfile.niche || "General"}

AVAILABLE CREATORS:
${creatorsText}

Score each creator on how well they match this brand. Consider:
1. Niche alignment — Does the creator's content niche match the brand's industry?
2. Content style fit — Would the creator's audience care about this brand?
3. Location relevance — Geographic alignment for the brand's target market
4. Overall brand-creator synergy

For each creator, provide a match score (0-100) and 2-3 specific reasons why they match.

Respond with ONLY valid JSON:
{
  "matches": [
    {
      "id": "creator_profile_id",
      "score": 85,
      "reasons": ["Niche alignment: creator's fitness content matches brand's athletic wear", "Strong engagement suggests authentic audience"],
      "strengths": {"niche_fit": "high", "audience_quality": "strong"}
    }
  ]
}

Only include creators with a score of 40 or above. Sort by score descending.`;

  const response = await aiChat(prompt, {
    temperature: 0.6,
    maxTokens: 4096,
    timeout: 90000,
    jsonMode: true,
  });

  if (!response?.text) return [];

  let parsed: AIMatchResponse;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }

  if (!parsed?.matches || !Array.isArray(parsed.matches)) return [];

  const topMatches = parsed.matches
    .filter((m) => m.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  if (topMatches.length === 0) return [];

  const rows = topMatches.map((m) => ({
    brand_profile_id: brandProfile.id as string,
    creator_profile_id: m.id,
    match_score: Math.max(0, Math.min(100, Math.round(m.score))),
    match_reasons: m.reasons,
    brand_interests: {
      industry: brandProfile.industry,
      description: brandProfile.brand_description,
      niche: brandProfile.niche,
    },
    creator_strengths: m.strengths || {},
    status: "suggested" as const,
    is_read: false,
  }));

  await admin
    .from("brand_creator_matches")
    .delete()
    .eq("brand_profile_id", brandProfile.id as string)
    .eq("status", "suggested");

  const { data: inserted, error } = await admin
    .from("brand_creator_matches")
    .insert(rows)
    .select(`
      *,
      creator:profiles!brand_creator_matches_creator_profile_id_fkey(
        id, full_name, avatar_url, niche, location
      )
    `);

  if (error) {
    console.error("[matchBrandWithCreatorProfiles] DB error:", error.message);
    return [];
  }

  return (inserted ?? []) as BrandCreatorMatch[];
}

async function scoreBrandCreatorBatch(
  brandProfile: Record<string, unknown>,
  creators: Array<Record<string, unknown>>,
): Promise<MatchCandidate[]> {
  const creatorsText = creators
    .map((c, i) => {
      const profile = (c.profile as Record<string, unknown>) || {};
      return `${i + 1}. ID: ${c.profile_id} | Name: ${profile.full_name || "Unknown"} | Niche: ${profile.niche || "General"} | Location: ${profile.location || "Unknown"} | Categories: ${(c.categories as string[])?.join(", ") || "N/A"} | Followers: ${c.total_followers || 0} | Engagement: ${c.avg_engagement_rate || 0}% | AQS: ${c.audience_quality_score || "N/A"} | Content Types: ${(c.content_types as string[])?.join(", ") || "N/A"} | Platforms: ${(c.platforms_active as string[])?.join(", ") || "N/A"} | Past Brands: ${(c.past_brands as string[])?.join(", ") || "None"} | Min Budget: $${c.minimum_budget || "N/A"} | Profile Verified: ${c.has_verified_profiles ? "Yes" : "No"}`;
    })
    .join("\n");

  const prompt = `You are a brand-creator matchmaking AI for an influencer marketing platform.

BRAND PROFILE:
- Company: ${brandProfile.company_name || brandProfile.full_name}
- Industry: ${brandProfile.industry || "Not specified"}
- Description: ${brandProfile.brand_description || "Not provided"}
- Target Niche: ${brandProfile.niche || "General"}

CREATOR CANDIDATES:
${creatorsText}

Score each creator on brand fit. Consider:
1. Niche alignment — Content niche vs brand industry
2. Audience demographics — Would their audience buy this brand's products?
3. Engagement quality — Higher engagement = more authentic influence
4. Content style fit — Does the creator's content type work for this brand?
5. Budget compatibility — Is the creator's minimum budget reasonable?
6. Platform coverage — Does the creator cover platforms the brand needs?
7. Past brand work — Experience with similar brands is a plus
8. Profile verification — Verified creators have proven ownership of their social profiles, which is a strong trust signal. Give a bonus (5-10 points) to verified creators and flag unverified ones as higher risk.

For each creator, provide:
- score: 0-100 match score
- reasons: 2-3 specific match reasons
- strengths: Key strengths as an object

Respond with ONLY valid JSON:
{
  "matches": [
    {
      "id": "creator_profile_id",
      "score": 85,
      "reasons": ["Strong niche alignment with brand's fitness industry", "High engagement rate indicates authentic audience"],
      "strengths": {"niche_fit": "excellent", "engagement": "above_average", "audience_reach": "245K"}
    }
  ]
}

Only include creators scoring 40+. Sort by score descending.`;

  const response = await aiChat(prompt, {
    temperature: 0.6,
    maxTokens: 3072,
    timeout: 90000,
    jsonMode: true,
  });

  if (!response?.text) return [];

  let parsed: AIMatchResponse;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }

  if (!parsed?.matches || !Array.isArray(parsed.matches)) return [];

  return parsed.matches
    .filter((m) => m.score >= 40)
    .map((m) => ({
      creator_profile_id: m.id,
      match_score: Math.max(0, Math.min(100, Math.round(m.score))),
      match_reasons: m.reasons || [],
      creator_strengths: m.strengths || {},
    }));
}

/* ─── generateCreatorOpportunities (for creators) ─── */

export async function generateCreatorOpportunities(
  creatorProfileId: string,
): Promise<BrandCreatorMatch[]> {
  const admin = createAdminClient();

  // Fetch creator profile
  const { data: creatorProfile } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, niche, location, bio, account_type")
    .eq("id", creatorProfileId)
    .single();

  if (!creatorProfile || creatorProfile.account_type !== "creator") {
    return [];
  }

  // Fetch creator's social stats
  const { data: socialProfiles } = await admin
    .from("social_profiles")
    .select("platform, handle, followers_count, engagement_rate, niche")
    .eq("organization_id", creatorProfileId)
    .limit(10);

  // Fetch brands
  const { data: brandProfiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, company_name, industry, brand_description, niche")
    .eq("account_type", "brand")
    .limit(50);

  if (!brandProfiles || brandProfiles.length === 0) return [];

  // Build social stats summary
  const socialSummary = (socialProfiles ?? [])
    .map(
      (sp) =>
        `${sp.platform}: @${sp.handle} (${sp.followers_count} followers, ${sp.engagement_rate ?? 0}% engagement, niche: ${sp.niche || "General"})`,
    )
    .join("\n");

  // Process brands in batches
  const allMatches: BrandCandidate[] = [];
  const batchSize = 10;

  for (let i = 0; i < brandProfiles.length; i += batchSize) {
    const batch = brandProfiles.slice(i, i + batchSize);
    const brandsText = batch
      .map(
        (b, idx) =>
          `${idx + 1}. ID: ${b.id} | Company: ${b.company_name || b.full_name} | Industry: ${b.industry || "Not specified"} | Description: ${(b.brand_description || "").slice(0, 150)} | Looking for: ${b.niche || "General"} creators`,
      )
      .join("\n");

    const prompt = `You are a brand-creator matchmaking AI for an influencer marketing platform.

CREATOR PROFILE:
- Name: ${creatorProfile.full_name || "Unknown"}
- Niche: ${creatorProfile.niche || "General"}
- Location: ${creatorProfile.location || "Not specified"}
- Bio: ${(creatorProfile.bio as string || "").slice(0, 200)}

SOCIAL MEDIA STATS:
${socialSummary || "No social profiles connected yet."}

BRAND OPPORTUNITIES:
${brandsText}

Score each brand on how good of an opportunity it is for this creator. Consider:
1. Niche alignment — Brand's industry matches creator's content niche
2. Audience fit — Creator's audience would be interested in this brand
3. Brand reputation — Well-described brands with clear goals are better
4. Content potential — The brand offers interesting content possibilities

For each brand, provide:
- id: brand profile ID
- score: 0-100 opportunity score
- reasons: 2-3 reasons why this is a good match for the creator
- interests: What the brand is looking for (as object)

Respond with ONLY valid JSON:
{
  "matches": [
    {
      "id": "brand_profile_id",
      "score": 88,
      "reasons": ["Brand's fitness industry perfectly aligns with your content niche", "Your high engagement rate is exactly what this brand needs"],
      "interests": {"looking_for": "authentic fitness content creators", "campaign_type": "product review", "target_audience": "18-35 fitness enthusiasts"}
    }
  ]
}

Only include brands scoring 35+. Sort by score descending.`;

    const response = await aiChat(prompt, {
      temperature: 0.6,
      maxTokens: 3072,
      timeout: 90000,
      jsonMode: true,
    });

    if (response?.text) {
      let parsed: { matches: Array<{ id: string; score: number; reasons: string[]; interests: Record<string, unknown> }> };
      try {
        parsed = JSON.parse(response.text);
      } catch {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            continue;
          }
        } else {
          continue;
        }
      }

      if (parsed?.matches && Array.isArray(parsed.matches)) {
        for (const m of parsed.matches) {
          if (m.score >= 35) {
            allMatches.push({
              brand_profile_id: m.id,
              match_score: Math.max(0, Math.min(100, Math.round(m.score))),
              match_reasons: m.reasons || [],
              brand_interests: m.interests || {},
            });
          }
        }
      }
    }
  }

  // Sort and take top 20
  allMatches.sort((a, b) => b.match_score - a.match_score);
  const topMatches = allMatches.slice(0, 20);

  if (topMatches.length === 0) return [];

  // Store in DB
  const rows = topMatches.map((m) => ({
    brand_profile_id: m.brand_profile_id,
    creator_profile_id: creatorProfileId,
    match_score: m.match_score,
    match_reasons: m.match_reasons,
    brand_interests: m.brand_interests,
    creator_strengths: {
      niche: creatorProfile.niche,
      location: creatorProfile.location,
    },
    status: "suggested" as const,
    is_read: false,
  }));

  // Delete old suggested matches for this creator
  await admin
    .from("brand_creator_matches")
    .delete()
    .eq("creator_profile_id", creatorProfileId)
    .eq("status", "suggested");

  const { data: inserted, error } = await admin
    .from("brand_creator_matches")
    .insert(rows)
    .select(`
      *,
      brand:profiles!brand_creator_matches_brand_profile_id_fkey(
        id, full_name, avatar_url, company_name, industry
      )
    `);

  if (error) {
    console.error("[generateCreatorOpportunities] DB error:", error.message);
    return [];
  }

  return (inserted ?? []) as BrandCreatorMatch[];
}

/* ─── getMatches ─── */

export async function getMatches(
  userId: string,
  role: "brand" | "creator",
): Promise<BrandCreatorMatch[]> {
  const admin = createAdminClient();

  if (role === "brand") {
    const { data, error } = await admin
      .from("brand_creator_matches")
      .select(`
        *,
        creator:profiles!brand_creator_matches_creator_profile_id_fkey(
          id, full_name, avatar_url, niche, location
        )
      `)
      .eq("brand_profile_id", userId)
      .order("match_score", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[getMatches brand] DB error:", error.message);
      return [];
    }
    return (data ?? []) as BrandCreatorMatch[];
  }

  // Creator role
  const { data, error } = await admin
    .from("brand_creator_matches")
    .select(`
      *,
      brand:profiles!brand_creator_matches_brand_profile_id_fkey(
        id, full_name, avatar_url, company_name, industry
      )
    `)
    .eq("creator_profile_id", userId)
    .order("match_score", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[getMatches creator] DB error:", error.message);
    return [];
  }
  return (data ?? []) as BrandCreatorMatch[];
}

/* ─── updateMatchStatus ─── */

export async function updateMatchStatus(
  matchId: string,
  status: "interested" | "contacted" | "dismissed",
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Verify the user is a party to this match
  if (userId) {
    const { data: match } = await admin
      .from("brand_creator_matches")
      .select("brand_profile_id, creator_profile_id")
      .eq("id", matchId)
      .single();

    if (!match || (match.brand_profile_id !== userId && match.creator_profile_id !== userId)) {
      return { success: false, error: "Match not found." };
    }
  }

  const { error } = await admin
    .from("brand_creator_matches")
    .update({ status, is_read: true })
    .eq("id", matchId);

  if (error) {
    console.error("[updateMatchStatus] DB error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/* ─── expressInterest ─── */

export async function expressInterest(
  matchId: string,
  userId?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient();

  // Get match details
  const { data: match } = await admin
    .from("brand_creator_matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match) {
    return { success: false, error: "Match not found." };
  }

  // Verify the user is a party to this match
  if (userId && match.brand_profile_id !== userId && match.creator_profile_id !== userId) {
    return { success: false, error: "Match not found." };
  }

  // Update status
  const { error: updateError } = await admin
    .from("brand_creator_matches")
    .update({ status: "interested", is_read: true })
    .eq("id", matchId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Create notification for the brand
  await admin.from("notifications").insert({
    organization_id: match.brand_profile_id,
    title: "New Creator Interest",
    body: "A creator has expressed interest in partnering with your brand. Check your matches to learn more.",
    type: "brand_match",
    is_read: false,
  });

  return { success: true };
}
