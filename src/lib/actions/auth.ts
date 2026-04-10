"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const niche = formData.get("niche") as string;
  const goal = formData.get("goal") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const referralSource = formData.get("referralSource") as string;

  const fullName = [firstName, lastName].filter(Boolean).join(" ") ||
    (formData.get("fullName") as string);

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const admin = createAdminClient();

  // 1. Create auth user (auto-confirmed, no email verification needed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      niche: niche || undefined,
      goal: goal || undefined,
      city: city || undefined,
      state: state || undefined,
      referral_source: referralSource || undefined,
    },
  });

  if (authError || !authData.user) {
    console.error("[signUp] createUser failed:", JSON.stringify(authError, null, 2));
    if (authError?.message?.includes("already been registered")) {
      return { error: "An account with this email already exists." };
    }
    return { error: authError?.message || "Failed to create account." };
  }

  // 2. Create organization with 14-day trial
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const slug = (fullName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .slice(0, 30);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: fullName ? `${fullName}'s Dashboard` : "My Dashboard",
      slug: `${slug}-${Date.now().toString(36)}`,
      plan: "free",
      max_social_profiles: 1,
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: "Failed to create organization." };
  }

  // 3. Create profile linked to org with owner role
  // Use upsert in case a DB trigger already created a skeleton profile row
  const profileLocation = [city, state].filter(Boolean).join(", ") || null;
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: authData.user.id,
      organization_id: org.id,
      full_name: fullName || null,
      niche: niche || null,
      location: profileLocation,
      role: "owner",
    }, { onConflict: "id" });

  if (profileError) {
    console.error("[signUp] profile upsert failed:", JSON.stringify(profileError, null, 2));
    return { error: "Failed to create user profile." };
  }

  // 4. Auto sign-in
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });

  revalidatePath("/", "layout");
  redirect("/welcome");
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // Determine redirect based on account_type
  let destination = "/dashboard";
  if (authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", authData.user.id)
      .single();

    if (profile?.account_type === "brand") {
      destination = "/brand";
    }
  }

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
