"use client";

import { useState, useRef, useTransition } from "react";
import { ProfileSelector } from "../ProfileSelector";
import { Save, Loader2, Sparkles } from "lucide-react";
import { saveGoal, generateAIGoals } from "@/lib/actions/goals";
import type { SocialProfile } from "@/types";

interface GoalsClientProps {
  profiles: SocialProfile[];
}

export function GoalsClient({ profiles }: GoalsClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    profiles[0]?.id ?? null,
  );
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("profileId", selectedId);

    setError(null);
    setSaved(false);
    setAiReasoning(null);
    startTransition(async () => {
      const result = await saveGoal(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  function handleGenerate() {
    if (!selectedId || !formRef.current) return;

    setError(null);
    setSaved(false);
    setAiReasoning(null);
    startGenerate(async () => {
      const result = await generateAIGoals(selectedId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.data || !formRef.current) return;

      const d = result.data;
      const form = formRef.current;

      // Auto-fill select fields
      const objective = form.querySelector<HTMLSelectElement>("[name=primaryObjective]");
      if (objective) objective.value = d.primaryObjective || "grow_followers";

      const monetization = form.querySelector<HTMLSelectElement>("[name=monetizationGoal]");
      if (monetization) monetization.value = d.monetizationGoal || "";

      const posting = form.querySelector<HTMLSelectElement>("[name=postingCommitment]");
      if (posting) posting.value = d.postingCommitment || "daily";

      // Auto-fill text/number inputs via native setter to trigger React state
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

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">Add a social profile to set goals.</p>
      </div>
    );
  }

  return (
    <>
      <ProfileSelector
        profiles={profiles}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">Goals</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Set goals to personalize your AI analysis and recommendations.
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
              AI Reasoning
            </p>
            <p className="text-sm text-ink-secondary">{aiReasoning}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="editorial-overline mb-1.5 block">
                Primary Objective
              </label>
              <select
                name="primaryObjective"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink"
              >
                <option value="grow_followers">Grow Followers</option>
                <option value="increase_engagement">Increase Engagement</option>
                <option value="monetize">Monetize Content</option>
                <option value="build_brand">Build Personal Brand</option>
                <option value="drive_traffic">Drive Traffic</option>
              </select>
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">
                Target Value
              </label>
              <input
                type="number"
                name="targetValue"
                placeholder="e.g., 10000"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted"
              />
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">
                Target Days
              </label>
              <input
                type="number"
                name="targetDays"
                placeholder="e.g., 90"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted"
              />
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">
                Content Niche
              </label>
              <input
                type="text"
                name="contentNiche"
                placeholder="e.g., fitness, tech, cooking"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted"
              />
            </div>

            <div>
              <label className="editorial-overline mb-1.5 block">
                Monetization Goal
              </label>
              <select
                name="monetizationGoal"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink"
              >
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
              <label className="editorial-overline mb-1.5 block">
                Posting Commitment
              </label>
              <select
                name="postingCommitment"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink"
              >
                <option value="daily">Daily</option>
                <option value="3-5_per_week">3-5 per week</option>
                <option value="1-2_per_week">1-2 per week</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="editorial-overline mb-1.5 block">
                Target Audience
              </label>
              <input
                type="text"
                name="targetAudience"
                placeholder="e.g., 18-35 year old fitness enthusiasts"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="editorial-overline mb-1.5 block">
                Competitive Aspiration
              </label>
              <input
                type="text"
                name="competitiveAspiration"
                placeholder="e.g., @competitor_handle - I want their engagement style"
                className="w-full border border-rule bg-surface-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-editorial-red">{error}</p>
          )}

          {saved && (
            <p className="text-xs text-editorial-green">Goals saved successfully!</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/80 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Goals
          </button>
        </form>
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
