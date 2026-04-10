"use server";

import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { SubscriptionData, BillingInvoice } from "@/types";
import type Stripe from "stripe";

export async function getSubscriptionData(): Promise<SubscriptionData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_subscription_id, stripe_customer_id")
    .eq("id", profile.organization_id)
    .single();

  if (!org?.stripe_subscription_id) return null;

  try {
    const subscription = await stripe.subscriptions.retrieve(
      org.stripe_subscription_id,
      { expand: ["default_payment_method"] },
    );

    const pm = subscription.default_payment_method as Stripe.PaymentMethod | null;
    const periodEnd = subscription.items.data[0]?.current_period_end;

    return {
      status: subscription.status,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      payment_method_last4: pm?.card?.last4 ?? null,
      payment_method_brand: pm?.card?.brand ?? null,
    };
  } catch {
    return null;
  }
}

export async function getBillingInvoices(): Promise<BillingInvoice[]> {
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

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", profile.organization_id)
    .single();

  if (!org?.stripe_customer_id) return [];

  try {
    const invoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 12,
      expand: ["data.charge"],
    });

    return invoices.data
      .filter((inv) => inv.status === "paid" || inv.status === "uncollectible")
      .map((inv) => {
        const charge = (inv as unknown as { charge?: Stripe.Charge | null }).charge ?? null;
        const pm = charge?.payment_method_details;
        return {
          id: inv.id,
          number: inv.number ?? null,
          date: new Date((inv.created ?? 0) * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          due_date: inv.due_date
            ? new Date(inv.due_date * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null,
          description: inv.lines.data[0]?.description ?? "Subscription",
          amount: (inv.amount_paid ?? 0) / 100,
          subtotal: (inv.subtotal ?? 0) / 100,
          tax: ((inv as unknown as { tax?: number }).tax ?? 0) / 100,
          status: inv.status ?? "unknown",
          invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf: inv.invoice_pdf ?? null,
          payment_method_brand: pm?.card?.brand ?? null,
          payment_method_last4: pm?.card?.last4 ?? null,
          customer_name: inv.customer_name ?? null,
          customer_email: inv.customer_email ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          line_items: inv.lines.data.map((line: any) => ({
            description: line.description ?? "Subscription",
            quantity: line.quantity ?? 1,
            unit_amount: (line.price?.unit_amount ?? 0) / 100,
            amount: (line.amount ?? 0) / 100,
          })),
          period_start: inv.lines.data[0]?.period?.start
            ? new Date(inv.lines.data[0].period.start * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null,
          period_end: inv.lines.data[0]?.period?.end
            ? new Date(inv.lines.data[0].period.end * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null,
        };
      });
  } catch {
    return [];
  }
}
