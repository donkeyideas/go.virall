"use client";

import type { PricingPlan } from "@/types";

const PLAN_ACCENTS: Record<string, string> = {
  free: "text-ink-muted",
  pro: "text-editorial-gold",
  business: "text-editorial-green",
  enterprise: "text-editorial-red",
};

export function SubscriptionsClient({ plans }: { plans: PricingPlan[] }) {
  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-6">
        Subscriptions
      </h1>

      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
        Pricing Plans
      </p>

      {plans.length === 0 ? (
        <div className="border border-rule bg-surface-card p-8 text-center text-sm text-ink-muted">
          No pricing plans configured
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const monthlyPrice = plan.price_monthly / 100;
            const accent = PLAN_ACCENTS[plan.name.toLowerCase()] ?? "text-ink";
            const featureEntries = Object.entries(plan.features ?? {});

            return (
              <div
                key={plan.id}
                className="border border-rule bg-surface-card flex flex-col"
              >
                {/* Plan Header */}
                <div className="border-b border-rule bg-surface-raised px-4 py-3">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-widest ${accent}`}
                  >
                    {plan.name}
                  </span>
                </div>

                {/* Price */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-ink">
                      ${monthlyPrice}
                    </span>
                    <span className="text-xs text-ink-muted font-mono">
                      /mo
                    </span>
                  </div>
                </div>

                {/* Max Profiles */}
                <div className="px-4 pb-3 border-b border-rule">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                      Social Profiles
                    </span>
                    <span className="font-mono text-sm font-bold text-ink">
                      {plan.max_social_profiles}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="px-4 py-3 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                    Features
                  </p>
                  {featureEntries.length === 0 ? (
                    <span className="text-sm text-ink-muted">
                      No features listed
                    </span>
                  ) : (
                    <div className="space-y-1.5">
                      {featureEntries.map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-ink-secondary">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono text-sm text-ink">
                            {typeof value === "boolean"
                              ? value
                                ? "Yes"
                                : "No"
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Plan ID */}
                <div className="border-t border-rule px-4 py-2">
                  <span className="font-mono text-[11px] text-ink-muted truncate block">
                    {plan.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
