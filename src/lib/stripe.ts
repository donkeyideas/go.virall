import Stripe from "stripe";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  return new Stripe(key, { typescript: true });
}

/** Lazy-initialized Stripe client — only throws when actually used without a key. */
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) _stripe = getStripeClient();
  return _stripe;
}

/** @deprecated Use getStripe() for lazy init. Kept for convenience in existing code. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Map plan names to Stripe Price IDs (from env vars). */
export const PLAN_PRICE_IDS: Record<string, string | null> = {
  free: null,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
  business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? null,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null,
};

/** Reverse lookup: Stripe Price ID → plan name. */
export function planNameFromPriceId(priceId: string): string {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return plan;
  }
  return "free";
}
