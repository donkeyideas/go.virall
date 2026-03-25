"use server";

import { createClient } from "@/lib/supabase/server";
import type { Campaign } from "@/types";

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("*")
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
