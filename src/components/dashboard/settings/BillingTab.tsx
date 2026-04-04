"use client";

import { useState, useTransition, useCallback } from "react";
import { Check, X, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import { createSubscription, activateSubscription, createPortalSession } from "@/lib/actions/billing";
import type { Organization, SubscriptionData, BillingInvoice } from "@/types";

// ─── Plan definitions ────────────────────────────────────────

interface PlanDef {
  key: string;
  name: string;
  price: number;
  period: string;
  features: string[];
}

const PLANS: PlanDef[] = [
  {
    key: "free",
    name: "Free",
    price: 0,
    period: "/mo",
    features: [
      "1 connected profile",
      "24hr data sync",
      "3 AI insights/month",
      "2 active deals",
      "Basic media kit",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 29,
    period: "/mo",
    features: [
      "3 connected profiles",
      "6hr data sync",
      "Unlimited AI insights",
      "10 active deals",
      "Full media kit + PDF",
      "10 conversations",
      "50 AI content/month",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: 79,
    period: "/mo",
    features: [
      "10 connected profiles",
      "2hr data sync",
      "Unlimited everything",
      "Custom media kit domain",
      "Unlimited messaging",
      "15 competitor tracking",
      "Basic API access",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 199,
    period: "/mo",
    features: [
      "Unlimited profiles",
      "Real-time data sync",
      "Priority AI processing",
      "White-label media kit",
      "Team + messaging",
      "Unlimited competitors",
      "Full API access",
    ],
  },
];

// ─── Payment Element appearance (matches Go Virall theme) ────

const stripeAppearance = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#1a1a1a",
    colorBackground: "#faf8f5",
    colorText: "#1a1a1a",
    colorDanger: "#dc2626",
    fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: "0px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid #d4d0cb",
      boxShadow: "none",
      padding: "10px 12px",
    },
    ".Input:focus": {
      border: "1px solid #1a1a1a",
      boxShadow: "none",
    },
    ".Label": {
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      color: "#6b6560",
    },
    ".Tab--selected": {
      backgroundColor: "#1a1a1a",
      color: "#faf8f5",
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────

function getPlanAction(planKey: string, currentPlan: string) {
  const planOrder = ["free", "pro", "business", "enterprise"];
  const current = planOrder.indexOf(currentPlan.toLowerCase());
  const target = planOrder.indexOf(planKey);

  if (current === target)
    return { label: "Current Plan", disabled: true, style: "filled" as const };
  if (target < current)
    return { label: "Downgrade", disabled: false, style: "ghost" as const };
  if (planKey === "enterprise")
    return { label: "Contact Sales", disabled: false, style: "ghost" as const };
  return { label: "Upgrade", disabled: false, style: "filled" as const };
}

function formatDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Payment Form (inside Elements provider) ────────────────

function PaymentForm({
  subscriptionId,
  planName,
  onSuccess,
  onCancel,
}: {
  subscriptionId: string;
  planName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripeClient = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripeClient || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const { error } = await stripeClient.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/settings?tab=billing&upgraded=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
      return;
    }

    // Payment succeeded — activate subscription immediately
    const result = await activateSubscription(subscriptionId);
    setIsProcessing(false);

    if ("error" in result) {
      setErrorMessage(result.error);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {errorMessage && (
        <div className="mt-4 p-3 bg-editorial-red/5 border border-editorial-red/20 text-editorial-red text-xs">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-rule">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isProcessing || !stripeClient || !elements}
          className="flex items-center gap-2 px-6 py-2.5 bg-ink text-surface-cream text-[10px] font-semibold uppercase tracking-widest hover:bg-ink/80 transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={14} />
              Subscribe to {planName}
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] text-ink-muted">
        <ShieldCheck size={12} />
        Secured by Stripe. Your card details never touch our servers.
      </div>
    </form>
  );
}

// ─── Payment Modal ───────────────────────────────────────────

function PaymentModal({
  clientSecret,
  subscriptionId,
  plan,
  onSuccess,
  onClose,
}: {
  clientSecret: string;
  subscriptionId: string;
  plan: PlanDef;
  onSuccess: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-surface-cream border border-rule shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-rule">
          <div>
            <h3 className="font-serif text-lg font-bold text-ink">
              Upgrade to {plan.name}
            </h3>
            <p className="text-[11px] text-ink-muted mt-0.5">
              <span className="font-serif text-lg font-bold text-editorial-red">
                ${plan.price}
              </span>
              <span className="text-ink-muted">/month</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Payment Element */}
        <div className="px-6 py-5">
          <Elements
            stripe={getStripePromise()}
            options={{ clientSecret, appearance: stripeAppearance }}
          >
            <PaymentForm
              subscriptionId={subscriptionId}
              planName={plan.name}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}

// ─── Main BillingTab ─────────────────────────────────────────

export function BillingTab({
  organization,
  subscription,
  invoices,
}: {
  organization: Organization | null;
  subscription: SubscriptionData | null;
  invoices: BillingInvoice[];
}) {
  const currentPlan = organization?.plan ?? "free";
  const currentPlanLabel =
    PLANS.find((p) => p.key === currentPlan.toLowerCase())?.name ?? "Free";
  const currentPrice =
    PLANS.find((p) => p.key === currentPlan.toLowerCase())?.price ?? 0;

  const [isPending, startTransition] = useTransition();
  const [paymentState, setPaymentState] = useState<{
    clientSecret: string;
    subscriptionId: string;
    plan: PlanDef;
  } | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const handleUpgrade = useCallback((planKey: string) => {
    const plan = PLANS.find((p) => p.key === planKey);
    if (!plan) return;

    startTransition(async () => {
      const result = await createSubscription(planKey);

      if ("error" in result) {
        alert(result.error);
        return;
      }

      // If subscription was updated inline (already active), just reload
      if (result.clientSecret === "already_active") {
        setUpgradeSuccess(true);
        window.location.reload();
        return;
      }

      // Open payment modal
      setPaymentState({
        clientSecret: result.clientSecret,
        subscriptionId: result.subscriptionId,
        plan,
      });
    });
  }, []);

  function handlePaymentSuccess() {
    setPaymentState(null);
    setUpgradeSuccess(true);
    window.location.reload();
  }

  function handleManageBilling() {
    startTransition(async () => {
      const result = await createPortalSession();
      if (result?.error) {
        alert(result.error);
      }
    });
  }

  return (
    <div>
      {/* Success banner */}
      {upgradeSuccess && (
        <div className="mb-6 p-4 bg-editorial-green/5 border border-editorial-green/20 flex items-center gap-3">
          <Check size={18} className="text-editorial-green shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">
              Subscription activated!
            </p>
            <p className="text-[11px] text-ink-muted">
              Your plan has been upgraded. Enjoy your new features.
            </p>
          </div>
          <button
            onClick={() => setUpgradeSuccess(false)}
            className="ml-auto p-1 text-ink-muted hover:text-ink"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Current Plan */}
      <h3 className="font-serif text-lg font-bold text-ink mb-4">
        Current Plan
      </h3>

      <div className="border border-rule bg-surface-raised p-5 mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-base font-bold text-ink">
              {currentPlanLabel} Plan
            </span>
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5",
                subscription?.cancel_at_period_end
                  ? "bg-editorial-gold/10 text-editorial-gold"
                  : "bg-editorial-green/10 text-editorial-green",
              )}
            >
              {subscription?.cancel_at_period_end ? "Cancelling" : "Current"}
            </span>
          </div>

          {subscription ? (
            <p className="text-[11px] text-ink-muted font-mono mt-1">
              {subscription.cancel_at_period_end
                ? `Cancels ${formatDate(subscription.current_period_end)}`
                : `Renews ${formatDate(subscription.current_period_end)}`}
              {subscription.payment_method_brand &&
                subscription.payment_method_last4 && (
                  <>
                    {" "}
                    &middot; {capitalize(subscription.payment_method_brand)}{" "}
                    ending {subscription.payment_method_last4}
                  </>
                )}
            </p>
          ) : (
            <p className="text-[11px] text-ink-muted font-mono mt-1">
              {currentPlan === "free"
                ? "No active subscription"
                : "Subscription status unavailable"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {subscription && (
            <button
              onClick={handleManageBilling}
              disabled={isPending}
              className="border border-rule px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors disabled:opacity-50"
            >
              {isPending ? "Loading\u2026" : "Manage Subscription"}
            </button>
          )}

          <div className="text-right">
            <span className="font-serif text-2xl font-bold text-editorial-red">
              ${currentPrice}
            </span>
            <span className="text-sm text-ink-muted">/mo</span>
            <p className="text-[10px] text-ink-muted font-mono">
              Billed monthly
            </p>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <p className="editorial-overline mb-4">Available Plans</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan.toLowerCase();
          const action = getPlanAction(plan.key, currentPlan);

          return (
            <div
              key={plan.key}
              className={cn(
                "border p-5 flex flex-col",
                isCurrent
                  ? "border-2 border-dashed border-editorial-red"
                  : "border-rule",
              )}
            >
              <h4 className="font-serif text-base font-bold text-ink text-center mb-2">
                {plan.name}
              </h4>
              <div className="text-center mb-4">
                <span className="font-serif text-3xl font-bold text-editorial-red">
                  ${plan.price}
                </span>
                <span className="text-sm text-ink-muted">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-xs text-ink-secondary"
                  >
                    <Check
                      size={12}
                      className="text-editorial-green shrink-0 mt-0.5"
                    />
                    {feat}
                  </li>
                ))}
              </ul>

              {action.label === "Upgrade" ? (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={isPending}
                  className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-widest bg-ink text-surface-cream hover:bg-ink/80 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Loading\u2026" : "Upgrade"}
                </button>
              ) : action.label === "Contact Sales" ? (
                <a
                  href="mailto:sales@govirall.app"
                  className="block w-full py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest border border-rule text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors"
                >
                  Contact Sales
                </a>
              ) : action.label === "Downgrade" ? (
                <button
                  onClick={handleManageBilling}
                  disabled={isPending}
                  className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-widest border border-rule text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors disabled:opacity-50"
                >
                  {isPending ? "Loading\u2026" : "Manage Plan"}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2.5 text-[10px] font-semibold uppercase tracking-widest bg-ink text-surface-cream disabled:opacity-50"
                >
                  Current Plan
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Billing History */}
      {invoices.length > 0 ? (
        <>
          <h3 className="font-serif text-lg font-bold text-ink mb-4">
            Billing History
          </h3>

          <div className="border border-rule">
            <div className="grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-rule bg-surface-raised">
              <span className="editorial-overline">Date</span>
              <span className="editorial-overline">Description</span>
              <span className="editorial-overline text-right">Amount</span>
              <span className="editorial-overline text-right">Status</span>
            </div>

            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-rule last:border-b-0"
              >
                <span className="text-xs text-ink font-mono">{inv.date}</span>
                <span className="text-xs text-ink-secondary">
                  {inv.description}
                </span>
                <span className="text-xs text-ink font-mono text-right">
                  ${inv.amount.toFixed(2)}
                </span>
                <div className="flex items-center justify-end gap-3">
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-widest",
                      inv.status === "paid"
                        ? "text-editorial-green"
                        : inv.status === "open"
                          ? "text-editorial-gold"
                          : "text-ink-muted",
                    )}
                  >
                    {inv.status.toUpperCase()}
                  </span>
                  {inv.invoice_url && (
                    <a
                      href={inv.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-semibold text-editorial-blue hover:underline"
                    >
                      Invoice
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        currentPlan === "free" && (
          <div className="border border-rule bg-surface-raised p-8 text-center">
            <p className="text-sm text-ink-secondary">
              No billing history. Upgrade to a paid plan to get started.
            </p>
          </div>
        )
      )}

      {/* Payment Modal */}
      {paymentState && (
        <PaymentModal
          clientSecret={paymentState.clientSecret}
          subscriptionId={paymentState.subscriptionId}
          plan={paymentState.plan}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentState(null)}
        />
      )}
    </div>
  );
}
