"use server";

import { createClient } from "@/lib/supabase/server";
import type { SocialProfile, SocialMetrics } from "@/types";

export async function getSocialProfiles(): Promise<SocialProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (data ?? []) as SocialProfile[];
}

export async function getSocialProfileById(
  id: string,
): Promise<SocialProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_profiles")
    .select("*")
    .eq("id", id)
    .single();

  return data as SocialProfile | null;
}

export async function getSocialProfileCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("social_profiles")
    .select("id", { count: "exact", head: true });

  return count ?? 0;
}

export async function getLatestMetrics(
  profileId: string,
  limit = 30,
): Promise<SocialMetrics[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: false })
    .limit(limit);

  return (data ?? []) as SocialMetrics[];
}
