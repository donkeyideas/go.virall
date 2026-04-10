"use client";

import { useState, useTransition, useCallback } from "react";
import {
  X,
  CreditCard,
  Loader2,
  ShieldCheck,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripePromise } from "@/lib/stripe";
import { initiatePayment, confirmPayment } from "@/lib/actions/payments";

// ─── Stripe Appearance (dark theme matching Go Virall) ───────

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#4B9CD3",
    colorBackground: "#1a1a2e",
    colorText: "#e5e7eb",
    colorDanger: "#ef4444",
    fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    borderRadius: "8px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(var(--accent-rgb),0.2)",
      boxShadow: "none",
      padding: "10px 12px",
      backgroundColor: "rgba(var(--accent-rgb),0.06)",
    },
    ".Input:focus": {
      border: "1px solid rgba(var(--accent-rgb),0.5)",
      boxShadow: "0 0 0 1px rgba(var(--accent-rgb),0.2)",
    },
    ".Label": {
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
      color: "#9ca3af",
    },
    ".Tab--selected": {
      backgroundColor: "rgba(var(--accent-rgb),0.15)",
      color: "#e5e7eb",
    },
  },
};

// ─── Payment Form (inside Elements provider) ─────────────────

function ConnectPaymentForm({
  paymentId,
  paymentIntentId,
  amount,
  platformFee,
  creatorName,
  onSuccess,
  onCancel,
}: {
  paymentId: string;
  paymentIntentId: string;
  amount: number;
  platformFee: number;
  creatorName: string;
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
        return_url: `${window.location.origin}/dashboard/business?tab=revenue&payment=success`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsProcessing(false);
      return;
    }

    // Payment succeeded -- confirm on backend
    const result = await confirmPayment(paymentId, paymentIntentId);
    setIsProcessing(false);

    if ("error" in result) {
      setErrorMessage(result.error);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Summary */}
      <div
        className="rounded-lg p-4 mb-5"
        style={{ background: "rgba(var(--accent-rgb),0.06)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            Payment to
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
            {creatorName}
          </span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            Amount
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
            ${amount.toFixed(2)}
          </span>
        </div>
        <div
          className="flex items-center justify-between mb-2 pt-2"
          style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            Platform fee (5%)
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            -${platformFee.toFixed(2)}
          </span>
        </div>
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--color-editorial-red)" }}>
            Creator receives
          </span>
          <span className="text-sm font-bold" style={{ color: "var(--color-editorial-red)" }}>
            ${(amount - platformFee).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Stripe Payment Element */}
      <PaymentElement />

      {/* Error */}
      {errorMessage && (
        <div
          className="mt-4 p-3 rounded-lg flex items-start gap-2"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <X size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center justify-between mt-6 pt-4"
        style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
          style={{ color: "var(--color-text-secondary, #9ca3af)" }}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isProcessing || !stripeClient || !elements}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: "var(--color-editorial-red)" }}
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={16} />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </button>
      </div>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <ShieldCheck size={12} style={{ color: "var(--color-text-secondary, #9ca3af)" }} />
        <span className="text-[10px]" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
          Secured by Stripe. Your card details never touch our servers.
        </span>
      </div>
    </form>
  );
}

// ─── Payment Modal ───────────────────────────────────────────

function PaymentModal({
  clientSecret,
  paymentId,
  paymentIntentId,
  amount,
  platformFee,
  creatorName,
  dealName,
  onSuccess,
  onClose,
}: {
  clientSecret: string;
  paymentId: string;
  paymentIntentId: string;
  amount: number;
  platformFee: number;
  creatorName: string;
  dealName: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.2)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-6 pb-4"
          style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.12)" }}
        >
          <div>
            <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
              Pay Creator
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
              {dealName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--color-text-secondary, #9ca3af)" }}
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
            <ConnectPaymentForm
              paymentId={paymentId}
              paymentIntentId={clientSecret.split("_secret_")[0]}
              amount={amount}
              platformFee={platformFee}
              creatorName={creatorName}
              onSuccess={onSuccess}
              onCancel={onClose}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}

// ─── Success Modal ───────────────────────────────────────────

function SuccessModal({
  amount,
  creatorName,
  onClose,
}: {
  amount: number;
  creatorName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-xl shadow-2xl overflow-hidden text-center p-8"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(34,197,94,0.3)",
        }}
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-emerald-500/10">
          <CheckCircle size={32} className="text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
          Payment Successful
        </h3>
        <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
          ${amount.toFixed(2)} sent to {creatorName}
        </p>
        <p className="text-xs mb-6" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
          The creator will receive the funds in their connected bank account.
        </p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all bg-emerald-600 hover:bg-emerald-700"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ─── Main PaymentButton Component ────────────────────────────

