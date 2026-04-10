"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, X, Check, Loader2 } from "lucide-react";
import { createPricingPlan, updatePricingPlan, deletePricingPlan } from "@/lib/actions/admin";
import type { PricingPlan } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  creator: "Creator Plans",
  brand: "Brand Plans",
};

const PLAN_ACCENTS: Record<string, string> = {
  free: "text-ink-muted",
  pro: "text-editorial-gold",
  business: "text-editorial-green",
  enterprise: "text-editorial-red",
};

const BRAND_PLAN_ACCENTS: Record<string, string> = {
  brand_starter: "text-white bg-black/80 px-1.5 py-0.5 rounded",
  brand_growth: "text-white bg-black/80 px-1.5 py-0.5 rounded",
  brand_pro: "text-white bg-black/80 px-1.5 py-0.5 rounded",
  brand_enterprise: "text-white bg-black/80 px-1.5 py-0.5 rounded",
};

function groupByAccountType(plans: PricingPlan[]) {
  const groups: Record<string, PricingPlan[]> = {};
  for (const plan of plans) {
    const key = plan.account_type ?? "creator";
    if (!groups[key]) groups[key] = [];
    groups[key].push(plan);
  }
  // Sort each group by sort_order then price
  for (const group of Object.values(groups)) {
    group.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price_monthly - b.price_monthly);
  }
  return groups;
}

// ─── Feature Editor ──────────────────────────────────────────

