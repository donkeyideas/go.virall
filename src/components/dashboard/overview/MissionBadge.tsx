"use client";

import Link from "next/link";
import { Target, TrendingUp, DollarSign, Award, Zap, ArrowRight } from "lucide-react";
import type { PrimaryGoal } from "@/types";

interface MissionBadgeProps {
  primaryGoal: PrimaryGoal | null;
  /** "editorial" styles match the newspaper theme; "modern" uses yellow accent. */
  variant: "editorial" | "modern";
}

const GOAL_META: Record<
  PrimaryGoal,
  { label: string; tagline: string; Icon: React.ComponentType<{ size?: number }> }
> = {
  grow_audience: {
    label: "Grow my audience",
    tagline: "AI tuned for reach, virality, and follower growth",
    Icon: TrendingUp,
  },
  make_money: {
    label: "Make money",
    tagline: "AI tuned for revenue, deals, and monetization",
    Icon: DollarSign,
  },
  build_brand: {
    label: "Build my brand",
    tagline: "AI tuned for authority, identity, and brand equity",
    Icon: Award,
  },
  drive_traffic: {
    label: "Drive traffic / conversions",
    tagline: "AI tuned for CTAs, funnels, and off-platform clicks",
    Icon: Zap,
  },
};

export function MissionBadge({ primaryGoal, variant }: MissionBadgeProps) {
  if (variant === "editorial") {
    if (!primaryGoal) {
      return (
        <Link
          href="/dashboard/mission"
          className="mb-4 flex items-center justify-between gap-3 border border-dashed border-editorial-red/50 bg-editorial-red/5 px-4 py-2.5 transition-colors hover:bg-editorial-red/10"
        >
          <div className="flex items-center gap-2">
            <Target size={14} className="text-editorial-red" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-[2px] text-editorial-red">
              Set Your Mission
            </span>
            <span className="font-sans text-[12px] text-ink-secondary">
              Choose a goal to personalize your dashboard
            </span>
          </div>
          <ArrowRight size={12} className="text-editorial-red" />
        </Link>
      );
    }
    const { label, tagline, Icon } = GOAL_META[primaryGoal];
    return (
      <Link
        href="/dashboard/mission"
        className="mb-4 flex items-center justify-between gap-3 border-l-4 border-editorial-red bg-editorial-red/5 px-4 py-2.5 transition-colors hover:bg-editorial-red/10"
      >
        <div className="flex items-center gap-3">
          <Icon size={16} />
          <div className="flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[2px] text-editorial-red">
                Your Mission
              </span>
              <span className="font-serif text-[15px] font-bold text-ink">{label}</span>
            </div>
            <span className="font-sans text-[11px] italic text-ink-muted">{tagline}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-editorial-red opacity-70">
          Details <ArrowRight size={10} />
        </div>
      </Link>
    );
  }

  // Modern variant
  if (!primaryGoal) {
    return (
      <Link
        href="/dashboard/mission"
        className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 transition-colors"
        style={{
          borderColor: "rgba(250, 204, 21, 0.5)",
          background: "rgba(250, 204, 21, 0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: "#facc15" }} />
          <span className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: "#facc15" }}>
            Set Your Mission
          </span>
          <span className="text-[12px]" style={{ color: "var(--color-ink-secondary)" }}>
            Choose a goal to personalize your dashboard
          </span>
        </div>
        <ArrowRight size={12} style={{ color: "#facc15" }} />
      </Link>
    );
  }
  const { label, tagline, Icon } = GOAL_META[primaryGoal];
  return (
    <Link
      href="/dashboard/mission"
      className="mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors"
      style={{
        borderColor: "rgba(250, 204, 21, 0.4)",
        background: "rgba(250, 204, 21, 0.08)",
      }}
    >
      <div className="flex items-center gap-3">
        <Icon size={16} />
        <div className="flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[2px]" style={{ color: "#facc15" }}>
              Your Mission
            </span>
            <span className="text-[15px] font-bold" style={{ color: "var(--color-ink)" }}>
              {label}
            </span>
          </div>
          <span className="text-[11px] italic" style={{ color: "var(--color-ink-muted)" }}>
            {tagline}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-70" style={{ color: "#facc15" }}>
        Details <ArrowRight size={10} />
      </div>
    </Link>
  );
}
