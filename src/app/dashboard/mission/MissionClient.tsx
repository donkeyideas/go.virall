"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Target,
  TrendingUp,
  DollarSign,
  Award,
  Zap,
  Check,
  Pencil,
  ArrowRight,
} from "lucide-react";
import { setPrimaryGoal } from "@/lib/actions/account";
import { GoalsClient } from "@/components/dashboard/goals/GoalsClient";
import { GoalEffectsPanel } from "@/components/dashboard/mission/GoalEffectsPanel";
import { trackEvent } from "@/lib/analytics/track";
import { useViewMode } from "@/lib/contexts/view-mode";
import type { SocialProfile, PrimaryGoal } from "@/types";

interface MissionClientProps {
  profiles: SocialProfile[];
  initialPrimaryGoal: PrimaryGoal | null;
}

interface GoalOption {
  value: PrimaryGoal;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    value: "grow_audience",
    label: "Grow my audience",
    description: "Focus on follower count, reach, and building a bigger community.",
    icon: TrendingUp,
  },
  {
    value: "make_money",
    label: "Make money",
    description: "Turn your audience into revenue via brand deals, affiliate, and monetization.",
    icon: DollarSign,
  },
  {
    value: "build_brand",
    label: "Build my brand",
    description: "Establish authority and identity through high-quality engagement.",
    icon: Award,
  },
  {
    value: "drive_traffic",
    label: "Drive traffic / conversions",
    description: "Funnel followers to sales, signups, newsletters, or your product.",
    icon: Zap,
  },
];

export function MissionClient({ profiles, initialPrimaryGoal }: MissionClientProps) {
  const { viewMode } = useViewMode();
  const isEditorial = viewMode === "editorial";
  const accentText = isEditorial ? "text-editorial-red" : "text-editorial-gold";
  const accentBorder = isEditorial ? "border-editorial-red" : "border-editorial-gold";
  const accentBg = isEditorial ? "bg-editorial-red" : "bg-editorial-gold";
  const accentBgSoft = isEditorial ? "bg-editorial-red/10" : "bg-editorial-gold/10";

  const [primaryGoal, setGoalState] = useState<PrimaryGoal | null>(initialPrimaryGoal);
  const [editing, setEditing] = useState(!initialPrimaryGoal);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("page_view", "mission");
  }, []);

  const selected = GOAL_OPTIONS.find((g) => g.value === primaryGoal);

  const handleSelect = (value: PrimaryGoal) => {
    setError(null);
    startTransition(async () => {
      const res = await setPrimaryGoal(value);
      if (res.error) {
        setError(res.error);
        return;
      }
      setGoalState(value);
      setEditing(false);
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <header className="mb-8 border-b-4 border-double border-rule-dark pb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Target size={16} className={accentText} />
          <span className={`font-sans text-[10px] font-bold uppercase tracking-[2px] ${accentText}`}>
            Your Mission
          </span>
          <Target size={16} className={accentText} />
        </div>
        <h1 className="font-serif text-[32px] font-black leading-none tracking-tight text-ink sm:text-[40px]">
          Mission Control
        </h1>
        <p className="mt-3 font-serif text-[14px] italic text-ink-muted">
          Your default ambition powers every AI recommendation, analysis, and content suggestion.
        </p>
      </header>

      {/* Primary Goal card */}
      <section className="mb-10">
        <div className="mb-3 flex items-center gap-3 border-b-2 border-ink pb-2">
          <div className={`flex h-8 w-8 items-center justify-center ${accentBgSoft} ${accentText}`}>
            <Target size={16} />
          </div>
          <h2 className="font-serif text-[20px] font-bold leading-tight text-ink">
            Primary Goal
          </h2>
        </div>

        {!editing && selected ? (
          <div
            className={`flex flex-col items-start justify-between gap-4 border-2 ${accentBorder} ${accentBgSoft} p-6 sm:flex-row sm:items-center`}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center ${accentBg} text-white`}>
                <selected.icon size={24} />
              </div>
              <div>
                <div className={`font-sans text-[10px] font-bold uppercase tracking-[2px] ${accentText}`}>
                  Current Mission
                </div>
                <div className="mt-1 font-serif text-[24px] font-black leading-tight text-ink">
                  {selected.label}
                </div>
                <p className="mt-1 font-sans text-[13px] leading-relaxed text-ink-secondary">
                  {selected.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex shrink-0 items-center gap-2 border border-rule bg-surface-card px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-ink hover:bg-surface-raised"
            >
              <Pencil size={12} />
              Change Mission
            </button>
          </div>
        ) : null}

        {!editing && selected ? (
          <div className="mt-4">
            <GoalEffectsPanel primaryGoal={selected.value} variant={isEditorial ? "editorial" : "modern"} />
          </div>
        ) : null}

        {editing ? (
          <div>
            <p className="mb-4 font-sans text-[13px] leading-relaxed text-ink-secondary">
              {initialPrimaryGoal
                ? "Pick a new default ambition. This updates how the AI prioritizes recommendations everywhere."
                : "Choose your default ambition. This guides the platform's AI, analytics, and recommendations."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {GOAL_OPTIONS.map((opt) => {
                const isSelected = primaryGoal === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSelect(opt.value)}
                    className={`group flex items-start gap-3 border p-4 text-left transition-colors disabled:opacity-60 ${
                      isSelected
                        ? `${accentBorder} ${accentBgSoft}`
                        : "border-rule bg-surface-card hover:bg-surface-raised"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center ${
                        isSelected ? `${accentBg} text-white` : `${accentBgSoft} ${accentText}`
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-sans text-[14px] font-bold text-ink">
                          {opt.label}
                        </h3>
                        {isSelected && <Check size={14} className={accentText} />}
                      </div>
                      <p className="mt-1 font-sans text-[12px] leading-relaxed text-ink-muted">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {error && (
              <p className="mt-3 font-sans text-[11px] text-editorial-red">{error}</p>
            )}
            {initialPrimaryGoal && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="mt-4 font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            )}
          </div>
        ) : null}
      </section>

      {/* Per-profile goals */}
      <section>
        <div className="mb-3 flex items-center gap-3 border-b-2 border-ink pb-2">
          <div className={`flex h-8 w-8 items-center justify-center ${accentBgSoft} ${accentText}`}>
            <Target size={16} />
          </div>
          <h2 className="font-serif text-[20px] font-bold leading-tight text-ink">
            Per-Profile Goals
          </h2>
        </div>

        {profiles.length === 0 ? (
          <div className="border border-rule bg-surface-card p-6">
            <p className="font-sans text-[13px] leading-relaxed text-ink-secondary">
              Connect a social profile to set detailed per-platform goals with specific targets,
              monetization channels, and posting commitments.
            </p>
            <Link
              href="/dashboard/profiles"
              className={`mt-4 inline-flex items-center gap-2 ${accentBg} px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:opacity-90`}
            >
              Connect Your First Profile
              <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 font-sans text-[13px] leading-relaxed text-ink-secondary">
              Fine-tune goals for each connected profile. Per-profile goals <strong>override</strong> your primary
              mission for that specific account &mdash; everywhere else still follows your primary goal above.
            </p>
            <GoalsClient profiles={profiles} />
          </>
        )}
      </section>
    </div>
  );
}
