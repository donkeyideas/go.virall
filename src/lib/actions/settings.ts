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

export async function updateFeaturePreferences(formData: FormData) {
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
    feature_inbox: boolField("feature_inbox"),
    feature_business: boolField("feature_business"),
    feature_publish: boolField("feature_publish"),
    feature_hashtags: boolField("feature_hashtags"),
    feature_media_kit: boolField("feature_media_kit"),
    feature_team: boolField("feature_team"),
    feature_api_keys: boolField("feature_api_keys"),
    feature_growth: boolField("feature_growth"),
    feature_revenue: boolField("feature_revenue"),
    feature_strategy: boolField("feature_strategy"),
    feature_intelligence: boolField("feature_intelligence"),
    feature_trust_score: boolField("feature_trust_score"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("user_preferences")
    .upsert(prefs, { onConflict: "id" });

  if (error) {
    return { error: "Failed to update feature preferences." };
  }

  revalidatePath("/dashboard", "layout");
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

// ---------------------------------------------------------------------------
// Brand Profile
// ---------------------------------------------------------------------------

export async function updateBrandProfile(data: {
  companyName?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.companyName !== undefined) updateData.company_name = data.companyName.trim() || null;
  if (data.website !== undefined) updateData.company_website = data.website.trim() || null;
  if (data.industry !== undefined) updateData.industry = data.industry || null;
  if (data.companySize !== undefined) updateData.company_size = data.companySize || null;
  if (data.description !== undefined) updateData.brand_description = data.description.trim() || null;
  if (data.contactEmail !== undefined) updateData.contact_email = data.contactEmail.trim() || null;
  if (data.contactPhone !== undefined) updateData.contact_phone = data.contactPhone.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id);

  if (error) return { error: "Failed to update brand profile." };

  revalidatePath("/brand/settings");
  revalidatePath("/brand");
  return { success: true };
}

export async function uploadBrandLogo(formData: FormData): Promise<{ success?: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated." };

    const file = formData.get("file") as File | null;
    if (!file) return { error: "No file provided." };

    if (file.size > 2 * 1024 * 1024) return { error: "File must be under 2MB." };

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `brand-logos/${user.id}.${ext}`;

    let uploadResult;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      uploadResult = await supabase.storage
        .from("avatars")
        .upload(path, uint8, { upsert: true, contentType: file.type });
    } catch (storageErr) {
      return { error: `Storage crash: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}` };
    }

    if (uploadResult.error) {
      return { error: `Storage: ${uploadResult.error.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        brand_logo_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) return { error: `DB: ${updateError.message}` };

    revalidatePath("/brand/settings");
    revalidatePath("/brand");
    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    return { error: `Crash: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function uploadAvatar(formData: FormData): Promise<{ success?: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated." };

    const file = formData.get("file") as File | null;
    if (!file) return { error: "No file provided." };

    if (file.size > 2 * 1024 * 1024) return { error: "File must be under 2MB." };

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `avatars/${user.id}.${ext}`;

    let uploadResult;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      uploadResult = await supabase.storage
        .from("avatars")
        .upload(path, uint8, { upsert: true, contentType: file.type });
    } catch (storageErr) {
      return { error: `Storage crash: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}` };
    }

    if (uploadResult.error) {
      return { error: `Storage: ${uploadResult.error.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) return { error: `DB: ${updateError.message}` };

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");
    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    return { error: `Crash: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function inviteTeamMember(email: string, role: string = "viewer") {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { error: "Not authenticated." };

    // Validate email
    if (!email || !email.includes("@")) return { error: "Valid email required." };

    // Can't invite yourself
    if (email.toLowerCase() === user.email?.toLowerCase()) {
      return { error: "You cannot invite yourself." };
    }

    // Get inviter profile for display name and org
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, company_name, organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) return { error: "No organization found." };

    const admin = createAdminClient();

    // Check for existing pending invite
    const { data: existing } = await admin
      .from("team_invites")
      .select("id, status")
      .eq("organization_id", profile.organization_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();

    if (existing) return { error: "This person already has a pending invite." };

    // Generate invite token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    // Store invite
    const { data: invite, error: insertError } = await admin.from("team_invites").insert({
      organization_id: profile.organization_id,
      invited_by: user.id,
      email: email.toLowerCase(),
      role,
      token,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    }).select("id").single();

    if (insertError || !invite) {
      return { error: "Failed to create invite." };
    }

    // Send invite email (best-effort — don't fail the invite if email fails)
    const inviterName = profile.company_name || profile.full_name || "Someone";
    const orgName = profile.company_name || "a team on Go Virall";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3600";
    const inviteUrl = `${appUrl}/invite/${token}`;

    // Send invite email via DB template (falls back to helper if template missing)
    const { sendTemplateEmail } = await import("@/lib/email");
    const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

    let emailSent = false;
    const emailResult = await sendTemplateEmail({
      templateName: "team_invite",
      to: email,
      variables: {
        inviter_name: inviterName,
        org_name: orgName,
        invite_url: inviteUrl,
        role: roleLabel,
      },
      from: "Go Virall <noreply@govirall.com>",
    });
    emailSent = "success" in emailResult;

    // Fallback: if template lookup failed, send a direct email
    if (!emailSent) {
      const { sendEmail } = await import("@/lib/email");
      const fallbackResult = await sendEmail({
        to: email,
        subject: `${inviterName} invited you to join ${orgName} on Go Virall`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
            <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">You've been invited!</h2>
            <p style="margin:0 0 12px;font-size:14px;color:#444;line-height:1.6;">
              <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Go Virall as a <strong>${roleLabel}</strong>.
            </p>
            <a href="${inviteUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.5px;">
              Accept Invite
            </a>
            <p style="margin:16px 0 0;font-size:12px;color:#999;">This invite expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
          </div>
        `,
        from: "Go Virall <noreply@govirall.com>",
      });
      emailSent = "success" in fallbackResult;
    }

    revalidatePath("/brand/settings");
    revalidatePath("/dashboard/settings");
    return { success: true, emailSent, inviteId: invite.id };
  } catch (err) {
    return { error: `Crash: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function getTeamInvites() {
  const supabase = await createClient();
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

  const admin = createAdminClient();
  const { data: invites } = await admin
    .from("team_invites")
    .select("id, email, role, status, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return invites || [];
}

export async function cancelTeamInvite(inviteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("team_invites")
    .delete()
    .eq("id", inviteId);

  if (error) return { error: "Failed to cancel invite." };

  revalidatePath("/brand/settings");
  revalidatePath("/dashboard/settings");
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

// ─── Support Messages ────────────────────────────────────────

export async function submitSupportMessage(
  subject: string,
  message: string,
): Promise<{ success: true } | { error: string }> {
  if (!subject.trim() || !message.trim()) {
    return { error: "Subject and message are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, organization_id")
    .eq("id", user.id)
    .single();

  const name = profile?.company_name || profile?.full_name || "Brand User";

  const admin = createAdminClient();
  const { error } = await admin.rpc("submit_support_message", {
    p_name: name,
    p_email: user.email ?? "",
    p_subject: subject.trim(),
    p_message: message.trim(),
    p_user_id: user.id,
  });

  if (error) return { error: "Failed to send message." };

  revalidatePath("/brand/settings");
  return { success: true };
}

export async function markSupportMessageRead(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("contact_submissions")
    .update({ brand_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: "Failed to mark as read." };

  revalidatePath("/brand/settings");
  return { success: true };
}
