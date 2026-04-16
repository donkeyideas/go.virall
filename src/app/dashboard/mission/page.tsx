import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles, getUserPrimaryGoal } from "@/lib/dal/profiles";
import { getOrgGoalProgress } from "@/lib/dal/goals";
import { MissionClient } from "./MissionClient";

export const dynamic = "force-dynamic";

export default async function MissionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profiles, primaryGoal, goalProgress] = await Promise.all([
    getSocialProfiles(),
    getUserPrimaryGoal(),
    getOrgGoalProgress().catch(() => []),
  ]);

  return (
    <MissionClient
      profiles={profiles}
      initialPrimaryGoal={primaryGoal}
      goalProgress={goalProgress}
    />
  );
}
