"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addCompetitor(formData: FormData) {
  const profileId = formData.get("profileId") as string;
  const platform = formData.get("platform") as string;
  const handle = formData.get("handle") as string;

  if (!profileId || !platform || !handle) {
    return { error: "Profile, platform, and handle are required." };
  }

  const cleanHandle = handle.replace(/^@/, "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("social_competitors").insert({
    social_profile_id: profileId,
    platform,
    handle: cleanHandle,
    display_name: cleanHandle,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: `@${cleanHandle} is already a competitor.` };
    }
    return { error: "Failed to add competitor." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeCompetitor(competitorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("social_competitors")
    .delete()
    .eq("id", competitorId);

  if (error) return { error: "Failed to remove competitor." };

  revalidatePath("/dashboard");
  return { success: true };
}
