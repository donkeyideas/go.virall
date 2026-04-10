"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/track";
import { useViewMode } from "@/lib/contexts/view-mode";
import { ProfileSelector } from "@/components/dashboard/ProfileSelector";
import type { SocialProfile } from "@/types";
import type { PostPerformance, PlatformGrowthComparison } from "@/lib/dal/analytics";

const TABS = [
  { key: "performance", label: "Performance" },
  { key: "growth", label: "Growth" },
  { key: "revenue", label: "Revenue" },
  { key: "competitive", label: "Competitive" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface AnalyticsClientProps {
  profiles: SocialProfile[];
  posts: PostPerformance[];
  platformGrowth: PlatformGrowthComparison[];
  earningsResults: Record<string, Record<string, unknown>>;
  competitorResults: Record<string, Record<string, unknown>>;
}

/* ─── Shared helpers ─── */

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  return (
    <div className={cn(
      ed
        ? "border border-rule bg-surface-card p-5"
        : "rounded-[14px] border border-modern-card-border bg-surface-card p-5",
      className,
    )}>
      {children}
    </div>
  );
}
function SubCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  return (
    <div className={cn(
      ed
        ? "border border-rule bg-surface-raised"
        : "rounded-[10px] border border-modern-card-border/50 bg-surface-raised",
      className,
    )}>
      {children}
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  const { viewMode } = useViewMode();
  return viewMode === "editorial"
    ? <h3 className="font-serif text-sm font-bold text-ink">{children}</h3>
    : <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-secondary">{children}</h3>;
}
function KpiLabel({ children }: { children: React.ReactNode }) {
  const { viewMode } = useViewMode();
  return viewMode === "editorial"
    ? <p className="editorial-overline">{children}</p>
    : <div className="text-[9px] font-semibold uppercase tracking-widest text-ink-muted">{children}</div>;
}
function KpiValue({ children, className }: { children: React.ReactNode; className?: string }) {
  const { viewMode } = useViewMode();
  return viewMode === "editorial"
    ? <p className={cn("mt-1 font-serif text-2xl font-bold text-ink", className)}>{children}</p>
    : <div className={cn("mt-1 text-3xl font-bold text-ink", className)}>{children}</div>;
}
function ProgressBar({ pct, color = "bg-editorial-red" }: { pct: number; color?: string }) {
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  return (
    <div className={cn("mt-1 h-2.5 w-full overflow-hidden bg-surface-raised", !ed && "rounded-full")}>
      <div className={cn("h-full transition-all", color, !ed && "rounded-full")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AnalyticsClient({
  profiles,
  posts,
  platformGrowth,
  earningsResults,
  competitorResults,
}: AnalyticsClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("performance");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("page_view", "analytics");
  }, []);

  if (profiles.length === 0) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-xl font-bold text-ink">Analytics</h2>
        <p className="mt-2 text-sm text-ink-secondary">
          Connect a social profile to see your analytics.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar — flush, same as Strategy page */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-rule">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors",
              activeTab === tab.key
                ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-secondary hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Selector — flush, same as Strategy page */}
      <ProfileSelector
        profiles={profiles}
        selectedId={selectedProfileId}
        onSelect={(id) => setSelectedProfileId(id)}
        showAll
        onSelectAll={() => setSelectedProfileId(null)}
      />

      {/* Tab content */}
      <div className="mt-4 space-y-4">
        {activeTab === "performance" && (
          <PerformanceTab
            posts={selectedProfileId
              ? posts.filter((p) => {
                  const prof = profiles.find((pr) => pr.id === selectedProfileId);
                  return prof && p.platform === prof.platform && p.handle === prof.handle;
                })
              : posts
            }
            profiles={selectedProfileId
              ? profiles.filter((p) => p.id === selectedProfileId)
              : profiles
            }
          />
        )}
        {activeTab === "growth" && (
          <GrowthTab
            platformGrowth={selectedProfileId
              ? platformGrowth.filter((pg) => pg.profileId === selectedProfileId)
              : platformGrowth
            }
            selectedProfileId={selectedProfileId}
          />
        )}
        {activeTab === "revenue" && (
          <RevenueTab
            data={selectedProfileId
              ? earningsResults[selectedProfileId]
              : Object.values(earningsResults)[0] as Record<string, unknown> | undefined
            }
          />
        )}
        {activeTab === "competitive" && (
          <CompetitiveTab
            data={selectedProfileId
              ? competitorResults[selectedProfileId]
              : Object.values(competitorResults)[0] as Record<string, unknown> | undefined
            }
            profiles={profiles}
            selectedProfileId={selectedProfileId ?? profiles[0]?.id ?? ""}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PERFORMANCE TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function PerformanceTab({ posts, profiles }: { posts: PostPerformance[]; profiles: SocialProfile[] }) {
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  if (posts.length === 0) {
    // Show profile-level metrics as fallback when individual posts aren't available
    if (profiles.length > 0) {
      const totalFollowers = profiles.reduce((s, p) => s + (p.followers_count || 0), 0);
      const totalPosts = profiles.reduce((s, p) => s + (p.posts_count || 0), 0);
      const avgEng = profiles.filter((p) => p.engagement_rate != null).length > 0
        ? profiles.reduce((s, p) => s + (Number(p.engagement_rate) || 0), 0) / profiles.filter((p) => p.engagement_rate != null).length
        : 0;
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="text-center">
              <KpiLabel>Total Followers</KpiLabel>
              <KpiValue>{totalFollowers.toLocaleString()}</KpiValue>
            </Card>
            <Card className="text-center">
              <KpiLabel>Total Posts</KpiLabel>
              <KpiValue>{totalPosts.toLocaleString()}</KpiValue>
            </Card>
            <Card className="text-center">
              <KpiLabel>Avg Engagement</KpiLabel>
              <KpiValue className="text-editorial-red">{avgEng.toFixed(2)}%</KpiValue>
            </Card>
          </div>
          {/* Per-profile breakdown */}
          <Card>
            <SectionTitle>Profile Overview</SectionTitle>
            <div className="mt-3 space-y-3">
              {profiles.map((p) => {
                const pct = totalFollowers > 0 ? (p.followers_count / totalFollowers) * 100 : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium capitalize text-ink">{p.platform} &middot; @{p.handle}</span>
                      <span className="font-mono font-bold text-ink">{p.followers_count.toLocaleString()} followers</span>
                    </div>
                    <ProgressBar pct={pct} />
                    <div className="mt-1 flex gap-4 text-[10px] text-ink-muted">
                      <span>{p.posts_count.toLocaleString()} posts</span>
                      {p.engagement_rate != null && (
                        <span>{Number(p.engagement_rate).toFixed(2)}% engagement</span>
                      )}
                      {p.last_synced_at && (
                        <span>Synced {new Date(p.last_synced_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-ink-secondary">
              Post-level performance data will appear after your next profile sync.
            </p>
            <a href="/dashboard/profiles" className={cn("mt-3 inline-block border border-editorial-red/30 bg-editorial-red/5 px-4 py-2 text-[11px] font-semibold text-editorial-red transition-colors hover:bg-editorial-red/10", !ed && "rounded-full")}>
              Go to Profiles to sync
            </a>
          </Card>
        </div>
      );
    }
    return (
      <EmptyState
        title="No Post Data Yet"
        message="Sync your profiles to pull in post performance data."
        action="Go to Profiles to sync"
        href="/dashboard/profiles"
      />
    );
  }

  const topPosts = posts.slice(0, 10);
  const worstPosts = [...posts].sort((a, b) => a.likesCount - b.likesCount).slice(0, 5);
  const videoCount = posts.filter((p) => p.isVideo).length;
  const imageCount = posts.length - videoCount;
  const avgVideoLikes = videoCount > 0 ? Math.round(posts.filter((p) => p.isVideo).reduce((s, p) => s + p.likesCount, 0) / videoCount) : 0;
  const avgImageLikes = imageCount > 0 ? Math.round(posts.filter((p) => !p.isVideo).reduce((s, p) => s + p.likesCount, 0) / imageCount) : 0;
  const totalLikes = posts.reduce((s, p) => s + p.likesCount, 0);
  const totalComments = posts.reduce((s, p) => s + p.commentsCount, 0);
  const avgEngRate = posts.reduce((s, p) => s + p.engagementRate, 0) / posts.length;

  // Build engagement trend chart data from posts
  const chartData = posts.slice(0, 20).reverse().map((p, i) => ({
    name: `#${i + 1}`,
    engagement: p.engagementRate,
    likes: p.likesCount,
  }));

  // Content type bar chart data
  const typeData = [
    { name: "Videos / Reels", count: videoCount, avgLikes: avgVideoLikes, fill: "#c0392b" },
    { name: "Images / Carousels", count: imageCount, avgLikes: avgImageLikes, fill: "#5b9cf5" },
  ];

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="text-center">
          <KpiLabel>Total Posts</KpiLabel>
          <KpiValue>{posts.length}</KpiValue>
        </Card>
        <Card className="text-center">
          <KpiLabel>Total Likes</KpiLabel>
          <KpiValue>{totalLikes.toLocaleString()}</KpiValue>
        </Card>
        <Card className="text-center">
          <KpiLabel>Total Comments</KpiLabel>
          <KpiValue>{totalComments.toLocaleString()}</KpiValue>
        </Card>
        <Card className="text-center">
          <KpiLabel>Avg Engagement</KpiLabel>
          <KpiValue className="text-editorial-red">{avgEngRate.toFixed(2)}%</KpiValue>
        </Card>
      </div>

      {/* Engagement Trend Chart */}
      <Card>
        <SectionTitle>Engagement Rate Trend</SectionTitle>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="engGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c0392b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c0392b" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--accent-rgb),0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "var(--color-ink-muted, #999)" }} tickLine={false} axisLine={{ stroke: "rgba(var(--accent-rgb),0.15)" }} />
              <YAxis tick={{ fontSize: 9, fill: "var(--color-ink-muted, #999)" }} tickLine={false} axisLine={false} width={35} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "var(--color-surface-card, #1a1a2e)", border: "1px solid var(--color-modern-card-border, #333)", borderRadius: "8px", fontSize: "11px" }}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />
              <Area type="monotone" dataKey="engagement" name="Eng. Rate %" stroke="#c0392b" strokeWidth={2} fill="url(#engGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Content Type Breakdown — Visual Bar Chart */}
      <Card>
        <SectionTitle>Content Type Breakdown</SectionTitle>
        <div className="mt-4 grid gap-6 md:grid-cols-[1fr_200px]">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink, #fff)" }} width={130} tickLine={false} axisLine={false} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "var(--color-surface-card, #1a1a2e)", border: "1px solid var(--color-modern-card-border, #333)", borderRadius: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="count" name="Posts" radius={ed ? [0, 0, 0, 0] : [0, 4, 4, 0]} barSize={24}>
                {typeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-col justify-center gap-3">
            {typeData.map((t) => (
              <SubCard key={t.name} className="p-3 text-center">
                <KpiValue>{t.count}</KpiValue>
                <div className="text-[9px] text-ink-muted">Avg {t.avgLikes.toLocaleString()} likes</div>
              </SubCard>
            ))}
          </div>
        </div>
      </Card>

      {/* Top Performing Posts */}
      <Card>
        <SectionTitle>Top Performing Posts</SectionTitle>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-ink/10">
                <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-widest text-ink-muted">#</th>
                <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Content</th>
                <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Platform</th>
                <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Type</th>
                <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Likes</th>
                <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Comments</th>
                <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Eng. Rate</th>
              </tr>
            </thead>
            <tbody>
              {topPosts.map((post, i) => (
                <tr key={post.id} className="border-b border-rule">
                  <td className="py-2.5 pr-4 font-mono text-ink-muted">{i + 1}</td>
                  <td className="max-w-[200px] truncate py-2.5 pr-4 font-medium text-ink">{post.caption || "(no caption)"}</td>
                  <td className="py-2.5 pr-4 capitalize text-ink-secondary">{post.platform}</td>
                  <td className="py-2.5 pr-4 text-ink-secondary">{post.isVideo ? "Video" : "Image"}</td>
                  <td className="py-2.5 pr-4 text-right font-mono font-bold text-ink">{post.likesCount.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-ink-secondary">{post.commentsCount.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-editorial-red">{post.engagementRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Worst Performing */}
      {worstPosts.length > 0 && (
        <Card>
          <SectionTitle>Lowest Performing Posts</SectionTitle>
          <div className="mt-3 space-y-2">
            {worstPosts.map((post, i) => {
              const maxLikes = Math.max(...posts.map((p) => p.likesCount), 1);
              const pct = (post.likesCount / maxLikes) * 100;
              return (
                <div key={post.id} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 font-mono text-xs text-ink-muted">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="max-w-[300px] truncate font-medium text-ink">{post.caption || "(no caption)"}</span>
                      <span className="font-mono font-bold text-ink">{post.likesCount.toLocaleString()} likes</span>
                    </div>
                    <ProgressBar pct={pct} color="bg-editorial-red/40" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROWTH TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function GrowthTab({
  platformGrowth,
  selectedProfileId,
}: {
  platformGrowth: PlatformGrowthComparison[];
  selectedProfileId: string | null;
}) {
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";

  if (platformGrowth.length === 0) {
    return (
      <EmptyState
        title="No Growth Data Yet"
        message="Growth data is calculated from daily metric snapshots. Sync your profiles regularly and check back in a few days."
        action="Go to Profiles to sync"
        href="/dashboard/profiles"
      />
    );
  }

  const selected = platformGrowth.find((pg) => pg.profileId === selectedProfileId);
  const maxFollowers = Math.max(...platformGrowth.map((pg) => pg.currentFollowers), 1);

  // Build chart data for platform comparison
  const chartData = platformGrowth.map((pg) => ({
    name: `@${pg.handle}`,
    followers: pg.currentFollowers,
    growth: pg.growth,
    growthPct: pg.growthPct,
    fill: pg.profileId === selectedProfileId ? "#c0392b" : "#5b9cf5",
  }));

  return (
    <div className="space-y-4">
      {/* Selected profile highlight */}
      {selected && (
        <Card className="text-center">
          <KpiLabel>{selected.platform} &middot; @{selected.handle}</KpiLabel>
          <KpiValue className="!text-5xl">{selected.currentFollowers.toLocaleString()}</KpiValue>
          <div className="text-xs text-ink-muted">followers</div>
          <div className={cn("mt-2 text-lg font-bold", selected.growth >= 0 ? "text-editorial-green" : "text-editorial-red")}>
            {selected.growth >= 0 ? "+" : ""}{selected.growth.toLocaleString()} ({selected.growthPct}%)
          </div>
          <div className="text-[10px] text-ink-muted">30-day change</div>
        </Card>
      )}

      {/* Platform Growth Comparison Chart */}
      <Card>
        <SectionTitle>Platform Growth Comparison (30 Days)</SectionTitle>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={Math.max(160, platformGrowth.length * 52)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: "var(--color-ink-muted, #999)" }} tickLine={false} axisLine={{ stroke: "rgba(var(--accent-rgb),0.15)" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink, #fff)" }} width={120} tickLine={false} axisLine={false} />
              <RechartsTooltip
                contentStyle={{ backgroundColor: "var(--color-surface-card, #1a1a2e)", border: "1px solid var(--color-modern-card-border, #333)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(value: unknown) => [`${Number(value).toLocaleString()}`, "Followers"]}
              />
              <Bar dataKey="followers" name="Followers" radius={ed ? [0, 0, 0, 0] : [0, 4, 4, 0]} barSize={20}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Growth Rate Bars */}
      <Card>
        <SectionTitle>Growth Rate by Platform</SectionTitle>
        <div className="mt-3 space-y-3">
          {platformGrowth.map((pg) => {
            const isSelected = pg.profileId === selectedProfileId;
            const barPct = Math.min(Math.abs(pg.growthPct) * 5, 100);
            return (
              <div key={pg.profileId}>
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-medium", isSelected ? "text-editorial-red" : "text-ink")}>
                    {pg.platform} &middot; @{pg.handle}
                  </span>
                  <span className={cn("font-mono font-bold", pg.growth >= 0 ? "text-editorial-green" : "text-editorial-red")}>
                    {pg.growth >= 0 ? "+" : ""}{pg.growthPct}%
                  </span>
                </div>
                <ProgressBar pct={barPct} color={pg.growth >= 0 ? "bg-editorial-green" : "bg-editorial-red"} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Milestone Tracker */}
      {selectedProfileId && (
        <Card>
          <SectionTitle>Milestone Tracker</SectionTitle>
          <p className="mt-1 text-[10px] text-ink-muted">
            Growth projections based on your last 30 days of data.
          </p>
          <MilestoneSection profileId={selectedProfileId} />
        </Card>
      )}
    </div>
  );
}

function MilestoneSection({ profileId }: { profileId: string }) {
  const [milestones, setMilestones] = useState<{
    currentFollowers: number;
    dailyGrowthRate: number;
    milestones: Array<{ target: number; label: string; estimatedDate: string | null; daysAway: number | null }>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { getMilestoneProjection } = await import("@/lib/dal/analytics");
      const data = await getMilestoneProjection(profileId);
      setMilestones(data);
    })();
  }, [profileId]);

  if (!milestones?.milestones.length) {
    return <p className="mt-2 text-xs text-ink-secondary italic">Not enough data to project milestones yet.</p>;
  }

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex items-center gap-3 text-xs text-ink-secondary">
        <span>Daily growth rate:</span>
        <span className="font-mono font-bold text-editorial-green">{milestones.dailyGrowthRate}/day</span>
      </div>
      {milestones.milestones.map((m) => {
        const progress = m.daysAway ? Math.min((milestones.currentFollowers / m.target) * 100, 100) : 0;
        return (
          <SubCard key={m.target} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink">{m.label} followers</span>
              <span className="text-[10px] text-ink-muted">
                {m.daysAway ? `~${m.daysAway} days (${m.estimatedDate})` : "Insufficient data"}
              </span>
            </div>
            <ProgressBar pct={progress} />
            <div className="mt-1 text-right text-[9px] font-mono text-ink-muted">{progress.toFixed(0)}%</div>
          </SubCard>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REVENUE TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function RevenueTab({ data }: { data?: Record<string, unknown> }) {
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  if (!data) {
    return (
      <EmptyState
        title="No Revenue Data Yet"
        message="Run an Earnings Forecast from the Monetization page to see revenue projections, income sources, and recommended rates here."
        action="Run Earnings Forecast"
        href="/dashboard/business?tab=monetization"
      />
    );
  }

  const result = extractResult(data);
  const scenarios = (result.scenarios ?? result.earningScenarios) as Array<Record<string, unknown>> | undefined;
  const sources = (result.revenueSources ?? result.revenue_sources ?? result.incomeSources) as Array<Record<string, unknown>> | undefined;
  const rates = (result.recommendedRates ?? result.recommended_rates ?? result.sponsorshipRates) as Array<Record<string, unknown>> | undefined;

  const scenarioColors = ["#5b9cf5", "#c0392b", "#4ade80"];

  return (
    <div className="space-y-4">
      {/* Earnings Forecast — Visual Cards */}
      {scenarios && scenarios.length > 0 && (
        <Card>
          <SectionTitle>Earnings Forecast</SectionTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {scenarios.map((s, i) => {
              const label = (s.name ?? s.scenario) as string;
              const monthly = (s.monthly ?? s.monthlyEarnings) as number | undefined;
              const annual = (s.annually ?? s.annualEarnings ?? (monthly ? monthly * 12 : null)) as number | null;
              return (
                <SubCard key={i} className="p-4 text-center">
                  <div className="mb-2 h-1 w-full" style={{ backgroundColor: scenarioColors[i] ?? "#999" }} />
                  <KpiLabel>{label}</KpiLabel>
                  <KpiValue>${monthly?.toLocaleString() ?? "N/A"}</KpiValue>
                  <p className="text-xs text-ink-muted">/month</p>
                  {annual && <p className="mt-1 text-[10px] text-ink-secondary">${annual.toLocaleString()}/year</p>}
                </SubCard>
              );
            })}
          </div>

          {/* Scenario comparison bar chart */}
          {scenarios.length > 1 && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={scenarios.map((s, i) => ({
                    name: (s.name ?? s.scenario) as string,
                    monthly: (s.monthly ?? s.monthlyEarnings) as number ?? 0,
                    fill: scenarioColors[i] ?? "#999",
                  }))}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--accent-rgb),0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-ink-muted, #999)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--color-ink-muted, #999)" }} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "var(--color-surface-card, #1a1a2e)", border: "1px solid var(--color-modern-card-border, #333)", borderRadius: "8px", fontSize: "11px" }}
                    formatter={(value: unknown) => [`$${Number(value).toLocaleString()}`, "Monthly"]}
                  />
                  <Bar dataKey="monthly" name="Monthly" radius={ed ? [0, 0, 0, 0] : [4, 4, 0, 0]} barSize={40}>
                    {scenarios.map((_, i) => (
                      <Cell key={i} fill={scenarioColors[i] ?? "#999"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {/* Revenue Sources with progress bars */}
      {sources && sources.length > 0 && (
        <Card>
          <SectionTitle>Revenue Sources</SectionTitle>
          <div className="mt-3 space-y-3">
            {(() => {
              const maxAmount = Math.max(...sources.map((src) => (src.monthly ?? src.monthlyRevenue ?? src.amount ?? 0) as number), 1);
              return sources.map((src, i) => {
                const name = (src.name ?? src.source ?? src.type) as string;
                const amount = (src.monthly ?? src.monthlyRevenue ?? src.amount) as number | undefined;
                const pct = amount ? (amount / maxAmount) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink">{name}</span>
                      <span className="font-mono font-bold text-ink">{amount != null ? `$${amount.toLocaleString()}/mo` : "N/A"}</span>
                    </div>
                    <ProgressBar pct={pct} />
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      )}

      {/* Recommended Rates */}
      {rates && rates.length > 0 && (
        <Card>
          <SectionTitle>Recommended Rates</SectionTitle>
          <div className="mt-3 space-y-2">
            {rates.map((rate, i) => {
              const typeName = (rate.type ?? rate.content_type ?? rate.contentType ?? rate.name) as string;
              const minRate = (rate.rate ?? rate.price ?? rate.suggestedRate ?? rate.minRate) as number | undefined;
              const maxRate = (rate.maxRate ?? rate.highRate) as number | undefined;
              return (
                <SubCard key={i} className="flex items-center justify-between p-3">
                  <span className="text-xs font-medium text-ink">{typeName}</span>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-editorial-red">
                      ${minRate?.toLocaleString() ?? "N/A"}
                    </span>
                    {maxRate && (
                      <span className="font-mono text-xs text-ink-muted"> — ${maxRate.toLocaleString()}</span>
                    )}
                  </div>
                </SubCard>
              );
            })}
          </div>
        </Card>
      )}

      {!scenarios && !sources && !rates && (
        <EmptyState
          title="Analysis Data Incomplete"
          message="The earnings forecast didn't return detailed data. Try re-running from the Monetization page."
          action="Re-run Forecast"
          href="/dashboard/business?tab=monetization"
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPETITIVE TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function CompetitiveTab({
  data,
  profiles,
  selectedProfileId,
}: {
  data?: Record<string, unknown>;
  profiles: SocialProfile[];
  selectedProfileId: string;
}) {
  const profile = profiles.find((p) => p.id === selectedProfileId);

  if (!data) {
    return (
      <EmptyState
        title="No Competitive Data Yet"
        message="Run a Competitors analysis from the Intelligence page to see how you stack up."
        action="Run Competitor Analysis"
        href="/dashboard/intelligence?tab=competitors"
      />
    );
  }

  const result = extractResult(data);
  const overview = result.overview as string | undefined;
  const strengths = result.strengths as string[] | undefined;
  const weaknesses = result.weaknesses as string[] | undefined;
  const opportunities = result.opportunities as string[] | undefined;
  const threats = result.threats as string[] | undefined;
  const competitors = result.competitors as Array<Record<string, unknown>> | undefined;

  const swotSections = [
    { key: "strengths", label: "Strengths", items: strengths, color: "text-editorial-green", borderColor: "border-editorial-green/30", bgColor: "bg-editorial-green/5", icon: "S" },
    { key: "weaknesses", label: "Weaknesses", items: weaknesses, color: "text-editorial-red", borderColor: "border-editorial-red/30", bgColor: "bg-editorial-red/5", icon: "W" },
    { key: "opportunities", label: "Opportunities", items: opportunities, color: "text-blue-500", borderColor: "border-blue-500/30", bgColor: "bg-blue-500/5", icon: "O" },
    { key: "threats", label: "Threats", items: threats, color: "text-editorial-gold", borderColor: "border-editorial-gold/30", bgColor: "bg-editorial-gold/5", icon: "T" },
  ].filter((s) => s.items && s.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Overview */}
      {overview && (
        <Card>
          <SectionTitle>Competitive Overview</SectionTitle>
          <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{overview}</p>
        </Card>
      )}

      {/* SWOT Grid */}
      {swotSections.length > 0 && (
        <div className={cn("grid gap-3", swotSections.length > 2 ? "sm:grid-cols-2" : swotSections.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
          {swotSections.map((section) => (
            <Card key={section.key} className={cn(section.borderColor, section.bgColor, "bg-opacity-5")}>
              <div className="flex items-center gap-2">
                <span className={cn("flex h-6 w-6 items-center justify-center text-[10px] font-bold", section.color, section.borderColor, "border")}>
                  {section.icon}
                </span>
                <h4 className={cn("text-[10px] font-semibold uppercase tracking-wider", section.color)}>
                  {section.label}
                </h4>
              </div>
              <ul className="mt-2 space-y-1.5">
                {section.items!.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-ink">
                    <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", section.color.replace("text-", "bg-"))} />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Competitor Comparison Table */}
      {competitors && competitors.length > 0 && (
        <Card>
          <SectionTitle>Competitor Comparison</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-ink/10">
                  <th className="pb-2 pr-4 text-left text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Handle</th>
                  <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Followers</th>
                  <th className="pb-2 pr-4 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Eng. Rate</th>
                  <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-widest text-ink-muted">Growth</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((comp, i) => (
                  <tr key={i} className="border-b border-rule">
                    <td className="py-2.5 pr-4 font-medium text-ink">@{(comp.handle ?? comp.name ?? comp.username) as string}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-ink">{((comp.followers ?? comp.followerCount) as number)?.toLocaleString() ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-right font-mono text-ink">{((comp.engagementRate ?? comp.engagement_rate) as number)?.toFixed(2) ?? "—"}%</td>
                    <td className="py-2.5 text-right font-mono">
                      <span className={cn(((comp.growth ?? comp.growthRate) as number) >= 0 ? "text-editorial-green" : "text-editorial-red")}>
                        {((comp.growth ?? comp.growthRate) as number) >= 0 ? "+" : ""}{((comp.growth ?? comp.growthRate) as number)?.toFixed(1) ?? "—"}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Your Position */}
      {profile && (
        <Card>
          <SectionTitle>Your Position</SectionTitle>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <SubCard className="p-4 text-center">
              <KpiLabel>Followers</KpiLabel>
              <KpiValue>{profile.followers_count.toLocaleString()}</KpiValue>
            </SubCard>
            <SubCard className="p-4 text-center">
              <KpiLabel>Avg Likes/Post</KpiLabel>
              <KpiValue className="text-editorial-red">{(() => { const rp = (profile as unknown as { recent_posts?: { likesCount?: number }[] }).recent_posts; if (!rp?.length) return "N/A"; return Math.round(rp.reduce((s, p) => s + (p.likesCount || 0), 0) / rp.length).toLocaleString(); })()}</KpiValue>
            </SubCard>
            <SubCard className="p-4 text-center">
              <KpiLabel>Posts</KpiLabel>
              <KpiValue>{profile.posts_count.toLocaleString()}</KpiValue>
            </SubCard>
          </div>
        </Card>
      )}

      {!overview && !strengths && !weaknesses && !opportunities && !competitors && (
        <EmptyState
          title="Analysis Data Incomplete"
          message="The competitor analysis didn't return detailed insights. Try re-running from the Intelligence page."
          action="Re-run Analysis"
          href="/dashboard/intelligence?tab=competitors"
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function EmptyState({ title, message, action, href }: { title: string; message: string; action?: string; href?: string }) {
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  return (
    <div className={cn("flex flex-col items-center justify-center bg-surface-card py-16 text-center", ed ? "border border-rule" : "rounded-[14px] border border-modern-card-border")}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-secondary">
          <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-secondary">{message}</p>
      {action && href && (
        <a href={href} className={cn("mt-4 border border-editorial-red/30 bg-editorial-red/5 px-4 py-2 text-[11px] font-semibold text-editorial-red transition-colors hover:bg-editorial-red/10", !ed && "rounded-full")}>
          {action}
        </a>
      )}
    </div>
  );
}

function extractResult(data: Record<string, unknown>): Record<string, unknown> {
  if (typeof data.raw === "string") {
    try { return extractResult(JSON.parse(data.raw)); } catch { return data; }
  }
  if (data.result && typeof data.result === "object") {
    return extractResult(data.result as Record<string, unknown>);
  }
  for (const key of ["audience", "forecast", "analysis"]) {
    if (data[key] && typeof data[key] === "object") return data[key] as Record<string, unknown>;
  }
  const keys = Object.keys(data);
  if (keys.length === 1 && typeof data[keys[0]] === "object" && data[keys[0]] !== null) {
    return data[keys[0]] as Record<string, unknown>;
  }
  return data;
}
