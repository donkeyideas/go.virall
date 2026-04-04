import { NextRequest, NextResponse } from "next/server";
import { stripe, planNameFromPriceId, PLAN_PROFILE_LIMITS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    // ── Invoice paid (primary activation — covers initial + recurring) ──
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null;

      // Get subscription ID from invoice parent (Stripe 2026+ API)
      const subId = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subId === "string" ? subId : subId?.id ?? null;

      if (!subscriptionId || !customerId) break;

      // Find org by Stripe customer ID
      const { data: org } = await admin
        .from("organizations")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!org) break;

      // Retrieve subscription for plan details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
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
      break;
    }

    // ── Invoice payment failed ──
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.parent?.subscription_details?.subscription;
      const subscriptionId =
        typeof subId === "string" ? subId : subId?.id ?? null;

      if (subscriptionId) {
        await admin
          .from("organizations")
          .update({
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);
      }
      break;
    }

    // ── Subscription updated (plan change, renewal, etc.) ──
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organization_id;
      if (!orgId) break;

      const priceId = subscription.items.data[0]?.price.id;
      const isActive = ["active", "trialing"].includes(subscription.status);
      const planKey =
        isActive && priceId ? planNameFromPriceId(priceId) : "free";

      await admin
        .from("organizations")
        .update({
          stripe_subscription_id: isActive ? subscription.id : null,
          stripe_price_id: isActive ? priceId || null : null,
          plan: planKey,
          subscription_status: subscription.status,
          max_social_profiles: PLAN_PROFILE_LIMITS[planKey] ?? 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
      break;
    }

    // ── Subscription deleted (cancellation) ──
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = subscription.metadata?.organization_id;
      if (!orgId) break;

      await admin
        .from("organizations")
        .update({
          stripe_subscription_id: null,
          stripe_price_id: null,
          plan: "free",
          subscription_status: "canceled",
          max_social_profiles: PLAN_PROFILE_LIMITS["free"] ?? 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
