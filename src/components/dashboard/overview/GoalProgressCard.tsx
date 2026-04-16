"use client";

import Link from "next/link";
import { Target, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCompact } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/types";
import type { GoalProgress } from "@/lib/dal/goals";

interface GoalProgressCardProps {
  goalProgress: GoalProgress[];
  variant: "editorial" | "modern";
}

const OBJECTIVE_LABEL: Record<string, string> = {
  grow_followers: "Grow followers",
  increase_engagement: "Increase engagement",
  monetize: "Monetize",
  build_brand: "Build brand",
  drive_traffic: "Drive traffic",
};

function statusCopy(status: GoalProgress["status"]): {
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: "green" | "yellow" | "red" | "muted";
} {
  switch (status) {
    case "ahead":
      return { label: "Ahead of pace", Icon: TrendingUp, tone: "green" };
    case "behind":
      return { label: "Behind pace", Icon: TrendingDown, tone: "red" };
    case "on_track":
      return { label: "On track", Icon: TrendingUp, tone: "green" };
    default:
      return { label: "No target", Icon: Minus, tone: "muted" };
  }
}

export function GoalProgressCard({ goalProgress, variant }: GoalProgressCardProps) {
  if (goalProgress.length === 0) return null;
  const isEditorial = variant === "editorial";

  return (
    <section
      className={
        isEditorial
          ? "mb-6 border-2 border-ink bg-surface-card p-5"
          : "mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      }
      style={
        isEditorial
          ? undefined
          : { background: "rgba(255, 255, 255, 0.03)" }
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-ink pb-2">
        <div className="flex items-center gap-2">
          <Target
            size={16}
            className={isEditorial ? "text-editorial-red" : undefined}
            style={isEditorial ? undefined : { color: "#facc15" }}
          />
          <h2
            className={
              isEditorial
                ? "font-serif text-[18px] font-black uppercase tracking-tight text-ink"
                : "text-[15px] font-bold uppercase tracking-[2px] text-white"
            }
          >
            Goal Progress
          </h2>
        </div>
        <Link
          href="/dashboard/mission"
          className="flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          Manage <ArrowRight size={10} />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {goalProgress.map((g) => {
          const { label: statusLabel, Icon: StatusIcon, tone } = statusCopy(g.status);
          const barColor =
            tone === "green"
              ? "#15803d"
              : tone === "red"
                ? "#b91c1c"
                : tone === "yellow"
                  ? "#ca8a04"
                  : "#6b7280";
          const platformLabel =
            PLATFORM_CONFIG[g.platform as keyof typeof PLATFORM_CONFIG]?.label ??
            g.platform;
          const hasTarget = g.targetValue > 0;

          return (
            <div
              key={g.goalId}
              className={
                isEditorial
                  ? "border border-rule bg-surface-raised p-4"
                  : "rounded-xl border border-white/10 p-4"
              }
              style={isEditorial ? undefined : { background: "rgba(255, 255, 255, 0.02)" }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-sans text-[10px] font-bold uppercase tracking-[2px] text-ink-muted">
                    {platformLabel} · @{g.handle}
                  </div>
                  <div className="truncate font-serif text-[15px] font-bold text-ink">
                    {OBJECTIVE_LABEL[g.objective] || g.objective}
                  </div>
                </div>
                <div
                  className="flex shrink-0 items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: barColor }}
                >
                  <StatusIcon size={12} />
                  {statusLabel}
                </div>
              </div>

              {hasTarget ? (
                <>
                  <div className="mb-1 flex items-baseline justify-between font-sans text-[11px] text-ink-secondary">
                    <span>
                      <span className="font-bold text-ink">
                        {formatCompact(g.currentValue)}
                      </span>
                      {" / "}
                      {formatCompact(g.targetValue)}
                    </span>
                    <span className="font-bold" style={{ color: barColor }}>
                      {g.percent}%
                    </span>
                  </div>
                  <div
                    className={
                      isEditorial
                        ? "h-2 w-full border border-ink bg-surface-card"
                        : "h-2 w-full rounded-full bg-white/10"
                    }
                  >
                    <div
                      className={isEditorial ? "h-full" : "h-full rounded-full"}
                      style={{
                        width: `${Math.min(100, g.percent)}%`,
                        background: barColor,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between font-sans text-[10px] text-ink-muted">
                    <span>
                      Day {g.daysElapsed} of {g.targetDays}
                      {" · "}
                      {g.daysRemaining} left
                    </span>
                    {g.projectedValue != null && (
                      <span>
                        Projected: {formatCompact(g.projectedValue)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="font-sans text-[11px] text-ink-muted">
                  No numeric target set yet.{" "}
                  <Link
                    href="/dashboard/mission"
                    className="underline hover:text-ink"
                  >
                    Add one in Mission
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
