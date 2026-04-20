import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults } from "@/lib/dal/analyses";
import { SmoScoreClient } from "./SmoScoreClient";

export const dynamic = "force-dynamic";

export default async function SmoScorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profiles = await getSocialProfiles();
  const ids = profiles.map((p) => p.id);
  const smoCache = await getCachedResults(ids, "smo_score");

  return (
    <Suspense>
      <SmoScoreClient profiles={profiles} cachedResults={smoCache} />
    </Suspense>
  );
}
