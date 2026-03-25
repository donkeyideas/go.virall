import { NextRequest, NextResponse } from "next/server";
import { stripe, planNameFromPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  pro: 3,
  business: 10,
  enterprise: 999,
};

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
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.metadata?.organization_id) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        const priceId = subscription.items.data[0]?.price.id;
        const planKey = priceId ? planNameFromPriceId(priceId) : "free";

        await admin
          .from("organizations")
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId || null,
            plan: planKey,
            subscription_status: subscription.status,
            max_social_profiles: PLAN_LIMITS[planKey] ?? 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.metadata.organization_id);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
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
          max_social_profiles: PLAN_LIMITS[planKey] ?? 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subId =
        invoice.parent?.subscription_details?.subscription;
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
  }

  return NextResponse.json({ received: true });
}
