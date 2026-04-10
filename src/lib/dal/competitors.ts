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

/**
 * Batch: fetch competitors for multiple profiles in one query.
 */
export async function getCompetitorsBatch(
  profileIds: string[],
): Promise<Record<string, SocialCompetitor[]>> {
  if (profileIds.length === 0) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("social_competitors")
    .select("*")
    .in("social_profile_id", profileIds)
    .order("followers_count", { ascending: false });

  const result: Record<string, SocialCompetitor[]> = {};
  for (const id of profileIds) result[id] = [];
  for (const row of (data ?? []) as SocialCompetitor[]) {
    result[row.social_profile_id]?.push(row);
  }
  return result;
}
