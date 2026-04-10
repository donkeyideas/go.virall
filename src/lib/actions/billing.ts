"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, PLAN_PRICE_IDS, planNameFromPriceId, PLAN_PROFILE_LIMITS } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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

  // Validate plan — check hardcoded map first, then DB pricing_plans table
  let priceId = PLAN_PRICE_IDS[planKey] ?? null;
  let resolvedPlanName = planKey;

  if (!priceId) {
    // planKey might be a pricing_plans ID (brand plans use DB-stored plans)
    const { data: dbPlan } = await admin
      .from("pricing_plans")
      .select("id, stripe_price_id, name, price_monthly")
      .eq("id", planKey)
      .eq("is_active", true)
      .single();

    if (dbPlan) {
      resolvedPlanName = dbPlan.name.toLowerCase();

      if (dbPlan.stripe_price_id) {
        priceId = dbPlan.stripe_price_id;
      } else if (dbPlan.price_monthly > 0) {
        // Auto-create Stripe price for this plan
        const product = await stripe.products.create({
          name: `Go Virall — ${dbPlan.name} (Brand)`,
          metadata: { pricing_plan_id: dbPlan.id },
        });
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: dbPlan.price_monthly,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: { pricing_plan_id: dbPlan.id },
        });
        priceId = stripePrice.id;

        // Store it back so we don't recreate next time
        await admin
          .from("pricing_plans")
          .update({ stripe_price_id: stripePrice.id, updated_at: new Date().toISOString() })
          .eq("id", dbPlan.id);
      }
    }
  }

  if (!priceId || planKey === "free" || resolvedPlanName === "free") {
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

        const newPlan = planNameFromPriceId(priceId) || resolvedPlanName;
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
  let planKey = priceId ? planNameFromPriceId(priceId) : "free";

  // If hardcoded map didn't resolve (brand plans), check DB
  if (planKey === "free" && priceId) {
    const { data: dbPlan } = await admin
      .from("pricing_plans")
      .select("name")
      .eq("stripe_price_id", priceId)
      .single();
    if (dbPlan) {
      planKey = dbPlan.name.toLowerCase();
    }
  }

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

// ─── Cancel Incomplete Subscription (user closed modal without paying) ──

export async function cancelIncompleteSubscription(
  subscriptionId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (sub.status === "incomplete") {
      await stripe.subscriptions.cancel(subscriptionId);
    }
    return { success: true };
  } catch {
    return { error: "Failed to clean up subscription." };
  }
}

// ─── Portal Session (for managing existing subscription) ─────

export async function createPortalSession() {
  return _createPortalSession(`${APP_URL}/dashboard/settings?tab=billing`);
}

export async function createBrandPortalSession() {
  return _createPortalSession(`${APP_URL}/brand/settings`);
}

async function _createPortalSession(returnUrl: string) {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org } = result;

  if (!org.stripe_customer_id) {
    return { error: "No billing account found. You're on the Free plan." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id as string,
    return_url: returnUrl,
  });

  redirect(session.url);
}

// ─── Portal URL (returns URL instead of redirecting) ─────────

export async function getBrandPortalUrl(): Promise<
  { url: string } | { error: string }
> {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org } = result;

  if (!org.stripe_customer_id) {
    return { error: "No billing account found. You're on the Free plan." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id as string,
    return_url: `${APP_URL}/brand/settings`,
  });

  return { url: session.url };
}

// ─── Cancel Subscription at Period End ───────────────────────

export async function cancelSubscriptionAtPeriodEnd(): Promise<
  { success: true } | { error: string }
> {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org } = result;

  if (!org.stripe_subscription_id) {
    return { error: "No active subscription found." };
  }

  try {
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    const admin = (await import("@/lib/supabase/admin")).createAdminClient();
    await admin
      .from("organizations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", org.id);

    revalidatePath("/brand/settings");
    return { success: true };
  } catch {
    return { error: "Failed to cancel subscription. Please try again." };
  }
}

// ─── Create SetupIntent (for updating payment method in-modal) ───

export async function createSetupIntent(): Promise<
  { clientSecret: string } | { error: string }
> {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org } = result;

  if (!org.stripe_customer_id) {
    return { error: "No billing account found." };
  }

  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: org.stripe_customer_id as string,
      usage: "off_session",
      automatic_payment_methods: { enabled: true },
    });

    if (!setupIntent.client_secret) {
      return { error: "Failed to create setup intent." };
    }

    return { clientSecret: setupIntent.client_secret };
  } catch {
    return { error: "Failed to initialize payment method update." };
  }
}

// ─── Set Default Payment Method (after SetupIntent succeeds) ─

export async function setDefaultPaymentMethod(
  paymentMethodId: string,
): Promise<{ success: true } | { error: string }> {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org } = result;

  if (!org.stripe_customer_id) {
    return { error: "No billing account found." };
  }

  try {
    // Set as default on customer
    await stripe.customers.update(org.stripe_customer_id as string, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Also set as default on subscription if active
    if (org.stripe_subscription_id) {
      await stripe.subscriptions.update(org.stripe_subscription_id as string, {
        default_payment_method: paymentMethodId,
      });
    }

    revalidatePath("/brand/settings");
    return { success: true };
  } catch {
    return { error: "Failed to update payment method." };
  }
}

// ─── Resume Subscription (undo cancel) ──────────────────────

export async function resumeSubscription(): Promise<
  { success: true } | { error: string }
> {
  const result = await getAuthenticatedOrg();
  if ("error" in result) return { error: result.error! };
  const { org } = result;

  if (!org.stripe_subscription_id) {
    return { error: "No subscription found." };
  }

  try {
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    revalidatePath("/brand/settings");
    return { success: true };
  } catch {
    return { error: "Failed to resume subscription." };
  }
}
