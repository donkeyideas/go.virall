"use client";

import { useState, useTransition, useCallback } from "react";
import { Check, X, CreditCard, Loader2, ShieldCheck, ExternalLink, AlertTriangle } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import {
  createSubscription,
  activateSubscription,
  cancelIncompleteSubscription,
  createSetupIntent,
  setDefaultPaymentMethod,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
} from "@/lib/actions/billing";
import type { Organization, SubscriptionData, BillingInvoice, PricingPlan } from "@/types";

// ─── Helpers to convert DB plans to display format ───────────

interface PlanDef {
  key: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
}

function featureLabel(key: string, value: unknown): string | null {
  if (typeof value === "boolean") {
    if (!value) return null; // skip false features
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const num = Number(value);
  if (num === -1) return `Unlimited ${key.replace(/_/g, " ")}`;
  const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${num} ${label}`;
}

function dbPlanToDisplay(plan: PricingPlan): PlanDef {
  const features: string[] = [];
  for (const [key, value] of Object.entries(plan.features ?? {})) {
    const label = featureLabel(key, value);
    if (label) features.push(label);
  }
  return {
    key: plan.id,
    name: plan.name,
    price: plan.price_monthly / 100,
    period: "/mo",
    description: plan.description ?? "",
    features,
  };
}

// ─── Dark theme Stripe appearance ────────────────────────────

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#4B9CD3",
    colorBackground: "#0B1928",
    colorText: "#F0EDF5",
    colorDanger: "#EF4444",
    fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: "8px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(75,156,211,0.2)",
      boxShadow: "none",
      padding: "10px 12px",
      backgroundColor: "rgba(15,10,30,0.6)",
    },
    ".Input:focus": {
      border: "1px solid rgba(75,156,211,0.5)",
      boxShadow: "0 0 0 1px rgba(75,156,211,0.3)",
    },
    ".Label": {
      fontSize: "11px",
      fontWeight: "700",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      color: "#8B8A9E",
    },
    ".Tab--selected": {
      backgroundColor: "#4B9CD3",
      color: "#FFFFFF",
    },
  },
};

// ─── Helpers ─────────────────────────────────────────────────

function getPlanAction(planKey: string, currentPlan: string, plans: PlanDef[]) {
  const cp = currentPlan.toLowerCase();
  const current = plans.findIndex((p) => p.key === cp || p.name.toLowerCase() === cp);
  const target = plans.findIndex((p) => p.key === planKey);

  if (current === target || planKey === cp)
    return { label: "Current Plan", disabled: true };
  if (target < current)
    return { label: "Downgrade", disabled: false };
  // Last plan = enterprise-tier → contact sales
  if (target === plans.length - 1 && plans[target].price >= 500)
    return { label: "Contact Sales", disabled: false };
  return { label: "Upgrade", disabled: false };
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

// ─── Shared inline styles ────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface-card)",
  border: "1px solid rgba(75,156,211,0.12)",
  borderRadius: 14,
  padding: 24,
};

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
        return_url: `${window.location.origin}/brand/settings?upgraded=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
      return;
    }

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
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            fontSize: 12,
            color: "#EF4444",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid rgba(75,156,211,0.12)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          style={{
            background: "none",
            border: "none",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--color-ink-secondary)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isProcessing || !stripeClient || !elements}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            background: isProcessing ? "rgba(75,156,211,0.5)" : "#4B9CD3",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 12,
          fontSize: 10,
          color: "var(--color-ink-secondary)",
        }}
      >
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "24px 0",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          margin: "auto 16px",
          background: "#0B1928",
          border: "1px solid rgba(75,156,211,0.2)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(75,156,211,0.12)",
            position: "sticky",
            top: 0,
            background: "#0B1928",
            borderRadius: "16px 16px 0 0",
            zIndex: 1,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              Upgrade to {plan.name}
              <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 800, color: "#4B9CD3" }}>
                ${plan.price}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-ink-secondary)" }}>/mo</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: 4,
              color: "var(--color-ink-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Payment Element */}
        <div style={{ padding: "16px 24px 20px" }}>
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

// ─── Update Payment Method Form (inside Elements provider) ──

