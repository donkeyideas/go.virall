import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults } from "@/lib/dal/analyses";
import { GroupedAnalysisPage, type TabDef } from "@/components/dashboard/GroupedAnalysisPage";

const INTELLIGENCE_TABS: TabDef[] = [
  {
    key: "audience",
    label: "Audience",
    analysisType: "audience",
    title: "Audience",
    description:
      "Click 'Analyze Audience' to get estimated demographics, audience quality score, interests, and growth potential analysis.",
    buttonLabel: "Analyze Audience",
  },
  {
    key: "competitors",
    label: "Competitors",
    analysisType: "competitors",
    title: "Competitors",
    description:
      "Click 'Analyze Competitors' to get competitive analysis with strengths, weaknesses, opportunities, and industry benchmarks.",
    buttonLabel: "Analyze Competitors",
  },
  {
    key: "network",
    label: "Network",
    analysisType: "network",
    title: "Network",
    description:
      "Click 'Analyze Network' to discover collaboration opportunities, ideal partners, and networking strategies.",
    buttonLabel: "Analyze Network",
  },
];

export default async function IntelligencePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);

  const [audience, competitors, network] = await Promise.all([
    getCachedResults(ids, "audience"),
    getCachedResults(ids, "competitors"),
    getCachedResults(ids, "network"),
  ]);

  return (
    <Suspense>
      <GroupedAnalysisPage
        profiles={profiles}
        tabs={INTELLIGENCE_TABS}
        cachedResultsByTab={{
          audience,
          competitors,
          network,
        }}
        defaultTab="audience"
      />
    </Suspense>
  );
}
