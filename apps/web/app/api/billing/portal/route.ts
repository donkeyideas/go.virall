import { handleRoute, ApiError } from '../../_lib/handler';
import { createServerClient } from '@govirall/db/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw ApiError.badRequest('Stripe not configured');
  return new Stripe(key);
}

// POST /api/billing/portal -- create Stripe customer portal session
export const POST = handleRoute(async ({ userId }) => {
  const stripe = getStripe();
  const supabase = await createServerClient();

  // Get user's Stripe customer ID
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (!sub?.stripe_customer_id) {
    throw ApiError.badRequest('No active subscription found');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3600';

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl}/settings#billing`,
  });

  return { url: session.url };
});
