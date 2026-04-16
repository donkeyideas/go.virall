"use client";

import Link from "next/link";
import { Sparkles, ListOrdered, LineChart, Target, ArrowRight } from "lucide-react";
import type { PrimaryGoal } from "@/types";

/**
 * User-facing explainer that translates an abstract `primary_goal` into
 * concrete, observable behavior changes across the product.
 *
 * Keep copy short, active-voice, and written in the second person —
 * this is what the AI / platform will do FOR the user, not what they
 * need to do.
 */
interface Effect {
  area: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  copy: string;
  /** Destination route when the user clicks this effect card. */
  href: string;
  /** Short CTA label shown next to the arrow. */
  cta: string;
}

/** Shared per-area destinations — identical across all goals. */
const EFFECT_LINKS: Record<"content" | "recs" | "analyses" | "profiles", { href: string; cta: string }> = {
  content: { href: "/dashboard/ai-studio", cta: "Open AI Studio" },
  recs: { href: "/dashboard/recommendations", cta: "See Recommendations" },
  analyses: { href: "/dashboard/intelligence", cta: "View Analyses" },
  profiles: { href: "/dashboard/profiles", cta: "Manage Profiles" },
};

export const GOAL_EFFECTS: Record<PrimaryGoal, Effect[]> = {
  grow_audience: [
    {
      area: "Content Generation",
      icon: Sparkles,
      copy: "AI Studio writes hooks tuned for maximum reach — viral formats, trend-jumping angles, and high-CTR first lines.",
      ...EFFECT_LINKS.content,
    },
    {
      area: "Recommendations",
      icon: ListOrdered,
      copy: "Your top priorities focus on growth tactics, posting cadence, and reach optimization. Monetization drops to the bottom.",
      ...EFFECT_LINKS.recs,
    },
    {
      area: "AI Analyses",
      icon: LineChart,
      copy: "Growth tips, content strategy, and 30-day plans all lead with audience-expansion moves and trend capture.",
      ...EFFECT_LINKS.analyses,
    },
    {
      area: "New Profiles",
      icon: Target,
      copy: "When you connect a profile, it auto-starts with a 90-day follower-growth goal (target based on your current tier).",
      ...EFFECT_LINKS.profiles,
    },
  ],
  make_money: [
    {
      area: "Content Generation",
      icon: Sparkles,
      copy: "AI Studio writes captions that build commercial trust — product-forward hooks, clear CTAs, and brand-deal-friendly tone.",
      ...EFFECT_LINKS.content,
    },
    {
      area: "Recommendations",
      icon: ListOrdered,
      copy: "Monetization tactics (deals, rates, affiliate, sponsors) lead your priorities. Only growth tactics that unlock revenue make the cut.",
      ...EFFECT_LINKS.recs,
    },
    {
      area: "AI Analyses",
      icon: LineChart,
      copy: "Earnings forecast, brand deal fit, and rate card guidance are weighted heavily. Every insight frames ROI.",
      ...EFFECT_LINKS.analyses,
    },
    {
      area: "New Profiles",
      icon: Target,
      copy: "New profiles auto-start with a 90-day monetization goal — ready for deal tracking, revenue targets, and rate planning.",
      ...EFFECT_LINKS.profiles,
    },
  ],
  build_brand: [
    {
      area: "Content Generation",
      icon: Sparkles,
      copy: "AI Studio favors distinctive POV, signature aesthetic, and thought-leadership depth. Long-form hooks over virality bait.",
      ...EFFECT_LINKS.content,
    },
    {
      area: "Recommendations",
      icon: ListOrdered,
      copy: "Content pillars, voice consistency, and engagement quality lead. Growth-hacks are deprioritized in favor of authority.",
      ...EFFECT_LINKS.recs,
    },
    {
      area: "AI Analyses",
      icon: LineChart,
      copy: "Insights reinforce identity, values, and niche expertise — every recommendation is weighted toward brand equity.",
      ...EFFECT_LINKS.analyses,
    },
    {
      area: "New Profiles",
      icon: Target,
      copy: "New profiles auto-start with a 90-day brand-building goal focused on authority, voice, and community depth.",
      ...EFFECT_LINKS.profiles,
    },
  ],
  drive_traffic: [
    {
      area: "Content Generation",
      icon: Sparkles,
      copy: "Every post pushes viewers off-platform — captions end with clear CTAs, link-in-bio prompts, and funnel entry points.",
      ...EFFECT_LINKS.content,
    },
    {
      area: "Recommendations",
      icon: ListOrdered,
      copy: "Link optimization, CTA placement, and funnel tactics lead your priorities. Conversion-focused always beats pure reach.",
      ...EFFECT_LINKS.recs,
    },
    {
      area: "AI Analyses",
      icon: LineChart,
      copy: "Insights quantify click potential, traffic routing, and landing-page performance. Every tip ties back to conversions.",
      ...EFFECT_LINKS.analyses,
    },
    {
      area: "New Profiles",
      icon: Target,
      copy: "New profiles auto-start with a 90-day conversion goal — ready to track traffic, signups, or sales as targets.",
      ...EFFECT_LINKS.profiles,
    },
  ],
};

interface GoalEffectsPanelProps {
  primaryGoal: PrimaryGoal;
  variant: "editorial" | "modern";
  /** Compact mode hides the header and uses tighter spacing (for popovers / onboarding). */
  compact?: boolean;
}

export function GoalEffectsPanel({ primaryGoal, variant, compact = false }: GoalEffectsPanelProps) {
  const isEditorial = variant === "editorial";
  const effects = GOAL_EFFECTS[primaryGoal];
  const accentText = isEditorial ? "text-editorial-red" : "text-editorial-gold";

  return (
    <div
      className={
        isEditorial
          ? `border-2 border-ink bg-surface-card ${compact ? "p-4" : "p-5"}`
          : `rounded-2xl border border-modern-card-border bg-surface-card ${compact ? "p-4" : "p-5"}`
      }
    >
      {!compact && (
        <div className="mb-4 flex items-center gap-2 border-b-2 border-ink pb-2">
          <Sparkles size={16} className={accentText} />
          <h3
            className={
              isEditorial
                ? "font-serif text-[16px] font-black uppercase tracking-tight text-ink"
                : "text-[14px] font-bold uppercase tracking-[2px] text-ink"
            }
          >
            What this unlocks
          </h3>
        </div>
      )}
      <ul className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        {effects.map((effect) => {
          const Icon = effect.icon;
          return (
            <li key={effect.area}>
              <Link
                href={effect.href}
                className={
                  isEditorial
                    ? "group flex h-full flex-col border border-rule bg-surface-raised p-3 transition-colors hover:border-editorial-red hover:bg-editorial-red/5"
                    : "group flex h-full flex-col rounded-xl border border-modern-card-border bg-surface-raised p-3 transition-colors hover:border-editorial-gold/60"
                }
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Icon size={14} className={accentText} />
                  <span
                    className={
                      isEditorial
                        ? "font-sans text-[10px] font-bold uppercase tracking-[2px] text-ink"
                        : "text-[10px] font-bold uppercase tracking-[2px] text-ink"
                    }
                  >
                    {effect.area}
                  </span>
                </div>
                <p
                  className={
                    isEditorial
                      ? "font-sans text-[12px] leading-relaxed text-ink-secondary"
                      : "text-[12px] leading-relaxed text-ink-secondary"
                  }
                >
                  {effect.copy}
                </p>
                <div
                  className={`mt-2 flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-wider ${accentText} opacity-70 transition-opacity group-hover:opacity-100`}
                >
                  {effect.cta}
                  <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
