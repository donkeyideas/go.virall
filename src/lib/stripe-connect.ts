import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3600";
// Platform fee percentage charged by Go Virall on creator payments.
// To change this, update the value here — it is applied to all new payment intents.
const PLATFORM_FEE_PERCENT = 5;

// ─── Create Stripe Connect account for a creator ─────────────

export async function createConnectAccount(userId: string, email: string) {
  const account = await stripe.accounts.create({
    type: "express",
    email,
    metadata: { user_id: userId },
    capabilities: {
      transfers: { requested: true },
    },
  });
  return account;
}

// ─── Create onboarding link for creator ──────────────────────

export async function createOnboardingLink(accountId: string) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/dashboard/settings?tab=payouts&refresh=true`,
    return_url: `${APP_URL}/dashboard/settings?tab=payouts&onboarded=true`,
    type: "account_onboarding",
  });
  return link.url;
}

// ─── Create login link for existing connected account ────────

export async function createDashboardLink(accountId: string) {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

// ─── Check if account is fully onboarded ─────────────────────

export async function isAccountOnboarded(accountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(accountId);
  return account.charges_enabled && account.payouts_enabled;
}

// ─── Get account balance ─────────────────────────────────────

export async function getAccountBalance(accountId: string) {
  const balance = await stripe.balance.retrieve({
    stripeAccount: accountId,
  });

  // Sum across all currency buckets — Stripe returns an array per currency.
  // We report totals in the primary currency (first available bucket or "usd" fallback).
  const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
  const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);
  const currency =
    balance.available[0]?.currency ??
    balance.pending[0]?.currency ??
    "usd";

  return { available, pending, currency };
}

// ─── Create payment intent for brand paying creator ──────────

export async function createPlatformPayment(opts: {
  amount: number; // in cents
  currency?: string;
  creatorConnectId: string;
  metadata?: Record<string, string>;
}) {
  const { amount, currency = "usd", creatorConnectId, metadata = {} } = opts;
  const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    application_fee_amount: platformFee,
    transfer_data: {
      destination: creatorConnectId,
    },
    metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    platformFee,
  };
}

// ─── Constants ───────────────────────────────────────────────

export { PLATFORM_FEE_PERCENT };
