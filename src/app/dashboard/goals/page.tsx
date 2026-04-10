import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { GoalsClient } from "@/components/dashboard/goals/GoalsClient";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const profiles = await getSocialProfiles();
  return <GoalsClient profiles={profiles} />;
}
