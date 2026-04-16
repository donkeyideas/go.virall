import { redirect } from "next/navigation";
import { getSocialProfiles, getLatestMetricsBatch, getUserPrimaryGoal } from "@/lib/dal/profiles";
import { getAllLatestAnalysesBatch } from "@/lib/dal/analyses";
import { getCompetitorsBatch } from "@/lib/dal/competitors";
import { getDeals } from "@/lib/dal/deals";
import { getCampaigns } from "@/lib/dal/campaigns";
import { getNotifications } from "@/lib/dal/notifications";
import { getRevenueStats } from "@/lib/dal/revenue";
import { getOrgGoalProgress } from "@/lib/dal/goals";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OverviewRouter } from "@/components/dashboard/overview/OverviewRouter";
import type { TrustScore } from "@/types";

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profiles = await getSocialProfiles();

  if (profiles.length === 0) {
    const primaryGoal = await getUserPrimaryGoal();
    return (
      <OverviewRouter
        profiles={[]}
        analysisMap={{}}
        competitorsMap={{}}
        deals={[]}
        campaigns={[]}
        notifications={[]}
        metricsMap={{}}
        trustScore={{ id: "", profile_id: user.id, overall_score: 100, completion_rate: 100, response_time_score: 100, dispute_rate: 100, consistency_score: 100, deal_volume_score: 0, total_deals_closed: 0, total_deals_completed: 0, total_deals_disputed: 0, avg_response_hours: null, is_public: false, last_calculated_at: "", created_at: "", updated_at: "" }}
        revenueStats={null}
        primaryGoal={primaryGoal}
        goalProgress={[]}
      />
    );
  }

  const ids = profiles.map((p) => p.id);

  // Batch all data in parallel
  const admin = createAdminClient();
  const [deals, campaigns, notifications, analysisMap, competitorsMap, metricsMap, trustScoreRow, revenueStats, primaryGoal, goalProgress] =
    await Promise.all([
      getDeals(),
      getCampaigns(),
      getNotifications(10),
      getAllLatestAnalysesBatch(ids),
      getCompetitorsBatch(ids),
      getLatestMetricsBatch(ids, 30),
      admin
        .from("trust_scores")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle()
        .then(({ data }) => data as TrustScore | null),
      getRevenueStats().catch(() => null),
      getUserPrimaryGoal(),
      getOrgGoalProgress().catch(() => []),
    ]);
  // Default trust score: everyone starts at 100 (same as TrustScorePage)
  const trustScore: TrustScore = trustScoreRow ?? {
    id: "",
    profile_id: user.id,
    overall_score: 100,
    completion_rate: 100,
    response_time_score: 100,
    dispute_rate: 100,
    consistency_score: 100,
    deal_volume_score: 0,
    total_deals_closed: 0,
    total_deals_completed: 0,
    total_deals_disputed: 0,
    avg_response_hours: null,
    is_public: false,
    last_calculated_at: "",
    created_at: "",
    updated_at: "",
  };

  return (
    <OverviewRouter
      profiles={profiles}
      analysisMap={analysisMap}
      competitorsMap={competitorsMap}
      deals={deals}
      campaigns={campaigns}
      notifications={notifications}
      metricsMap={metricsMap}
      trustScore={trustScore}
      revenueStats={revenueStats}
      primaryGoal={primaryGoal}
      goalProgress={goalProgress}
    />
  );
}
