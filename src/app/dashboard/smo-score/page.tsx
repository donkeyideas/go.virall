import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults } from "@/lib/dal/analyses";
import { RunAnalysisTab } from "@/components/dashboard/RunAnalysisTab";

export default async function SmoScorePage() {
  const profiles = await getSocialProfiles();
  const cachedResults = await getCachedResults(
    profiles.map((p) => p.id),
    "smo_score",
  );

  return (
    <RunAnalysisTab
      profiles={profiles}
      analysisType="smo_score"
      title="SMO Score"
      description="Click 'Calculate SMO Score' to get a Social Media Optimization score based on 6 factors: profile completeness, content quality, posting consistency, engagement, growth trajectory, and monetization readiness."
      buttonLabel="Calculate SMO Score"
      cachedResults={cachedResults}
    />
  );
}
