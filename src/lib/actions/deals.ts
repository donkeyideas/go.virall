"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDeal(formData: FormData) {
  const brandName = formData.get("brandName") as string;
  const contactEmail = formData.get("contactEmail") as string;
  const totalValue = parseFloat(formData.get("totalValue") as string) || null;
  const notes = formData.get("notes") as string;

  if (!brandName) return { error: "Brand name is required." };

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

  const { error } = await supabase.from("deals").insert({
    organization_id: profile.organization_id,
    brand_name: brandName,
    contact_email: contactEmail || null,
    total_value: totalValue,
    notes: notes || null,
  });

  if (error) return { error: "Failed to create deal." };

  revalidatePath("/dashboard/revenue");
  return { success: true };
}

export async function updateDealStatus(dealId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("deals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: "Failed to update deal." };

  revalidatePath("/dashboard/revenue");
  return { success: true };
}
