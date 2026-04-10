"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  createConnectAccount,
  createOnboardingLink,
  createDashboardLink,
  isAccountOnboarded,
  createPlatformPayment,
  getAccountBalance,
  PLATFORM_FEE_PERCENT,
} from "@/lib/stripe-connect";

// ─── Helper: get authenticated user + profile ────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, organization_id, account_type, full_name, stripe_connect_id, stripe_connect_onboarded"
    )
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found." } as const;

  return { error: undefined, user, profile, supabase } as const;
}

// ─── Setup Payouts (Create Connect Account) ──────────────────

export async function setupPayouts(): Promise<
  | { onboardingUrl: string }
  | { error: string }
> {
  const result = await getAuthenticatedUser();
  if (result.error) return { error: result.error };
  const { user, profile } = result;

  // If they already have a connect account, just get a new onboarding link
  if (profile.stripe_connect_id) {
    const onboarded = await isAccountOnboarded(profile.stripe_connect_id);
    if (onboarded) {
      return { error: "Payouts are already set up." };
    }
    // Re-send onboarding link for incomplete accounts
    const url = await createOnboardingLink(profile.stripe_connect_id);
    return { onboardingUrl: url };
  }

  // Create new Stripe Connect Express account
  const account = await createConnectAccount(user.id, user.email ?? "");

  // Save connect ID to profile
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      stripe_connect_id: account.id,
      stripe_connect_onboarded: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { error: "Failed to save Connect account. Please try again." };
  }

  // Generate onboarding link
  const url = await createOnboardingLink(account.id);

  revalidatePath("/dashboard/settings");
  return { onboardingUrl: url };
}

// ─── Get Payout Status ───────────────────────────────────────

export async function getPayoutStatus(): Promise<
  | {
      hasConnectAccount: boolean;
      isOnboarded: boolean;
      connectId: string | null;
      balance?: { available: number; pending: number; currency: string };
    }
  | { error: string }
> {
  const result = await getAuthenticatedUser();
  if (result.error) return { error: result.error };
  const { profile } = result;

  if (!profile.stripe_connect_id) {
    return {
      hasConnectAccount: false,
      isOnboarded: false,
      connectId: null,
    };
  }

  const onboarded = await isAccountOnboarded(profile.stripe_connect_id);

  // Update onboarded status if it changed
  if (onboarded && !profile.stripe_connect_onboarded) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        stripe_connect_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
  }

  let balance: { available: number; pending: number; currency: string } | undefined;
  if (onboarded) {
    try {
      balance = await getAccountBalance(profile.stripe_connect_id);
    } catch {
      // Balance may not be available for new accounts
    }
  }

  return {
    hasConnectAccount: true,
    isOnboarded: onboarded,
    connectId: profile.stripe_connect_id,
    balance,
  };
}

// ─── Get Payout Dashboard URL ────────────────────────────────

export async function getPayoutDashboardUrl(): Promise<
  | { url: string }
  | { error: string }
> {
  const result = await getAuthenticatedUser();
  if (result.error) return { error: result.error };
  const { profile } = result;

  if (!profile.stripe_connect_id) {
    return { error: "No payout account set up." };
  }

  const onboarded = await isAccountOnboarded(profile.stripe_connect_id);
  if (!onboarded) {
    return { error: "Please complete payout setup first." };
  }

  const url = await createDashboardLink(profile.stripe_connect_id);
  return { url };
}

// ─── Initiate Payment (Brand → Creator) ──────────────────────

export async function initiatePayment(
  dealId: string,
  amount: number
): Promise<
  | { clientSecret: string; paymentId: string; platformFee: number }
  | { error: string }
