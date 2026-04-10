"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { scrapeProfile } from "@/lib/actions/profiles";
import crypto from "crypto";

/**
 * Generate a bio-challenge verification code for a social profile.
 * Superadmins are auto-verified instantly.
 */
export async function generateVerificationCode(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  // Fetch social profile
  const { data: sp } = await admin
    .from("social_profiles")
    .select("id, organization_id, ownership_verified")
    .eq("id", profileId)
    .single();

  if (!sp) return { error: "Profile not found." };

  // Verify ownership — profile must belong to user's org
  const { data: userProfile } = await admin
    .from("profiles")
    .select("organization_id, system_role")
    .eq("id", user.id)
    .single();

  if (!userProfile || userProfile.organization_id !== sp.organization_id) {
    return { error: "Not authorized." };
  }

  // Superadmin: auto-verify immediately
  if (userProfile.system_role === "superadmin") {
    await admin
      .from("social_profiles")
      .update({
        ownership_verified: true,
        ownership_verified_at: new Date().toISOString(),
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq("id", profileId);

    revalidatePath("/dashboard");
    return { success: true, autoVerified: true };
  }

  // Already verified
  if (sp.ownership_verified) {
    return { error: "This profile is already verified." };
  }

  // Generate code: gv- + 6 random hex chars
  const code = `gv-${crypto.randomBytes(3).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await admin
    .from("social_profiles")
    .update({
      verification_code: code,
      verification_code_expires_at: expiresAt,
    })
    .eq("id", profileId);

  return { success: true, code };
}

/**
 * Check if the verification code is present in the social profile's bio.
 * Scrapes the live bio and compares.
 */
export async function checkVerificationCode(profileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  // Fetch social profile with verification fields
  const { data: sp } = await admin
    .from("social_profiles")
    .select("id, organization_id, platform, handle, verification_code, verification_code_expires_at, ownership_verified")
    .eq("id", profileId)
    .single();

  if (!sp) return { error: "Profile not found." };

  // Verify ownership
  const { data: userProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userProfile || userProfile.organization_id !== sp.organization_id) {
    return { error: "Not authorized." };
  }

  if (sp.ownership_verified) {
    return { success: true, verified: true };
  }

  if (!sp.verification_code) {
    return { error: "No verification code found. Please generate one first." };
  }

  // Check expiry
  if (sp.verification_code_expires_at && new Date(sp.verification_code_expires_at) < new Date()) {
    return { error: "Verification code has expired. Please generate a new one.", expired: true };
  }

  // Scrape the live bio
  const scraped = await scrapeProfile(sp.platform, sp.handle);
  const bio = (scraped.bio || "").toLowerCase();
  const code = sp.verification_code.toLowerCase();

  if (!bio.includes(code)) {
    return {
      success: false,
      verified: false,
      message: "Code not found in your bio. Make sure you saved your bio with the code and try again.",
    };
  }

  // Verified! Update the profile
  const updateData: Record<string, unknown> = {
    ownership_verified: true,
    ownership_verified_at: new Date().toISOString(),
    verification_code: null,
    verification_code_expires_at: null,
  };

  // Also update scraped data while we're at it
  if (scraped.displayName !== undefined) updateData.display_name = scraped.displayName;
  if (scraped.bio !== undefined) updateData.bio = scraped.bio;
  if (scraped.avatarUrl !== undefined) updateData.avatar_url = scraped.avatarUrl;
  if (scraped.followersCount !== undefined) updateData.followers_count = scraped.followersCount;
  if (scraped.followingCount !== undefined) updateData.following_count = scraped.followingCount;
  if (scraped.postsCount !== undefined) updateData.posts_count = scraped.postsCount;
  if (scraped.verified !== undefined) updateData.verified = scraped.verified;
  updateData.last_synced_at = new Date().toISOString();

  await admin
    .from("social_profiles")
    .update(updateData)
    .eq("id", profileId);

  revalidatePath("/dashboard");
  return { success: true, verified: true };
}
