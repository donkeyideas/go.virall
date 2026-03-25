"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const fields = [
    ["fullName", "full_name"],
    ["displayName", "display_name"],
    ["bio", "bio"],
    ["niche", "niche"],
    ["location", "location"],
    ["timezone", "timezone"],
  ] as const;

  for (const [formKey, dbKey] of fields) {
    const value = formData.get(formKey) as string | null;
    if (value !== null) {
      updateData[dbKey] = value.trim() || null;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) {
    return { error: "Failed to update profile." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateOrganization(formData: FormData) {
  const name = formData.get("name") as string | null;

  if (!name || !name.trim()) {
    return { error: "Organization name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "No organization found." };
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name: name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.organization_id);

  if (error) {
    return { error: "Failed to update organization." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateNotificationPreferences(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const boolField = (key: string) => formData.get(key) === "true";

  const prefs = {
    id: user.id,
    email_notifications: boolField("email_notifications"),
    weekly_report: boolField("weekly_report"),
    daily_digest: boolField("daily_digest"),
    brand_deal_updates: boolField("brand_deal_updates"),
    growth_milestones: boolField("growth_milestones"),
    collab_opportunities: boolField("collab_opportunities"),
    marketing_updates: boolField("marketing_updates"),
    deal_room_messages: boolField("deal_room_messages"),
    campaign_reminders: boolField("campaign_reminders"),
    ai_analysis_complete: boolField("ai_analysis_complete"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_preferences")
    .upsert(prefs, { onConflict: "id" });

  if (error) {
    return { error: "Failed to update preferences." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const newPassword = formData.get("newPassword") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return { error: "Failed to delete account." };
  }

  await supabase.auth.signOut();
  redirect("/");
}
