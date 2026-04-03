import { Suspense } from "react";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults, getCachedContentResults } from "@/lib/dal/analyses";
import { AiStudioClient } from "./AiStudioClient";

export default async function AiStudioPage() {
  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);

  const [cachedInsights, cachedContent] = await Promise.all([
    getCachedResults(ids, "insights"),
    getCachedContentResults(ids),
  ]);

  return (
    <Suspense>
      <AiStudioClient
        profiles={profiles}
        cachedInsights={cachedInsights}
        cachedContent={cachedContent}
      />
    </Suspense>
  );
}
