import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles, getUserPrimaryGoal } from "@/lib/dal/profiles";
import { MissionClient } from "./MissionClient";

export const dynamic = "force-dynamic";

export default async function MissionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profiles, primaryGoal] = await Promise.all([
    getSocialProfiles(),
    getUserPrimaryGoal(),
  ]);

  return <MissionClient profiles={profiles} initialPrimaryGoal={primaryGoal} />;
}
