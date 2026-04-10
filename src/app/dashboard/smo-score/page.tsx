import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults } from "@/lib/dal/analyses";
import { SmoScoreClient } from "./SmoScoreClient";

export default async function SmoScorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profiles = await getSocialProfiles();
  const cachedResults = await getCachedResults(
    profiles.map((p) => p.id),
    "smo_score",
  );

  return (
    <SmoScoreClient
      profiles={profiles}
      cachedResults={cachedResults}
    />
  );
}
