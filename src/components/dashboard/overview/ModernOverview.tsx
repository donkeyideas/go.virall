"use client";

import { Fragment } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { cn, formatCompact } from "@/lib/utils";
import { PLATFORM_CONFIG } from "@/types";
import { useOverviewData, type OverviewProps } from "./use-overview-data";
import {
  formatHour,
  activityLabel,
  activityColor,
  engBoost,
  bestFormat,
} from "./overview-helpers";
import { TrustScoreDetail } from "@/components/deals/TrustScoreDetail";

// ============================================================
// Modern Overview Component
// ============================================================

export function ModernOverview(props: OverviewProps) {
  const d = useOverviewData(props);

  if (d.profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold text-ink">
          Welcome to <span className="text-editorial-accent">Go</span>Virall
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-secondary">
          Connect your first social media profile in the Profiles tab to unlock
          analytics, growth strategies, and content intelligence.
        </p>
        <a
          href="/dashboard/guide"
          className="mt-5 inline-block rounded-lg bg-yellow-400 px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
        >
          Getting Started Guide
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* ──── Profile Selector ──── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-modern-card-border pb-3 mb-4">
        <button
          onClick={() => d.setSelectedProfileId(null)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all",
            d.isAllProfiles
              ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
              : "border-modern-card-border bg-surface-card text-yellow-400/70 hover:border-yellow-400 hover:text-yellow-400",
          )}
        >
          All Profiles
        </button>
        {d.profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => d.setSelectedProfileId(profile.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all",
              d.selectedProfileId === profile.id
                ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                : "border-modern-card-border bg-surface-card text-yellow-400/70 hover:border-yellow-400 hover:text-yellow-400",
            )}
          >
            <PlatformIcon platform={profile.platform} size={14} />
            @{profile.handle}
            {profile.platform !== "instagram" && (
              <span className="text-ink-muted">
                ({PLATFORM_CONFIG[profile.platform]?.label})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ──── KPI Grid ──── */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: "Profiles",
            value: d.isAllProfiles ? d.profiles.length : 1,
            accent: false,
            change: null as number | null,
          },
          {
            label: "Total Followers",
            value: d.isAllProfiles
              ? d.totalFollowers > 0
                ? formatCompact(d.totalFollowers)
                : "---"
              : d.selectedProfile
                ? formatCompact(d.selectedProfile.followers_count)
                : "---",
            accent: true,
            change: d.followerChange,
            changeFormat: "compact" as const,
          },
          {
            label: "Avg Likes/Post",
            value: d.isAllProfiles
              ? d.avgLikesPerPost > 0
                ? formatCompact(d.avgLikesPerPost)
                : "---"
              : d.profileAvgLikes > 0
                ? formatCompact(d.profileAvgLikes)
                : "---",
            accent: false,
            change: null as number | null,
          },
          {
            label: "Trust Score",
            value: props.trustScore?.overall_score != null
              ? `${props.trustScore.overall_score}/100`
              : "---",
            accent: false,
            color: props.trustScore && props.trustScore.overall_score >= 90
              ? "text-editorial-green"
              : undefined,
            change: null as number | null,
          },
          {
            label: "Revenue (Month)",
            value: props.revenueStats?.thisMonth != null && props.revenueStats.thisMonth > 0
              ? `$${formatCompact(props.revenueStats.thisMonth)}`
              : "---",
            accent: true,
            color: "text-editorial-green",
            change: null as number | null,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[14px] border border-modern-card-border bg-surface-card p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-1 text-[26px] font-extrabold tracking-[-1px]",
                stat.color
                  ? stat.color
                  : stat.accent
                    ? "text-editorial-accent"
                    : "text-ink",
              )}
            >
              {stat.value}
            </p>
            {stat.change != null && stat.change !== 0 && (
              <p
                className={cn(
                  "mt-0.5 text-[11px] font-semibold",
                  stat.change > 0
                    ? "text-editorial-green"
                    : "text-[var(--modern-error,#EF4444)]",
                )}
              >
                {stat.change > 0 ? "+" : ""}
                {"changeFormat" in stat && stat.changeFormat === "compact"
                  ? formatCompact(Math.abs(stat.change))
                  : stat.change}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ──── Last Synced ──── */}
      {(() => {
        const latest = d.profiles.reduce<string | null>((best, p) => {
          if (!p.last_synced_at) return best;
          if (!best) return p.last_synced_at;
          return new Date(p.last_synced_at) > new Date(best) ? p.last_synced_at : best;
        }, null);
        return latest ? (
          <p className="mb-2 text-right text-[10px] text-ink-muted">
            Last synced: {new Date(latest).toLocaleString()}
          </p>
        ) : null;
      })()}

      {/* ──── Three-Column Layout ──── */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr_280px]">
        {/* ════ LEFT COLUMN ════ */}
        <div className="flex flex-col gap-4">
          {/* Trust Score — styled like Social Health */}
          <a
            href="/dashboard/trust-score"
            className="block group rounded-[14px] border border-modern-card-border bg-surface-card p-5 hover:border-editorial-green/40 transition-colors"
          >
            <h3 className="text-sm font-extrabold text-ink">Trust Score</h3>
            <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-green mb-2">
              Platform Reliability
            </p>
            <div className="flex flex-col items-center my-2">
              <span
                className="text-[56px] font-black leading-none"
                style={{
                  color: !props.trustScore
                    ? "var(--color-ink-muted)"
                    : props.trustScore.overall_score >= 90
                      ? "#22C55E"
                      : props.trustScore.overall_score >= 75
                        ? "rgba(75,156,211,0.9)"
                        : props.trustScore.overall_score >= 60
                          ? "#F59E0B"
                          : "#EF4444",
                }}
              >
                {props.trustScore ? Math.round(props.trustScore.overall_score) : "—"}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-ink-muted">
                {props.trustScore
                  ? props.trustScore.overall_score >= 90
                    ? "Excellent"
                    : props.trustScore.overall_score >= 75
                      ? "Good"
                      : props.trustScore.overall_score >= 60
                        ? "Fair"
                        : "Needs Work"
                  : "No score yet"}
              </span>
            </div>
            {props.trustScore && (
              <div className="mt-3 space-y-2.5">
                {[
                  { label: "Completion Rate", value: props.trustScore.completion_rate },
                  { label: "Dispute Rate", value: props.trustScore.dispute_rate },
                  { label: "Response Time", value: props.trustScore.response_time_score },
                  { label: "Consistency", value: props.trustScore.consistency_score },
                ].map((f) => {
                  const val = Number(f.value) || 0;
                  return (
                    <div key={f.label}>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="text-ink-secondary">{f.label}</span>
                        <span
                          className={cn(
                            "font-bold",
                            val >= 90
                              ? "text-editorial-green"
                              : val >= 60
                                ? "text-editorial-gold"
                                : "text-editorial-red",
                          )}
                        >
                          {Math.round(val)}%
                        </span>
                      </div>
                      <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            val >= 90
                              ? "bg-editorial-green"
                              : val >= 60
                                ? "bg-editorial-gold"
                                : "bg-editorial-red",
                          )}
                          style={{ width: `${Math.min(100, val)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[9px] font-semibold text-ink-muted group-hover:text-editorial-green transition-colors">
              View Details &rarr;
            </p>
          </a>

          {/* Social Intelligence Brief */}
          <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-ink">
              Social Intelligence Brief
            </h2>

            <div className="mt-4 space-y-0">
              {d.briefItems.length > 0 ? (
                d.briefItems.map((item, i) => (
                  <article
                    key={i}
                    className="border-b border-modern-card-border pb-3 mb-3 last:border-0 last:pb-0 last:mb-0"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider text-editorial-red">
                      {item.category}
                    </span>
                    <h4 className="mt-1 text-sm font-bold leading-snug text-ink">
                      {item.headline}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                      {item.body}
                    </p>
                  </article>
                ))
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-ink-muted">
                    Run analyses in the Intelligence tab to see intelligence
                    briefs here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════ CENTER COLUMN ════ */}
        <div className="flex flex-col gap-4">
          {/* Strategic Analysis */}
          {d.strategicHeadline && (
            <div className="rounded-[14px] border border-modern-card-border bg-gradient-to-br from-surface-card to-editorial-blue/6 p-5">
              <h2 className="text-lg font-bold leading-snug text-ink">
                {d.strategicHeadline}
              </h2>
              {d.strategicSummary && (
                <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary italic">
                  {d.strategicSummary}
                </p>
              )}
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-editorial-red">
                Read Full Brief &rarr;
              </p>
            </div>
          )}

          {/* Profile Performance */}
          {d.profileForData && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink mb-4">
                Profile Performance &mdash; @{d.profileForData.handle}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    label: "Followers",
                    value: formatCompact(d.profileForData.followers_count),
                    accent: true,
                  },
                  {
                    label: "Avg Likes/Post",
                    value: d.profileAvgLikes > 0
                      ? formatCompact(d.profileAvgLikes)
                      : "---",
                    accent: false,
                  },
                  {
                    label: "Est. Earnings",
                    value: d.summaryStats
                      ? `$${(d.summaryStats.estMonthly ?? 0).toLocaleString()}`
                      : "---",
                    sub: d.summaryStats ? "per month" : undefined,
                    accent: false,
                  },
                  {
                    label: "Total Posts",
                    value: formatCompact(d.profileForData.posts_count),
                    accent: false,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[10px] bg-surface-raised p-3"
                  >
                    <p className="text-[10px] font-semibold uppercase text-ink-muted">
                      {stat.label}
                    </p>
                    <p
                      className={cn(
                        "text-[22px] font-extrabold",
                        stat.accent ? "text-editorial-accent" : "text-ink",
                      )}
                    >
                      {stat.value}
                    </p>
                    {stat.sub && (
                      <p className="text-[10px] text-ink-muted">{stat.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heatmap */}
          {d.heatmap && d.heatmap.data && d.heatmap.data.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                Follower Activity Heatmap
              </h3>
              <p className="text-[10px] text-ink-muted mb-3">
                Best times to post &mdash; click a cell for details
              </p>
              <div ref={d.heatmapRef} className="relative">
                <div
                  data-heatmap-grid
                  className="grid"
                  style={{
                    gridTemplateColumns: "40px repeat(24, 1fr)",
                    gap: "2px",
                    fontSize: "9px",
                  }}
                >
                  <div />
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="text-center font-mono text-[8px] text-ink-muted"
                    >
                      {i % 3 === 0
                        ? i === 0
                          ? "12a"
                          : i < 12
                            ? `${i}a`
                            : i === 12
                              ? "12p"
                              : `${i - 12}p`
                        : ""}
                    </div>
                  ))}
                  {d.heatmap.data.map((row, ri) => {
                    const hours = row.hours ?? [];
                    return (
                      <Fragment key={ri}>
                        <div className="flex items-center font-mono text-[9px] font-semibold uppercase text-ink-muted">
                          {row.day}
                        </div>
                        {hours.map((val, ci) => {
                          const nv = val / 100;
                          const isSelected =
                            d.selectedCell?.dayIdx === ri &&
                            d.selectedCell?.hourIdx === ci;
                          return (
                            <div
                              key={ci}
                              data-heatmap-cell
                              className="cursor-pointer rounded-[3px]"
                              style={{
                                aspectRatio: "1",
                                minHeight: "12px",
                                backgroundColor: `rgba(${Math.round(255 * nv)},${Math.round(184 * nv)},${Math.round(77 * nv)},${0.1 + nv * 0.9})`,
                                transition:
                                  "transform 0.15s, box-shadow 0.15s",
                                transform: isSelected
                                  ? "scale(1.3)"
                                  : undefined,
                                zIndex: isSelected ? 2 : undefined,
                                boxShadow: isSelected
                                  ? "0 0 0 2px var(--color-surface-cream), 0 0 0 3px var(--color-editorial-red)"
                                  : undefined,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.transform =
                                    "scale(1.3)";
                                  e.currentTarget.style.zIndex = "2";
                                  e.currentTarget.style.boxShadow =
                                    "0 0 0 2px var(--color-surface-cream), 0 0 0 3px var(--color-editorial-red)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.transform = "";
                                  e.currentTarget.style.zIndex = "";
                                  e.currentTarget.style.boxShadow = "";
                                }
                              }}
                              onClick={(e) =>
                                d.handleCellClick(e, ri, ci, row.day, val)
                              }
                            />
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </div>
                {/* Tooltip */}
                {d.selectedCell && (
                  <div
                    data-heatmap-tooltip
                    className="absolute z-[100] rounded-xl border border-modern-card-border bg-surface-card shadow-lg"
                    style={{
                      left: d.tooltipPos.left,
                      top: d.tooltipPos.top,
                      padding: "12px 16px",
                      minWidth: "220px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    }}
                  >
                    <div className="text-sm font-bold text-ink mb-2">
                      {d.selectedCell.day}{" "}
                      {formatHour(d.selectedCell.hourIdx)}
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                        Activity Level
                      </span>
                      <span
                        className="font-mono text-xs font-bold"
                        style={{
                          color: activityColor(d.selectedCell.value),
                        }}
                      >
                        {d.selectedCell.value}% &mdash;{" "}
                        {activityLabel(d.selectedCell.value)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${d.selectedCell.value}%`,
                          backgroundColor: activityColor(d.selectedCell.value),
                        }}
                      />
                    </div>
                    <div className="mt-2" />
                    <div className="flex items-center justify-between py-0.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                        Eng. Boost
                      </span>
                      <span className="font-mono text-xs font-bold text-editorial-green">
                        {engBoost(d.selectedCell.value)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                        Best Format
                      </span>
                      <span className="font-mono text-xs font-bold text-ink">
                        {bestFormat(
                          d.selectedCell.dayIdx,
                          d.selectedCell.hourIdx,
                        )}
                      </span>
                    </div>
                    {d.selectedCell.value > 60 && (
                      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-editorial-gold">
                        Recommended posting time
                      </p>
                    )}
                  </div>
                )}
              </div>
              {d.heatmap.peakTimes && d.heatmap.peakTimes.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-ink-muted">
                    Peak times:
                  </span>
                  {d.heatmap.peakTimes.map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold uppercase tracking-wider text-editorial-red"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top Performing Content */}
          {d.topContent.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink mb-4">
                Top Performing Content
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-modern-card-border">
                      <th className="pb-2.5 pr-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Content
                      </th>
                      <th className="pb-2.5 pr-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Type
                      </th>
                      <th className="pb-2.5 pr-3 text-right text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Likes
                      </th>
                      <th className="pb-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                        Comments
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topContent.map((post) => (
                      <tr
                        key={post.id}
                        className="border-b border-modern-card-border/50 last:border-0"
                      >
                        <td className="max-w-[200px] truncate py-3 pr-3 text-[13px] font-semibold text-ink">
                          {post.caption || "No caption"}
                        </td>
                        <td className="py-3 pr-3">
                          <span className="rounded-full bg-ink-muted/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                            {post.isVideo ? "Reel" : "Post"}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-right font-mono text-[13px] font-bold text-ink">
                          {formatCompact(post.likesCount)}
                        </td>
                        <td className="py-3 text-right font-mono text-[13px] text-ink-secondary">
                          {formatCompact(post.commentsCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className={`grid gap-4 ${d.engagementTrendData.length > 2 && d.followerGrowthData.length > 2 ? "md:grid-cols-2" : "grid-cols-1"}`}>
            {/* Engagement Rate Trend */}
            {d.engagementTrendData.length > 2 && (
              <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                  Engagement Rate Trend
                </h3>
                <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-3">
                  30-Day Average
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={d.engagementTrendData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="modernEngGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4B9CD3"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4B9CD3"
                          stopOpacity={0.03}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(75,156,211,0.08)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(75,156,211,0.15)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={35}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#112240",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#E8F0FA",
                      }}
                      formatter={(value) => [
                        `${value}%`,
                        "Engagement",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#4B9CD3"
                      strokeWidth={2}
                      fill="url(#modernEngGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Follower Growth Trend */}
            {d.followerGrowthData.length > 2 && (
              <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                  Follower Growth Trend
                </h3>
                <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-3">
                  30-Day Performance
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={d.followerGrowthData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="modernFollowGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-editorial-red)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-editorial-red)"
                          stopOpacity={0.03}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(75,156,211,0.08)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(75,156,211,0.15)" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "var(--color-ink-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                      tickFormatter={(v) => formatCompact(Number(v))}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#112240",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "11px",
                        color: "#E8F0FA",
                      }}
                      formatter={(value) => [
                        formatCompact(Number(value)),
                        "Followers",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="followers"
                      stroke="var(--color-editorial-red)"
                      strokeWidth={2}
                      fill="url(#modernFollowGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Content Mix Distribution */}
          {d.contentMixEntries.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                Content Mix Distribution
              </h3>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-3">
                Recommended Content Types
              </p>
              <div className="space-y-3">
                {d.contentMixEntries.map(([type, pct]) => {
                  const maxPct = Math.max(
                    ...d.contentMixEntries.map(([, v]) => v),
                  );
                  return (
                    <div key={type}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-xs font-medium capitalize text-ink">
                          {type.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono text-sm font-bold text-ink">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className="h-full rounded-full bg-editorial-red"
                          style={{
                            width: `${(pct / maxPct) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenue by Source */}
          {d.revenueBySources.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink">
                Revenue by Source
              </h3>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted mb-3">
                Monthly Breakdown
              </p>
              <div className="space-y-3">
                {d.revenueBySources.map((src, i) => (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">
                        {src.source}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-ink-muted">
                          {src.percentage}%
                        </span>
                        <span className="w-24 text-right font-mono text-xs font-bold text-ink">
                          ${src.monthlyAmount.toLocaleString()}/mo
                        </span>
                      </div>
                    </div>
                    <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                      <div
                        className="h-full rounded-full bg-editorial-green"
                        style={{
                          width: `${src.percentage}%`,
                          opacity: 1 - i * 0.15,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="flex flex-col gap-4">
          {/* Social Health */}
          {d.audienceQualityScore > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Social Health
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-2">
                Overall Assessment
              </p>
              <div className="flex flex-col items-center my-2">
                <span className="text-[56px] font-black leading-none text-ink">
                  {d.audienceQualityScore}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-wider text-ink-muted">
                  out of 100
                </span>
              </div>
              {d.qualityScore?.factors &&
                d.qualityScore.factors.length > 0 && (
                  <div className="mt-3 space-y-2.5">
                    {d.qualityScore.factors.map((f, i) => (
                      <div key={i}>
                        <div className="mb-1 flex justify-between text-[11px]">
                          <span className="text-ink-secondary">{f.name}</span>
                          <span
                            className={cn(
                              "font-bold",
                              f.score >= 80
                                ? "text-editorial-green"
                                : f.score >= 60
                                  ? "text-editorial-gold"
                                  : "text-editorial-red",
                            )}
                          >
                            {f.score}%
                          </span>
                        </div>
                        <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              f.score >= 80
                                ? "bg-editorial-green"
                                : f.score >= 60
                                  ? "bg-editorial-gold"
                                  : "bg-editorial-red",
                            )}
                            style={{ width: `${f.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Competitor Watch */}
          {d.competitorProfiles.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Competitor Watch
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-3">
                Follower Rankings
              </p>
              <div className="space-y-0">
                {d.competitorProfiles.slice(0, 5).map((c, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center justify-between border-b border-modern-card-border/50 py-1.5 last:border-0",
                      c.handle === d.profileForData?.handle &&
                        "rounded-md bg-editorial-red/5 px-1",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-4 text-[10px] font-bold",
                          c.handle === d.profileForData?.handle
                            ? "text-editorial-red"
                            : "text-ink-muted",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          c.handle === d.profileForData?.handle
                            ? "text-editorial-red"
                            : "text-ink",
                        )}
                      >
                        @{c.handle?.replace(/^@/, "")}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-mono text-[11px] font-semibold",
                        c.handle === d.profileForData?.handle
                          ? "text-editorial-red"
                          : "text-ink",
                      )}
                    >
                      {formatCompact(c.followersCount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SMO Score */}
          {d.smoScore > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">SMO Score</h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-2">
                Profile Optimization
              </p>
              <div className="flex flex-col items-center my-2">
                <span className="text-4xl font-black text-editorial-gold">
                  {d.smoScore}
                </span>
                <span className="text-[10px] text-ink-muted">/100</span>
              </div>
              {d.smoFactors.length > 0 && (
                <div className="mt-3 space-y-2">
                  {d.smoFactors.slice(0, 6).map((f, i) => {
                    const pct = (f.score / f.maxScore) * 100;
                    return (
                      <div key={i}>
                        <div className="mb-1 flex justify-between text-[10px]">
                          <span className="text-ink-secondary">{f.factor}</span>
                          <span
                            className={cn(
                              "font-bold",
                              pct >= 80
                                ? "text-editorial-green"
                                : pct >= 60
                                  ? "text-editorial-gold"
                                  : "text-editorial-red",
                            )}
                          >
                            {f.score}
                          </span>
                        </div>
                        <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-raised">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              pct >= 80
                                ? "bg-editorial-green"
                                : pct >= 60
                                  ? "bg-editorial-gold"
                                  : "bg-editorial-red",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Deadlines */}
          {d.upcomingDeadlines.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Upcoming Deadlines
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-3">
                Brand Deals &amp; Campaigns
              </p>
              <div className="space-y-2.5">
                {d.upcomingDeadlines.map((deal) => (
                  <div
                    key={deal.id}
                    className="border-b border-modern-card-border/50 pb-2 last:border-0 text-[11px]"
                  >
                    <p className="font-bold text-ink">{deal.brand_name}</p>
                    <p className="text-[10px] capitalize text-ink-muted">
                      {deal.status}
                    </p>
                    {deal.total_value != null && (
                      <p className="font-mono text-[10px] text-editorial-green">
                        ${deal.total_value.toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Influencer Hub */}
          <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
            <h3 className="text-sm font-extrabold text-ink">Influencer Hub</h3>
            <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-3">
              Quick Access
            </p>
            <div className="space-y-1">
              {[
                {
                  label: "Business",
                  count: d.deals.length,
                  code: "BZ",
                  bg: "bg-editorial-green/10",
                  fg: "text-editorial-green",
                  href: "/dashboard/business",
                },
                {
                  label: "Deals",
                  count: d.deals.filter(
                    (dd) => dd.status === "active" || dd.status === "negotiation",
                  ).length,
                  code: "DL",
                  bg: "bg-editorial-gold/10",
                  fg: "text-editorial-gold",
                  href: "/dashboard/deals",
                },
                {
                  label: "Revenue",
                  count: props.revenueStats?.totalEarnings ? 1 : 0,
                  code: "RV",
                  bg: "bg-editorial-green/10",
                  fg: "text-editorial-green",
                  href: "/dashboard/revenue",
                },
                {
                  label: "Inbox",
                  count: d.notifications.length,
                  code: "IN",
                  bg: "bg-editorial-blue/10",
                  fg: "text-editorial-blue",
                  href: "/dashboard/inbox",
                },
                {
                  label: "Publish",
                  count: 0,
                  code: "PB",
                  bg: "bg-editorial-red/10",
                  fg: "text-editorial-red",
                  href: "/dashboard/publish",
                },
                {
                  label: "AI Studio",
                  count: 0,
                  code: "AI",
                  bg: "bg-editorial-blue/10",
                  fg: "text-editorial-blue",
                  href: "/dashboard/ai-studio",
                },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-lg border border-modern-card-border bg-surface-raised px-3 py-2 cursor-pointer hover:bg-editorial-red/5 hover:border-editorial-red/20 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold",
                        item.bg,
                        item.fg,
                      )}
                    >
                      {item.code}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink">
                        {item.label}
                      </p>
                      {item.count > 0 && (
                        <p className="text-[9px] text-ink-muted">
                          {item.count} item{item.count !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold text-ink-muted">
                    View &rarr;
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Audience Demographics */}
          {(d.ageDistribution.length > 0 || d.genderEntries.length > 0) && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Audience Demographics
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-3">
                Who Follows You
              </p>

              {d.genderEntries.length > 0 && (
                <div className="mt-1">
                  <div className="flex h-4 w-full overflow-hidden rounded-full">
                    {d.genderEntries.map(([gender, pct]) => (
                      <div
                        key={gender}
                        className={cn(
                          "flex items-center justify-center text-[8px] font-bold text-white",
                          gender === "female"
                            ? "bg-editorial-red"
                            : gender === "male"
                              ? "bg-editorial-blue"
                              : "bg-ink-muted",
                        )}
                        style={{ width: `${pct}%` }}
                      >
                        {pct >= 15 && `${pct}%`}
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3">
                    {d.genderEntries.map(([gender, pct]) => (
                      <div key={gender} className="flex items-center gap-1">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            gender === "female"
                              ? "bg-editorial-red"
                              : gender === "male"
                                ? "bg-editorial-blue"
                                : "bg-ink-muted",
                          )}
                        />
                        <span className="text-[9px] capitalize text-ink-secondary">
                          {gender} {pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {d.ageDistribution.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {d.ageDistribution.map((a, i) => {
                    const maxPct = Math.max(
                      ...d.ageDistribution.map((dd) => dd.percentage),
                    );
                    const isTop = a.percentage === maxPct;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-10 shrink-0 text-[10px]",
                            isTop
                              ? "font-bold text-editorial-red"
                              : "text-ink-secondary",
                          )}
                        >
                          {a.range}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              isTop
                                ? "bg-editorial-red"
                                : "bg-editorial-red/50",
                            )}
                            style={{
                              width: `${(a.percentage / maxPct) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-[9px] font-bold text-ink">
                          {a.percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Top Hashtags */}
          {d.topHashtags.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">Top Hashtags</h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-3">
                Optimized Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {d.topHashtags.map((h, i) => (
                  <span
                    key={i}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 font-mono text-[10px]",
                      h.estimatedReach === "high"
                        ? "border-editorial-red text-editorial-red bg-editorial-red/5"
                        : "border-modern-card-border text-ink-secondary",
                    )}
                  >
                    {h.tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Industry Benchmarks */}
          {d.industryBenchmarks.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Industry Benchmarks
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-3">
                You vs. Average
              </p>
              <div className="space-y-2.5">
                {d.industryBenchmarks.slice(0, 5).map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-modern-card-border/50 pb-2 last:border-0"
                  >
                    <span className="text-[10px] text-ink-secondary">
                      {b.metric}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-ink">
                        {b.yourValue}
                        {b.unit}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[9px] font-bold",
                          b.delta > 0
                            ? "text-editorial-green"
                            : b.delta < 0
                              ? "text-editorial-red"
                              : "text-ink-muted",
                        )}
                      >
                        {b.delta > 0 ? "+" : ""}
                        {b.delta}
                        {b.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {d.notifications.length > 0 && (
            <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-5">
              <h3 className="text-sm font-extrabold text-ink">
                Recent Activity
              </h3>
              <p className="text-[9px] font-bold uppercase tracking-wider text-editorial-red mb-3">
                Last 7 Days
              </p>
              <div className="space-y-2">
                {d.notifications.slice(0, 5).map((n) => (
                  <div
                    key={n.id}
                    className="border-b border-modern-card-border/50 pb-2 last:border-0"
                  >
                    <p className="text-xs text-ink">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-muted">
                        {n.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──── Earnings / Revenue Hub ──── */}
      {(props.revenueStats || d.summaryStats) && (
        <div className="mt-6">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink mb-3">
            {props.revenueStats ? "Revenue Overview" : "Earnings Projection Hub"}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: props.revenueStats ? "This Month" : "Est. Monthly",
                value: props.revenueStats
                  ? `$${(props.revenueStats.thisMonth ?? 0).toLocaleString()}`
                  : `$${(d.summaryStats?.estMonthly ?? 0).toLocaleString()}`,
                color: "text-editorial-green",
                sub: props.revenueStats?.thisMonthChange != null && props.revenueStats.thisMonthChange !== 0
                  ? `${props.revenueStats.thisMonthChange > 0 ? "+" : ""}${props.revenueStats.thisMonthChange.toFixed(0)}% vs last month`
                  : props.revenueStats ? undefined : "Realistic scenario",
              },
              {
                label: props.revenueStats ? "Pipeline Value" : "Active Deals",
                value: props.revenueStats
                  ? `$${(props.revenueStats.pipelineValue ?? 0).toLocaleString()}`
                  : (d.summaryStats?.activeDeals ?? 0),
                color: "text-editorial-blue",
                sub: undefined,
              },
              {
                label: props.revenueStats ? "Total Earnings" : "YTD Revenue",
                value: props.revenueStats
                  ? `$${(props.revenueStats.totalEarnings ?? 0).toLocaleString()}`
                  : `$${(d.summaryStats?.ytdRevenue ?? 0).toLocaleString()}`,
                color: "text-editorial-green",
                sub: !props.revenueStats && d.summaryStats?.ytdDealsCompleted != null
                  ? `${d.summaryStats.ytdDealsCompleted} deals completed`
                  : undefined,
              },
              {
                label: props.revenueStats ? "Pending" : "Profiles",
                value: props.revenueStats
                  ? `$${(props.revenueStats.pendingPayments ?? 0).toLocaleString()}`
                  : d.profiles.length,
                color: "text-ink",
                sub: undefined,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[14px] border border-modern-card-border bg-surface-card p-4"
              >
                <p className="text-[10px] font-semibold uppercase text-ink-muted">
                  {stat.label}
                </p>
                <p
                  className={cn(
                    "mt-1 text-2xl font-extrabold",
                    stat.color,
                  )}
                >
                  {stat.value}
                </p>
                {stat.sub && (
                  <p className="text-[10px] text-ink-muted">{stat.sub}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── Disclaimer ──── */}
      <div className="mt-6 flex items-start gap-2 rounded-[10px] border border-editorial-gold/15 bg-editorial-gold/6 p-3 text-xs text-ink-secondary">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-editorial-gold)"
          strokeWidth="2"
          className="mt-0.5 shrink-0"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>
          <strong>Disclaimer:</strong> All metrics, earnings projections, and
          growth estimates are generated based on industry benchmarks. They
          should be used for strategic planning purposes only.
        </span>
      </div>
      {(d.profileCreated || d.lastSynced) && (
        <p className="mt-1 text-[9px] text-ink-muted">
          {d.profileCreated && <>Profile added {d.profileCreated}. </>}
          {d.lastSynced && <>Last synced {d.lastSynced}.</>}
        </p>
      )}
    </div>
  );
}