> {
  if (!dealId || !amount || amount <= 0) {
    return { error: "Invalid deal or amount." };
  }

  const amountCents = Math.round(amount * 100);

  const result = await getAuthenticatedUser();
  if (result.error) return { error: result.error };
  const { user, profile, supabase } = result;

  // Get the deal
  const { data: deal } = await supabase
    .from("deals")
    .select("id, organization_id, brand_name, total_value, paid_amount, brand_profile_id")
    .eq("id", dealId)
    .single();

  if (!deal) {
    return { error: "Deal not found." };
  }

  // Determine who the creator is — the deal is associated with an organization,
  // and payments flow from the brand (payer) to the creator (payee).
  // If the deal has a brand_profile_id, the brand is the one paying and
  // the deal's organization owner is the creator.
  // We need to find the creator's stripe_connect_id.

  const admin = createAdminClient();

  // Get the creator's profile (the org owner of this deal)
  const { data: creatorProfile } = await admin
    .from("profiles")
    .select("id, stripe_connect_id, stripe_connect_onboarded")
    .eq("organization_id", deal.organization_id)
    .eq("account_type", "creator")
    .limit(1)
    .single();

  if (!creatorProfile?.stripe_connect_id) {
    return { error: "Creator has not set up payouts yet." };
  }

  if (!creatorProfile.stripe_connect_onboarded) {
    return { error: "Creator has not completed payout setup." };
  }

  // Verify amount doesn't exceed remaining deal value
  const remaining = (deal.total_value ?? 0) - (deal.paid_amount ?? 0);
  if (amount > remaining && remaining > 0) {
    return { error: `Amount exceeds remaining deal value of $${remaining.toFixed(2)}.` };
  }

  // Create the payment intent via Stripe Connect
  const { clientSecret, paymentIntentId, platformFee } = await createPlatformPayment({
    amount: amountCents,
    creatorConnectId: creatorProfile.stripe_connect_id,
    metadata: {
      deal_id: dealId,
      payer_id: user.id,
      payee_id: creatorProfile.id,
      brand_name: deal.brand_name ?? "",
    },
  });

  if (!clientSecret) {
    return { error: "Failed to create payment. Please try again." };
  }

  // Create platform_payments record
  const { data: payment, error: paymentError } = await admin
    .from("platform_payments")
    .insert({
      deal_id: dealId,
      payer_id: user.id,
      payee_id: creatorProfile.id,
      amount: amountCents,
      currency: "usd",
      platform_fee: platformFee,
      stripe_payment_intent_id: paymentIntentId,
      status: "pending",
      description: `Payment for deal: ${deal.brand_name}`,
      metadata: {
        platform_fee_percent: PLATFORM_FEE_PERCENT,
        organization_id: deal.organization_id,
      },
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return { error: "Failed to record payment. Please try again." };
  }

  return {
    clientSecret,
    paymentId: payment.id,
    platformFee: platformFee / 100, // return in dollars for display
  };
}

// ─── Confirm Payment (after frontend succeeds) ───────────────

export async function confirmPayment(
  paymentId: string,
  paymentIntentId: string
): Promise<{ success: true } | { error: string }> {
  if (!paymentId || !paymentIntentId) {
    return { error: "Missing payment details." };
  }

  const result = await getAuthenticatedUser();
  if (result.error) return { error: result.error };

  const admin = createAdminClient();

  // Get the payment record
  const { data: payment } = await admin
    .from("platform_payments")
    .select("id, deal_id, amount, stripe_payment_intent_id, status")
    .eq("id", paymentId)
    .single();

  if (!payment) {
    return { error: "Payment record not found." };
  }

  if (payment.stripe_payment_intent_id !== paymentIntentId) {
    return { error: "Payment intent mismatch." };
  }

  if (payment.status === "completed") {
    return { success: true }; // Already confirmed (idempotent)
  }

  // Atomically update payment to completed ONLY if still pending (prevents race with webhook)
  const { data: updatedPayment, error: updateError } = await admin
    .from("platform_payments")
    .update({
      status: "completed",
      paid_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id, deal_id, amount")
    .single();

  if (updateError || !updatedPayment) {
    // Already processed by webhook or other call — treat as success (idempotent)
    return { success: true };
  }

  // Only increment deal paid_amount if we were the ones who flipped status
  if (updatedPayment.deal_id) {
    const { data: deal } = await admin
      .from("deals")
      .select("paid_amount")
      .eq("id", updatedPayment.deal_id)
      .single();

    if (deal) {
      const newPaidAmount = (deal.paid_amount ?? 0) + updatedPayment.amount;
      await admin
        .from("deals")
        .update({
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedPayment.deal_id);
    }
  }

  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard/business");
  return { success: true };
}

// ─── Get Payment History ─────────────────────────────────────

export async function getPaymentHistory(
  role: "payer" | "payee"
): Promise<
  | {
      payments: Array<{
        id: string;
        amount: number;
        currency: string;
        platform_fee: number;
        status: string;
        description: string | null;
        paid_at: string | null;
        created_at: string;
        deal_brand_name: string | null;
        other_party_name: string | null;
      }>;
    }
  | { error: string }
> {
  const result = await getAuthenticatedUser();
  if (result.error) return { error: result.error };
  const { user } = result;

  const admin = createAdminClient();

  const column = role === "payer" ? "payer_id" : "payee_id";
  const otherColumn = role === "payer" ? "payee_id" : "payer_id";

  const { data: payments, error } = await admin
    .from("platform_payments")
    .select("id, amount, currency, platform_fee, status, description, paid_at, created_at, deal_id, payer_id, payee_id")
    .eq(column, user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { error: "Failed to load payment history." };
  }

  if (!payments || payments.length === 0) {
    return { payments: [] };
  }

  // Enrich with deal names and other party names
  const dealIds = payments
    .map((p) => p.deal_id)
    .filter((id): id is string => !!id);
  const otherPartyIds = payments.map((p) =>
    role === "payer" ? p.payee_id : p.payer_id
  );

  const [dealsResult, profilesResult] = await Promise.all([
    dealIds.length > 0
      ? admin.from("deals").select("id, brand_name").in("id", dealIds)
      : Promise.resolve({ data: [] as Array<{ id: string; brand_name: string }> }),
    otherPartyIds.length > 0
      ? admin
          .from("profiles")
          .select("id, full_name, company_name")
          .in("id", otherPartyIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; company_name: string | null }> }),
  ]);

  const dealsMap = new Map(
    (dealsResult.data ?? []).map((d) => [d.id, d.brand_name])
  );
  const profilesMap = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id,
      p.company_name ?? p.full_name ?? "Unknown",
    ])
  );

  const enriched = payments.map((p) => ({
    id: p.id,
    amount: p.amount / 100, // Convert cents to dollars
    currency: p.currency,
    platform_fee: p.platform_fee / 100,
    status: p.status,
    description: p.description,
    paid_at: p.paid_at,
    created_at: p.created_at,
    deal_brand_name: p.deal_id ? (dealsMap.get(p.deal_id) ?? null) : null,
    other_party_name:
      profilesMap.get(role === "payer" ? p.payee_id : p.payer_id) ?? null,
  }));

  return { payments: enriched };
}

