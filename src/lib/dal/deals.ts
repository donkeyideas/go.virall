"use server";

import { createClient } from "@/lib/supabase/server";
import type { Deal, DealDeliverable } from "@/types";

export async function getDeals(): Promise<Deal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deals")
    .select("*")
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
