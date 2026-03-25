"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCheckoutSession, createPortalSession } from "@/lib/actions/billing";
import type { Organization, SubscriptionData, BillingInvoice } from "@/types";

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
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

  function handleUpgrade(planKey: string) {
    startTransition(async () => {
      const result = await createCheckoutSession(planKey);
      if (result?.error) {
        alert(result.error);
      }
    });
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

          {/* Dynamic renewal / payment info */}
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
          {/* Manage Subscription button for paid users */}
          {subscription && (
            <button
              onClick={handleManageBilling}
              disabled={isPending}
              className="border border-rule px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink hover:border-ink-muted transition-colors disabled:opacity-50"
            >
              {isPending ? "Loading…" : "Manage Subscription"}
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
                  {isPending ? "Loading…" : "Upgrade"}
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
                  {isPending ? "Loading…" : "Manage Plan"}
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
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-rule bg-surface-raised">
              <span className="editorial-overline">Date</span>
              <span className="editorial-overline">Description</span>
              <span className="editorial-overline text-right">Amount</span>
              <span className="editorial-overline text-right">Status</span>
            </div>

            {/* Rows */}
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
    </div>
  );
}