function UpdatePaymentForm({
  onSuccess,
  onCancel,
}: {
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

    const { error, setupIntent } = await stripeClient.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/brand/settings`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Failed to update payment method.");
      setIsProcessing(false);
      return;
    }

    // Attach the new payment method as default
    if (setupIntent?.payment_method) {
      const pmId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;

      const result = await setDefaultPaymentMethod(pmId);
      if ("error" in result) {
        setErrorMessage(result.error);
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {errorMessage && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            fontSize: 12,
            color: "#EF4444",
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid rgba(75,156,211,0.12)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          style={{
            background: "none",
            border: "none",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--color-ink-secondary)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isProcessing || !stripeClient || !elements}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            background: isProcessing ? "rgba(75,156,211,0.5)" : "#4B9CD3",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
            cursor: isProcessing ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {isProcessing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CreditCard size={14} />
              Save Payment Method
            </>
          )}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          marginTop: 12,
          fontSize: 10,
          color: "var(--color-ink-secondary)",
        }}
      >
        <ShieldCheck size={12} />
        Secured by Stripe. Your card details never touch our servers.
      </div>
    </form>
  );
}

// ─── Update Payment Method Modal ─────────────────────────────

function UpdatePaymentModal({
  clientSecret,
  onSuccess,
  onClose,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "24px 0",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          margin: "auto 16px",
          background: "#0B1928",
          border: "1px solid rgba(75,156,211,0.2)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(75,156,211,0.12)",
            position: "sticky",
            top: 0,
            background: "#0B1928",
            borderRadius: "16px 16px 0 0",
            zIndex: 1,
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Update Payment Method
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: 4,
              color: "var(--color-ink-secondary)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Payment Element */}
        <div style={{ padding: "16px 24px 20px" }}>
          <Elements
            stripe={getStripePromise()}
            options={{
              clientSecret,
              appearance: stripeAppearance,
            }}
          >
            <UpdatePaymentForm onSuccess={onSuccess} onCancel={onClose} />
          </Elements>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Subscription Modal ───────────────────────────────

function ManageSubscriptionModal({
  subscription,
  planLabel,
  planPrice,
  invoices,
  onClose,
}: {
  subscription: SubscriptionData;
  planLabel: string;
  planPrice: number;
  invoices: BillingInvoice[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);

  function handleUpdatePayment() {
    startTransition(async () => {
      setActionError(null);
      const result = await createSetupIntent();
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      setSetupClientSecret(result.clientSecret);
    });
  }

  function handlePaymentMethodSuccess() {
    setSetupClientSecret(null);
    setActionSuccess("Payment method updated successfully.");
    setTimeout(() => window.location.reload(), 1500);
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelSubscriptionAtPeriodEnd();
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      setActionSuccess("Your subscription will cancel at the end of the current billing period.");
      setConfirmCancel(false);
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  function handleResume() {
    startTransition(async () => {
      const result = await resumeSubscription();
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      setActionSuccess("Your subscription has been resumed.");
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
        padding: "24px 0",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 500,
          margin: "auto 16px",
          background: "#0B1928",
          border: "1px solid rgba(75,156,211,0.2)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderBottom: "1px solid rgba(75,156,211,0.12)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
            Manage Subscription
          </h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", padding: 4, color: "var(--color-ink-secondary)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Success / Error messages */}
          {actionSuccess && (
            <div style={{ marginBottom: 16, padding: 12, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, fontSize: 12, color: "#10B981", display: "flex", alignItems: "center", gap: 8 }}>
              <Check size={14} />
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div style={{ marginBottom: 16, padding: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, color: "#EF4444" }}>
              {actionError}
            </div>
          )}

          {/* Current Plan Card */}
          <div
            style={{
              background: "rgba(75,156,211,0.06)",
              border: "1px solid rgba(75,156,211,0.15)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>
                  {planLabel} Plan
                </div>
                <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 2 }}>
                  {subscription.cancel_at_period_end
                    ? `Cancels ${formatDate(subscription.current_period_end)}`
                    : `Renews ${formatDate(subscription.current_period_end)}`}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#4B9CD3" }}>
                  ${planPrice}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>/mo</span>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: subscription.cancel_at_period_end ? "#FACC15" : "#10B981",
                }}
              />
              <span style={{ fontWeight: 600, color: subscription.cancel_at_period_end ? "#FACC15" : "#10B981" }}>
                {subscription.cancel_at_period_end ? "Cancelling at period end" : "Active"}
              </span>
            </div>

            {/* Payment method */}
            {subscription.payment_method_brand && subscription.payment_method_last4 && (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--color-ink-secondary)" }}>
                <CreditCard size={14} />
                {capitalize(subscription.payment_method_brand)} ending in {subscription.payment_method_last4}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {/* Update Payment Method */}
            <button
              onClick={handleUpdatePayment}
              disabled={isPending}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "12px 16px",
                background: "rgba(75,156,211,0.06)",
                border: "1px solid rgba(75,156,211,0.15)",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--color-ink)",
                cursor: isPending ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: isPending ? 0.5 : 1,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CreditCard size={14} style={{ color: "#4B9CD3" }} />
                Update Payment Method
              </span>
              {isPending ? <Loader2 size={12} className="animate-spin" style={{ color: "var(--color-ink-secondary)" }} /> : null}
            </button>

            {/* Cancel or Resume */}
            {subscription.cancel_at_period_end ? (
              <button
                onClick={handleResume}
                disabled={isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.15)",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#10B981",
                  cursor: isPending ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Resume Subscription
              </button>
            ) : !confirmCancel ? (
              <button
                onClick={() => setConfirmCancel(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#EF4444",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <X size={14} />
                Cancel Subscription
              </button>
            ) : (
              <div
                style={{
                  padding: 16,
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} style={{ color: "#FACC15", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
                      Cancel your subscription?
                    </p>
                    <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", margin: "4px 0 0" }}>
                      You&apos;ll keep access until {formatDate(subscription.current_period_end)}. You can resume anytime before then.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: "transparent",
                      border: "1px solid rgba(75,156,211,0.2)",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--color-ink-secondary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Keep Plan
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: isPending ? "rgba(239,68,68,0.3)" : "#EF4444",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: isPending ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {isPending ? "Cancelling..." : "Yes, Cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          {invoices.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--color-ink-secondary)", marginBottom: 8 }}>
                Recent Invoices
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {invoices.slice(0, 5).map((inv, idx) => (
                  <div
                    key={inv.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: idx < Math.min(invoices.length, 5) - 1 ? "1px solid rgba(75,156,211,0.08)" : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: "var(--color-ink)" }}>{inv.date}</div>
                      <div style={{ fontSize: 10, color: "var(--color-ink-secondary)", marginTop: 1 }}>{inv.description}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>
                        ${inv.amount.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: inv.status === "paid" ? "#10B981" : "#FACC15" }}>
                        {inv.status}
                      </span>
                      {inv.invoice_url && (
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: "#818CF8", display: "flex" }} title="View invoice">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Update Payment Method Modal (overlays on top) */}
      {setupClientSecret && (
        <UpdatePaymentModal
          clientSecret={setupClientSecret}
          onSuccess={handlePaymentMethodSuccess}
          onClose={() => setSetupClientSecret(null)}
        />
      )}
    </div>
  );
}

// ─── Main BrandBillingTab ────────────────────────────────────

export function BrandBillingTab({
  organization,
  subscription,
  invoices,
  brandPlans,
}: {
  organization: Organization | null;
  subscription: SubscriptionData | null;
  invoices: BillingInvoice[];
  brandPlans: PricingPlan[];
}) {
  const PLANS: PlanDef[] = brandPlans.map(dbPlanToDisplay);
  const currentPlan = organization?.plan ?? "free";
  const currentPlanDef = PLANS.find(
    (p) => p.key === currentPlan.toLowerCase() || p.name.toLowerCase() === currentPlan.toLowerCase(),
  );
  const currentPlanLabel = currentPlanDef?.name ?? "Free";
  const currentPrice = currentPlanDef?.price ?? 0;

  const [isPending, startTransition] = useTransition();
  const [paymentState, setPaymentState] = useState<{
    clientSecret: string;
    subscriptionId: string;
    plan: PlanDef;
  } | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  const handleUpgrade = useCallback((planKey: string) => {
    const plan = PLANS.find((p) => p.key === planKey);
    if (!plan) return;

    startTransition(async () => {
      const result = await createSubscription(planKey);

      if ("error" in result) {
        alert(result.error);
        return;
      }

      if (result.clientSecret === "already_active") {
        setUpgradeSuccess(true);
        window.location.reload();
        return;
      }

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
    setShowManageModal(true);
  }

  return (
    <div>
      {/* Success banner */}
      {upgradeSuccess && (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            background: "rgba(16,185,129,0.08)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Check size={18} style={{ color: "#10B981", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", margin: 0 }}>
              Subscription activated!
            </p>
            <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", margin: "2px 0 0" }}>
              Your plan has been upgraded. Enjoy your new features.
            </p>
          </div>
          <button
            onClick={() => setUpgradeSuccess(false)}
            style={{ marginLeft: "auto", background: "none", border: "none", padding: 4, color: "var(--color-ink-secondary)", cursor: "pointer" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Current Plan */}
      <div
        style={{
          ...cardStyle,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>
              {currentPlanLabel} Plan
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: subscription?.cancel_at_period_end ? "#FACC15" : "#10B981",
              }}
            >
              {subscription?.cancel_at_period_end ? "Cancelling" : "Active"}
            </span>
          </div>

          {subscription ? (
            <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
              {subscription.cancel_at_period_end
                ? `Cancels ${formatDate(subscription.current_period_end)}`
                : `Renews ${formatDate(subscription.current_period_end)}`}
              {subscription.payment_method_brand && subscription.payment_method_last4 && (
                <>
                  {" "}&middot; {capitalize(subscription.payment_method_brand)} ending{" "}
                  {subscription.payment_method_last4}
                </>
              )}
            </p>
          ) : (
            <p style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
              {currentPlan === "free" ? "No active subscription" : "Subscription status unavailable"}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {subscription && (
            <button
              onClick={handleManageBilling}
              disabled={isPending}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid rgba(75,156,211,0.2)",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-ink-secondary)",
                cursor: isPending ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: isPending ? 0.5 : 1,
              }}
            >
              {isPending ? "Loading\u2026" : "Manage Subscription"}
            </button>
          )}

          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#4B9CD3" }}>
              ${currentPrice}
            </span>
            <span style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>/mo</span>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--color-ink-secondary)",
          }}
        >
          Available Plans
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {PLANS.filter((p) => p.price > 0).map((plan) => {
          const isCurrent = plan.key === currentPlan.toLowerCase();
          const action = getPlanAction(plan.key, currentPlan, PLANS);

          return (
            <div
              key={plan.key}
              style={{
                ...cardStyle,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                border: isCurrent
                  ? "2px solid rgba(75,156,211,0.5)"
                  : "1px solid rgba(75,156,211,0.12)",
              }}
            >
              <h4
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  textAlign: "center",
                  margin: "0 0 8px",
                }}
              >
                {plan.name}
              </h4>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#4B9CD3" }}>
                  ${plan.price}
                </span>
                <span style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
                  {plan.period}
                </span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", flex: 1 }}>
                {plan.features.map((feat) => (
                  <li
                    key={feat}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      fontSize: 11,
                      color: "var(--color-ink-secondary)",
                      marginBottom: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    <Check size={12} style={{ color: "#10B981", flexShrink: 0, marginTop: 1 }} />
                    {feat}
                  </li>
                ))}
              </ul>

              {action.label === "Upgrade" ? (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={isPending}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: isPending ? "rgba(75,156,211,0.5)" : "#4B9CD3",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: "#ffffff",
                    cursor: isPending ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {isPending ? "Loading\u2026" : "Upgrade"}
                </button>
              ) : action.label === "Contact Sales" ? (
                <a
                  href="mailto:sales@govirall.com"
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 16px",
                    textAlign: "center",
                    background: "transparent",
                    border: "1px solid rgba(75,156,211,0.2)",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: "var(--color-ink-secondary)",
                    textDecoration: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                >
                  Contact Sales
                </a>
              ) : action.label === "Downgrade" ? (
                <button
                  onClick={handleManageBilling}
                  disabled={isPending}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "transparent",
                    border: "1px solid rgba(75,156,211,0.2)",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: "var(--color-ink-secondary)",
                    cursor: isPending ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  {isPending ? "Loading\u2026" : "Manage Plan"}
                </button>
              ) : (
                <button
                  disabled
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "rgba(75,156,211,0.15)",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: "#4B9CD3",
                    cursor: "default",
                    fontFamily: "inherit",
                  }}
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
          <div style={{ marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "var(--color-ink-secondary)",
              }}
            >
              Billing History
            </span>
          </div>

          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.5fr 0.8fr 0.8fr",
                padding: "10px 20px",
                background: "rgba(75,156,211,0.04)",
                borderBottom: "1px solid rgba(75,156,211,0.08)",
              }}
            >
              {["Date", "Description", "Amount", "Status"].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "var(--color-ink-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {invoices.map((inv, idx) => (
              <div
                key={inv.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr 0.8fr 0.8fr",
                  padding: "12px 20px",
                  alignItems: "center",
                  borderBottom:
                    idx < invoices.length - 1 ? "1px solid rgba(75,156,211,0.06)" : "none",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                  {inv.date}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                  {inv.description}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>
                  ${inv.amount.toFixed(2)}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color:
                        inv.status === "paid"
                          ? "#10B981"
                          : inv.status === "open"
                            ? "#FACC15"
                            : "var(--color-ink-secondary)",
                    }}
                  >
                    {inv.status.toUpperCase()}
                  </span>
                  {inv.invoice_url && (
                    <a
                      href={inv.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#818CF8", display: "flex" }}
                      title="View invoice"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        currentPlan === "free" && (
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
              padding: "40px 20px",
            }}
          >
            <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", margin: 0 }}>
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
          onClose={() => {
            cancelIncompleteSubscription(paymentState.subscriptionId);
            setPaymentState(null);
          }}
        />
      )}

      {/* Manage Subscription Modal */}
      {showManageModal && subscription && (
        <ManageSubscriptionModal
          subscription={subscription}
          planLabel={currentPlanLabel}
          planPrice={currentPrice}
          invoices={invoices}
          onClose={() => setShowManageModal(false)}
        />
      )}
    </div>
  );
}