// ─── Get Payment Stats ───────────────────────────────────────

export async function getPaymentStats(): Promise<
  | {
      totalEarned: number;
      totalSpent: number;
      totalPending: number;
      thisMonthEarned: number;
      thisMonthSpent: number;
      totalFeesPaid: number;
      paymentCount: number;
    }
  | { error: string }
> {
  const result = await getAuthenticatedUser();
  if (result.error) return { error: result.error };
  const { user } = result;

  const admin = createAdminClient();

  // Get all completed payments involving this user
  const [payeeResult, payerResult, pendingResult] = await Promise.all([
    admin
      .from("platform_payments")
      .select("amount, platform_fee, paid_at")
      .eq("payee_id", user.id)
      .eq("status", "completed"),
    admin
      .from("platform_payments")
      .select("amount, platform_fee, paid_at")
      .eq("payer_id", user.id)
      .eq("status", "completed"),
    admin
      .from("platform_payments")
      .select("amount")
      .or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`)
      .in("status", ["pending", "processing"]),
  ]);

  const payeePayments = payeeResult.data ?? [];
  const payerPayments = payerResult.data ?? [];
  const pendingPayments = pendingResult.data ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Amounts earned: amount minus platform fee (what creator receives)
  const totalEarned = payeePayments.reduce(
    (sum, p) => sum + (p.amount - p.platform_fee),
    0
  );
  const thisMonthEarned = payeePayments
    .filter((p) => p.paid_at && p.paid_at >= monthStart)
    .reduce((sum, p) => sum + (p.amount - p.platform_fee), 0);

  // Amounts spent: full amount (what brand pays)
  const totalSpent = payerPayments.reduce((sum, p) => sum + p.amount, 0);
  const thisMonthSpent = payerPayments
    .filter((p) => p.paid_at && p.paid_at >= monthStart)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  const totalFeesPaid = payeePayments.reduce(
    (sum, p) => sum + p.platform_fee,
    0
  );

  return {
    totalEarned: totalEarned / 100,
    totalSpent: totalSpent / 100,
    totalPending: totalPending / 100,
    thisMonthEarned: thisMonthEarned / 100,
    thisMonthSpent: thisMonthSpent / 100,
    totalFeesPaid: totalFeesPaid / 100,
    paymentCount: payeePayments.length + payerPayments.length,
  };
}
