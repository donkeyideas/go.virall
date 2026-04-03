"use server";

import { createClient } from "@/lib/supabase/server";
import type { Campaign } from "@/types";

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();

  // Resolve the user's organization for explicit filtering (alongside RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return (data ?? []) as Campaign[];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  return data as Campaign | null;
}
