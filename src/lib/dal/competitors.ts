"use server";

import { createClient } from "@/lib/supabase/server";
import type { SocialCompetitor } from "@/types";

export async function getCompetitors(
  profileId: string,
): Promise<SocialCompetitor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_competitors")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("followers_count", { ascending: false });

  return (data ?? []) as SocialCompetitor[];
}
