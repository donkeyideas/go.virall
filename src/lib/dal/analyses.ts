"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SocialAnalysis, AnalysisType } from "@/types";

/**
 * Verify the current user is authenticated.
 * Returns user ID or null.
 */
async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getLatestAnalysis(
  profileId: string,
  analysisType: AnalysisType,
): Promise<SocialAnalysis | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("social_analyses")
    .select("*")
    .eq("social_profile_id", profileId)
    .eq("analysis_type", analysisType)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data as SocialAnalysis | null;
}

/**
 * Fetch cached analysis results for a specific type across multiple profiles.
 * Returns a map of profileId → result JSONB data.
 */
export async function getCachedResults(
  profileIds: string[],
  analysisType: AnalysisType,
): Promise<Record<string, Record<string, unknown>>> {
  if (profileIds.length === 0) return {};

  const userId = await getAuthUserId();
  if (!userId) return {};

  const admin = createAdminClient();
  const { data } = await admin
    .from("social_analyses")
    .select("social_profile_id, result, created_at")
    .in("social_profile_id", profileIds)
    .eq("analysis_type", analysisType)
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as Array<{
    social_profile_id: string;
    result: Record<string, unknown>;
    created_at: string;
  }>;

  // Keep only the latest per profile
  const result: Record<string, Record<string, unknown>> = {};
  for (const a of analyses) {
    if (!result[a.social_profile_id]) {
      result[a.social_profile_id] = a.result;
    }
  }

  return result;
}

/**
 * Batch-fetch cached results for MULTIPLE analysis types in ONE query.
 * Returns a map of analysisType → { profileId → result }.
 * Single auth call + single DB round-trip instead of N separate calls.
 */
export async function getCachedResultsBatch(
  profileIds: string[],
  analysisTypes: AnalysisType[],
): Promise<Record<string, Record<string, Record<string, unknown>>>> {
  if (profileIds.length === 0 || analysisTypes.length === 0) {
    const empty: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const t of analysisTypes) empty[t] = {};
    return empty;
  }

  const userId = await getAuthUserId();
  if (!userId) {
    const empty: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const t of analysisTypes) empty[t] = {};
    return empty;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("social_analyses")
    .select("social_profile_id, analysis_type, result, created_at")
    .in("social_profile_id", profileIds)
    .in("analysis_type", analysisTypes)
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as Array<{
    social_profile_id: string;
    analysis_type: string;
    result: Record<string, unknown>;
    created_at: string;
  }>;

  // Build nested map: type → profileId → result (latest only)
  const result: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const t of analysisTypes) result[t] = {};

  for (const a of analyses) {
    const typeMap = result[a.analysis_type];
    if (typeMap && !typeMap[a.social_profile_id]) {
      typeMap[a.social_profile_id] = a.result;
    }
  }

  return result;
}

