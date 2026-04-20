import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults, getAnalysisStatus } from "@/lib/dal/analyses";
import { RecommendationsClient } from "@/components/dashboard/RecommendationsClient";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);
  const [cachedResults, ...statusResults] = await Promise.all([
    getCachedResults(ids, "recommendations"),
    ...ids.map((id) => getAnalysisStatus(id)),
  ]);
  const analysisStatusMap: Record<string, Awaited<ReturnType<typeof getAnalysisStatus>>> = {};
  ids.forEach((id, i) => {
    analysisStatusMap[id] = statusResults[i];
  });

  return (
    <Suspense>
      <RecommendationsClient
        profiles={profiles}
        cachedResults={cachedResults}
        analysisStatus={analysisStatusMap}
      />
    </Suspense>
  );
}