interface PaymentButtonProps {
  dealId: string;
  dealName: string;
  creatorName: string;
  suggestedAmount?: number;
  remainingAmount?: number;
  className?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function PaymentButton({
  dealId,
  dealName,
  creatorName,
  suggestedAmount,
  remainingAmount,
  className = "",
  variant = "primary",
  size = "md",
}: PaymentButtonProps) {
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [amount, setAmount] = useState<string>(
    suggestedAmount ? suggestedAmount.toFixed(2) : ""
  );
  const [paymentState, setPaymentState] = useState<{
    clientSecret: string;
    paymentId: string;
    paymentIntentId: string;
    amount: number;
    platformFee: number;
  } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInitiate = useCallback(() => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }

    if (parsedAmount < 0.5) {
      setErrorMessage("Minimum payment amount is $0.50.");
      return;
    }

    if (remainingAmount && parsedAmount > remainingAmount) {
      setErrorMessage(`Amount exceeds remaining deal value of $${remainingAmount.toFixed(2)}.`);
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await initiatePayment(dealId, parsedAmount);

      if ("error" in result) {
        setErrorMessage(result.error);
        return;
      }

      setPaymentState({
        clientSecret: result.clientSecret,
        paymentId: result.paymentId,
        paymentIntentId: result.clientSecret.split("_secret_")[0],
        amount: parsedAmount,
        platformFee: result.platformFee,
      });
      setShowAmountInput(false);
    });
  }, [amount, dealId, remainingAmount]);

  function handlePaymentSuccess() {
    setSuccessAmount(paymentState?.amount ?? 0);
    setPaymentState(null);
    setShowSuccess(true);
    setAmount("");
  }

  function handleSuccessClose() {
    setShowSuccess(false);
    // Force a page reload to update deal data
    window.location.reload();
  }

  // Size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const variantStyles =
    variant === "primary"
      ? { background: "var(--color-editorial-red)", color: "white" }
      : {
          background: "transparent",
          color: "var(--color-editorial-red)",
          border: "1px solid var(--color-editorial-red)",
        };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setShowAmountInput(true)}
        className={`inline-flex items-center gap-2 rounded-lg font-semibold transition-all hover:opacity-90 ${sizeClasses[size]} ${className}`}
        style={variantStyles}
      >
        <DollarSign size={size === "sm" ? 14 : 16} />
        Pay Creator
      </button>

      {/* Amount Input Modal */}
      {showAmountInput && !paymentState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => {
              setShowAmountInput(false);
              setErrorMessage(null);
            }}
          />
          <div
            className="relative w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.2)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 pt-6 pb-4"
              style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.12)" }}
            >
              <div>
                <h3 className="text-lg font-bold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
                  Pay Creator
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                  {dealName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAmountInput(false);
                  setErrorMessage(null);
                }}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "var(--color-text-secondary, #9ca3af)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Creator info */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                  Paying:
                </span>
                <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
                  {creatorName}
                </span>
              </div>

              {/* Amount input */}
              <label
                className="block text-[10px] font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-text-secondary, #9ca3af)" }}
              >
                Payment Amount (USD)
              </label>
              <div className="relative mb-3">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold"
                  style={{ color: "var(--color-text-secondary, #9ca3af)" }}
                >
                  $
                </span>
                <input
                  type="number"
                  min="0.50"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="0.00"
                  className="w-full pl-7 pr-4 py-3 rounded-lg text-sm font-medium outline-none transition-all"
                  style={{
                    background: "rgba(var(--accent-rgb),0.06)",
                    border: "1px solid rgba(var(--accent-rgb),0.2)",
                    color: "var(--color-text-primary, #e5e7eb)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(var(--accent-rgb),0.5)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(var(--accent-rgb),0.2)";
                  }}
                  autoFocus
                />
              </div>

              {/* Remaining value */}
              {remainingAmount !== undefined && remainingAmount > 0 && (
                <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                  Remaining deal value: ${remainingAmount.toFixed(2)}
                </p>
              )}

              {/* Fee preview */}
              {amount && parseFloat(amount) > 0 && (
                <div
                  className="rounded-lg p-3 mb-3"
                  style={{ background: "rgba(var(--accent-rgb),0.06)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                      Platform fee (5%)
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                      ${(parseFloat(amount) * 0.05).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: "var(--color-editorial-red)" }}>
                      Creator receives
                    </span>
                    <span className="text-xs font-bold" style={{ color: "var(--color-editorial-red)" }}>
                      ${(parseFloat(amount) * 0.95).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Info */}
              <div
                className="flex items-start gap-2 p-2.5 rounded-lg mb-4"
                style={{ background: "rgba(var(--accent-rgb),0.04)" }}
              >
                <Info size={12} className="shrink-0 mt-0.5" style={{ color: "var(--color-editorial-red)" }} />
                <p className="text-[10px]" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                  Go Virall takes a 5% platform fee.
                  The creator receives the remainder directly to their bank.
                </p>
              </div>

              {/* Error */}
              {errorMessage && (
                <div
                  className="p-3 rounded-lg mb-4 flex items-start gap-2"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  <X size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowAmountInput(false);
                    setErrorMessage(null);
                  }}
                  className="text-xs font-semibold uppercase tracking-wider transition-colors"
                  style={{ color: "var(--color-text-secondary, #9ca3af)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitiate}
                  disabled={isPending || !amount || parseFloat(amount) <= 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "var(--color-editorial-red)" }}
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentState && (
        <PaymentModal
          clientSecret={paymentState.clientSecret}
          paymentId={paymentState.paymentId}
          paymentIntentId={paymentState.paymentIntentId}
          amount={paymentState.amount}
          platformFee={paymentState.platformFee}
          creatorName={creatorName}
          dealName={dealName}
          onSuccess={handlePaymentSuccess}
          onClose={() => setPaymentState(null)}
        />
      )}

      {/* Success Modal */}
      {showSuccess && (
        <SuccessModal
          amount={successAmount}
          creatorName={creatorName}
          onClose={handleSuccessClose}
        />
      )}
    </>
  );
}
