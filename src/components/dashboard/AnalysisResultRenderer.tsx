"use client";

import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { cn, formatCompact } from "@/lib/utils";
import { PLATFORM_ALGORITHMS } from "@/lib/ai/platform-algorithms";
import type { AnalysisType, SocialProfile, SocialPlatform } from "@/types";

interface AnalysisResultRendererProps {
  type: AnalysisType;
  data: Record<string, unknown>;
  profile?: SocialProfile | null;
}

export function AnalysisResultRenderer({ type, data, profile }: AnalysisResultRendererProps) {
  // If the data object is completely empty, show a generic empty state
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="border border-rule bg-surface-card px-6 py-12 text-center">
        <p className="font-serif text-sm font-bold text-ink">No data available</p>
        <p className="mt-2 text-xs text-ink-muted leading-relaxed">
          The analysis could not produce results for this profile. Try syncing the profile first, then re-run the analysis.
        </p>
      </div>
    );
  }

  switch (type) {
    case "growth":
      return <GrowthResult data={data} />;
    case "content_strategy":
      return <ContentStrategyResult data={data} />;
    case "hashtags":
      return <HashtagsResult data={data} />;
    case "competitors":
      return <CompetitorsResult data={data} profile={profile} />;
    case "insights":
      return <InsightsResult data={data} />;
    case "earnings_forecast":
      return <EarningsForecastResult data={data} />;
    case "thirty_day_plan":
      return <ThirtyDayPlanResult data={data} />;
    case "smo_score":
      return <SMOScoreResult data={data} />;
    case "audience":
      return <AudienceResult data={data} platform={profile?.platform} />;
    case "network":
      return <NetworkResult data={data} />;
    case "campaign_ideas":
      return <CampaignIdeasResult data={data} />;
    case "recommendations":
      return <RawResult data={data} />;
    default:
      return <RawResult data={data} />;
  }
}

/* ─── Shared helpers ─── */

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("border border-rule bg-surface-card p-4", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-serif text-sm font-bold text-ink mb-3">{children}</h3>;
}

function Badge({ label, variant = "default" }: { label: string; variant?: "high" | "medium" | "low" | "critical" | "important" | "default" }) {
  const colors: Record<string, string> = {
    high: "text-editorial-red border-rule bg-surface-raised",
    critical: "text-editorial-red border-rule bg-surface-raised",
    medium: "text-editorial-gold border-rule bg-surface-raised",
    important: "text-editorial-gold border-rule bg-surface-raised",
    low: "text-editorial-green border-rule bg-surface-raised",
    "nice-to-have": "text-editorial-green border-rule bg-surface-raised",
    default: "text-ink-muted border-rule bg-surface-raised",
  };
  return (
    <span className={cn("border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", colors[variant] || colors.default)}>
      {label}
    </span>
  );
}

/* ─── Growth Tips ─── */

