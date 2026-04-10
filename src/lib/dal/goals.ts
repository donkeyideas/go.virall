"use server";

import { createClient } from "@/lib/supabase/server";
import type { SocialGoal } from "@/types";

export async function getActiveGoal(
  profileId: string,
): Promise<SocialGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .eq("is_active", true)
    .limit(1)
    .single();

  return data as SocialGoal | null;
}

export async function getAllGoals(
  profileId: string,
): Promise<SocialGoal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("created_at", { ascending: false });

  return (data ?? []) as SocialGoal[];
}
