'use server';

import Stripe from 'stripe';
import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key);
}

const PRICE_MAP: Record<string, string | undefined> = {
  creator: process.env.STRIPE_PRICE_CREATOR_MONTHLY,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
  agency: process.env.STRIPE_PRICE_AGENCY_MONTHLY,
};

const TIER_LABELS: Record<string, string> = {
  creator: 'Creator',
  pro: 'Pro',
  agency: 'Agency',
};

/**
 * Creates a Stripe subscription with payment_behavior: "default_incomplete"
 * Returns clientSecret for inline payment via Elements.
 */
export async function createSubscription(tier: 'creator' | 'pro' | 'agency') {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const priceId = PRICE_MAP[tier];
  if (!priceId) return { error: `No price configured for ${tier}` };

  const stripe = getStripe();
  const admin = createAdminClient();

  // Check for existing subscription
  const { data: existingSub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('user_id', user.id)
    .single();

  if (existingSub?.status === 'active') {
    return { error: 'You already have an active subscription' };
  }

  // Get or create Stripe customer
  let customerId = existingSub?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
  }

  // Create subscription with incomplete payment
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    metadata: { user_id: user.id, tier },
    expand: ['latest_invoice'],
  });

  // In Stripe v20+, get the payment intent via invoicePayments API
  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const invoicePayments = await stripe.invoicePayments.list({
    invoice: invoice.id,
  });

  const paymentIntentId = invoicePayments.data[0]?.payment?.payment_intent;
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return { error: 'Failed to create payment intent' };
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (!paymentIntent.client_secret) {
    return { error: 'Failed to retrieve payment secret' };
  }

  return {
    success: true,
    clientSecret: paymentIntent.client_secret,
    subscriptionId: subscription.id,
    customerId,
  };
}

/**
 * Called after successful payment confirmation to activate the subscription in DB.
 */
export async function activateSubscription(subscriptionId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const stripe = getStripe();
  const admin = createAdminClient();

  // Retrieve subscription with latest invoice for period dates
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice'],
  });

  // Verify ownership
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if ('deleted' in customer && customer.deleted) {
    return { error: 'Customer not found' };
  }
  if ((customer as Stripe.Customer).metadata?.user_id !== user.id) {
    return { error: 'Subscription does not belong to this user' };
  }

  // Determine tier from metadata or price
  const tier = subscription.metadata?.tier ?? 'creator';

  // Get price ID and interval from subscription items
  const item = subscription.items.data[0];
  const stripePriceId = typeof item?.price === 'string' ? item.price : item?.price?.id ?? '';
  const interval = item?.price && typeof item.price !== 'string' ? item.price.recurring?.interval ?? 'month' : 'month';
  const amountCents = item?.price && typeof item.price !== 'string' ? item.price.unit_amount ?? 0 : 0;

  // Use the subscription's own period fields (seconds since epoch)
  const subAny = subscription as unknown as Record<string, unknown>;
  const periodStart = (subAny.current_period_start as number | undefined) ?? subscription.start_date;
  // current_period_end gives the actual next billing date (e.g. +1 month)
  const periodEnd = (subAny.current_period_end as number | undefined) ?? (periodStart + 30 * 86400);

  // Upsert subscription in DB
  const { error } = await admin.from('subscriptions').upsert(
    {
      user_id: user.id,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: stripePriceId,
      tier,
      status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status,
      interval,
      amount_cents: amountCents,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) return { error: error.message };

  return {
    success: true,
    tier,
    label: TIER_LABELS[tier] ?? tier,
  };
}

/**
 * Cancels the user's Stripe subscription at period end (no immediate charge loss).
 */
export async function cancelSubscription() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_subscription_id) return { error: 'No active subscription found' };

  const stripe = getStripe();

  // Verify ownership
  const customer = await stripe.customers.retrieve(sub.stripe_customer_id);
  if ('deleted' in customer && customer.deleted) return { error: 'Customer not found' };
  if ((customer as Stripe.Customer).metadata?.user_id !== user.id) {
    return { error: 'Subscription does not belong to this user' };
  }

  // Cancel at period end so the user keeps access until the paid period expires
  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update DB status
  await admin
    .from('subscriptions')
    .update({ status: 'canceling' })
    .eq('user_id', user.id);

  return { success: true };
}

/**
 * Fetches subscription details from Stripe for the manage modal.
 */
export async function getSubscriptionDetails() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id, tier, status, current_period_end, amount_cents, interval')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_subscription_id) return { error: 'No subscription found' };

  const stripe = getStripe();

  // Get default payment method from customer
  const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as Stripe.Customer;
  let paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null = null;

  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (defaultPm) {
    const pmId = typeof defaultPm === 'string' ? defaultPm : defaultPm.id;
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.card) {
      paymentMethod = {
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      };
    }
  }

  // If no default on customer, try the subscription's default
  if (!paymentMethod) {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const subPm = stripeSub.default_payment_method;
    if (subPm) {
      const pmId = typeof subPm === 'string' ? subPm : subPm.id;
      const pm = await stripe.paymentMethods.retrieve(pmId);
      if (pm.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        };
      }
    }
  }

  // Get recent invoices
  const invoices = await stripe.invoices.list({
    customer: sub.stripe_customer_id,
    limit: 10,
  });

  const invoiceList = invoices.data.map((inv) => ({
    id: inv.id,
    date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
    amount: inv.amount_paid ?? inv.total ?? 0,
    status: inv.status ?? 'unknown',
    pdfUrl: inv.invoice_pdf ?? null,
  }));

  return {
    success: true,
    details: {
      tier: sub.tier,
      status: sub.status,
      amountCents: sub.amount_cents,
      interval: sub.interval,
      currentPeriodEnd: sub.current_period_end,
      paymentMethod,
      invoices: invoiceList,
    },
  };
}
