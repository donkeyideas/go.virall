import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSocialProfileCount } from "@/lib/dal/profiles";
import { GettingStartedClient } from "./GettingStartedClient";

export default async function GuidePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profileCount = await getSocialProfileCount();

  return <GettingStartedClient profileCount={profileCount} />;
}