function GrowthResult({ data }: { data: Record<string, unknown> }) {
  const tips = (data.tips ?? []) as Array<{
    title: string;
    description: string;
    priority: string;
    category: string;
    estimatedImpact?: string;
  }>;

  if (!tips.length) return <RawResult data={data} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tips.map((tip, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-sm font-bold text-ink">{tip.title}</h3>
            <Badge label={tip.priority} variant={tip.priority as "high" | "medium" | "low"} />
          </div>
          <p className="mt-2 text-xs text-ink-secondary leading-relaxed">{tip.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">{tip.category}</span>
            {tip.estimatedImpact && (
              <span className="text-[9px] text-editorial-green">+{tip.estimatedImpact}</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─── Content Strategy ─── */

function extractCalendarEntry(day: Record<string, unknown>): {
  dayName: string;
  theme: string;
  postIdea: string;
} {
  const dayName = String(
    day.day ?? day.dayOfWeek ?? day.name ?? "",
  );
  const theme = String(day.theme ?? day.contentType ?? day.type ?? "");
  const postIdea = String(
    day.postIdea ??
      day.idea ??
      day.content ??
      day.post ??
      day.description ??
      day.caption ??
      "",
  );
  return { dayName, theme, postIdea };
}

function extractTimeEntry(t: string | Record<string, unknown>): {
  day: string;
  times: string[];
} {
  // Handle plain string entries like "Monday: 9am, 12pm, 6pm"
  if (typeof t === "string") {
    const colonIdx = t.indexOf(":");
    if (colonIdx > 0) {
      const day = t.slice(0, colonIdx).trim();
      const times = t.slice(colonIdx + 1).split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      return { day, times };
    }
    return { day: t, times: [] };
  }

  const day = String(t.day ?? t.dayOfWeek ?? "");
  let times: string[] = [];
  const raw = t.time ?? t.times ?? t.bestTime ?? t.bestTimes ?? "";
  if (Array.isArray(raw)) {
    times = raw.map(String);
  } else {
    const str = String(raw);
    times = str.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }
  return { day, times };
}

const DAY_COLORS: Record<string, string> = {
  monday: "bg-surface-raised border-rule",
  tuesday: "bg-surface-raised border-rule",
  wednesday: "bg-surface-raised border-rule",
  thursday: "bg-surface-raised border-rule",
  friday: "bg-surface-raised border-rule",
  saturday: "bg-surface-raised border-rule",
  sunday: "bg-surface-raised border-rule",
};

const DAY_ACCENTS: Record<string, string> = {
  monday: "text-editorial-red",
  tuesday: "text-blue-400",
  wednesday: "text-editorial-green",
  thursday: "text-purple-400",
  friday: "text-editorial-gold",
  saturday: "text-pink-400",
  sunday: "text-cyan-400",
};

function ContentStrategyResult({ data }: { data: Record<string, unknown> }) {
  const strategy = (data.strategy ?? data) as Record<string, unknown>;
  const postingFrequency = strategy.postingFrequency as { headline: string; subtitle: string } | undefined;
  const contentMix = (strategy.contentMix ?? {}) as Record<string, number>;
  const contentPillars = (strategy.contentPillars ?? []) as Array<string | Record<string, unknown>>;
  const weeklyCalendar = (strategy.weeklyCalendar ?? []) as Array<Record<string, unknown>>;
  const bestTimes = (strategy.bestTimes ?? []) as Array<string | Record<string, unknown>>;
  const proTips = (strategy.proTips ?? []) as string[];

  const totalMix = Object.values(contentMix).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-4">
      {/* Posting Frequency */}
      {postingFrequency && (
        <Card>
          <SectionTitle>Posting Frequency</SectionTitle>
          <p className="font-serif text-lg font-bold text-ink">{postingFrequency.headline}</p>
          {postingFrequency.subtitle && (
            <p className="mt-1 text-xs text-ink-muted">{postingFrequency.subtitle}</p>
          )}
        </Card>
      )}

      {/* Content Mix — bar chart style */}
      {Object.keys(contentMix).length > 0 && (
        <Card>
          <SectionTitle>Content Mix</SectionTitle>
          <div className="space-y-3">
            {Object.entries(contentMix).map(([type, pct]) => (
              <div key={type}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-medium capitalize text-ink">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="font-serif text-sm font-bold text-ink">
                    {pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-surface-raised">
                  <div
                    className="h-full bg-editorial-red/80 transition-all"
                    style={{ width: `${(pct / totalMix) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Content Pillars */}
      {contentPillars.length > 0 && (
        <Card>
          <SectionTitle>Content Pillars</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {contentPillars.map((pillar, i) => {
              const name =
                typeof pillar === "string"
                  ? pillar
                  : (pillar as Record<string, unknown>).name as string ??
                    (pillar as Record<string, unknown>).title as string ??
                    JSON.stringify(pillar);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 border border-rule bg-surface-raised px-3 py-2"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[9px] font-bold text-editorial-red">
                    {i + 1}
                  </span>
                  <span className="text-xs text-ink">{name}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Weekly Calendar — visual grid */}
      {weeklyCalendar.length > 0 && (
        <Card>
          <SectionTitle>Weekly Content Calendar</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {weeklyCalendar.map((rawDay, i) => {
              const { dayName, theme, postIdea } =
                extractCalendarEntry(rawDay);
              const dayKey = dayName.toLowerCase();
              const borderColor =
                DAY_COLORS[dayKey] ?? "bg-surface-raised border-rule";
              const accent =
                DAY_ACCENTS[dayKey] ?? "text-ink-muted";
              return (
                <div
                  key={i}
                  className={cn(
                    "border p-3 transition-colors",
                    borderColor,
                  )}
                >
                  {/* Day header */}
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        accent,
                      )}
                    >
                      {dayName || `Day ${i + 1}`}
                    </span>
                  </div>
                  {/* Theme badge */}
                  {theme && (
                    <span className="mb-2 inline-block bg-surface-card px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-muted">
                      {theme}
                    </span>
                  )}
                  {/* Post idea */}
                  {postIdea && (
                    <p className="text-xs leading-relaxed text-ink-secondary">
                      {postIdea}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Best Times to Post — clean table */}
      {bestTimes.length > 0 && (
        <Card>
          <SectionTitle>Best Times to Post</SectionTitle>
          <div className="overflow-hidden border border-rule">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule bg-surface-raised">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Day
                  </th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Best Times
                  </th>
                </tr>
              </thead>
              <tbody>
                {bestTimes.map((raw, i) => {
                  const { day, times } = extractTimeEntry(raw);
                  return (
                    <tr
                      key={i}
                      className="border-b border-rule/50 last:border-0"
                    >
                      <td className="px-4 py-2.5 text-xs font-medium text-ink">
                        {day}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {times.map((time, j) => (
                            <span
                              key={j}
                              className="bg-surface-raised px-2 py-0.5 font-mono text-[11px] text-editorial-red"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pro Tips */}
      {proTips.length > 0 && (
        <Card>
          <SectionTitle>Pro Tips</SectionTitle>
          <ul className="space-y-2">
            {proTips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-xs text-ink-secondary leading-relaxed">
                <span className="mt-0.5 shrink-0 text-editorial-red">&bull;</span>
                <span>{typeof tip === "string" ? tip : JSON.stringify(tip)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ─── Hashtags ─── */

function HashtagsResult({ data }: { data: Record<string, unknown> }) {
  const hashtags = (data.hashtags ?? []) as Array<{
    tag: string;
    category: string;
    estimatedReach: string;
  }>;

  const [copied, setCopied] = useState(false);

  if (!hashtags.length) return <RawResult data={data} />;

  const grouped: Record<string, typeof hashtags> = {};
  for (const h of hashtags) {
    const cat = h.category || "general";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(h);
  }

  const allTagsText = hashtags.map((h) => h.tag).join(" ");

  function handleCopy() {
    navigator.clipboard.writeText(allTagsText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const reachColor: Record<string, string> = {
    high: "text-editorial-green",
    medium: "text-editorial-gold",
    low: "text-ink-muted",
  };

  return (
    <div className="space-y-6">
      {/* ─── Copy-Paste Block ─── */}
      <Card>
        <h4 className="font-serif text-sm font-bold text-ink">
          Copy-Paste Block
        </h4>
        <div className="mt-3 border border-rule bg-surface-raised px-4 py-3">
          <p className="font-mono text-xs leading-relaxed text-ink-secondary">
            {allTagsText}
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/80"
        >
          {copied ? "Copied!" : "Copy All"}
        </button>
      </Card>

      {/* ─── By Category ─── */}
      <SectionTitle>By Category</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(grouped).map(([category, tags]) => (
          <Card key={category}>
            <SectionTitle>{category}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {tags.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-surface-raised px-2.5 py-1 text-xs font-mono text-ink">
                  {h.tag}
                  <span className={cn("text-[9px]", reachColor[h.estimatedReach] || "text-ink-muted")}>
                    {h.estimatedReach}
                  </span>
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Competitors ─── */

function CompetitorsResult({ data, profile }: { data: Record<string, unknown>; profile?: SocialProfile | null }) {
  const analysis = (data.analysis ?? data) as Record<string, unknown>;
  const overview = analysis.overview as string;
  const strengths = (analysis.strengths ?? []) as string[];
  const weaknesses = (analysis.weaknesses ?? []) as string[];
  const opportunities = (analysis.opportunities ?? []) as string[];

  const competitorProfiles = (analysis.competitorProfiles ?? []) as Array<{
    handle: string;
    displayName: string;
    niche: string;
    followersCount: number;
    engagementRate: number;
  }>;

  const yourFollowers = profile?.followers_count ?? 0;
  const yourEngagement = profile?.engagement_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* ─── Benchmarking Header ─── */}
      {profile && (
        <div>
          <h3 className="font-serif text-base font-bold text-ink">Competitor Benchmarking</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            Compare @{profile.handle} against competitors on {profile.platform}
          </p>
        </div>
      )}

      {/* ─── Your Profile Row ─── */}
      {profile && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-editorial-green">
                You
              </span>
              <span className="font-mono text-sm font-bold text-ink">@{profile.handle}</span>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Followers</p>
                <p className="font-mono text-sm font-bold text-ink">{formatCompact(yourFollowers)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Engagement</p>
                <p className="font-mono text-sm font-bold text-ink">{yourEngagement ? `${yourEngagement}%` : "---"}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Competitor Rows ─── */}
      {competitorProfiles.length > 0 ? (
        <div className="space-y-2">
          {competitorProfiles.map((c, i) => {
            const delta = c.followersCount - yourFollowers;
            const deltaStr = delta >= 0
              ? `+${formatCompact(delta)}`
              : `-${formatCompact(Math.abs(delta))}`;
            return (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-mono text-sm font-bold text-ink">@{c.handle?.replace(/^@/, "")}</span>
                    {c.displayName && (
                      <span className="text-xs text-ink-muted">{c.displayName}</span>
                    )}
                    {c.niche && (
                      <span className="bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                        {c.niche}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Followers</p>
                      <p className="font-mono text-sm font-bold text-ink">{formatCompact(c.followersCount)}</p>
                      {yourFollowers > 0 && (
                        <p className={`font-mono text-[10px] ${delta >= 0 ? "text-editorial-red" : "text-editorial-green"}`}>
                          {deltaStr} vs you
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Engagement</p>
                      <p className="font-mono text-sm font-bold text-ink">{c.engagementRate}%</p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <p className="text-xs text-ink-muted">
            {(analysis.noCompetitorsNote as string) || "Add competitors to your profile to unlock head-to-head benchmarking."}
          </p>
        </Card>
      )}

      {/* ─── Overview ─── */}
      {overview && (
        <Card>
          <p className="text-sm text-ink-secondary leading-relaxed">{overview}</p>
        </Card>
      )}

      {/* ─── SWOT Analysis ─── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {strengths.length > 0 && (
          <Card>
            <SectionTitle>Strengths</SectionTitle>
            <ul className="space-y-1.5">
              {strengths.map((s, i) => (
                <li key={i} className="text-xs text-editorial-green flex gap-1.5">
                  <span className="shrink-0 mt-1">+</span>
                  <span className="text-ink-secondary">{typeof s === "string" ? s : JSON.stringify(s)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {weaknesses.length > 0 && (
          <Card>
            <SectionTitle>Weaknesses</SectionTitle>
            <ul className="space-y-1.5">
              {weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-editorial-red flex gap-1.5">
                  <span className="shrink-0 mt-1">-</span>
                  <span className="text-ink-secondary">{typeof w === "string" ? w : JSON.stringify(w)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {opportunities.length > 0 && (
          <Card>
            <SectionTitle>Opportunities</SectionTitle>
            <ul className="space-y-1.5">
              {opportunities.map((o, i) => (
                <li key={i} className="text-xs text-editorial-gold flex gap-1.5">
                  <span className="shrink-0 mt-1">*</span>
                  <span className="text-ink-secondary">{typeof o === "string" ? o : JSON.stringify(o)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── Insights ─── */

function InsightsResult({ data }: { data: Record<string, unknown> }) {
  const insights = (data.insights ?? []) as Array<{
    title: string;
    insight: string;
    actionItem: string;
    priority: string;
  }>;

  if (!insights.length) return <RawResult data={data} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {insights.map((item, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-sm font-bold text-ink">{item.title}</h3>
            <Badge label={item.priority} variant={item.priority as "critical" | "important" | "default"} />
          </div>
          <p className="mt-2 text-xs text-ink-secondary leading-relaxed">{item.insight}</p>
          <div className="mt-3 bg-surface-raised px-3 py-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Action: </span>
            <span className="text-xs text-ink">{item.actionItem}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ─── Earnings Forecast ─── */

function EarningsForecastResult({ data }: { data: Record<string, unknown> }) {
  const forecast = (data.forecast ?? data) as Record<string, unknown>;

  // New rich format
  const summaryStats = forecast.summaryStats as {
    estMonthly: number; estMonthlyLabel?: string;
    estAnnual?: number; estAnnualLabel?: string;
    topRevenueSource?: string; topRevenueSourcePct?: number;
    marketPosition?: string; marketPositionNote?: string;
    // Legacy fields (backward compat with old cached results)
    activeDeals?: number; activeDealsPipeline?: string;
    ytdRevenue?: number; ytdDealsCompleted?: number;
    pending?: number; pendingNote?: string;
  } | undefined;
  const scenarios = (forecast.scenarios ?? []) as Array<{
    scenario: string;
    monthlyEarnings: number;
    annualEarnings: number;
    breakdown: Record<string, number>;
    assumptions?: string[];
  }>;
  const revenueBySources = (forecast.revenueBySources ?? []) as Array<{
    source: string; percentage: number; monthlyAmount: number;
  }>;
  const recommendedRates = (forecast.recommendedRates ?? []) as Array<{
    contentType: string; rate: number;
  }>;
  const rateNote = forecast.rateNote as string | undefined;
  const rateComparison = forecast.rateComparison as string | undefined;
  const monetizationFactors = (forecast.monetizationFactors ?? []) as Array<{
    name: string; score: number; note: string;
  }>;
  const mediaKit = forecast.mediaKit as {
    displayName: string; handle: string; niche: string; bio: string;
    followers: number; engagement: string; avgReach: number; coreDemo: string;
  } | undefined;
  const optimisticRoadmap = (forecast.optimisticRoadmap ?? []) as string[];
  const currentEstimate = forecast.currentEstimate as number | undefined;
  const recommendations = (forecast.recommendations ?? []) as string[];

  const factorBarColor = (s: number) => {
    if (s >= 80) return "bg-editorial-green";
    if (s >= 60) return "bg-editorial-green/70";
    return "bg-editorial-gold";
  };

  // Determine optimistic scenario for roadmap header
  const optimisticScenario = scenarios.find(s => s.scenario.toLowerCase().includes("optimistic"));
  const optimisticMonthly = optimisticScenario?.monthlyEarnings;

  // Check if any meaningful section has data
  const hasMeaningfulData =
    summaryStats ||
    scenarios.length > 0 ||
    revenueBySources.length > 0 ||
    recommendedRates.length > 0 ||
    monetizationFactors.length > 0 ||
    currentEstimate !== undefined;

  if (!hasMeaningfulData) {
    return (
      <div className="space-y-4">
        <div className="border border-rule bg-surface-raised px-4 py-2.5">
          <p className="text-[10px] text-ink-secondary leading-relaxed">
            <span className="font-bold text-editorial-gold">Advisory:</span> All earnings projections are estimates based on industry benchmarks and AI analysis. Actual income depends on content quality, consistency, audience demographics, and market conditions.
          </p>
        </div>
        <div className="border border-rule bg-surface-card px-6 py-12 text-center">
          <p className="font-serif text-sm font-bold text-ink">No forecast data available</p>
          <p className="mt-2 text-xs text-ink-muted leading-relaxed">
            The earnings forecast could not generate results for this profile. This may happen if the profile has limited data or the platform is not yet supported for revenue projections. Try re-running the analysis after syncing the profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Advisory Banner ── */}
      <div className="border border-rule bg-surface-raised px-4 py-2.5">
        <p className="text-[10px] text-ink-secondary leading-relaxed">
          <span className="font-bold text-editorial-gold">Advisory:</span> All earnings projections are estimates based on industry benchmarks and AI analysis. Actual income depends on content quality, consistency, audience demographics, and market conditions.
        </p>
      </div>

      {/* ── Summary Stats Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3 border-editorial-green/30">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Est. Monthly</div>
          <div className="mt-1 font-serif text-2xl font-bold text-ink">${(summaryStats?.estMonthly ?? 0).toLocaleString()}</div>
          {summaryStats?.estMonthlyLabel && <div className="text-[9px] text-ink-muted">{summaryStats.estMonthlyLabel}</div>}
        </Card>
        <Card className="p-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Est. Annual</div>
          <div className="mt-1 font-serif text-2xl font-bold text-ink">${(summaryStats?.estAnnual ?? (summaryStats?.estMonthly ? summaryStats.estMonthly * 12 : 0)).toLocaleString()}</div>
          {summaryStats?.estAnnualLabel && <div className="text-[9px] text-ink-muted">{summaryStats.estAnnualLabel}</div>}
        </Card>
        <Card className="p-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Top Revenue Source</div>
          <div className="mt-1 font-serif text-lg font-bold text-editorial-green">{summaryStats?.topRevenueSource ?? revenueBySources[0]?.source ?? "—"}</div>
          {(summaryStats?.topRevenueSourcePct || revenueBySources[0]?.percentage) && (
            <div className="text-[9px] text-ink-muted">{summaryStats?.topRevenueSourcePct ?? revenueBySources[0]?.percentage}% of revenue</div>
          )}
        </Card>
        <Card className="p-3">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Market Position</div>
          <div className="mt-1 font-serif text-lg font-bold text-ink">{summaryStats?.marketPosition ?? "—"}</div>
          {summaryStats?.marketPositionNote && <div className="text-[9px] text-ink-muted">{summaryStats.marketPositionNote}</div>}
        </Card>
      </div>

      {/* ── Earnings Forecast (3 Scenarios) ── */}
      {scenarios.length > 0 && (
        <Card>
          <SectionTitle>Earnings Forecast</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {scenarios.map((s, i) => {
              const isRealistic = s.scenario.toLowerCase().includes("realistic") || s.scenario.toLowerCase().includes("moderate");
              return (
                <div
                  key={i}
                  className={cn(
                    "border p-4 text-center",
                    isRealistic
                      ? "border-rule-dark bg-surface-raised"
                      : "border-rule bg-surface-raised/30",
                  )}
                >
                  <div className={cn("text-[9px] font-semibold uppercase tracking-widest", isRealistic ? "text-editorial-green" : "text-ink-muted")}>
                    {s.scenario}
                  </div>
                  <div className="mt-2 font-serif text-3xl font-bold text-ink">
                    ${s.monthlyEarnings.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[10px] text-ink-muted">
                    per month &middot; ${s.annualEarnings.toLocaleString()}/yr
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Revenue by Source + Recommended Rates ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {revenueBySources.length > 0 && (
          <Card>
            <SectionTitle>Revenue by Source</SectionTitle>
            <div className="mt-2 space-y-2.5">
              {revenueBySources.map((src, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 shrink-0 bg-editorial-red" style={{ opacity: 1 - i * 0.15 }} />
                  <span className="flex-1 text-xs text-ink">{src.source}</span>
                  <span className="font-mono text-[10px] text-ink-muted">{src.percentage}%</span>
                  <span className="w-24 text-right font-mono text-xs font-bold text-ink">
                    ${src.monthlyAmount.toLocaleString()}/mo
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {recommendedRates.length > 0 && (
          <Card>
            <div className="flex items-start justify-between">
              <SectionTitle>Recommended Rates</SectionTitle>
              {rateComparison && (
                <span className={cn(
                  "px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                  rateComparison === "above" ? "bg-surface-raised text-editorial-green"
                    : rateComparison === "below" ? "bg-surface-raised text-editorial-red"
                    : "bg-surface-raised text-editorial-gold",
                )}>
                  {rateComparison} market avg
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1.5">
              {recommendedRates.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-ink">{r.contentType}</span>
                  <span className="font-mono text-xs font-bold text-ink">${r.rate.toLocaleString()}</span>
                </div>
              ))}
            </div>
            {rateNote && (
              <div className="mt-3 text-[9px] text-ink-muted italic">{rateNote}</div>
            )}
          </Card>
        )}
      </div>

      {/* ── Monetization Factors ── */}
      {monetizationFactors.length > 0 && (
        <Card>
          <SectionTitle>Monetization Factors</SectionTitle>
          <div className="mt-2 space-y-4">
            {monetizationFactors.map((f, i) => (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">{f.name}</span>
                  <span className="font-mono text-xs font-bold text-ink">{f.score}/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden bg-surface-raised">
                  <div
                    className={cn("h-full transition-all", factorBarColor(f.score))}
                    style={{ width: `${f.score}%` }}
                  />
                </div>
                {f.note && <p className="mt-0.5 text-[9px] text-ink-muted">{f.note}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Media Kit ── */}
      {mediaKit && (
        <Card>
          <SectionTitle>Media Kit</SectionTitle>
          <div className="mt-3">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-lg font-serif font-bold text-ink-muted">
                {(mediaKit.displayName || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-serif text-sm font-bold text-ink">{mediaKit.displayName}</div>
                <div className="text-[10px] text-ink-muted">@{mediaKit.handle} &middot; {mediaKit.niche}</div>
              </div>
            </div>
            {mediaKit.bio && (
              <p className="mt-2 text-xs text-ink-secondary leading-relaxed">{mediaKit.bio}</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Followers</div>
                <div className="font-mono text-sm font-bold text-ink">{mediaKit.followers.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Engagement</div>
                <div className="font-mono text-sm font-bold text-ink">{mediaKit.engagement}</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Avg Reach</div>
                <div className="font-mono text-sm font-bold text-ink">{mediaKit.avgReach.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Core Demo</div>
                <div className="font-mono text-sm font-bold text-ink">{mediaKit.coreDemo}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── How to Reach the Optimistic Scenario ── */}
      {optimisticRoadmap.length > 0 && (
        <Card className="border-editorial-gold/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-editorial-gold font-bold">&#9650;</span>
            <h3 className="font-serif text-sm font-bold text-ink">
              How to Reach the Optimistic Scenario
              {optimisticMonthly && ` ($${optimisticMonthly.toLocaleString()}/mo)`}
            </h3>
          </div>
          <ol className="space-y-2">
            {optimisticRoadmap.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-ink-secondary leading-relaxed">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-surface-raised text-[9px] font-bold text-editorial-green">
                  {i + 1}
                </span>
                <span>{typeof step === "string" ? step : JSON.stringify(step)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ── Legacy: Current Estimate (for old data) ── */}
      {currentEstimate !== undefined && !summaryStats && (
        <Card>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">Current Estimated Monthly Earnings</div>
            <div className="mt-1 font-serif text-3xl font-bold text-ink">${currentEstimate.toLocaleString()}</div>
          </div>
        </Card>
      )}

      {/* ── Legacy: Recommendations (for old data) ── */}
      {recommendations.length > 0 && optimisticRoadmap.length === 0 && (
        <Card>
          <SectionTitle>Recommendations</SectionTitle>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="text-xs text-ink-secondary flex gap-2">
                <span className="shrink-0 font-bold text-editorial-gold">{i + 1}.</span>
                {typeof r === "string" ? r : JSON.stringify(r)}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ─── 30-Day Plan ─── */

function ThirtyDayPlanResult({ data }: { data: Record<string, unknown> }) {
  const plan = (data.plan ?? data) as Record<string, unknown>;
  const weeks = (plan.weeks ?? []) as Array<{
    week: number;
    theme: string;
    days: Array<{ day: number; task: string; category: string; priority: string }>;
  }>;
  const expectedOutcome = plan.expectedOutcome as string;
  const weeklyMilestones = (plan.weeklyMilestones ?? []) as string[];

  const categoryColor: Record<string, string> = {
    content: "bg-surface-raised text-editorial-red border-rule",
    engagement: "bg-surface-raised text-editorial-gold border-rule",
    analytics: "bg-surface-raised text-blue-400 border-rule",
    growth: "bg-surface-raised text-editorial-green border-rule",
    monetization: "bg-surface-raised text-purple-400 border-rule",
  };

  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-4">
      {/* Header row: Expected Outcome + Milestones */}
      <div className="grid gap-4 lg:grid-cols-2">
        {expectedOutcome && (
          <Card>
            <SectionTitle>Expected Outcome</SectionTitle>
            <p className="text-sm leading-relaxed text-ink-secondary">{expectedOutcome}</p>
          </Card>
        )}

        {weeklyMilestones.length > 0 && (
          <Card>
            <SectionTitle>Weekly Milestones</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {weeklyMilestones.map((m, i) => (
                <div key={i} className="border border-rule bg-surface-raised p-2">
                  <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">Week {i + 1}</div>
                  <p className="mt-1 text-xs text-ink">{typeof m === "string" ? m : JSON.stringify(m)}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Categories:</span>
        {Object.entries(categoryColor).map(([cat, cls]) => (
          <span key={cat} className={cn("border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", cls)}>
            {cat}
          </span>
        ))}
      </div>

      {/* Calendar table — one section per week */}
      {weeks.map((week) => (
        <Card key={week.week} className="overflow-hidden p-0">
          {/* Week header */}
          <div className="border-b-2 border-ink bg-surface-raised px-4 py-2.5">
            <h3 className="font-serif text-sm font-bold text-ink">
              Week {week.week}{" "}
              <span className="font-sans text-[11px] font-normal text-ink-secondary">— {week.theme}</span>
            </h3>
          </div>

          {/* 7-column grid header */}
          <div className="grid grid-cols-7 border-b border-rule">
            {dayLabels.map((d) => (
              <div key={d} className="border-r border-rule px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-widest text-ink-muted last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {/* 7-column day cells */}
          <div className="grid grid-cols-7">
            {(week.days ?? []).map((day, i) => {
              const catKey = (day.category ?? "").toLowerCase();
              const cls = categoryColor[catKey] || "bg-surface-raised text-ink-muted border-rule";
              return (
                <div
                  key={i}
                  className="flex min-h-[100px] flex-col border-r border-b border-rule p-2 last:border-r-0 [&:nth-child(n+7)]:border-b-0"
                >
                  {/* Day number */}
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-ink">
                      {((week.week - 1) * 7) + day.day}
                    </span>
                    {day.priority && (
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        day.priority === "high" ? "bg-editorial-red" : day.priority === "medium" ? "bg-editorial-gold" : "bg-editorial-green",
                      )} />
                    )}
                  </div>

                  {/* Task */}
                  <p className="mb-auto text-[11px] leading-snug text-ink-secondary">
                    {day.task}
                  </p>

                  {/* Category badge */}
                  <span className={cn("mt-2 self-start border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider", cls)}>
                    {day.category}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Full table view below */}
      <Card className="overflow-hidden p-0">
        <div className="border-b-2 border-ink bg-surface-raised px-4 py-2.5">
          <h3 className="font-serif text-sm font-bold text-ink">Full 30-Day Schedule</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-rule text-[10px] font-semibold uppercase tracking-widest text-ink-secondary">
                <th className="px-4 py-2">Day</th>
                <th className="px-4 py-2">Week</th>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Priority</th>
              </tr>
            </thead>
            <tbody>
              {weeks.flatMap((week) =>
                (week.days ?? []).map((day) => {
                  const globalDay = ((week.week - 1) * 7) + day.day;
                  const catKey = (day.category ?? "").toLowerCase();
                  const cls = categoryColor[catKey] || "bg-surface-raised text-ink-muted border-rule";
                  return (
                    <tr key={`${week.week}-${day.day}`} className="border-b border-rule/50 hover:bg-surface-raised/50">
                      <td className="px-4 py-2 font-mono font-bold text-ink">{globalDay}</td>
                      <td className="px-4 py-2 text-ink-muted">W{week.week}</td>
                      <td className="px-4 py-2 text-ink-secondary">{day.task}</td>
                      <td className="px-4 py-2">
                        <span className={cn("border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", cls)}>
                          {day.category}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn(
                          "border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          day.priority === "high" ? "bg-surface-raised text-editorial-red border-rule"
                            : day.priority === "medium" ? "bg-surface-raised text-editorial-gold border-rule"
                            : "bg-surface-raised text-editorial-green border-rule",
                        )}>
                          {day.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── SMO Score ─── */

function SMOScoreResult({ data }: { data: Record<string, unknown> }) {
  const smo = (data.smo ?? data) as Record<string, unknown>;
  const overallScore = (smo.overallScore as number) ?? 0;
  const gradeLabel = (smo.gradeLabel ?? smo.grade ?? "") as string;
  const factors = (smo.factors ?? []) as Array<{
    factor: string;
    weight: number;
    score: number;
    maxScore: number;
    subtitle: string;
    details: string | string[];
    recommendation: string;
    improvement?: string;
  }>;
  const checklist = smo.checklist as { completed: number; total: number; items: Array<{ text: string; done: boolean }> } | undefined;
  const improvementPlan = (smo.improvementPlan ?? []) as Array<{
    week: number;
    title: string;
    priority: string;
    actions: string[];
  }>;

  const scoreColor = (s: number) => {
    if (s >= 80) return "bg-editorial-green";
    if (s >= 60) return "bg-editorial-gold";
    return "bg-editorial-red";
  };

  const scoreTextColor = (s: number) => {
    if (s >= 80) return "text-editorial-green";
    if (s >= 60) return "text-editorial-gold";
    return "text-editorial-red";
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "bg-editorial-green";
    if (p === "medium") return "bg-editorial-gold";
    return "bg-editorial-red";
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: Overall Score + Breakdown Bars ── */}
      <Card>
        <h3 className="font-serif text-base font-bold text-ink mb-1">
          Social Media Optimization Score
        </h3>
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          {/* Left: big score */}
          <div className="flex flex-col items-center justify-center">
            <span className="font-serif text-6xl font-bold text-ink">{overallScore}</span>
            <span className="text-[10px] uppercase tracking-wider text-ink-muted mt-1">out of 100</span>
            {gradeLabel && (
              <span className={cn(
                "mt-2 px-3 py-1 text-[9px] font-bold uppercase tracking-wider",
                overallScore >= 80 ? "bg-surface-raised text-editorial-green" :
                overallScore >= 60 ? "bg-surface-raised text-editorial-gold" :
                "bg-surface-raised text-editorial-red",
              )}>
                {gradeLabel}
              </span>
            )}
          </div>
          {/* Right: breakdown bars */}
          <div className="space-y-2">
            {factors.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex w-[180px] shrink-0 items-baseline gap-1.5">
                  <span className="text-[11px] font-medium text-ink">{f.factor}</span>
                  {f.weight && (
                    <span className="text-[9px] text-ink-muted">({f.weight}%)</span>
                  )}
                </div>
                <div className="h-2 flex-1 overflow-hidden bg-surface-raised">
                  <div
                    className={cn("h-full transition-all", scoreColor(f.score))}
                    style={{ width: `${f.score}%` }}
                  />
                </div>
                <span className={cn("w-8 text-right font-mono text-xs font-bold", scoreTextColor(f.score))}>
                  {f.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Section 2: Factor Breakdown ── */}
      {factors.length > 0 && (
        <div>
          <h3 className="font-serif text-sm font-bold text-ink mb-3">Factor Breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {factors.map((f, i) => {
              const details = Array.isArray(f.details) ? f.details : (f.details ? [f.details] : []);
              const rec = f.recommendation ?? f.improvement ?? "";
              return (
                <Card key={i}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h4 className="font-serif text-sm font-bold text-ink">{f.factor}</h4>
                      {f.subtitle && (
                        <p className="text-[10px] text-ink-muted italic">{f.subtitle}</p>
                      )}
                    </div>
                    <span className={cn("font-mono text-sm font-bold", scoreTextColor(f.score))}>
                      {f.score}/{f.maxScore}
                    </span>
                  </div>
                  {details.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {details.map((d, j) => (
                        <li key={j} className="flex gap-1.5 text-[10px] leading-relaxed text-ink-secondary">
                          <span className="mt-1 shrink-0 text-ink-muted">&bull;</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {rec && (
                    <div className="mt-3">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-editorial-red mb-1">
                        Recommendation
                      </div>
                      <p className="text-[10px] leading-relaxed text-ink-secondary">{rec}</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile Optimization Checklist removed — data was AI-generated, not verified */}

      {/* Competitor comparison section removed — data was AI-fabricated, not from real tracked competitors */}

      {/* ── Section 5: 30-Day SMO Improvement Plan ── */}
      {improvementPlan.length > 0 && (
        <div>
          <h3 className="font-serif text-sm font-bold text-ink mb-3">30-Day SMO Improvement Plan</h3>
          <Card>
            <div className="space-y-5">
              {improvementPlan.map((week, i) => (
                <div key={i} className="flex gap-3">
                  {/* Priority dot */}
                  <div className="flex flex-col items-center pt-1">
                    <div className={cn("h-3 w-3 rounded-full", priorityColor(week.priority))} />
                    {i < improvementPlan.length - 1 && (
                      <div className="mt-1 h-full w-px bg-rule" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted mb-0.5">
                      Week {week.week}
                    </div>
                    <h4 className="font-serif text-sm font-bold text-ink mb-1.5">{week.title}</h4>
                    <ul className="space-y-1">
                      {week.actions.map((action, j) => (
                        <li key={j} className="flex gap-1.5 text-[10px] text-ink-secondary">
                          <span className="text-ink-muted">&rarr;</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ─── Audience ─── */

function AudienceResult({ data, platform }: { data: Record<string, unknown>; platform?: string }) {
  const audience = (data.audience ?? data) as Record<string, unknown>;

  // New data shape
  const qualityScore = audience.qualityScore as {
    overall: number;
    categoryNote?: string;
    factors: Array<{ name: string; score: number }>;
  } | undefined;
  // Legacy fallback
  const legacyQuality = audience.audienceQuality as { score: number; explanation: string } | undefined;

  const ageDistribution = (audience.ageDistribution ?? []) as Array<{ range: string; percentage: number }>;
  const genderDist = (audience.genderDistribution ?? {}) as Record<string, number>;
  const topCountries = (audience.topCountries ?? []) as Array<{ rank?: number; name?: string; country?: string; percentage: number }>;
  const topCities = (audience.topCities ?? []) as Array<{ rank?: number; name?: string; percentage: number }>;
  const interests = (audience.interests ?? []) as Array<string | { name: string; percentage: number }>;
  const heatmap = audience.activityHeatmap as {
    data: Array<{ day: string; hours: number[] }>;
    peakTimes: string[];
  } | undefined;
  const growthQuality = audience.growthQuality as {
    organic: number;
    paid: number;
    unfollowRate: number;
    unfollowNote?: string;
    chartData?: Array<{ date: string; organic: number; paid: number }>;
  } | undefined;

  const [selectedCell, setSelectedCell] = useState<{
    dayIdx: number;
    hourIdx: number;
    day: string;
    value: number;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const heatmapRef = useRef<HTMLDivElement>(null);

  const formatHour = (h: number) => {
    if (h === 0) return "12:00 AM";
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return "12:00 PM";
    return `${h - 12}:00 PM`;
  };

  const activityLabel = (v: number) => {
    if (v > 70) return "Peak Activity";
    if (v > 50) return "High Activity";
    if (v > 30) return "Moderate";
    return "Low Activity";
  };

  const activityColor = (v: number) => {
    if (v > 60) return "var(--color-editorial-red, #c0392b)";
    if (v > 30) return "var(--color-editorial-gold, #b8860b)";
    return "var(--color-ink-muted, #999)";
  };

  const engBoost = (v: number) => {
    if (v > 60) return `+${Math.round((v / 100 - 0.3) * 40)}%`;
    if (v > 30) return `+${Math.round((v / 100 - 0.1) * 20)}%`;
    return "Low";
  };

  const bestFormat = (di: number, h: number) => {
    const defaultFormats = ["Reels", "Carousels", "Stories", "Single Posts", "Live"];
    const formats = platform
      ? PLATFORM_ALGORITHMS[platform as SocialPlatform]?.contentFormats ?? defaultFormats
      : defaultFormats;
    return formats[((di * 137 + (h + 7) * 311 + 42) % 100) % formats.length];
  };

  const handleCellClick = useCallback((e: React.MouseEvent<HTMLDivElement>, dayIdx: number, hourIdx: number, day: string, value: number) => {
    e.stopPropagation();
    if (selectedCell?.dayIdx === dayIdx && selectedCell?.hourIdx === hourIdx) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell({ dayIdx, hourIdx, day, value });
    // Position tooltip near cell
    const grid = heatmapRef.current?.querySelector("[data-heatmap-grid]") as HTMLElement;
    if (grid) {
      const gridRect = grid.getBoundingClientRect();
      const cellRect = e.currentTarget.getBoundingClientRect();
      let left = cellRect.left - gridRect.left + cellRect.width + 8;
      let top = cellRect.top - gridRect.top - 20;
      if (left + 240 > gridRect.width) left = cellRect.left - gridRect.left - 240;
      if (top < 0) top = 0;
      setTooltipPos({ left, top });
    }
  }, [selectedCell]);

  // Close tooltip on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-heatmap-cell]") && !target.closest("[data-heatmap-tooltip]")) {
        setSelectedCell(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const scoreColor = (s: number) => {
    if (s >= 80) return "bg-editorial-green";
    if (s >= 60) return "bg-editorial-gold";
    return "bg-editorial-red";
  };

  const scoreTextColor = (s: number) => {
    if (s >= 80) return "text-editorial-green";
    if (s >= 60) return "text-editorial-gold";
    return "text-editorial-red";
  };

  const overallQualityScore = qualityScore?.overall ?? legacyQuality?.score ?? 0;
  const qualityFactors = qualityScore?.factors ?? [];

  // Gender bar colors
  const genderColors: Record<string, string> = {
    female: "bg-editorial-red",
    male: "bg-blue-500",
    other: "bg-ink-muted",
  };

  return (
    <div className="space-y-4">
      {/* ── AI Estimation Disclaimer ── */}
      <div className="border border-rule bg-surface-raised px-4 py-2.5 text-[10px] text-ink-muted">
        <span className="font-bold uppercase tracking-wider text-ink-secondary">AI-Estimated </span>
        Demographics, interests, and activity data are estimated by AI based on this creator&apos;s niche, content, and platform norms — not sourced from platform analytics.
      </div>

      {/* ── Section 1: Audience Quality Score ── */}
      {(overallQualityScore > 0 || qualityFactors.length > 0) && (
        <Card>
          <SectionTitle>Audience Quality Score</SectionTitle>
          <div className="mt-3 grid gap-6 md:grid-cols-[180px_1fr]">
            <div className="flex flex-col items-center justify-center">
              <span className="font-serif text-5xl font-bold text-ink">{overallQualityScore}</span>
              <span className="text-[10px] uppercase tracking-wider text-ink-muted mt-1">out of 100</span>
              {qualityScore?.categoryNote && (
                <span className="mt-1 text-[10px] text-ink-muted text-center">{qualityScore.categoryNote}</span>
              )}
            </div>
            {qualityFactors.length > 0 && (
              <div className="space-y-2.5">
                {qualityFactors.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-[140px] shrink-0 text-[11px] font-medium text-ink">{f.name}</span>
                    <div className="h-2.5 flex-1 overflow-hidden bg-surface-raised">
                      <div
                        className={cn("h-full transition-all", scoreColor(f.score))}
                        style={{ width: `${f.score}%` }}
                      />
                    </div>
                    <span className={cn("w-8 text-right font-mono text-xs font-bold", scoreTextColor(f.score))}>
                      {f.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Section 2: Age + Gender ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {ageDistribution.length > 0 && (
          <Card>
            <SectionTitle>Age Distribution</SectionTitle>
            <div className="mt-2 space-y-2.5">
              {ageDistribution.map((a, i) => {
                const maxPct = Math.max(...ageDistribution.map(d => d.percentage));
                const isTop = a.percentage === maxPct;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className={cn("w-10 shrink-0 text-xs font-medium", isTop ? "text-editorial-red font-bold" : "text-ink-secondary")}>
                      {a.range}
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden bg-surface-raised">
                      <div
                        className={cn("h-full", isTop ? "bg-editorial-red" : "bg-editorial-red/60")}
                        style={{ width: `${(a.percentage / maxPct) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-xs font-bold text-ink">{a.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {Object.keys(genderDist).length > 0 && (
          <Card>
            <SectionTitle>Gender Split</SectionTitle>
            {/* Stacked bar */}
            <div className="mt-3 flex h-5 w-full overflow-hidden">
              {Object.entries(genderDist).map(([gender, pct]) => (
                <div
                  key={gender}
                  className={cn("flex items-center justify-center text-[9px] font-bold text-white", genderColors[gender] ?? "bg-ink-muted")}
                  style={{ width: `${pct}%` }}
                >
                  {pct >= 15 && `${pct}%`}
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-3">
              {Object.entries(genderDist).map(([gender, pct]) => (
                <div key={gender} className="flex items-center gap-1.5">
                  <div className={cn("h-2.5 w-2.5", genderColors[gender] ?? "bg-ink-muted")} />
                  <span className="text-[10px] text-ink-secondary capitalize">{gender} {pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Section 3: Top Countries + Top Cities ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {topCountries.length > 0 && (
          <Card>
            <SectionTitle>Top Countries</SectionTitle>
            <div className="mt-2 space-y-1.5">
              {topCountries.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-4 shrink-0 font-mono text-ink-muted">{c.rank ?? i + 1}</span>
                  <span className="flex-1 font-medium text-ink">{c.name ?? c.country ?? ""}</span>
                  <span className="font-mono font-bold text-ink">{c.percentage}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {topCities.length > 0 && (
          <Card>
            <SectionTitle>Top Cities</SectionTitle>
            <div className="mt-2 space-y-1.5">
              {topCities.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-4 shrink-0 font-mono text-ink-muted">{c.rank ?? i + 1}</span>
                  <span className="flex-1 font-medium text-ink">{c.name ?? ""}</span>
                  <span className="font-mono font-bold text-editorial-red">{c.percentage}%</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Section 4: Audience Interests & Affinities ── */}
      {interests.length > 0 && (
        <Card>
          <SectionTitle>Audience Interests & Affinities</SectionTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {interests.map((interest, i) => {
              const name = typeof interest === "string" ? interest : interest.name;
              const pct = typeof interest === "object" ? interest.percentage : null;
              const isTop = i < 2;
              return (
                <span
                  key={i}
                  className={cn(
                    "border px-3 py-1 text-xs font-medium",
                    isTop
                      ? "border-editorial-red text-editorial-red"
                      : "border-rule text-ink-secondary",
                  )}
                >
                  {name}{pct != null && ` ${pct}%`}
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Section 5: Follower Activity Heatmap (Interactive) ── */}
      {heatmap && heatmap.data && heatmap.data.length > 0 && (
        <Card>
          <SectionTitle>Follower Activity Heatmap</SectionTitle>
          <p className="text-[10px] text-ink-muted mb-3">When your audience is most active (darker = more active)</p>
          <div ref={heatmapRef} className="relative">
            <div
              data-heatmap-grid
              className="grid"
              style={{ gridTemplateColumns: "40px repeat(24, 1fr)", gap: "2px", fontSize: "9px" }}
            >
              {/* Top-left empty cell */}
              <div />
              {/* Hour labels */}
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="text-center font-mono text-[8px] text-ink-muted">
                  {i % 3 === 0 ? (i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`) : ""}
                </div>
              ))}
              {/* Day rows */}
              {heatmap.data.map((row, ri) => {
                const hours = row.hours ?? [];
                return (
                  <Fragment key={ri}>
                    {/* Day label */}
                    <div className="flex items-center font-mono text-[9px] font-semibold uppercase text-ink-muted">
                      {row.day}
                    </div>
                    {/* Hour cells */}
                    {hours.map((val, ci) => {
                      const nv = val / 100;
                      const r = Math.round(255 * nv);
                      const g = Math.round(184 * nv);
                      const b = Math.round(77 * nv);
                      const isSelected = selectedCell?.dayIdx === ri && selectedCell?.hourIdx === ci;
                      return (
                        <div
                          key={ci}
                          data-heatmap-cell
                          className="cursor-pointer"
                          style={{
                            aspectRatio: "1",
                            minHeight: "12px",
                            backgroundColor: `rgba(${r},${g},${b},${0.15 + nv * 0.85})`,
                            transition: "transform 0.15s, box-shadow 0.15s",
                            transform: isSelected ? "scale(1.3)" : undefined,
                            zIndex: isSelected ? 2 : undefined,
                            boxShadow: isSelected
                              ? "0 0 0 2px var(--color-surface-cream, #f5f2ed), 0 0 0 3px var(--color-editorial-red, #c0392b)"
                              : undefined,
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = "scale(1.3)";
                              e.currentTarget.style.zIndex = "2";
                              e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-surface-cream, #f5f2ed), 0 0 0 3px var(--color-editorial-red, #c0392b)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = "";
                              e.currentTarget.style.zIndex = "";
                              e.currentTarget.style.boxShadow = "";
                            }
                          }}
                          onClick={(e) => handleCellClick(e, ri, ci, row.day, val)}
                        />
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
            {/* Rich Tooltip */}
            {selectedCell && (
              <div
                data-heatmap-tooltip
                className="absolute z-[100] border border-rule bg-surface-card shadow-lg"
                style={{
                  left: tooltipPos.left,
                  top: tooltipPos.top,
                  padding: "12px 16px",
                  minWidth: "220px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                }}
              >
                <div className="font-serif text-sm font-bold text-ink mb-2">
                  {selectedCell.day} {formatHour(selectedCell.hourIdx)}
                </div>
                {/* Activity Level */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Activity Level</span>
                  <span className="font-mono text-xs font-bold" style={{ color: activityColor(selectedCell.value) }}>
                    {selectedCell.value}% — {activityLabel(selectedCell.value)}
                  </span>
                </div>
                {/* Activity bar */}
                <div className="mt-1 h-1 w-full overflow-hidden bg-surface-raised">
                  <div
                    className="h-full"
                    style={{
                      width: `${selectedCell.value}%`,
                      backgroundColor: activityColor(selectedCell.value),
                    }}
                  />
                </div>
                <div className="mt-2" />
                {/* Eng. Boost */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Eng. Boost</span>
                  <span className="font-mono text-xs font-bold text-editorial-green">
                    {engBoost(selectedCell.value)}
                  </span>
                </div>
                {/* Best Format */}
                <div className="flex items-center justify-between py-0.5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Best Format</span>
                  <span className="font-mono text-xs font-bold text-ink">
                    {bestFormat(selectedCell.dayIdx, selectedCell.hourIdx)}
                  </span>
                </div>
                {/* Recommended posting time banner */}
                {selectedCell.value > 60 && (
                  <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-editorial-gold">
                    Recommended posting time
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Peak times */}
          {heatmap.peakTimes && heatmap.peakTimes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-ink-muted">Peak times:</span>
              {heatmap.peakTimes.map((t, i) => (
                <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-editorial-red">{t}</span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Section 6: Audience Growth Quality ── */}
      {growthQuality && (
        <Card>
          <SectionTitle>Audience Growth Quality</SectionTitle>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="border border-rule bg-surface-raised/50 p-3 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Organic</div>
              <div className="mt-1 font-serif text-2xl font-bold text-editorial-green">{growthQuality.organic}%</div>
            </div>
            <div className="border border-rule bg-surface-raised/50 p-3 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Paid / Referred</div>
              <div className="mt-1 font-serif text-2xl font-bold text-ink">{growthQuality.paid}%</div>
            </div>
            <div className="border border-rule bg-surface-raised/50 p-3 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Unfollow Rate</div>
              <div className="mt-1 font-serif text-2xl font-bold text-ink">{growthQuality.unfollowRate}%</div>
              {growthQuality.unfollowNote && (
                <div className="text-[9px] text-editorial-green">{growthQuality.unfollowNote}</div>
              )}
            </div>
          </div>

          {/* Growth Chart — Organic vs Paid */}
          {growthQuality.chartData && growthQuality.chartData.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-4 bg-editorial-green" />
                  <span className="text-[10px] font-medium text-ink-secondary">Organic Growth</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-0.5 w-4 border border-dashed border-blue-500 bg-transparent" />
                  <span className="text-[10px] font-medium text-ink-secondary">Paid / Referred</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={growthQuality.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="organicGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4ade80" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.08)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#6B5D8E" }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(139,92,246,0.15)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#6B5D8E" }}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#2A1B54",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#F0ECF8",
                    }}
                    labelStyle={{ color: "#F0ECF8", fontWeight: "bold", marginBottom: "4px" }}
                    itemStyle={{ padding: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="organic"
                    name="Organic"
                    stroke="#4ade80"
                    strokeWidth={2}
                    fill="url(#organicGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="paid"
                    name="Paid"
                    stroke="#5b9cf5"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ─── Network ─── */

function formatDollars(n: number): string {
  return `$${n.toLocaleString()}`;
}

function NetworkResult({ data }: { data: Record<string, unknown> }) {
  const network = (data.network ?? data) as Record<string, unknown>;

  /* ── Parse influence score ── */
  const scoreObj = network.influenceScore as Record<string, unknown> | number | undefined;
  const isNewFormat = typeof scoreObj === "object" && scoreObj !== null;
  const overallScore = isNewFormat
    ? (scoreObj as Record<string, unknown>).overall as number
    : typeof scoreObj === "number" ? scoreObj : undefined;
  const scoreBreakdown = isNewFormat ? scoreObj as Record<string, unknown> : null;

  /* ── Brand categories ── */
  const brandCategories = (network.brandCategories ?? []) as Array<{
    category: string;
    matchPercentage: number;
    why: string;
    estimatedRateRange: string;
    platform: string;
  }>;

  /* ── Collaboration strategy ── */
  const collaborationStrategy = (network.collaborationStrategy ?? []) as Array<{
    type: string;
    description: string;
    idealPartnerProfile: string;
  }>;

  /* ── Industry benchmarks ── */
  const industryBenchmarks = (network.industryBenchmarks ?? []) as Array<{
    metric: string;
    yourValue: number;
    average: number;
    unit: string;
    delta: number;
  }>;

  const networkingTips = (network.networkingTips ?? []) as string[];

  /* ── Backward compat: old format data ── */
  const oldCollabOpps = (network.collaborationOpportunities ?? []) as Array<{
    type: string; description: string; expectedBenefit: string; difficulty: string;
  }>;
  const oldIdealCollabs = (network.idealCollaborators ?? []) as Array<{
    niche: string; followerRange: string; why: string;
  }>;

  const scoreColor = (s: number) =>
    s >= 80 ? "text-editorial-green" : s >= 60 ? "text-editorial-gold" : "text-editorial-red";

  return (
    <div className="space-y-8">

      {/* ════════════════════════════════════════════
          YOUR INFLUENCE SCORE
          ════════════════════════════════════════════ */}
      {overallScore !== undefined && (
        <Card className="p-6">
          <h3 className="font-serif text-base font-bold text-ink">Your Influence Score</h3>

          <div className="mt-5 flex flex-col gap-8 sm:flex-row sm:items-start">
            {/* Left — big number */}
            <div className="flex flex-col items-center sm:w-52 sm:shrink-0">
              <p className={`font-serif text-7xl font-bold leading-none ${scoreColor(overallScore)}`}>
                {overallScore}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                out of 100
              </p>
              {typeof scoreBreakdown?.percentile === "number" && (
                <p className="mt-3 text-xs text-ink-secondary">
                  Top{" "}
                  <span className={`font-bold ${scoreColor(overallScore)}`}>
                    {scoreBreakdown.percentile}%
                  </span>{" "}
                  in {String(scoreBreakdown.category || "their")} category
                </p>
              )}
              {typeof scoreBreakdown?.tier === "string" && (
                <span className="mt-2 inline-block bg-surface-raised px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-editorial-green">
                  {scoreBreakdown.tier}
                </span>
              )}
            </div>

            {/* Right — breakdown bars */}
            {scoreBreakdown && (
              <div className="flex-1 space-y-3">
                {([
                  ["Content Quality", "contentQuality"],
                  ["Audience Trust", "audienceTrust"],
                  ["Brand Safety", "brandSafety"],
                  ["Consistency", "consistency"],
                  ["Growth Velocity", "growthVelocity"],
                ] as const).map(([label, key]) => {
                  const val = (scoreBreakdown[key] as number) ?? 0;
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink">{label}</span>
                        <span className="font-mono text-xs font-bold text-ink">{val}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden bg-surface-raised">
                        <div
                          className="h-full bg-editorial-green transition-all"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          BRAND CATEGORIES
          ════════════════════════════════════════════ */}
      {brandCategories.length > 0 && (
        <div>
          <SectionTitle>Brand Categories That Fit Your Niche</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {brandCategories.map((b, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-serif text-sm font-bold text-ink">{b.category}</h4>
                  <span className="shrink-0 font-mono text-xs font-bold text-editorial-green">{b.matchPercentage}%</span>
                </div>
                <p className="mt-1.5 text-[10px] text-ink-secondary leading-relaxed">{b.why}</p>
                <div className="mt-3 flex items-center justify-between border-t border-rule pt-2">
                  <span className="text-[9px] text-ink-muted">{b.platform}</span>
                  <span className="font-mono text-[10px] font-semibold text-ink">{b.estimatedRateRange}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          COLLABORATION STRATEGY
          ════════════════════════════════════════════ */}
      {collaborationStrategy.length > 0 && (
        <div>
          <SectionTitle>Collaboration Strategy</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {collaborationStrategy.map((c, i) => (
              <Card key={i}>
                <h4 className="font-serif text-sm font-bold text-ink">{c.type}</h4>
                <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">{c.description}</p>
                <div className="mt-3 bg-surface-raised px-3 py-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Ideal Partner: </span>
                  <span className="text-[10px] text-ink">{c.idealPartnerProfile}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Old format backward compat */}
      {collaborationStrategy.length === 0 && oldIdealCollabs.length > 0 && (
        <Card>
          <SectionTitle>Ideal Collaborators</SectionTitle>
          <div className="space-y-2">
            {oldIdealCollabs.map((c, i) => (
              <div key={i} className="border-b border-rule/50 pb-2 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink">{c.niche}</span>
                  <span className="text-[10px] text-ink-muted">({c.followerRange})</span>
                </div>
                <p className="mt-0.5 text-[10px] text-ink-secondary">{c.why}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          INDUSTRY BENCHMARKS
          ════════════════════════════════════════════ */}
      {industryBenchmarks.length > 0 && (
        <Card className="p-6">
          <h3 className="font-serif text-base font-bold text-ink">Industry Benchmarks</h3>
          <p className="mt-0.5 text-[10px] text-ink-muted">
            Your stats vs.{" "}
            {typeof scoreBreakdown?.category === "string"
              ? `${scoreBreakdown.category} category average`
              : "category average"}
          </p>

          <div className="mt-5 space-y-5">
            {industryBenchmarks.map((b, i) => {
              const maxVal = Math.max(b.yourValue, b.average) * 1.3 || 1;
              const yourPct = Math.min((b.yourValue / maxVal) * 100, 100);
              const isPositive = b.delta >= 0;
              const fmtVal = (v: number) =>
                b.unit === "$"
                  ? `$${v.toLocaleString()}`
                  : b.unit === "%"
                    ? `${v}%`
                    : `+${v}%`;
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink">{b.metric}</span>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold ${
                        isPositive
                          ? "bg-surface-raised text-editorial-green"
                          : "bg-surface-raised text-editorial-red"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {b.delta}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden bg-surface-raised">
                    <div
                      className="h-full bg-editorial-green transition-all"
                      style={{ width: `${yourPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-ink-muted">
                    <span className="font-mono font-bold text-ink">{fmtVal(b.yourValue)}</span>
                    {" "}vs{" "}
                    {b.unit === "$"
                      ? `$${b.average.toLocaleString()}`
                      : `${b.average}${b.unit}`}{" "}
                    avg
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════
          NETWORKING TIPS
          ════════════════════════════════════════════ */}
      {networkingTips.length > 0 && (
        <Card>
          <SectionTitle>Networking Tips</SectionTitle>
          <ul className="space-y-1.5">
            {networkingTips.map((t, i) => (
              <li key={i} className="flex gap-2 text-xs text-ink-secondary">
                <span className="shrink-0 font-bold text-editorial-gold">{i + 1}.</span>
                {typeof t === "string" ? t : JSON.stringify(t)}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ─── Campaign Ideas ─── */

function CampaignIdeasResult({ data }: { data: Record<string, unknown> }) {
  const campaigns = (data.campaigns ?? []) as Array<{
    name: string;
    type: string;
    platforms?: string;
    description: string;
    expectedOutcome?: string;
    steps: string[];
    budget: string;
    duration?: string;
    // Legacy fields (backward compat with old cached results)
    brand?: string;
    dateRange?: string;
    status?: string;
    progress?: number;
    timeline?: string;
    expectedROI?: string;
    metrics?: Array<{ label: string; value: string }>;
  }>;
  const performanceMatrix = (data.performanceMatrix ?? []) as Array<{
    format: string;
    instagram: number | null;
    tiktok: number | null;
    youtube: number | null;
  }>;
  const deliverables = (data.deliverables ?? data.weeklyPlan ?? []) as Array<{
    day: string;
    items: Array<{ campaign: string; task: string }>;
  }>;

  // Legacy detection: old format had status/metrics/summary
  const isLegacyFormat = campaigns.some(c => c.status || c.metrics);

  if (!campaigns.length) {
    return (
      <div className="border border-rule bg-surface-card px-6 py-12 text-center">
        <p className="font-serif text-sm font-bold text-ink">No campaign data available</p>
        <p className="mt-2 text-xs text-ink-muted leading-relaxed">
          Campaign ideas could not be generated for this profile. Try re-running the analysis after syncing the latest profile data.
        </p>
      </div>
    );
  }

  // Campaign color palette for deliverables
  const campaignColors = ["bg-editorial-red", "bg-editorial-green", "bg-editorial-gold", "bg-blue-500", "bg-purple-500"];

  // Matrix cell color
  const matrixCellColor = (val: number | null) => {
    if (val === null) return { text: "text-ink-muted", bg: "" };
    if (val >= 5) return { text: "text-editorial-green font-bold", bg: "bg-surface-raised" };
    if (val >= 3) return { text: "text-ink", bg: "" };
    return { text: "text-editorial-red font-bold", bg: "bg-surface-raised" };
  };

  // Old format fallback
  if (isLegacyFormat) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif text-sm font-bold text-ink">{c.name}</h3>
              <span className="shrink-0 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-muted">
                {c.budget}
              </span>
            </div>
            <span className="mt-1 inline-block text-[9px] uppercase tracking-wider text-editorial-gold">
              {c.type?.replace(/_/g, " ")}
            </span>
            <p className="mt-2 text-xs text-ink-secondary leading-relaxed">{c.description}</p>
            <div className="mt-3 flex gap-4 text-[10px]">
              <div>
                <span className="text-ink-muted">Timeline: </span>
                <span className="text-ink">{c.timeline}</span>
              </div>
            </div>
            {c.steps?.length > 0 && (
              <div className="mt-3 border-t border-rule pt-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Steps</span>
                <ol className="mt-1 space-y-0.5">
                  {c.steps.map((step, j) => (
                    <li key={j} className="text-[10px] text-ink-secondary flex gap-1.5">
                      <span className="shrink-0 text-ink-muted">{j + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {c.expectedROI && (
              <div className="mt-2 bg-surface-raised px-2 py-1">
                <span className="text-[10px] text-editorial-green">{c.expectedROI}</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Campaign Idea Cards ── */}
      <div className="space-y-4">
        {campaigns.map((c, i) => (
          <Card key={i} className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif text-base font-bold text-ink">{c.name}</h3>
                <p className="mt-0.5 text-[10px] text-ink-muted">
                  {[c.platforms, c.duration].filter(Boolean).join(" \u2022 ")}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="shrink-0 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-muted">
                  {c.type?.replace(/_/g, " ")}
                </span>
                <span className="shrink-0 bg-surface-raised px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-editorial-gold">
                  {c.budget}
                </span>
              </div>
            </div>

            {/* Description */}
            {c.description && (
              <p className="mt-3 text-xs text-ink-secondary leading-relaxed">{c.description}</p>
            )}

            {/* Expected outcome */}
            {c.expectedOutcome && (
              <div className="mt-3 bg-surface-raised px-3 py-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Expected Outcome: </span>
                <span className="text-[10px] text-editorial-green">{c.expectedOutcome}</span>
              </div>
            )}

            {/* Steps */}
            {c.steps?.length > 0 && (
              <div className="mt-3 border-t border-rule pt-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Implementation Steps</span>
                <ol className="mt-1 space-y-0.5">
                  {c.steps.map((step, j) => (
                    <li key={j} className="flex gap-1.5 text-[10px] text-ink-secondary">
                      <span className="shrink-0 text-ink-muted">{j + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ── Content Performance Matrix ── */}
      {performanceMatrix.length > 0 && (
        <Card>
          <SectionTitle>Content Performance Matrix</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-rule text-[9px] font-semibold uppercase tracking-widest text-ink-secondary">
                  <th className="py-2 pr-4">Format</th>
                  <th className="py-2 px-4 text-center">Instagram</th>
                  <th className="py-2 px-4 text-center">TikTok</th>
                  <th className="py-2 px-4 text-center">YouTube</th>
                </tr>
              </thead>
              <tbody>
                {performanceMatrix.map((row, i) => (
                  <tr key={i} className="border-b border-rule/50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-ink">{row.format}</td>
                    {(["instagram", "tiktok", "youtube"] as const).map((platform) => {
                      const val = row[platform];
                      const { text, bg } = matrixCellColor(val);
                      return (
                        <td key={platform} className="py-2.5 px-4 text-center">
                          {val !== null ? (
                            <span className={cn("inline-block px-2 py-0.5 font-mono text-xs", text, bg)}>
                              {val}%
                            </span>
                          ) : (
                            <span className="text-ink-muted">&mdash;</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center gap-3">
            <span className="bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-editorial-green">Above Avg</span>
            <span className="bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">Average</span>
            <span className="bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-editorial-red">Below Avg</span>
          </div>
        </Card>
      )}

      {/* ── Suggested Weekly Plan ── */}
      {deliverables.length > 0 && (
        <Card>
          <SectionTitle>Suggested Weekly Plan</SectionTitle>
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {deliverables.map((d, i) => (
              <div key={i} className="text-center text-[9px] font-semibold uppercase tracking-widest text-ink-muted pb-2">
                {d.day}
              </div>
            ))}
            {/* Day cells */}
            {deliverables.map((d, i) => (
              <div key={`cell-${i}`} className="min-h-[50px]">
                {d.items.length === 0 ? (
                  <div className="flex h-full items-center justify-center border border-rule/30 bg-surface-raised/30 p-1">
                    <span className="text-[8px] text-ink-muted italic">No deliverables</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {d.items.map((item, j) => {
                      const colorIdx = campaigns.findIndex(c => c.name.toLowerCase().includes(item.campaign.toLowerCase()) || item.campaign.toLowerCase().includes(c.brand?.toLowerCase() ?? ""));
                      const color = campaignColors[colorIdx >= 0 ? colorIdx % campaignColors.length : j % campaignColors.length];
                      return (
                        <div key={j} className={cn("px-1.5 py-1 text-[8px] font-semibold text-white", color)}>
                          <div className="truncate">{item.campaign}</div>
                          <div className="truncate opacity-80">{item.task}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Raw fallback ─── */

function RawResult({ data }: { data: Record<string, unknown> }) {
  const raw = data.raw as string | undefined;
  if (raw) {
    return (
      <Card>
        <pre className="whitespace-pre-wrap text-xs text-ink-secondary font-mono leading-relaxed">{raw}</pre>
      </Card>
    );
  }
  return (
    <Card>
      <pre className="whitespace-pre-wrap text-xs text-ink-secondary font-mono leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </Card>
  );
}
