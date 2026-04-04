"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileSelector } from "../ProfileSelector";
import { AddProfileModal } from "../AddProfileModal";
import { AnalysisStatus } from "../AnalysisStatus";
import { RunAllButton } from "../RunAllButton";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import {
  RefreshCw,
  Loader2,
  ExternalLink,
  Users,
  UserPlus,
  FileText,
  Heart,
  MessageCircle,
  Play,
  PlayCircle,
  CheckCircle,
  Trash2,
  TrendingUp,
  Eye,
  Radio,
  Pin,
} from "lucide-react";
import { syncSocialProfile, deleteSocialProfile } from "@/lib/actions/profiles";
import {
  ANALYSIS_TYPES,
  PLATFORM_CONFIG,
  type SocialProfile,
  type AnalysisType,
} from "@/types";
import { formatCompact } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/track";
import { resolveStatsForProfile } from "@/lib/platform-stats";

const STAT_ICONS: Record<string, React.ReactNode> = {
  "file-text": <FileText size={14} />,
  users: <Users size={14} />,
  "user-plus": <UserPlus size={14} />,
  heart: <Heart size={14} />,
  "trending-up": <TrendingUp size={14} />,
  "play-circle": <PlayCircle size={14} />,
  eye: <Eye size={14} />,
  "message-circle": <MessageCircle size={14} />,
  pin: <Pin size={14} />,
  radio: <Radio size={14} />,
};

function statIcon(name: string): React.ReactNode {
  return STAT_ICONS[name] ?? <FileText size={14} />;
}

/**
 * Proxy Instagram CDN image URLs through our API route to avoid CORS/referrer blocking.
 * Only proxies URLs from known Instagram/Facebook CDN domains.
 */
