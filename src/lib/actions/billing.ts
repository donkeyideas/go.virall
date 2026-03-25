"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3600";

export async function createCheckoutSession(planKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  // Validate plan
  const priceId = PLAN_PRICE_IDS[planKey];
  if (!priceId || planKey === "free" || planKey === "enterprise") {
    return { error: "Invalid plan selected." };
  }

  // Get organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "No organization found." };
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, stripe_customer_id, plan")
    .eq("id", profile.organization_id)
    .single();

  if (!org) {
    return { error: "Organization not found." };
  }

  // Get or create Stripe Customer
  let customerId = org.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { organization_id: org.id, user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", org.id);
  }

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/dashboard/settings?tab=billing&upgraded=true`,
    cancel_url: `${APP_URL}/dashboard/settings?tab=billing`,
    subscription_data: {
      metadata: { organization_id: org.id },
    },
    metadata: { organization_id: org.id },
  });

  if (!session.url) {
    return { error: "Failed to create checkout session." };
  }

  redirect(session.url);
}

export async function createPortalSession() {
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

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", profile.organization_id)
    .single();

  if (!org?.stripe_customer_id) {
    return { error: "No billing account found. You're on the Free plan." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id as string,
    return_url: `${APP_URL}/dashboard/settings?tab=billing`,
  });

  redirect(session.url);
}
