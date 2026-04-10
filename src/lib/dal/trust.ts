"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrustScore, TrustScoreHistory } from "@/types";

// ─── Get Trust Score ────────────────────────────────────────────────────────

export async function getTrustScore(profileId: string): Promise<TrustScore | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const { data } = await admin
    .from("trust_scores")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data) return null;

  // Own profile: always return full data
  if (user?.id === profileId) return data as TrustScore;

  // Others: only return if public
  if (!data.is_public) return null;

  return data as TrustScore;
}

// ─── Get Public Trust Badge (minimal data for cards) ────────────────────────

export async function getPublicTrustBadge(
  profileId: string,
): Promise<{ score: number; totalDeals: number; isPublic: boolean } | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("trust_scores")
    .select("overall_score, total_deals_closed, is_public")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!data) return null;

  return {
    score: data.overall_score,
    totalDeals: data.total_deals_closed,
    isPublic: data.is_public,
  };
}

// ─── Get Trust Score History ─────────────────────────────────────────────────

export async function getTrustScoreHistory(
  profileId: string,
  limit = 50,
): Promise<TrustScoreHistory[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Others: only return if public
  if (user?.id !== profileId) {
    const { data: ts } = await admin
      .from("trust_scores")
      .select("is_public")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!ts?.is_public) return [];
  }

  const { data } = await admin
    .from("trust_score_history")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(limit);

  return (data ?? []) as TrustScoreHistory[];
}
