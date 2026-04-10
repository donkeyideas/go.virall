import { createAdminClient } from "@/lib/supabase/admin";
import type { TrustScore } from "@/types";

// ─── Trust Score Calculation Engine ─────────────────────────────────────────
//
// Weighted scoring (0-100):
//   Completion Rate:  35%  — paid deals / total closed
//   Dispute Rate:     25%  — inverted: fewer disputes = higher score
//   Response Time:    15%  — avg hours to respond to deliverables
//   Consistency:      15%  — matched outcomes / total outcomes
//   Deal Volume:      10%  — logarithmic scale

const WEIGHTS = {
  completion: 0.35,
  dispute: 0.25,
  responseTime: 0.15,
  consistency: 0.15,
  volume: 0.10,
};

const MIN_DEALS_FOR_PUBLIC = 3;

// Recency: last 6mo = 1.0, 6-12mo = 0.7, 12+ = 0.4
function recencyWeight(dateStr: string): number {
  const months = (Date.now() - new Date(dateStr).getTime()) / (30 * 86400000);
  if (months <= 6) return 1.0;
  if (months <= 12) return 0.7;
  return 0.4;
}

function volumeScore(count: number): number {
  if (count <= 0) return 0;
  if (count >= 50) return 100;
  // Logarithmic: 3→40, 5→55, 10→70, 20→85, 50→100
  return Math.min(100, Math.round(40 + 60 * (Math.log(count) / Math.log(50))));
}

function responseTimeScore(avgHours: number | null): number {
  if (avgHours == null) return 50; // neutral default
  if (avgHours <= 4) return 100;
  if (avgHours <= 12) return 85;
  if (avgHours <= 24) return 70;
  if (avgHours <= 48) return 50;
  return 30;
}