function FeaturesEditor({
  features,
  onChange,
}: {
  features: Record<string, unknown>;
  onChange: (f: Record<string, unknown>) => void;
}) {
  const entries = Object.entries(features);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  function addEntry() {
    if (!newKey.trim()) return;
    let parsed: unknown = newValue;
    if (newValue === "true") parsed = true;
    else if (newValue === "false") parsed = false;
    else if (!isNaN(Number(newValue)) && newValue.trim() !== "") parsed = Number(newValue);
    onChange({ ...features, [newKey.trim()]: parsed });
    setNewKey("");
    setNewValue("");
  }

  function removeEntry(key: string) {
    const copy = { ...features };
    delete copy[key];
    onChange(copy);
  }

  return (
    <div className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-xs text-ink-secondary flex-1 truncate font-mono">
            {key}
          </span>
          <span className="text-xs font-mono text-ink font-bold">
            {typeof value === "boolean" ? (value ? "true" : "false") : String(value)}
          </span>
          <button
            type="button"
            onClick={() => removeEntry(key)}
            className="text-ink-muted hover:text-editorial-red p-0.5"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1 pt-1 border-t border-rule">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="key"
          className="text-xs font-mono border border-rule bg-surface-raised px-2 py-1 text-ink flex-1"
        />
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="value"
          className="text-xs font-mono border border-rule bg-surface-raised px-2 py-1 text-ink w-20"
          onKeyDown={(e) => e.key === "Enter" && addEntry()}
        />
        <button
          type="button"
          onClick={addEntry}
          className="text-editorial-green p-0.5 hover:opacity-75"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Plan Edit Modal ─────────────────────────────────────────

interface PlanFormData {
  id: string;
  name: string;
  account_type: "creator" | "brand";
  price_monthly: number;
  max_social_profiles: number;
  description: string;
  stripe_price_id: string;
  sort_order: number;
  features: Record<string, unknown>;
}

function PlanModal({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: PlanFormData;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PlanFormData>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      let result: { success?: boolean; error?: string };
      if (isNew) {
        result = await createPricingPlan({
          id: form.id,
          name: form.name,
          account_type: form.account_type,
          price_monthly: form.price_monthly,
          max_social_profiles: form.max_social_profiles,
          description: form.description || undefined,
          stripe_price_id: form.stripe_price_id || undefined,
          sort_order: form.sort_order,
          features: form.features,
        });
      } else {
        result = await updatePricingPlan(form.id, {
          name: form.name,
          price_monthly: form.price_monthly,
          max_social_profiles: form.max_social_profiles,
          description: form.description || undefined,
          stripe_price_id: form.stripe_price_id || undefined,
          sort_order: form.sort_order,
          features: form.features,
        });
      }
      if (result.error) {
        setError(result.error);
      } else {
        onSaved();
        onClose();
      }
    });
  }

  const inputClass =
    "w-full border border-rule bg-surface-raised px-3 py-2 text-sm font-mono text-ink focus:border-editorial-gold focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-card border border-rule w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rule px-6 py-4">
          <h2 className="font-serif text-lg font-bold text-ink">
            {isNew ? "Create Plan" : `Edit: ${form.name}`}
          </h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="border border-editorial-red/30 bg-editorial-red/5 p-3 text-xs text-editorial-red">
              {error}
            </div>
          )}

          {/* ID (only for new) */}
          {isNew && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                Plan ID
              </label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="brand_pro"
                className={inputClass}
              />
              <p className="text-[10px] text-ink-muted mt-1">
                Unique slug — cannot be changed after creation
              </p>
            </div>
          )}

          {/* Account Type */}
          {isNew && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                Account Type
              </label>
              <select
                value={form.account_type}
                onChange={(e) =>
                  setForm({ ...form, account_type: e.target.value as "creator" | "brand" })
                }
                className={inputClass}
              >
                <option value="creator">Creator</option>
                <option value="brand">Brand</option>
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                Price (cents/mo)
              </label>
              <input
                type="number"
                value={form.price_monthly}
                onChange={(e) => setForm({ ...form, price_monthly: parseInt(e.target.value) || 0 })}
                className={inputClass}
              />
              <p className="text-[10px] text-ink-muted mt-1">
                e.g. 9900 = $99.00
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                Max Social Profiles
              </label>
              <input
                type="number"
                value={form.max_social_profiles}
                onChange={(e) =>
                  setForm({ ...form, max_social_profiles: parseInt(e.target.value) || 0 })
                }
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short description for the plan card"
              className={inputClass}
            />
          </div>

          {/* Stripe Price ID */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Stripe Price ID
            </label>
            <input
              type="text"
              value={form.stripe_price_id}
              onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
              placeholder="price_..."
              className={inputClass}
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Sort Order
            </label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>

          {/* Features */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
              Features (JSON)
            </label>
            <FeaturesEditor
              features={form.features}
              onChange={(f) => setForm({ ...form, features: f })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-rule px-6 py-4">
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-purple-500 rounded disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check size={12} />
                {isNew ? "Create" : "Save Changes"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ───────────────────────────────────

export function SubscriptionsClient({ plans }: { plans: PricingPlan[] }) {
  const grouped = groupByAccountType(plans);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newAccountType, setNewAccountType] = useState<"creator" | "brand">("creator");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(planId: string) {
    if (!confirm(`Delete plan "${planId}"? This cannot be undone.`)) return;
    setDeletingId(planId);
    startTransition(async () => {
      const result = await deletePricingPlan(planId);
      setDeletingId(null);
      if (result.error) alert(result.error);
    });
  }

  function handleToggleActive(plan: PricingPlan) {
    startTransition(async () => {
      const result = await updatePricingPlan(plan.id, { is_active: !plan.is_active });
      if (result.error) alert(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl font-bold text-ink">Subscriptions</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-purple-500 rounded"
        >
          <Plus size={14} />
          Add Plan
        </button>
      </div>

      {Object.entries(grouped).map(([accountType, groupPlans]) => (
        <div key={accountType} className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            {ACCOUNT_TYPE_LABELS[accountType] ?? accountType}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {groupPlans.map((plan) => {
              const monthlyPrice = plan.price_monthly / 100;
              const isBrand = plan.account_type === "brand";
              const accent = isBrand
                ? (BRAND_PLAN_ACCENTS[plan.id] ?? "text-white bg-black/80 px-1.5 py-0.5 rounded")
                : (PLAN_ACCENTS[plan.id] ?? PLAN_ACCENTS[plan.name.toLowerCase()] ?? "text-ink");
              const featureEntries = Object.entries(plan.features ?? {});

              return (
                <div
                  key={plan.id}
                  className={`border bg-surface-card flex flex-col ${
                    plan.is_active ? "border-rule" : "border-rule opacity-50"
                  }`}
                >
                  {/* Plan Header */}
                  <div className="border-b border-rule bg-surface-raised px-4 py-3 flex items-center justify-between">
                    <div>
                      <span
                        className={`text-[11px] font-bold uppercase tracking-widest ${accent}`}
                      >
                        {plan.name}
                      </span>
                      {!plan.is_active && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-editorial-red">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="p-1 text-ink-muted hover:text-ink"
                        title="Edit plan"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(plan)}
                        disabled={isPending}
                        className="p-1 text-ink-muted hover:text-ink"
                        title={plan.is_active ? "Deactivate" : "Activate"}
                      >
                        {plan.is_active ? <X size={12} /> : <Check size={12} />}
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        disabled={deletingId === plan.id}
                        className="p-1 text-ink-muted hover:text-editorial-red"
                        title="Delete plan"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <div className="px-4 pt-3">
                      <p className="text-xs text-ink-secondary">{plan.description}</p>
                    </div>
                  )}

                  {/* Price */}
                  <div className="px-4 pt-3 pb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-3xl font-bold text-ink">
                        ${monthlyPrice}
                      </span>
                      <span className="text-xs text-ink-muted font-mono">/mo</span>
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
                      <span className="text-sm text-ink-muted">No features listed</span>
                    ) : (
                      <div className="space-y-1.5">
                        {featureEntries.map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
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

                  {/* Stripe Price ID + Plan ID */}
                  <div className="border-t border-rule px-4 py-2 space-y-0.5">
                    <span className="font-mono text-[11px] text-ink-muted truncate block">
                      {plan.id}
                    </span>
                    {plan.stripe_price_id && (
                      <span className="font-mono text-[10px] text-ink-muted/60 truncate block">
                        {plan.stripe_price_id}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {plans.length === 0 && (
        <div className="border border-rule bg-surface-card p-8 text-center text-sm text-ink-muted">
          No pricing plans configured. Click &ldquo;Add Plan&rdquo; to create one.
        </div>
      )}

      {/* Edit Modal */}
      {editingPlan && (
        <PlanModal
          initial={{
            id: editingPlan.id,
            name: editingPlan.name,
            account_type: editingPlan.account_type ?? "creator",
            price_monthly: editingPlan.price_monthly,
            max_social_profiles: editingPlan.max_social_profiles,
            description: editingPlan.description ?? "",
            stripe_price_id: editingPlan.stripe_price_id ?? "",
            sort_order: editingPlan.sort_order ?? 0,
            features: editingPlan.features ?? {},
          }}
          isNew={false}
          onClose={() => setEditingPlan(null)}
          onSaved={() => setEditingPlan(null)}
        />
      )}

      {/* Create Modal */}
      {isCreating && (
        <PlanModal
          initial={{
            id: "",
            name: "",
            account_type: newAccountType,
            price_monthly: 0,
            max_social_profiles: 0,
            description: "",
            stripe_price_id: "",
            sort_order: 0,
            features: {},
          }}
          isNew={true}
          onClose={() => setIsCreating(false)}
          onSaved={() => setIsCreating(false)}
        />
      )}
    </div>
  );
}
