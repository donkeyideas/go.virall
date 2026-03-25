"use client";

import { useState, useTransition } from "react";
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
}

export function OverviewClient({
  profiles,
  recentPostsMap = {},
  analysisStatusMap = {},
}: OverviewClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    profiles[0]?.id ?? null,
  );
  const [showOnboarding, setShowOnboarding] = useState(profiles.length === 0);
  const [isSyncing, startSync] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [synced, setSynced] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  const totalAudience = profiles.reduce(
    (sum, p) => sum + (p.followers_count || 0),
    0,
  );
  const avgEngagement =
    profiles.length > 0
      ? profiles.reduce((sum, p) => sum + (p.engagement_rate || 0), 0) /
        profiles.length
      : 0;
  const totalPosts = profiles.reduce(
    (sum, p) => sum + (p.posts_count || 0),
    0,
  );

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
    startSync(async () => {
      await syncSocialProfile(selected.id);
      setSynced(true);
    });
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
          {[
            { label: "Profiles", value: profiles.length },
            {
              label: "Total Audience",
              value: totalAudience > 0 ? formatCompact(totalAudience) : "---",
            },
            {
              label: "Avg Engagement",
              value:
                avgEngagement > 0 ? `${avgEngagement.toFixed(1)}%` : "---",
            },
            {
              label: "Total Content",
              value: totalPosts > 0 ? formatCompact(totalPosts) : "---",
            },
            { label: "Est. Earnings", value: "---" },
          ].map((stat) => (
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
              Welcome to <span className="text-editorial-red">Go</span>Viral
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
              <h3 className="font-serif text-sm font-bold text-ink">AI Analyses</h3>
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
