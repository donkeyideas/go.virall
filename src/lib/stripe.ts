import Stripe from "stripe";
import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";

// ─── Server-side Stripe ──────────────────────────────────────

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }
  return new Stripe(key, { typescript: true });
}

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

// ─── Client-side Stripe (browser) ────────────────────────────

let _stripePromise: Promise<StripeClient | null> | null = null;
export function getStripePromise(): Promise<StripeClient | null> {
  if (!_stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    _stripePromise = loadStripe(key ?? "");
  }
  return _stripePromise;
}

// ─── Plan → Price ID mapping ─────────────────────────────────

export const PLAN_PRICE_IDS: Record<string, string | null> = {
  free: null,
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY ?? null,
  business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? null,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? null,
};

export function planNameFromPriceId(priceId: string): string {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id === priceId) return plan;
  }
  return "free";
}

// ─── Plan limits for DB updates ──────────────────────────────

export const PLAN_PROFILE_LIMITS: Record<string, number> = {
  free: 1,
  pro: 3,
  business: 10,
  enterprise: 999,
};
