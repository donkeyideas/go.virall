"use client";

import { useState, useEffect, useTransition } from "react";
import {
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Wallet,
  ArrowRight,
  DollarSign,
  Clock,
  Info,
} from "lucide-react";
import {
  setupPayouts,
  getPayoutStatus,
  getPayoutDashboardUrl,
} from "@/lib/actions/payments";

type PayoutState =
  | { status: "loading" }
  | { status: "not_setup" }
  | { status: "pending"; connectId: string }
  | {
      status: "active";
      connectId: string;
      balance?: { available: number; pending: number; currency: string };
    }
  | { status: "error"; message: string };

export function PayoutSetup() {
  const [state, setState] = useState<PayoutState>({ status: "loading" });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setState({ status: "loading" });
    const result = await getPayoutStatus();

    if ("error" in result) {
      setState({ status: "error", message: result.error });
      return;
    }

    if (!result.hasConnectAccount) {
      setState({ status: "not_setup" });
    } else if (!result.isOnboarded) {
      setState({ status: "pending", connectId: result.connectId! });
    } else {
      setState({
        status: "active",
        connectId: result.connectId!,
        balance: result.balance,
      });
    }
  }

  function handleSetup() {
    startTransition(async () => {
      const result = await setupPayouts();
      if ("error" in result) {
        setState({ status: "error", message: result.error });
        return;
      }
      window.location.href = result.onboardingUrl;
    });
  }

  function handleCompleteSetup() {
    startTransition(async () => {
      const result = await setupPayouts();
      if ("error" in result) {
        setState({ status: "error", message: result.error });
        return;
      }
      window.location.href = result.onboardingUrl;
    });
  }

  function handleViewDashboard() {
    startTransition(async () => {
      const result = await getPayoutDashboardUrl();
      if ("error" in result) {
        setState({ status: "error", message: result.error });
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  function formatCurrency(cents: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  }

  // Loading state
  if (state.status === "loading") {
    return (
      <div
        className="rounded-lg p-6"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
        }}
      >
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-editorial-red)" }} />
          <span className="text-sm" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            Loading payout status...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (state.status === "error") {
    return (
      <div
        className="rounded-lg p-6"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
            Payout Setup Error
          </h3>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
          {state.message}
        </p>
        <button
          onClick={() => loadStatus()}
          className="text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded transition-colors"
          style={{
            background: "rgba(var(--accent-rgb),0.12)",
            color: "var(--color-editorial-red)",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Not set up
  if (state.status === "not_setup") {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(var(--accent-rgb),0.12)" }}
            >
              <Wallet size={20} style={{ color: "var(--color-editorial-red)" }} />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
                Set Up Payouts
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                Receive payments directly from brands
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            Connect your bank account through Stripe to receive payments from brand deals.
            Once set up, brands can pay you directly through Go Virall.
          </p>

          <div
            className="flex items-start gap-2 p-3 rounded-lg mb-4"
            style={{ background: "rgba(var(--accent-rgb),0.06)" }}
          >
            <Info size={14} className="shrink-0 mt-0.5" style={{ color: "var(--color-editorial-red)" }} />
            <p className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
              Go Virall takes a 5% platform fee on transactions.
              You will receive 95% of each payment directly to your connected bank account.
            </p>
          </div>
        </div>

        {/* Action */}
        <div
          className="px-6 py-4"
          style={{ borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}
        >
          <button
            onClick={handleSetup}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "var(--color-editorial-red)" }}
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Set Up Payouts
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Pending (started but not completed onboarding)
  if (state.status === "pending") {
    return (
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(245,158,11,0.3)",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
                Complete Payout Setup
              </h3>
              <p className="text-xs text-amber-500">
                Action required
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            Your Stripe Connect account has been created but onboarding is incomplete.
            Please finish setting up to start receiving payments.
          </p>

          <div
            className="flex items-start gap-2 p-3 rounded-lg mb-4"
            style={{ background: "rgba(var(--accent-rgb),0.06)" }}
          >
            <Info size={14} className="shrink-0 mt-0.5" style={{ color: "var(--color-editorial-red)" }} />
            <p className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
              Go Virall takes a 5% platform fee on transactions.
              You will receive 95% of each payment directly to your connected bank account.
            </p>
          </div>
        </div>

        {/* Action */}
        <div
          className="px-6 py-4"
          style={{ borderTop: "1px solid rgba(245,158,11,0.3)" }}
        >
          <button
            onClick={handleCompleteSetup}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 bg-amber-500 hover:bg-amber-600"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                Complete Setup
                <ExternalLink size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Active (fully onboarded)
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid rgba(34,197,94,0.3)",
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10">
            <CheckCircle size={20} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
              Payouts Active
            </h3>
            <p className="text-xs text-emerald-500">
              Ready to receive payments
            </p>
          </div>
        </div>
      </div>

      {/* Balance info */}
      {state.balance && (
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-3 rounded-lg"
              style={{ background: "rgba(var(--accent-rgb),0.06)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign size={12} style={{ color: "var(--color-editorial-red)" }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                  Available
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
                {formatCurrency(state.balance.available, state.balance.currency)}
              </p>
            </div>
            <div
              className="p-3 rounded-lg"
              style={{ background: "rgba(var(--accent-rgb),0.06)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} style={{ color: "var(--color-editorial-red)" }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
                  Pending
                </span>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--color-text-primary, #e5e7eb)" }}>
                {formatCurrency(state.balance.pending, state.balance.currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fee info */}
      <div className="px-6 pb-4">
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{ background: "rgba(var(--accent-rgb),0.06)" }}
        >
          <Info size={14} className="shrink-0 mt-0.5" style={{ color: "var(--color-editorial-red)" }} />
          <p className="text-xs" style={{ color: "var(--color-text-secondary, #9ca3af)" }}>
            Go Virall takes a 5% platform fee on transactions.
            You receive 95% of each payment directly to your bank account.
          </p>
        </div>
      </div>

      {/* Action */}
      <div
        className="px-6 py-4"
        style={{ borderTop: "1px solid rgba(34,197,94,0.3)" }}
      >
        <button
          onClick={handleViewDashboard}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Opening...
            </>
          ) : (
            <>
              View Stripe Dashboard
              <ExternalLink size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
