"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import { ProfileSelector } from "../ProfileSelector";
import { Save, Loader2, Sparkles, Pencil, Trash2, ToggleLeft, ToggleRight, Plus } from "lucide-react";
import { saveGoal, generateAIGoals, deleteGoal, toggleGoalActive } from "@/lib/actions/goals";
import { getAllGoals } from "@/lib/dal/goals";
import { trackEvent } from "@/lib/analytics/track";
import type { SocialProfile, SocialGoal } from "@/types";

interface GoalsClientProps {
  profiles: SocialProfile[];
}

const OBJECTIVE_LABELS: Record<string, string> = {
  grow_followers: "Grow Followers",
  increase_engagement: "Increase Engagement",
  monetize: "Monetize Content",
  build_brand: "Build Personal Brand",
  drive_traffic: "Drive Traffic",
};

const MONETIZATION_LABELS: Record<string, string> = {
  brand_deals: "Brand Deals",
  affiliate: "Affiliate Marketing",
  digital_products: "Digital Products",
  coaching: "Coaching/Consulting",
  ad_revenue: "Ad Revenue",
  subscriptions: "Subscriptions",
};

const POSTING_LABELS: Record<string, string> = {
  daily: "Daily",
  "3-5_per_week": "3-5 per week",
  "1-2_per_week": "1-2 per week",
  weekly: "Weekly",
};

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  twitch: "Twitch",
  threads: "Threads",
};