export async function calculateTrustScore(profileId: string): Promise<TrustScore | null> {
  const admin = createAdminClient();

  // Get all deals this profile is part of (either as org owner or brand_profile_id)
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", profileId)
    .single();

  if (!profile?.organization_id) return null;

  // Get deals where this user is involved AND that are platform deals with closure outcomes
  const { data: deals } = await admin
    .from("deals")
    .select("id, brand_profile_id, organization_id, closure_status, final_outcome, closed_at, is_from_platform, updated_at")
    .eq("is_from_platform", true)
    .or(`organization_id.eq.${profile.organization_id},brand_profile_id.eq.${profileId}`);

  if (!deals || deals.length === 0) return null;

  // Get all closure outcomes for these deals
  const dealIds = deals.map((d) => d.id);
  const { data: allOutcomes } = await admin
    .from("deal_closure_outcomes")
    .select("*")
    .in("deal_id", dealIds);

  // Filter to closed deals (have final_outcome)
  const closedDeals = deals.filter((d) => d.final_outcome);

  if (closedDeals.length === 0) return null;

  // ─── Completion Rate ──────────────────────────────────────
  let weightedCompleted = 0;
  let weightedTotal = 0;

  for (const deal of closedDeals) {
    const w = recencyWeight(deal.closed_at ?? deal.updated_at);
    weightedTotal += w;
    if (deal.final_outcome === "paid" || deal.final_outcome === "partially_paid") {
      weightedCompleted += w;
    }
  }

  const completionRate = weightedTotal > 0 ? (weightedCompleted / weightedTotal) * 100 : 0;

  // ─── Dispute Rate ─────────────────────────────────────────
  let weightedDisputed = 0;
  let weightedDisputeTotal = 0;

  for (const deal of closedDeals) {
    const w = recencyWeight(deal.closed_at ?? deal.updated_at);
    weightedDisputeTotal += w;
    if (deal.final_outcome === "disputed") {
      weightedDisputed += w;
    }
  }

  const rawDisputeRate = weightedDisputeTotal > 0 ? (weightedDisputed / weightedDisputeTotal) * 100 : 0;
  const disputeRateScore = Math.max(0, 100 - rawDisputeRate);

  // ─── Consistency Score ────────────────────────────────────
  const myOutcomes = (allOutcomes ?? []).filter((o) => o.user_id === profileId);
  let matched = 0;
  let total = 0;

  for (const myOutcome of myOutcomes) {
    const otherOutcome = (allOutcomes ?? []).find(
      (o) => o.deal_id === myOutcome.deal_id && o.user_id !== profileId,
    );
    if (otherOutcome) {
      total++;
      if (myOutcome.outcome === otherOutcome.outcome) matched++;
    }
  }

  const consistencyScore = total > 0 ? (matched / total) * 100 : 50; // neutral if no data

  // ─── Response Time ────────────────────────────────────────
  // Avg time from deliverable submission to review (or vice versa)
  const { data: deliverables } = await admin
    .from("deal_deliverables")
    .select("submitted_at, reviewed_at")
    .in("deal_id", dealIds)
    .not("submitted_at", "is", null)
    .not("reviewed_at", "is", null);

  let totalResponseMs = 0;
  let responseCount = 0;

  for (const del of deliverables ?? []) {
    if (del.submitted_at && del.reviewed_at) {
      const diff = new Date(del.reviewed_at).getTime() - new Date(del.submitted_at).getTime();
      if (diff > 0) {
        totalResponseMs += diff;
        responseCount++;
      }
    }
  }

  const avgResponseHours = responseCount > 0 ? totalResponseMs / responseCount / 3600000 : null;
  const respScore = responseTimeScore(avgResponseHours);

  // ─── Deal Volume ──────────────────────────────────────────
  const volScore = volumeScore(closedDeals.length);

  // ─── Overall Score ────────────────────────────────────────
  const overall =
    completionRate * WEIGHTS.completion +
    disputeRateScore * WEIGHTS.dispute +
    respScore * WEIGHTS.responseTime +
    consistencyScore * WEIGHTS.consistency +
    volScore * WEIGHTS.volume;

  const totalDealsDisputed = closedDeals.filter((d) => d.final_outcome === "disputed").length;
  const totalDealsCompleted = closedDeals.filter(
    (d) => d.final_outcome === "paid" || d.final_outcome === "partially_paid",
  ).length;

  // Upsert into trust_scores
  const scoreData = {
    profile_id: profileId,
    overall_score: Math.round(overall * 10) / 10,
    completion_rate: Math.round(completionRate * 10) / 10,
    response_time_score: Math.round(respScore * 10) / 10,
    dispute_rate: Math.round(disputeRateScore * 10) / 10,
    consistency_score: Math.round(consistencyScore * 10) / 10,
    deal_volume_score: Math.round(volScore * 10) / 10,
    total_deals_closed: closedDeals.length,
    total_deals_completed: totalDealsCompleted,
    total_deals_disputed: totalDealsDisputed,
    avg_response_hours: avgResponseHours != null ? Math.round(avgResponseHours * 10) / 10 : null,
    is_public: closedDeals.length >= MIN_DEALS_FOR_PUBLIC,
    last_calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Check if exists
  const { data: existing } = await admin
    .from("trust_scores")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (existing) {
    await admin.from("trust_scores").update(scoreData).eq("id", existing.id);
  } else {
    await admin.from("trust_scores").insert(scoreData);
  }

  // Insert history entry
  await admin.from("trust_score_history").insert({
    profile_id: profileId,
    overall_score: scoreData.overall_score,
    breakdown: {
      completion_rate: scoreData.completion_rate,
      response_time_score: scoreData.response_time_score,
      dispute_rate: scoreData.dispute_rate,
      consistency_score: scoreData.consistency_score,
      deal_volume_score: scoreData.deal_volume_score,
    },
  });

  return {
    id: existing?.id ?? "",
    ...scoreData,
    created_at: new Date().toISOString(),
  } as TrustScore;
}
