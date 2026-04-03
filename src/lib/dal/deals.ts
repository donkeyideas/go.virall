"use server";

import { createClient } from "@/lib/supabase/server";
import type { Deal, DealDeliverable } from "@/types";

export async function getDeals(): Promise<Deal[]> {
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
    .from("deals")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return (data ?? []) as Deal[];
}

export async function getDealById(id: string): Promise<Deal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  return data as Deal | null;
}

export async function getDealDeliverables(
  dealId: string,
): Promise<DealDeliverable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deal_deliverables")
    .select("*")
    .eq("deal_id", dealId)
    .order("deadline", { ascending: true });

  return (data ?? []) as DealDeliverable[];
}