export async function getAllLatestAnalyses(
  profileId: string,
): Promise<Record<AnalysisType, SocialAnalysis | null>> {
  const userId = await getAuthUserId();
  if (!userId) {
    return emptyAnalysesRecord();
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("social_analyses")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as SocialAnalysis[];

  const result: Record<string, SocialAnalysis | null> = {};
  const types: AnalysisType[] = [
    "growth",
    "content_strategy",
    "hashtags",
    "competitors",
    "insights",
    "earnings_forecast",
    "thirty_day_plan",
    "smo_score",
    "audience",
    "network",
    "campaign_ideas",
    "content_generator",
    "recommendations",
  ];

  for (const type of types) {
    result[type] = analyses.find((a) => a.analysis_type === type) ?? null;
  }

  return result as Record<AnalysisType, SocialAnalysis | null>;
}

/**
 * Batch version: fetch ALL latest analyses for MULTIPLE profiles in one query.
 * Returns profileId → { analysisType → SocialAnalysis | null }.
 * Single auth call + single DB query instead of N separate calls.
 */
export async function getAllLatestAnalysesBatch(
  profileIds: string[],
): Promise<Record<string, Record<AnalysisType, SocialAnalysis | null>>> {
  const result: Record<string, Record<AnalysisType, SocialAnalysis | null>> = {};
  for (const id of profileIds) result[id] = emptyAnalysesRecord();

  if (profileIds.length === 0) return result;

  const userId = await getAuthUserId();
  if (!userId) return result;

  const admin = createAdminClient();
  const { data } = await admin
    .from("social_analyses")
    .select("*")
    .in("social_profile_id", profileIds)
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as SocialAnalysis[];

  // Track seen types per profile to keep only the latest
  const seen = new Set<string>();
  for (const a of analyses) {
    const key = `${a.social_profile_id}:${a.analysis_type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (result[a.social_profile_id]) {
      (result[a.social_profile_id] as Record<string, SocialAnalysis | null>)[a.analysis_type] = a;
    }
  }

  return result;
}

export async function getAnalysisStatus(
  profileId: string,
): Promise<
  Record<AnalysisType, { hasData: boolean; createdAt: string | null }>
> {
  const userId = await getAuthUserId();
  if (!userId) {
    return emptyStatusRecord();
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("social_analyses")
    .select("analysis_type, created_at")
    .eq("social_profile_id", profileId)
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as Array<{
    analysis_type: AnalysisType;
    created_at: string;
  }>;

  const types: AnalysisType[] = [
    "growth",
    "content_strategy",
    "hashtags",
    "competitors",
    "insights",
    "earnings_forecast",
    "thirty_day_plan",
    "smo_score",
    "audience",
    "network",
    "campaign_ideas",
    "content_generator",
    "recommendations",
  ];

  const result: Record<
    string,
    { hasData: boolean; createdAt: string | null }
  > = {};
  for (const type of types) {
    const found = analyses.find((a) => a.analysis_type === type);
    result[type] = {
      hasData: !!found,
      createdAt: found?.created_at ?? null,
    };
  }

  return result as Record<
    AnalysisType,
    { hasData: boolean; createdAt: string | null }
  >;
}

/**
 * Fetch cached content generator results for multiple profiles.
 * Returns a map of profileId → contentType → result JSONB.
 * Unlike getCachedResults (which keeps 1 per profile), this keeps
 * the latest result per profile per contentType.
 */
export async function getCachedContentResults(
  profileIds: string[],
): Promise<Record<string, Record<string, Record<string, unknown>>>> {
  if (profileIds.length === 0) return {};

  const userId = await getAuthUserId();
  if (!userId) return {};

  const admin = createAdminClient();
  const { data } = await admin
    .from("social_analyses")
    .select("social_profile_id, result, created_at")
    .in("social_profile_id", profileIds)
    .eq("analysis_type", "content_generator")
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as Array<{
    social_profile_id: string;
    result: Record<string, unknown>;
    created_at: string;
  }>;

  // Keep the latest per profile per contentType
  const result: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const a of analyses) {
    const pid = a.social_profile_id;
    const ct = (a.result?.contentType as string) ?? "post_ideas";
    if (!result[pid]) result[pid] = {};
    // Only keep the first (latest) for each contentType
    if (!result[pid][ct]) {
      result[pid][ct] = a.result;
    }
  }

  return result;
}

function emptyAnalysesRecord(): Record<AnalysisType, SocialAnalysis | null> {
  const types: AnalysisType[] = [
    "growth",
    "content_strategy",
    "hashtags",
    "competitors",
    "insights",
    "earnings_forecast",
    "thirty_day_plan",
    "smo_score",
    "audience",
    "network",
    "campaign_ideas",
    "content_generator",
    "recommendations",
  ];
  const r: Record<string, SocialAnalysis | null> = {};
  for (const t of types) r[t] = null;
  return r as Record<AnalysisType, SocialAnalysis | null>;
}

function emptyStatusRecord(): Record<
  AnalysisType,
  { hasData: boolean; createdAt: string | null }
> {
  const types: AnalysisType[] = [
    "growth",
    "content_strategy",
    "hashtags",
    "competitors",
    "insights",
    "earnings_forecast",
    "thirty_day_plan",
    "smo_score",
    "audience",
    "network",
    "campaign_ideas",
    "content_generator",
    "recommendations",
  ];
  const r: Record<string, { hasData: boolean; createdAt: string | null }> = {};
  for (const t of types) r[t] = { hasData: false, createdAt: null };
  return r as Record<
    AnalysisType,
    { hasData: boolean; createdAt: string | null }
  >;
}
