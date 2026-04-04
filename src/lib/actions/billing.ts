"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PLAN_PRICE_IDS, planNameFromPriceId, PLAN_PROFILE_LIMITS } from "@/lib/stripe";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3600";

// ─── Helper: get authenticated user + org ────────────────────

async function getAuthenticatedOrg() {
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

  if (!profile?.organization_id)
    return { error: "No organization found." };

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, stripe_customer_id, stripe_subscription_id, plan")
    .eq("id", profile.organization_id)
    .single();

  if (!org) return { error: "Organization not found." };

  return { user, org, admin };
}

// ─── Helper: ensure Stripe customer exists ───────────────────

async function ensureStripeCustomer(
  userId: string,
  email: string | undefined,
  orgId: string,
  existingCustomerId: string | null,
  admin: ReturnType<typeof createAdminClient>,
) {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { organization_id: orgId, user_id: userId },
  });

  await admin
    .from("organizations")
    .update({ stripe_customer_id: customer.id })
    .eq("id", orgId);

  return customer.id;
}

// ─── Create Subscription (returns clientSecret for Payment Element) ───

export async function createSubscription(planKey: string): Promise<
  | { clientSecret: string; subscriptionId: string }
  | { error: string }
> {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { user, org, admin } = result;

  // Validate plan
  const priceId = PLAN_PRICE_IDS[planKey];
  if (!priceId || planKey === "free" || planKey === "enterprise") {
    return { error: "Invalid plan selected." };
  }

  const customerId = await ensureStripeCustomer(
    user.id,
    user.email,
    org.id,
    org.stripe_customer_id as string | null,
    admin,
  );

  // If user already has an active subscription, update it instead
  if (org.stripe_subscription_id) {
    try {
      const existingSub = await stripe.subscriptions.retrieve(
        org.stripe_subscription_id as string,
      );
      if (["active", "trialing"].includes(existingSub.status)) {
        // Update existing subscription to new plan
        await stripe.subscriptions.update(existingSub.id, {
          items: [
            {
              id: existingSub.items.data[0].id,
              price: priceId,
            },
          ],
          proration_behavior: "create_prorations",
        });

        const newPlan = planNameFromPriceId(priceId);
        await admin
          .from("organizations")
          .update({
            stripe_price_id: priceId,
            plan: newPlan,
            max_social_profiles: PLAN_PROFILE_LIMITS[newPlan] ?? 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", org.id);

        return { clientSecret: "already_active", subscriptionId: existingSub.id };
      }
    } catch {
      // Subscription doesn't exist or is invalid — create new one
    }
  }

  // Create subscription with payment_behavior: "default_incomplete"
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice"],
    metadata: { organization_id: org.id },
  });

  // Get the client secret from the invoice's payment intent
  // Stripe API 2026+ uses invoicePayments
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === "string") {
    return { error: "Failed to create subscription invoice." };
  }

  let clientSecret: string | null = null;

  // Try the newer invoicePayments API first
  try {
    const payments = await stripe.invoicePayments.list({
      invoice: invoice.id,
      expand: ["data.payment.payment_intent"],
      limit: 1,
    });
    const paymentObj = payments.data[0]?.payment;
    if (paymentObj && "payment_intent" in paymentObj) {
      const pi = paymentObj.payment_intent;
      if (pi && typeof pi !== "string" && pi.client_secret) {
        clientSecret = pi.client_secret;
      }
    }
  } catch {
    // Fallback: try legacy approach
    try {
      const fullInvoice = await stripe.invoices.retrieve(invoice.id, {
        expand: ["payment_intent"],
      });
      const pi = (fullInvoice as unknown as { payment_intent?: { client_secret?: string } }).payment_intent;
      if (pi?.client_secret) {
        clientSecret = pi.client_secret;
      }
    } catch {
      // Neither approach worked
    }
  }

  if (!clientSecret) {
    return { error: "Failed to retrieve payment secret. Please try again." };
  }

  return { clientSecret, subscriptionId: subscription.id };
}

// ─── Activate Subscription (called after payment success) ────

export async function activateSubscription(subscriptionId: string): Promise<
  | { success: true; plan: string }
  | { error: string }
> {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org, admin } = result;

  // Verify subscription via Stripe API
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Verify it belongs to this org
  if (subscription.metadata?.organization_id !== org.id) {
    return { error: "Subscription does not belong to this organization." };
  }

  // Check status is valid
  if (!["active", "trialing"].includes(subscription.status)) {
    return { error: `Subscription is ${subscription.status}, not active.` };
  }

  const priceId = subscription.items.data[0]?.price.id;
  const planKey = priceId ? planNameFromPriceId(priceId) : "free";

  await admin
    .from("organizations")
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId || null,
      plan: planKey,
      subscription_status: subscription.status,
      max_social_profiles: PLAN_PROFILE_LIMITS[planKey] ?? 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id);

  return { success: true, plan: planKey };
}

// ─── Portal Session (for managing existing subscription) ─────

export async function createPortalSession() {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org } = result;

  if (!org.stripe_customer_id) {
    return { error: "No billing account found. You're on the Free plan." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id as string,
    return_url: `${APP_URL}/dashboard/settings?tab=billing`,
  });

  redirect(session.url);
}
