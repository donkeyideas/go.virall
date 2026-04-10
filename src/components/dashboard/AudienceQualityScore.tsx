"use client";

import { AlertTriangle, Loader2, RefreshCw, Shield, TrendingUp, Zap, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AudienceQualityScore as AQSType } from "@/types";

interface AudienceQualityScoreProps {
  score: AQSType | null;
  onRecalculate: () => void;
  loading: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "#22C55E";
  if (score >= 70) return "#3B82F6";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

// ── Circular Gauge Component ──

function CircularGauge({
  score,
  grade,
  size = 180,
}: {
  score: number;
  grade: string | null;
  size?: number;
}) {
  const color = getScoreColor(score);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="8"
          opacity="0.3"
        />
        {/* Score arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-serif text-3xl font-black"
          style={{ color }}
        >
          {grade || "--"}
        </span>
        <span className="mt-0.5 text-2xl font-bold text-ink">{score}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ── SubScore Bar ──

function SubScoreBar({
  label,
  score,
  icon: Icon,
}: {
  label: string;
  score: number;
  icon: React.ElementType;
}) {
  const color = getScoreColor(score);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className="text-ink-muted" />
          <span className="text-[11px] font-semibold text-ink">{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden bg-surface-raised">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${score}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

// ── Loading Skeleton ──

function AQSSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="h-[180px] w-[180px] rounded-full bg-surface-raised" />
        <div className="flex-1 space-y-4">
          <div className="h-4 w-48 bg-surface-raised" />
          <div className="h-2 w-full bg-surface-raised" />
          <div className="h-2 w-full bg-surface-raised" />
          <div className="h-2 w-full bg-surface-raised" />
          <div className="h-2 w-full bg-surface-raised" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-32 bg-surface-raised" />
        <div className="h-6 w-full bg-surface-raised" />
        <div className="h-6 w-full bg-surface-raised" />
      </div>
    </div>
  );
}

// ── Main Component ──

export function AudienceQualityScore({
  score,
  onRecalculate,
  loading,
}: AudienceQualityScoreProps) {
  // Loading state
  if (loading) {
    return (
      <div className="border border-rule bg-surface-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-editorial-red" />
          <div>
            <h3 className="font-serif text-base font-bold text-ink">
              Calculating Audience Quality Score
            </h3>
            <p className="text-[11px] text-ink-muted">
              Analyzing your audience data...
            </p>
          </div>
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden bg-surface-raised">
          <div
            className="h-full animate-pulse bg-editorial-red/60 transition-all"
            style={{ width: "60%" }}
          />
        </div>
        <AQSSkeleton />
      </div>
    );
  }

  // Empty state — no score yet
  if (!score) {
    return (
      <div className="border border-rule bg-surface-card px-6 py-12 text-center">
        <Shield size={32} className="mx-auto mb-3 text-ink-muted" />
        <h3 className="mb-1 font-serif text-lg font-bold text-ink">
          No Audience Quality Score
        </h3>
        <p className="mb-4 text-sm text-ink-secondary">
          Calculate your AQS to understand the health and authenticity of your audience.
        </p>
        <button
          onClick={onRecalculate}
          className="inline-flex items-center gap-2 bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/90"
        >
          <Zap size={14} />
          Calculate AQS
        </button>
      </div>
    );
  }

  const breakdown = (score.breakdown ?? {}) as Record<string, string>;
  const demographics = (score.audience_demographics ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-5">
      {/* Header + Recalculate */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">
            Audience Quality Score
          </h3>
          {score.calculated_at && (
            <p className="text-[10px] text-ink-muted">
              Calculated{" "}
              {new Date(score.calculated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <button
          onClick={onRecalculate}
          className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink"
        >
          <RefreshCw size={12} />
          Recalculate
        </button>
      </div>

      {/* Main Score Card */}
      <div className="border border-rule bg-surface-card p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {/* Circular Gauge */}
          <div className="shrink-0">
            <CircularGauge score={score.overall_score} grade={score.grade} />
          </div>

          {/* SubScore Bars */}
          <div className="flex-1 space-y-4 w-full">
            <SubScoreBar
              label="Engagement Quality"
              score={score.engagement_quality ?? 0}
              icon={BarChart3}
            />
            <SubScoreBar
              label="Follower Authenticity"
              score={score.follower_authenticity ?? 0}
              icon={Shield}
            />
            <SubScoreBar
              label="Growth Health"
              score={score.growth_health ?? 0}
              icon={TrendingUp}
            />
            <SubScoreBar
              label="Content Consistency"
              score={score.content_consistency ?? 0}
              icon={Zap}
            />
          </div>
        </div>
      </div>

      {/* Risk Flags */}
      {Array.isArray(score.risk_flags) && (score.risk_flags as string[]).length > 0 && (
        <div className="border border-rule bg-surface-card p-5">
          <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            <AlertTriangle size={13} className="text-[#F59E0B]" />
            Risk Flags
          </h4>
          <div className="flex flex-wrap gap-2">
            {(score.risk_flags as string[]).map((flag: string, i: number) => (
              <span
                key={i}
                className="flex items-center gap-1.5 border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3 py-1.5 text-xs font-medium text-[#F59E0B]"
              >
                <AlertTriangle size={11} />
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {breakdown.overall_summary && (
        <div className="border border-rule bg-surface-card p-5">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            Analysis Breakdown
          </h4>
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-ink">
              {breakdown.overall_summary}
            </p>

            {breakdown.engagement_analysis && (
              <div className="border-l-2 border-[#3B82F6]/40 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#3B82F6]">
                  Engagement
                </p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {breakdown.engagement_analysis}
                </p>
              </div>
            )}

            {breakdown.authenticity_analysis && (
              <div className="border-l-2 border-[#22C55E]/40 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#22C55E]">
                  Authenticity
                </p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {breakdown.authenticity_analysis}
                </p>
              </div>
            )}

            {breakdown.growth_analysis && (
              <div className="border-l-2 border-[#F59E0B]/40 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F59E0B]">
                  Growth
                </p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {breakdown.growth_analysis}
                </p>
              </div>
            )}

            {breakdown.consistency_analysis && (
              <div className="border-l-2 border-[#4B9CD3]/40 pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4B9CD3]">
                  Consistency
                </p>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {breakdown.consistency_analysis}
                </p>
              </div>
            )}

            {breakdown.top_recommendation && (
              <div className="mt-2 border border-rule bg-surface-raised p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-editorial-red">
                  Top Recommendation
                </p>
                <p className="mt-1 text-xs font-medium text-ink">
                  {breakdown.top_recommendation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Demographics Summary */}
      {typeof demographics.estimated_real_followers_pct === "number" && (
        <div className="border border-rule bg-surface-card p-5">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
            Audience Authenticity Estimate
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#22C55E]">
                {Number(demographics.estimated_real_followers_pct)}%
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Real Followers
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#EF4444]">
                {Number(demographics.estimated_bot_pct)}%
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Estimated Bots
              </p>
            </div>
            <div className="text-center">
              <p className={cn(
                "text-lg font-bold",
                String(demographics.engagement_tier).includes("Above")
                  ? "text-[#22C55E]"
                  : String(demographics.engagement_tier).includes("Below")
                    ? "text-[#EF4444]"
                    : "text-[#3B82F6]",
              )}>
                {String(demographics.engagement_tier || "N/A")}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Engagement Tier
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
