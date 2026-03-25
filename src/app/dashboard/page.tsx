import { getSocialProfiles, getLatestMetrics } from "@/lib/dal/profiles";
import { getAllLatestAnalyses } from "@/lib/dal/analyses";
import { getCompetitors } from "@/lib/dal/competitors";
import { getDeals } from "@/lib/dal/deals";
import { getCampaigns } from "@/lib/dal/campaigns";
import { getNotifications } from "@/lib/dal/notifications";
import { OverviewRouter } from "@/components/dashboard/overview/OverviewRouter";
import type {
  AnalysisType,
  SocialAnalysis,
  SocialCompetitor,
  SocialMetrics,
} from "@/types";

export default async function OverviewPage() {
  const profiles = await getSocialProfiles();

  if (profiles.length === 0) {
    return (
      <OverviewRouter
        profiles={[]}
        analysisMap={{}}
        competitorsMap={{}}
        deals={[]}
        campaigns={[]}
        notifications={[]}
        metricsMap={{}}
      />
    );
  }

  const [deals, campaigns, notifications] = await Promise.all([
    getDeals(),
    getCampaigns(),
    getNotifications(10),
  ]);

  const profileDataArr = await Promise.all(
    profiles.map(async (profile) => {
      const [analyses, competitors, metrics] = await Promise.all([
        getAllLatestAnalyses(profile.id),
        getCompetitors(profile.id),
        getLatestMetrics(profile.id, 30),
      ]);
      return { id: profile.id, analyses, competitors, metrics };
    }),
  );

  const analysisMap: Record<
    string,
    Record<AnalysisType, SocialAnalysis | null>
  > = {};
  const competitorsMap: Record<string, SocialCompetitor[]> = {};
  const metricsMap: Record<string, SocialMetrics[]> = {};

  for (const pd of profileDataArr) {
    analysisMap[pd.id] = pd.analyses;
    competitorsMap[pd.id] = pd.competitors;
    metricsMap[pd.id] = pd.metrics;
  }

  return (
    <OverviewRouter
      profiles={profiles}
      analysisMap={analysisMap}
      competitorsMap={competitorsMap}
      deals={deals}
      campaigns={campaigns}
      notifications={notifications}
      metricsMap={metricsMap}
    />
  );
}
