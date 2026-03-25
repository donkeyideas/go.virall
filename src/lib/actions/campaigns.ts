"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCampaign(formData: FormData) {
  const name = formData.get("name") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const budget = parseFloat(formData.get("budget") as string) || null;
  const targetReach = parseInt(formData.get("targetReach") as string) || null;
  const notes = formData.get("notes") as string;

  if (!name) return { error: "Campaign name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { error } = await supabase.from("campaigns").insert({
    organization_id: profile.organization_id,
    name,
    start_date: startDate || null,
    end_date: endDate || null,
    budget,
    target_reach: targetReach,
    notes: notes || null,
  });

  if (error) return { error: "Failed to create campaign." };

  revalidatePath("/dashboard/campaigns");
  return { success: true };
}

export async function updateCampaignStatus(campaignId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  if (error) return { error: "Failed to update campaign." };

  revalidatePath("/dashboard/campaigns");
  return { success: true };
}
