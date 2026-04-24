import { handleRoute, parseBody, ApiError } from '../../_lib/handler';
import { CreateCheckoutInput } from '@govirall/api-types';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw ApiError.badRequest('Stripe not configured');
  return new Stripe(key);
}

const PRICE_MAP: Record<string, Record<string, string | undefined>> = {
  creator: {
    month: process.env.STRIPE_PRICE_CREATOR_MONTHLY,
    year: process.env.STRIPE_PRICE_CREATOR_YEARLY,
  },
  pro: {
    month: process.env.STRIPE_PRICE_PRO_MONTHLY,
    year: process.env.STRIPE_PRICE_PRO_YEARLY,
  },
  agency: {
    month: process.env.STRIPE_PRICE_AGENCY_MONTHLY,
    year: process.env.STRIPE_PRICE_AGENCY_YEARLY,
  },
};

// POST /api/billing/checkout -- create Stripe checkout session
export const POST = handleRoute(async ({ req, userId }) => {
  const body = await parseBody(req, CreateCheckoutInput);
  const stripe = getStripe();

  const interval = body.interval ?? 'month';
  const priceId = PRICE_MAP[body.tier]?.[interval];
  if (!priceId) throw ApiError.badRequest(`No price configured for ${body.tier}/${body.interval}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3600';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings#billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings#billing`,
    client_reference_id: userId,
    metadata: { user_id: userId, tier: body.tier },
  });

  return { url: session.url };
});