export function GoalsClient({ profiles }: GoalsClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    profiles[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [goals, setGoals] = useState<SocialGoal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedProfile = profiles.find((p) => p.id === selectedId) ?? null;

  // Load all goals for selected profile
  const loadGoals = useCallback(async (profileId: string) => {
    setLoadingGoals(true);
    const data = await getAllGoals(profileId);
    setGoals(data);
    setLoadingGoals(false);
  }, []);

  // Fill form fields from a goal object
  const fillForm = useCallback((goal: SocialGoal) => {
    const form = formRef.current;
    if (!form) return;

    const objective = form.querySelector<HTMLSelectElement>("[name=primaryObjective]");
    if (objective) objective.value = goal.primary_objective || "grow_followers";

    const monetization = form.querySelector<HTMLSelectElement>("[name=monetizationGoal]");
    if (monetization) monetization.value = goal.monetization_goal || "";

    const posting = form.querySelector<HTMLSelectElement>("[name=postingCommitment]");
    if (posting) posting.value = goal.posting_commitment || "daily";

    setNativeValue(form.querySelector<HTMLInputElement>("[name=targetValue]"), String(goal.target_value || ""));
    setNativeValue(form.querySelector<HTMLInputElement>("[name=targetDays]"), String(goal.target_days || ""));
    setNativeValue(form.querySelector<HTMLInputElement>("[name=contentNiche]"), goal.content_niche || "");
    setNativeValue(form.querySelector<HTMLInputElement>("[name=targetAudience]"), goal.target_audience || "");
    setNativeValue(form.querySelector<HTMLInputElement>("[name=competitiveAspiration]"), goal.competitive_aspiration || "");
  }, []);

  // Clear form fields
  const clearForm = useCallback(() => {
    const form = formRef.current;
    if (!form) return;

    const objective = form.querySelector<HTMLSelectElement>("[name=primaryObjective]");
    if (objective) objective.value = "grow_followers";

    const monetization = form.querySelector<HTMLSelectElement>("[name=monetizationGoal]");
    if (monetization) monetization.value = "";

    const posting = form.querySelector<HTMLSelectElement>("[name=postingCommitment]");
    if (posting) posting.value = "daily";

    setNativeValue(form.querySelector<HTMLInputElement>("[name=targetValue]"), "");
    setNativeValue(form.querySelector<HTMLInputElement>("[name=targetDays]"), "");
    setNativeValue(form.querySelector<HTMLInputElement>("[name=contentNiche]"), "");
    setNativeValue(form.querySelector<HTMLInputElement>("[name=targetAudience]"), "");
    setNativeValue(form.querySelector<HTMLInputElement>("[name=competitiveAspiration]"), "");
  }, []);

  useEffect(() => {
    trackEvent("page_view", "goals");
  }, []);

  // Reload goals when profile changes
  useEffect(() => {
    if (!selectedId) {
      setGoals([]);
      return;
    }
    setSaved(false);
    setError(null);
    setAiReasoning(null);
    setEditingGoalId(null);
    requestAnimationFrame(() => clearForm());
    loadGoals(selectedId);
  }, [selectedId, loadGoals, clearForm]);

  function handleNewGoal() {
    setEditingGoalId(null);
    setSaved(false);
    setError(null);
    requestAnimationFrame(() => {
      clearForm();
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleEditGoal(goal: SocialGoal) {
    setEditingGoalId(goal.id);
    setSaved(false);
    setError(null);
    requestAnimationFrame(() => {
      fillForm(goal);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("profileId", selectedId);
    if (editingGoalId) {
      formData.set("goalId", editingGoalId);
    }

    setError(null);
    setSaved(false);
    setAiReasoning(null);
    startTransition(async () => {
      const result = await saveGoal(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setEditingGoalId(null);
        trackEvent("goal_saved", "goals");
        await loadGoals(selectedId);
        requestAnimationFrame(() => clearForm());
      }
    });
  }

  function handleGenerate() {
    if (!selectedId || !formRef.current) return;

    setError(null);
    setSaved(false);
    setAiReasoning(null);
    setEditingGoalId(null);
    startGenerate(async () => {
      const result = await generateAIGoals(selectedId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.data || !formRef.current) return;

      const d = result.data;
      const form = formRef.current;

      const objective = form.querySelector<HTMLSelectElement>("[name=primaryObjective]");
      if (objective) objective.value = d.primaryObjective || "grow_followers";

      const monetization = form.querySelector<HTMLSelectElement>("[name=monetizationGoal]");
      if (monetization) monetization.value = d.monetizationGoal || "";

      const posting = form.querySelector<HTMLSelectElement>("[name=postingCommitment]");
      if (posting) posting.value = d.postingCommitment || "daily";

      setNativeValue(form.querySelector<HTMLInputElement>("[name=targetValue]"), String(d.targetValue || ""));
      setNativeValue(form.querySelector<HTMLInputElement>("[name=targetDays]"), String(d.targetDays || ""));
      setNativeValue(form.querySelector<HTMLInputElement>("[name=contentNiche]"), d.contentNiche || "");
      setNativeValue(form.querySelector<HTMLInputElement>("[name=targetAudience]"), d.targetAudience || "");
      setNativeValue(form.querySelector<HTMLInputElement>("[name=competitiveAspiration]"), d.competitiveAspiration || "");

      if (d.reasoning) {
        setAiReasoning(d.reasoning);
      }
    });
  }

  async function handleDelete(goalId: string) {
    if (!confirm("Delete this goal?")) return;
    setDeletingId(goalId);
    const result = await deleteGoal(goalId);
    setDeletingId(null);
    if (result.error) {
      setError(result.error);
    } else {
      if (editingGoalId === goalId) {
        setEditingGoalId(null);
        requestAnimationFrame(() => clearForm());
      }
      if (selectedId) await loadGoals(selectedId);
    }
  }

  async function handleToggle(goalId: string, currentActive: boolean) {
    setTogglingId(goalId);
    const result = await toggleGoalActive(goalId, !currentActive);
    setTogglingId(null);
    if (result.error) {
      setError(result.error);
    } else if (selectedId) {
      await loadGoals(selectedId);
    }
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">Add a social profile to set goals.</p>
      </div>
    );
  }

  const platformName = selectedProfile
    ? PLATFORM_NAMES[selectedProfile.platform] || selectedProfile.platform
    : "";

  return (
    <>
      <ProfileSelector
        profiles={profiles}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="mt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Goals{selectedProfile ? ` for ${platformName} @${selectedProfile.handle}` : ""}
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Set goals to personalize your analysis and recommendations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !selectedId}
            className="flex items-center gap-2 bg-editorial-red px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate
              </>
            )}
          </button>
        </div>

        {aiReasoning && (
          <div className="mt-4 border border-editorial-gold/30 bg-editorial-gold/5 p-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold mb-1">
              Reasoning
            </p>
            <p className="text-sm text-ink-secondary">{aiReasoning}</p>
          </div>
        )}

        {/* Goal Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              {editingGoalId ? "Edit Goal" : "New Goal"}
            </p>
            {editingGoalId && (
              <button
                type="button"
                onClick={handleNewGoal}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-editorial-red hover:text-editorial-red/70 transition-colors"
              >
                <Plus size={10} /> New Instead
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="editorial-overline mb-1.5 block">Primary Objective</label>
              <select name="primaryObjective" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink">
                <option value="grow_followers">Grow Followers</option>
                <option value="increase_engagement">Increase Engagement</option>
                <option value="monetize">Monetize Content</option>
                <option value="build_brand">Build Personal Brand</option>
                <option value="drive_traffic">Drive Traffic</option>
              </select>
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">Target Value</label>
              <input type="number" name="targetValue" placeholder="e.g., 10000" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted" />
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">Target Days</label>
              <input type="number" name="targetDays" placeholder="e.g., 90" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted" />
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">Content Niche</label>
              <input type="text" name="contentNiche" placeholder="e.g., fitness, tech, cooking" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted" />
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">Monetization Goal</label>
              <select name="monetizationGoal" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink">
                <option value="">Select...</option>
                <option value="brand_deals">Brand Deals</option>
                <option value="affiliate">Affiliate Marketing</option>
                <option value="digital_products">Digital Products</option>
                <option value="coaching">Coaching/Consulting</option>
                <option value="ad_revenue">Ad Revenue</option>
                <option value="subscriptions">Subscriptions</option>
              </select>
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">Posting Commitment</label>
              <select name="postingCommitment" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink">
                <option value="daily">Daily</option>
                <option value="3-5_per_week">3-5 per week</option>
                <option value="1-2_per_week">1-2 per week</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="editorial-overline mb-1.5 block">Target Audience</label>
              <input type="text" name="targetAudience" placeholder="e.g., 18-35 year old fitness enthusiasts" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted" />
            </div>

            <div className="sm:col-span-2">
              <label className="editorial-overline mb-1.5 block">Competitive Aspiration</label>
              <input type="text" name="competitiveAspiration" placeholder="e.g., @competitor_handle - I want their engagement style" className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted" />
            </div>
          </div>

          {error && <p className="text-xs text-editorial-red">{error}</p>}
          {saved && <p className="text-xs text-editorial-green">Goal saved successfully!</p>}

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/80 disabled:opacity-50"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editingGoalId ? "Update Goal" : "Save Goal"}
          </button>
        </form>

        {/* Goals Table */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
              All Goals ({goals.length})
            </p>
          </div>

          {loadingGoals && (
            <div className="flex items-center gap-2 py-8 justify-center text-sm text-ink-muted">
              <Loader2 size={14} className="animate-spin" /> Loading goals...
            </div>
          )}

          {!loadingGoals && goals.length === 0 && (
            <div className="border border-rule py-8 text-center">
              <p className="text-sm text-ink-muted">No goals yet. Create one above or use Auto Generate.</p>
            </div>
          )}

          {!loadingGoals && goals.length > 0 && (
            <div className="border border-rule">
              {/* Table Header */}
              <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-rule bg-surface-raised">
                <span className="editorial-overline col-span-2">Objective</span>
                <span className="editorial-overline col-span-1">Target</span>
                <span className="editorial-overline col-span-1">Days</span>
                <span className="editorial-overline col-span-2">Niche</span>
                <span className="editorial-overline col-span-2">Monetization</span>
                <span className="editorial-overline col-span-1">Status</span>
                <span className="editorial-overline col-span-1">Created</span>
                <span className="editorial-overline col-span-2 text-right">Actions</span>
              </div>

              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 border-b border-rule last:border-b-0 items-center ${
                    editingGoalId === goal.id ? "bg-editorial-red/5" : ""
                  } ${!goal.is_active ? "opacity-50" : ""}`}
                >
                  {/* Objective */}
                  <div className="sm:col-span-2">
                    <span className="sm:hidden editorial-overline mr-2">Objective:</span>
                    <span className="text-sm font-semibold text-ink">
                      {OBJECTIVE_LABELS[goal.primary_objective ?? ""] ?? goal.primary_objective ?? "—"}
                    </span>
                  </div>

                  {/* Target */}
                  <div className="sm:col-span-1">
                    <span className="sm:hidden editorial-overline mr-2">Target:</span>
                    <span className="text-sm text-ink font-mono">
                      {goal.target_value != null ? goal.target_value.toLocaleString() : "—"}
                    </span>
                  </div>

                  {/* Days */}
                  <div className="sm:col-span-1">
                    <span className="sm:hidden editorial-overline mr-2">Days:</span>
                    <span className="text-sm text-ink font-mono">{goal.target_days ?? "—"}</span>
                  </div>

                  {/* Niche */}
                  <div className="sm:col-span-2 min-w-0">
                    <span className="sm:hidden editorial-overline mr-2">Niche:</span>
                    <span className="text-xs text-ink-secondary truncate block">{goal.content_niche || "—"}</span>
                  </div>

                  {/* Monetization */}
                  <div className="sm:col-span-2 min-w-0">
                    <span className="sm:hidden editorial-overline mr-2">Monetization:</span>
                    <span className="text-xs text-ink-secondary truncate block">
                      {MONETIZATION_LABELS[goal.monetization_goal ?? ""] ?? goal.monetization_goal ?? "—"}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-1">
                    <span className="sm:hidden editorial-overline mr-2">Status:</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 ${
                      goal.is_active
                        ? "bg-editorial-green/10 text-editorial-green"
                        : "bg-surface-raised text-ink-muted"
                    }`}>
                      {goal.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Created */}
                  <div className="sm:col-span-1">
                    <span className="sm:hidden editorial-overline mr-2">Created:</span>
                    <span className="text-[10px] text-ink-muted font-mono">
                      {new Date(goal.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="sm:col-span-2 flex items-center gap-2 sm:justify-end">
                    <button
                      onClick={() => handleEditGoal(goal)}
                      className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-secondary hover:text-ink transition-colors"
                      title="Edit"
                    >
                      <Pencil size={10} /> Edit
                    </button>
                    <button
                      onClick={() => handleToggle(goal.id, goal.is_active)}
                      disabled={togglingId === goal.id}
                      className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-secondary hover:text-ink transition-colors disabled:opacity-50"
                      title={goal.is_active ? "Deactivate" : "Activate"}
                    >
                      {goal.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                      {goal.is_active ? "Off" : "On"}
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      disabled={deletingId === goal.id}
                      className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-editorial-red hover:text-editorial-red/70 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={10} /> {deletingId === goal.id ? "..." : "Del"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Integration note */}
          {goals.length > 0 && (
            <p className="mt-3 text-[10px] text-ink-muted">
              Active goals feed into analysis (Growth, Content Strategy, Insights, Earnings, 30-Day Plan, Campaigns), Chat, and Recommendations.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/** Set input value programmatically and dispatch an input event so React picks it up */
function setNativeValue(el: HTMLInputElement | null, value: string) {
  if (!el) return;
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    el.value = value;
  }
}
