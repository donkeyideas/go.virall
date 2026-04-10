import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Use a dedicated Connect webhook secret if available, otherwise fall back
function getWebhookSecret(): string {
  return (
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    ""
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const secret = getWebhookSecret();
  if (!secret) {
    console.error("[stripe-connect webhook] No webhook secret configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-connect webhook] Signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    // ── Account updated (Connect onboarding completed / details changed) ──
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.user_id;

      if (!userId) {
        console.warn("[stripe-connect webhook] account.updated: no user_id in metadata");
        break;
      }

      const isOnboarded =
        account.charges_enabled === true && account.payouts_enabled === true;

      const { error: updateError } = await admin
        .from("profiles")
        .update({
          stripe_connect_onboarded: isOnboarded,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .eq("stripe_connect_id", account.id);

      if (updateError) {
        console.error(
          "[stripe-connect webhook] Failed to update profile:",
          updateError.message
        );
      } else {
        console.log(
          `[stripe-connect webhook] account.updated: user=${userId} onboarded=${isOnboarded}`
        );
      }
      break;
    }

    // ── Payment succeeded ──
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const dealId = paymentIntent.metadata?.deal_id;
      const payerId = paymentIntent.metadata?.payer_id;
      const payeeId = paymentIntent.metadata?.payee_id;

      if (!dealId && !payerId) {
        // Not a platform payment, ignore
        break;
      }

      // Update platform_payments to completed
      const { data: payment, error: fetchError } = await admin
        .from("platform_payments")
        .select("id, deal_id, amount, status")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .single();

      if (fetchError || !payment) {
        console.warn(
          "[stripe-connect webhook] payment_intent.succeeded: no matching platform_payment for",
          paymentIntent.id
        );
        break;
      }

      if (payment.status === "completed") {
        // Already processed (confirmPayment was called first)
        break;
      }

      const { error: updateError } = await admin
        .from("platform_payments")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (updateError) {
        console.error(
          "[stripe-connect webhook] Failed to update platform_payment:",
          updateError.message
        );
        break;
      }

      // Update deal paid_amount
      if (payment.deal_id) {
        const { data: deal } = await admin
          .from("deals")
          .select("paid_amount, organization_id")
          .eq("id", payment.deal_id)
          .single();

        if (deal) {
          const newPaidAmount = (deal.paid_amount ?? 0) + payment.amount;
          await admin
            .from("deals")
            .update({
              paid_amount: newPaidAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.deal_id);
        }

        // Log billing event for brand payment — use the payer's org
        const payerOrgId = paymentIntent.metadata?.organization_id ?? deal?.organization_id;
        if (payerOrgId) {
          await admin.from("billing_events").insert({
            organization_id: payerOrgId,
            event_type: "brand_payment",
            stripe_event_id: event.id,
            amount_cents: paymentIntent.amount ?? 0,
            currency: paymentIntent.currency ?? "usd",
            metadata: {
              deal_id: payment.deal_id,
              payment_id: payment.id,
              payer_id: payerId,
              payee_id: payeeId,
            },
          });
        }
      }
      break;
    }

    // ── Payment failed ──
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const { data: payment, error: fetchError } = await admin
        .from("platform_payments")
        .select("id, status")
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .single();

      if (fetchError || !payment) {
        // Not a platform payment or already handled
        break;
      }

      if (payment.status === "completed" || payment.status === "failed") {
        break;
      }

      const { error: updateError } = await admin
        .from("platform_payments")
        .update({
          status: "failed",
          metadata: {
            failure_code: paymentIntent.last_payment_error?.code ?? null,
            failure_message:
              paymentIntent.last_payment_error?.message ?? "Payment failed",
          },
        })
        .eq("id", payment.id);

      if (updateError) {
        console.error(
          "[stripe-connect webhook] Failed to update failed payment:",
          updateError.message
        );
      } else {
        console.log(
          `[stripe-connect webhook] payment_intent.payment_failed: payment=${payment.id}`
        );
      }
      break;
    }

    default: {
      // Log unhandled events for debugging
      console.log(
        `[stripe-connect webhook] Unhandled event type: ${event.type}`
      );
    }
  }

  return NextResponse.json({ received: true });
}