function proxyImageUrl(url: string): string {
  if (!url || url === "undefined" || url === "null") return "";
  if (
    url.includes("instagram") ||
    url.includes("cdninstagram") ||
    url.includes("fbcdn") ||
    url.includes("scontent")
  ) {
    return `/api/proxy/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

interface RecentPost {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
}

interface OverviewClientProps {
  profiles: SocialProfile[];
  recentPostsMap?: Record<string, RecentPost[]>;
  analysisStatusMap?: Record<
    string,
    Record<AnalysisType, { hasData: boolean; createdAt: string | null }>
  >;
  estEarnings?: number;
}

export function OverviewClient({
  profiles,
  recentPostsMap = {},
  analysisStatusMap = {},
  estEarnings = 0,
}: OverviewClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null); // null = "All"
  const [showOnboarding, setShowOnboarding] = useState(profiles.length === 0);
  const [isSyncing, startSync] = useTransition();
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [synced, setSynced] = useState(false);
  const [syncedAll, setSyncedAll] = useState(false);
  const [syncAllStatus, setSyncAllStatus] = useState<Record<string, "pending" | "syncing" | "done" | "error">>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    trackEvent("page_view", "profiles");
  }, []);

  const isAllSelected = selectedId === null;
  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  // --- Aggregate KPIs (all profiles) ---
  const allAudience = profiles.reduce((sum, p) => sum + (p.followers_count || 0), 0);
  const allAvgLikes = (() => {
    let totalLikes = 0;
    let totalPostCount = 0;
    for (const p of profiles) {
      const posts = (p as unknown as { recent_posts?: { likesCount?: number }[] }).recent_posts;
      if (posts?.length) {
        totalLikes += posts.reduce((s, post) => s + (post.likesCount || 0), 0);
        totalPostCount += posts.length;
      }
    }
    return totalPostCount > 0 ? Math.round(totalLikes / totalPostCount) : 0;
  })();
  const allPosts = profiles.reduce((sum, p) => sum + (p.posts_count || 0), 0);

  // --- Per-profile KPIs ---
  const profileAvgLikes = (() => {
    if (!selected) return 0;
    const posts = (selected as unknown as { recent_posts?: { likesCount?: number }[] }).recent_posts;
    if (!posts?.length) return 0;
    const total = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
    return Math.round(total / posts.length);
  })();

  // KPI values based on selection
  const kpiStats = isAllSelected
    ? [
        { label: "Profiles", value: profiles.length },
        { label: "Total Audience", value: allAudience > 0 ? formatCompact(allAudience) : "---" },
        { label: "Avg Likes/Post", value: allAvgLikes > 0 ? formatCompact(allAvgLikes) : "---" },
        { label: "Total Content", value: allPosts > 0 ? formatCompact(allPosts) : "---" },
        { label: "Est. Earnings", value: estEarnings > 0 ? `$${estEarnings.toLocaleString()}` : "---" },
      ]
    : selected
      ? [
          { label: "Platform", value: (selected.platform ?? "").charAt(0).toUpperCase() + (selected.platform ?? "").slice(1) },
          { label: "Followers", value: selected.followers_count ? formatCompact(selected.followers_count) : "---" },
          { label: "Avg Likes/Post", value: profileAvgLikes > 0 ? formatCompact(profileAvgLikes) : "---" },
          { label: "Posts", value: selected.posts_count ? formatCompact(selected.posts_count) : "---" },
          { label: "Following", value: selected.following_count ? formatCompact(selected.following_count) : "---" },
        ]
      : [];

  // Get recent posts for the currently selected profile
  const recentPosts = selectedId ? (recentPostsMap[selectedId] ?? []) : [];

  // Get analysis status for the currently selected profile
  const statusData: Record<
    AnalysisType,
    { hasData: boolean; createdAt: string | null }
  > = (() => {
    const profileStatus = selectedId ? analysisStatusMap[selectedId] : undefined;
    if (profileStatus) return profileStatus;
    const s = {} as Record<AnalysisType, { hasData: boolean; createdAt: string | null }>;
    for (const { type } of ANALYSIS_TYPES) {
      s[type] = { hasData: false, createdAt: null };
    }
    return s;
  })();

  function handleSync() {
    if (!selected) return;
    setSynced(false);
    trackEvent("profile_sync", "profiles", { platform: selected.platform });
    startSync(async () => {
      await syncSocialProfile(selected.id);
      setSynced(true);
      router.refresh();
    });
  }

  async function handleSyncAll() {
    setSyncedAll(false);
    setIsSyncingAll(true);
    const initial: Record<string, "pending" | "syncing" | "done" | "error"> = {};
    for (const p of profiles) initial[p.id] = "pending";
    setSyncAllStatus(initial);
    trackEvent("profile_sync_all", "profiles");
    try {
      for (let i = 0; i < profiles.length; i += 2) {
        const batch = profiles.slice(i, i + 2);
        // Mark batch as syncing
        setSyncAllStatus((prev) => {
          const next = { ...prev };
          for (const p of batch) next[p.id] = "syncing";
          return next;
        });
        const results = await Promise.allSettled(batch.map((p) => syncSocialProfile(p.id)));
        // Mark batch as done/error
        setSyncAllStatus((prev) => {
          const next = { ...prev };
          for (let j = 0; j < batch.length; j++) {
            next[batch[j].id] = results[j].status === "fulfilled" ? "done" : "error";
          }
          return next;
        });
      }
      setSyncedAll(true);
      // Re-fetch server data so individual profile views update
      router.refresh();
    } catch (err) {
      console.error("[handleSyncAll] error:", err);
    } finally {
      setIsSyncingAll(false);
    }
  }

  function handleDelete() {
    if (!selected) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startDelete(async () => {
      await deleteSocialProfile(selected.id);
      setConfirmDelete(false);
      // Select the next available profile
      const remaining = profiles.filter((p) => p.id !== selected.id);
      setSelectedId(remaining[0]?.id ?? null);
    });
  }

  const platformUrl = selected
    ? getPlatformUrl(selected.platform, selected.handle)
    : null;

  return (
    <>
      {profiles.length > 0 && (
        <ProfileSelector
          profiles={profiles}
          selectedId={selectedId}
          showAll
          onSelectAll={() => {
            setSelectedId(null);
            setSynced(false);
            setConfirmDelete(false);
          }}
          onSelect={(id) => {
            setSelectedId(id);
            setSynced(false);
            setConfirmDelete(false);
          }}
        />
      )}

      <div className="mt-4">
        {/* KPI Bar */}
        <div className="grid grid-cols-2 border border-rule bg-surface-card sm:grid-cols-3 lg:grid-cols-5">
          {kpiStats.map((stat) => (
            <div
              key={stat.label}
              className="border-b border-r border-rule px-4 py-4 last:border-r-0"
            >
              <p className="editorial-overline">{stat.label}</p>
              <p className="mt-1 font-serif text-2xl font-bold text-ink">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {profiles.length === 0 ? (
          <div className="mt-8 border border-rule bg-surface-card px-6 py-16 text-center">
            <h2 className="font-serif text-2xl font-bold text-ink">
              Welcome to <span className="text-editorial-red">Go</span>Virall
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-secondary">
              Connect your first social media profile to get started with
              analytics, growth strategies, and content intelligence.
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="mt-6 bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/80"
            >
              + Add Profile
            </button>
          </div>
        ) : isAllSelected ? (
          <div className="mt-6 space-y-6">
            {/* ─── Sync All Button ─── */}
            <div className="flex justify-end">
              <button
                onClick={handleSyncAll}
                disabled={isSyncingAll}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest transition-all disabled:opacity-50 ${
                  syncedAll
                    ? "border border-green-600/50 text-green-500"
                    : "border border-rule text-ink-secondary hover:border-ink-muted hover:text-ink"
                }`}
              >
                {isSyncingAll ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : syncedAll ? (
                  <CheckCircle size={12} />
                ) : (
                  <RefreshCw size={12} />
                )}
                {isSyncingAll ? "Syncing All..." : syncedAll ? "All Synced" : "Sync All Profiles"}
              </button>
            </div>

            {/* ─── All Profiles Grid ─── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((p) => {
                const pAvgLikes = (() => {
                  const posts = (p as unknown as { recent_posts?: { likesCount?: number }[] }).recent_posts;
                  if (!posts?.length) return 0;
                  return Math.round(posts.reduce((s, post) => s + (post.likesCount || 0), 0) / posts.length);
                })();
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedId(p.id);
                      setSynced(false);
                      setConfirmDelete(false);
                    }}
                    className="border border-rule bg-surface-card p-4 text-left transition-colors hover:border-ink-muted"
                  >
                    <div className="flex items-center gap-3">
                      {p.avatar_url ? (
                        <img
                          src={proxyImageUrl(p.avatar_url)}
                          alt={p.handle}
                          className="h-10 w-10 rounded-full border border-rule object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-surface-raised">
                          <PlatformIcon platform={p.platform} size={20} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={p.platform} size={14} className="shrink-0 text-ink-muted" />
                          <span className="truncate font-serif text-sm font-bold text-ink">
                            @{p.handle}
                          </span>
                        </div>
                        <p className="text-[10px] text-ink-muted">
                          {PLATFORM_CONFIG[p.platform]?.label || p.platform}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Followers</p>
                        <p className="font-serif text-sm font-bold text-ink">
                          {p.followers_count ? formatCompact(p.followers_count) : "---"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Posts</p>
                        <p className="font-serif text-sm font-bold text-ink">
                          {p.posts_count ? formatCompact(p.posts_count) : "---"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted">Avg Likes</p>
                        <p className="font-serif text-sm font-bold text-ink">
                          {pAvgLikes > 0 ? formatCompact(pAvgLikes) : "---"}
                        </p>
                      </div>
                    </div>
                    {p.last_synced_at && (
                      <p className="mt-2 text-[9px] text-ink-muted">
                        Last synced: {new Date(p.last_synced_at).toLocaleString()}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ─── Recent Posts (all profiles combined) ─── */}
            {(() => {
              const allPosts: (RecentPost & { platform: string })[] = [];
              for (const p of profiles) {
                const posts = recentPostsMap[p.id] ?? [];
                for (const post of posts) {
                  allPosts.push({ ...post, platform: p.platform });
                }
              }
              allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              const topPosts = allPosts.slice(0, 8);
              if (topPosts.length === 0) return null;
              return (
                <div>
                  <h3 className="font-serif text-sm font-bold text-ink mb-3">Recent Posts</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {topPosts.map((post) => (
                      <div
                        key={post.id}
                        className="group relative overflow-hidden border border-rule bg-surface-card"
                      >
                        <div className="relative aspect-square bg-surface-raised">
                          {post.imageUrl ? (
                            <img
                              src={proxyImageUrl(post.imageUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-ink-muted">
                              <FileText size={24} />
                            </div>
                          )}
                          {post.isVideo && (
                            <div className="absolute right-2 top-2 rounded-md bg-ink/70 p-1">
                              <Play size={12} className="text-white" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-1 text-sm font-bold text-white">
                              <Heart size={14} />
                              {formatCompact(post.likesCount)}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-bold text-white">
                              <MessageCircle size={14} />
                              {formatCompact(post.commentsCount)}
                            </span>
                          </div>
                        </div>
                        {post.caption && (
                          <div className="px-2.5 py-2">
                            <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-secondary">
                              {decodeUnicodeEscapes(post.caption)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ─── Go Virall Analyses (run for first profile) ─── */}
            {profiles[0] && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm font-bold text-ink">Go Virall Analyses</h3>
                  <RunAllButton profileId={profiles[0].id} allProfileIds={profiles.map(p => p.id)} />
                </div>
                <AnalysisStatus status={(() => {
                  const s = analysisStatusMap[profiles[0].id];
                  if (s) return s;
                  const empty = {} as Record<AnalysisType, { hasData: boolean; createdAt: string | null }>;
                  for (const { type } of ANALYSIS_TYPES) {
                    empty[type] = { hasData: false, createdAt: null };
                  }
                  return empty;
                })()} />
              </>
            )}
          </div>
        ) : selected ? (
          <div className="mt-6 space-y-6">
            {/* ─── Profile Card ─── */}
            <div className="border border-rule bg-surface-card p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {selected.avatar_url ? (
                    <img
                      src={proxyImageUrl(selected.avatar_url)}
                      alt={selected.handle}
                      className="h-20 w-20 rounded-full border-2 border-rule object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-rule bg-surface-raised">
                      <PlatformIcon platform={selected.platform} size={32} />
                    </div>
                  )}
                  {selected.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                      <CheckCircle size={12} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <PlatformIcon
                      platform={selected.platform}
                      size={16}
                      className="text-ink-muted"
                    />
                    <h2 className="font-serif text-xl font-bold text-ink">
                      {selected.display_name || selected.handle}
                    </h2>
                    <span className="text-sm text-ink-muted">
                      @{selected.handle}
                    </span>
                  </div>

                  {selected.bio && (
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-secondary">
                      {selected.bio}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {platformUrl && (
                      <a
                        href={platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 border border-rule px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink"
                      >
                        <ExternalLink size={11} />
                        View on{" "}
                        {PLATFORM_CONFIG[selected.platform].label}
                      </a>
                    )}
                    {(() => {
                      const needsSync = !selected.last_synced_at || recentPosts.length === 0;
                      const syncLabel = isSyncing
                        ? "Syncing..."
                        : synced
                          ? "Synced \u2713"
                          : needsSync
                            ? "Sync Now"
                            : "Sync Data";
                      return (
                        <button
                          onClick={handleSync}
                          disabled={isSyncing}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all disabled:opacity-50 ${
                            synced
                              ? "border border-green-600/50 text-green-500"
                              : needsSync && !isSyncing
                                ? "bg-editorial-red text-white animate-pulse hover:bg-editorial-red/80"
                                : "border border-rule text-ink-secondary hover:border-ink-muted hover:text-ink"
                          }`}
                        >
                          {isSyncing ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : synced ? (
                            <CheckCircle size={11} />
                          ) : (
                            <RefreshCw size={11} />
                          )}
                          {syncLabel}
                        </button>
                      );
                    })()}
                    <button
                      onClick={handleDelete}
                      onBlur={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all disabled:opacity-50 ${
                        confirmDelete
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "border border-rule text-ink-muted hover:border-red-400 hover:text-red-500"
                      }`}
                    >
                      {isDeleting ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Trash2 size={11} />
                      )}
                      {isDeleting
                        ? "Deleting..."
                        : confirmDelete
                          ? "Confirm Delete"
                          : "Delete"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats row — platform-specific */}
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-4">
                {resolveStatsForProfile(selected, formatCompact).map((stat) => (
                  <StatCell
                    key={stat.label}
                    icon={statIcon(stat.icon)}
                    label={stat.label}
                    value={stat.value}
                  />
                ))}
              </div>

              {selected.last_synced_at && (
                <p className="mt-3 text-[10px] text-ink-muted">
                  Last synced:{" "}
                  {new Date(selected.last_synced_at).toLocaleString()}
                </p>
              )}
            </div>

            {/* ─── Recent Posts Grid ─── */}
            {recentPosts.length === 0 && selected.last_synced_at && (
              <div className="border border-rule bg-surface-card px-5 py-6 text-center">
                <FileText size={24} className="mx-auto text-ink-muted" />
                <p className="mt-2 text-sm font-medium text-ink-secondary">
                  Recent posts unavailable
                </p>
                <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
                  Post data for {PLATFORM_CONFIG[selected.platform]?.label || selected.platform} is not available at this time. Profile stats are synced.
                </p>
                <a
                  href={getPlatformUrl(selected.platform, selected.handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent-primary hover:underline"
                >
                  View posts on {PLATFORM_CONFIG[selected.platform]?.label || selected.platform}
                  <ExternalLink size={10} />
                </a>
              </div>
            )}
            {recentPosts.length > 0 && (
              <div>
                <h3 className="font-serif text-sm font-bold text-ink mb-3">Recent Posts</h3>
                {isTextPlatform(selected.platform) ? (
                  /* ── Text-based layout for X, Threads, LinkedIn ── */
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recentPosts.slice(0, 6).map((post) => (
                      <div
                        key={post.id}
                        className="group border border-rule bg-surface-card p-4 transition-colors hover:border-ink-muted"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0 text-ink-muted">
                            <PlatformIcon platform={selected.platform} size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-relaxed text-ink">
                              {decodeUnicodeEscapes(post.caption || "No content")}
                            </p>
                            <div className="mt-2.5 flex items-center gap-3 text-[10px] text-ink-muted">
                              {post.likesCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Heart size={10} />
                                  {formatCompact(post.likesCount)}
                                </span>
                              )}
                              {post.commentsCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <MessageCircle size={10} />
                                  {formatCompact(post.commentsCount)}
                                </span>
                              )}
                              {post.timestamp && (
                                <span>
                                  {formatPostDate(post.timestamp)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ── Image-based layout for Instagram, TikTok, YouTube, Pinterest ── */
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {recentPosts.slice(0, 4).map((post) => (
                      <div
                        key={post.id}
                        className="group relative overflow-hidden border border-rule bg-surface-card"
                      >
                        <div className="relative aspect-square bg-surface-raised">
                          {post.imageUrl ? (
                            <img
                              src={proxyImageUrl(post.imageUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-ink-muted">
                              <FileText size={24} />
                            </div>
                          )}
                          {post.isVideo && (
                            <div className="absolute right-2 top-2 rounded-md bg-ink/70 p-1">
                              <Play size={12} className="text-white" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-ink/60 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="flex items-center gap-1 text-sm font-bold text-white">
                              <Heart size={14} />
                              {formatCompact(post.likesCount)}
                            </span>
                            <span className="flex items-center gap-1 text-sm font-bold text-white">
                              <MessageCircle size={14} />
                              {formatCompact(post.commentsCount)}
                            </span>
                          </div>
                        </div>
                        {post.caption && (
                          <div className="px-2.5 py-2">
                            <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-secondary">
                              {decodeUnicodeEscapes(post.caption)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── Run All + Analysis Status ─── */}
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold text-ink">Go Virall Analyses</h3>
              <RunAllButton profileId={selected.id} />
            </div>
            <AnalysisStatus status={statusData} />
          </div>
        ) : null}
      </div>

      <AddProfileModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onboarding={profiles.length === 0}
      />

      {/* Sync All Progress Modal */}
      {isSyncingAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-md border border-rule bg-surface-card p-6 shadow-xl">
            <div className="mb-5 flex items-center gap-3">
              <Loader2 size={20} className="animate-spin text-editorial-red" />
              <div>
                <h3 className="font-serif text-base font-bold text-ink">Syncing All Profiles</h3>
                <p className="text-[11px] text-ink-muted">
                  {Object.values(syncAllStatus).filter((s) => s === "done").length}/{profiles.length} completed
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-1.5 flex justify-between text-[10px] text-ink-muted">
                <span>Progress</span>
                <span>{Math.round((Object.values(syncAllStatus).filter((s) => s === "done").length / profiles.length) * 100)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden bg-surface-raised">
                <div
                  className="h-full bg-editorial-red transition-all duration-500 ease-out"
                  style={{ width: `${(Object.values(syncAllStatus).filter((s) => s === "done").length / profiles.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {profiles.map((p) => {
                const s = syncAllStatus[p.id] ?? "pending";
                return (
                  <div key={p.id} className="flex items-center gap-3 py-1">
                    {s === "done" ? (
                      <CheckCircle size={14} className="shrink-0 text-editorial-green" />
                    ) : s === "syncing" ? (
                      <Loader2 size={14} className="shrink-0 animate-spin text-editorial-red" />
                    ) : s === "error" ? (
                      <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-editorial-red/20 text-editorial-red text-[9px] font-bold">!</div>
                    ) : (
                      <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-ink-muted/20" />
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                      <PlatformIcon platform={p.platform} size={14} />
                      <span className={`text-xs truncate ${s === "done" ? "text-ink-secondary line-through decoration-ink-muted/30" : s === "syncing" ? "font-medium text-ink" : "text-ink-muted"}`}>
                        @{p.handle}
                      </span>
                    </div>
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      {s === "done" ? "Synced" : s === "syncing" ? "Syncing..." : s === "error" ? "Failed" : "Waiting"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-surface-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-ink-muted">
        {icon}
        <span className="text-[9px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1 font-serif text-xl font-bold text-ink">{value}</p>
    </div>
  );
}


/** Platforms where posts are primarily text (no images expected) */
function isTextPlatform(platform: string): boolean {
  return ["twitter", "threads", "linkedin"].includes(platform);
}

/** Decode unicode escape sequences like \u2019 → ' */
function decodeUnicodeEscapes(text: string): string {
  return text.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

/** Format a post timestamp to a readable date */
function formatPostDate(timestamp: string): string {
  if (!timestamp) return "";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getPlatformUrl(platform: string, handle: string): string {
  const urls: Record<string, string> = {
    instagram: `https://instagram.com/${handle}`,
    tiktok: `https://tiktok.com/@${handle}`,
    youtube: `https://youtube.com/@${handle}`,
    twitter: `https://x.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
    threads: `https://threads.net/@${handle}`,
    pinterest: `https://pinterest.com/${handle}`,
    twitch: `https://twitch.tv/${handle}`,
  };
  return urls[platform] || "#";
}
