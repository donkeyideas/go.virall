"use client";

import { useState, useCallback, useTransition } from "react";
import {
  Plus,
  Calendar,
  List,
  Filter,
  CalendarDays,
  Send,
  FileText,
  Clock,
  ChevronDown,
  X,
  Loader2,
  Handshake,
  DollarSign,
  ExternalLink,
} from "lucide-react";
import type { ScheduledPost, SocialPlatform, SocialProfile } from "@/types";
import { ContentCalendar, type DealEvent } from "@/components/dashboard/ContentCalendar";
import { PostComposer } from "@/components/dashboard/PostComposer";
import { ProposalModal } from "@/components/proposals/ProposalModal";
import { getScheduledPosts } from "@/lib/actions/publishing";

// ─── Constants ──────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#00f2ea",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  threads: "#999999",
  pinterest: "#E60023",
  twitch: "#9146FF",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  threads: "Threads",
  pinterest: "Pinterest",
  twitch: "Twitch",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  scheduled: "#3182CE",
  publishing: "#F59E0B",
  published: "#34D399",
  failed: "#EF4444",
  cancelled: "#9CA3AF",
};

const ALL_STATUSES = ["draft", "scheduled", "published", "failed", "cancelled"] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface PublishClientProps {
  posts: ScheduledPost[];
  profiles: SocialProfile[];
  stats: {
    total: number;
    scheduled: number;
    published: number;
    drafts: number;
  };
  dealEvents?: DealEvent[];
  currentUserId?: string;
}

type ViewTab = "calendar" | "list";

// ─── Component ──────────────────────────────────────────────────────────────

export default function PublishClient({ posts: initialPosts, profiles, stats, dealEvents = [], currentUserId }: PublishClientProps) {
  const [posts, setPosts] = useState<ScheduledPost[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<ViewTab>("calendar");
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [composerDefaultDate, setComposerDefaultDate] = useState<Date | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [proposalModalId, setProposalModalId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealEvent | null>(null);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<"scheduled_at" | "created_at" | "platform">(
    "scheduled_at",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ─── Refresh data ─────────────────────────────────────────────────────

  const refreshPosts = useCallback(() => {
    startTransition(async () => {
      const result = await getScheduledPosts();
      if (result.data) {
        setPosts(result.data);
      }
    });
  }, []);

  // ─── Filtered/sorted posts ────────────────────────────────────────────

  const filteredPosts = posts.filter((p) => {
    if (platformFilter !== "all" && p.platform !== platformFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    let cmp = 0;
    if (sortField === "scheduled_at") {
      cmp = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    } else if (sortField === "created_at") {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortField === "platform") {
      cmp = a.platform.localeCompare(b.platform);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // ─── Handlers ─────────────────────────────────────────────────────────

  function openComposer(post?: ScheduledPost | null, defaultDate?: Date) {
    setEditingPost(post || null);
    setComposerDefaultDate(defaultDate);
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setEditingPost(null);
    setComposerDefaultDate(undefined);
  }

  function handleComposerSaved() {
    refreshPosts();
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // ─── Computed stats (from current posts, live) ────────────────────────

  const liveStats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
    drafts: posts.filter((p) => p.status === "draft").length,
  };

  // ─── Styles ───────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 12,
    background: "var(--color-surface-card)",
    border: "1px solid rgba(var(--accent-rgb),0.12)",
  };

  const selectStyle: React.CSSProperties = {
    padding: "7px 12px",
    background: "var(--color-surface-inset)",
    border: "1px solid rgba(var(--accent-rgb),0.12)",
    borderRadius: 8,
    color: "var(--color-ink)",
    fontSize: 12,
    fontFamily: "inherit",
    outline: "none",
    cursor: "pointer",
    appearance: "none" as const,
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            Content Publisher
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              margin: "4px 0 0",
            }}
          >
            Schedule, manage, and publish content across all your platforms
          </p>
        </div>
        <button
          onClick={() => openComposer()}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            background: "var(--color-editorial-red)",
            border: "none",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          <Plus size={16} />
          Create New Post
        </button>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Posts",
            value: liveStats.total,
            icon: CalendarDays,
            color: "var(--color-editorial-blue)",
          },
          {
            label: "Scheduled",
            value: liveStats.scheduled,
            icon: Clock,
            color: "#3182CE",
          },
          {
            label: "Published",
            value: liveStats.published,
            icon: Send,
            color: "#34D399",
          },
          {
            label: "Drafts",
            value: liveStats.drafts,
            icon: FileText,
            color: "#6B7280",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              style={{
                ...cardStyle,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 16,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${stat.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--color-ink)",
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-ink-secondary)",
                    margin: "2px 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Switcher + Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {/* View tabs */}
        <div
          style={{
            display: "flex",
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
          }}
        >
          <button
            onClick={() => setActiveTab("calendar")}
            style={{
              padding: "8px 18px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              background:
                activeTab === "calendar" ? "rgba(var(--accent-rgb),0.12)" : "var(--color-surface-card)",
              color:
                activeTab === "calendar"
                  ? "var(--color-editorial-blue)"
                  : "var(--color-ink-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Calendar size={14} />
            Calendar
          </button>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              padding: "8px 18px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              borderLeft: "1px solid rgba(var(--accent-rgb),0.12)",
              cursor: "pointer",
              fontFamily: "inherit",
              background:
                activeTab === "list" ? "rgba(var(--accent-rgb),0.12)" : "var(--color-surface-card)",
              color:
                activeTab === "list"
                  ? "var(--color-editorial-blue)"
                  : "var(--color-ink-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <List size={14} />
            List View
          </button>
        </div>

        {/* Filter toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isPending && (
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: "var(--color-ink-muted)" }}
            />
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              background: showFilters ? "rgba(var(--accent-rgb),0.1)" : "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              color: showFilters ? "var(--color-editorial-blue)" : "var(--color-ink-secondary)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Filter size={13} />
            Filters
            {(platformFilter !== "all" || statusFilter !== "all") && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--color-editorial-red)",
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div
          style={{
            ...cardStyle,
            padding: 14,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-ink-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Platform
            </span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as SocialPlatform | "all")}
              style={selectStyle}
            >
              <option value="all">All Platforms</option>
              {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-ink-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {(platformFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setPlatformFilter("all");
                setStatusFilter("all");
              }}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                background: "rgba(239,68,68,0.08)",
                border: "none",
                color: "#EF4444",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <X size={12} />
              Clear Filters
            </button>
          )}

          <span
            style={{
              marginLeft: "auto",
              fontSize: 11,
              color: "var(--color-ink-muted)",
            }}
          >
            {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Main Content */}
      <div style={cardStyle}>
        {activeTab === "calendar" ? (
          <ContentCalendar
            posts={filteredPosts}
            dealEvents={dealEvents}
            onDayClick={() => {}}
            onPostClick={(post) => openComposer(post)}
            onNewPost={(date) => openComposer(null, date)}
            onDealClick={(deal) => setSelectedDeal(deal)}
          />
        ) : (
          renderListView()
        )}
      </div>

      {/* Post Composer slide-over */}
      {composerOpen && (
        <PostComposer
          post={editingPost}
          profiles={profiles}
          defaultDate={composerDefaultDate}
          onClose={closeComposer}
          onSaved={handleComposerSaved}
        />
      )}

      {/* Deal detail modal */}
      {selectedDeal && (
        <DealEventModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onViewProposal={
            selectedDeal.proposalId && currentUserId
              ? () => { setSelectedDeal(null); setProposalModalId(selectedDeal.proposalId!); }
              : undefined
          }
        />
      )}

      {/* Proposal modal from deal click */}
      {proposalModalId && currentUserId && (
        <ProposalModal
          open={!!proposalModalId}
          onClose={() => setProposalModalId(null)}
          proposalId={proposalModalId}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );

  // ─── List View ──────────────────────────────────────────────────────────

  function renderListView() {
    if (sortedPosts.length === 0 && dealEvents.length === 0) {
      return (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
          }}
        >
          <CalendarDays
            size={48}
            style={{
              color: "var(--color-ink-muted)",
              marginBottom: 16,
              opacity: 0.5,
            }}
          />
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink-secondary)",
              margin: "0 0 8px",
            }}
          >
            No posts yet
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-muted)",
              margin: "0 0 20px",
            }}
          >
            Create your first post to get started with content scheduling.
          </p>
          <button
            onClick={() => openComposer()}
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              background: "var(--color-editorial-red)",
              border: "none",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} />
            Create Post
          </button>
        </div>
      );
    }

    if (sortedPosts.length === 0 && dealEvents.length > 0) {
      return renderDealsList();
    }

    return (
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              {[
                { key: "platform" as const, label: "Platform" },
                { key: "scheduled_at" as const, label: "Scheduled" },
                { key: null, label: "Content" },
                { key: null, label: "Status" },
                { key: null, label: "Hashtags" },
                { key: null, label: "" },
              ].map((col, idx) => (
                <th
                  key={idx}
                  onClick={col.key ? () => toggleSort(col.key!) : undefined}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-ink-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
                    cursor: col.key ? "pointer" : "default",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label}
                    {col.key && sortField === col.key && (
                      <ChevronDown
                        size={10}
                        style={{
                          transform: sortDir === "asc" ? "rotate(0deg)" : "rotate(180deg)",
                          transition: "transform 0.15s",
                        }}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedPosts.map((post) => {
              const scheduledDate = new Date(post.scheduled_at);
              return (
                <tr
                  key={post.id}
                  onClick={() => openComposer(post)}
                  style={{
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(var(--accent-rgb),0.04)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  {/* Platform */}
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: PLATFORM_COLORS[post.platform] || "#4B9CD3",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: PLATFORM_COLORS[post.platform] || "#4B9CD3",
                        }}
                      >
                        {PLATFORM_LABELS[post.platform] || post.platform}
                      </span>
                    </div>
                  </td>

                  {/* Scheduled date */}
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--color-ink)" }}>
                      {scheduledDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink-muted)",
                        marginLeft: 6,
                      }}
                    >
                      {scheduledDate.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </td>

                  {/* Content preview */}
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                      maxWidth: 300,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        color: "var(--color-ink)",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {post.content}
                    </p>
                  </td>

                  {/* Status */}
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: `${STATUS_COLORS[post.status] || "#6B7280"}20`,
                        color: STATUS_COLORS[post.status] || "#6B7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {post.status}
                    </span>
                    {post.ai_optimized && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 3,
                          background: "rgba(var(--accent-rgb),0.12)",
                          color: "var(--color-editorial-blue)",
                          marginLeft: 6,
                        }}
                      >
                        AI
                      </span>
                    )}
                  </td>

                  {/* Hashtags */}
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                      maxWidth: 200,
                    }}
                  >
                    {(post.hashtags as string[])?.length > 0 ? (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--color-editorial-blue)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                      >
                        {(post.hashtags as string[]).slice(0, 3).join(" ")}
                        {(post.hashtags as string[]).length > 3
                          ? ` +${(post.hashtags as string[]).length - 3}`
                          : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>-</span>
                    )}
                  </td>

                  {/* Media indicator */}
                  <td
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                    }}
                  >
                    {(post.media_urls as string[])?.length > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--color-ink-muted)",
                        }}
                      >
                        {(post.media_urls as string[]).length} media
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {dealEvents.length > 0 && (
          <div style={{ marginTop: 16 }}>{renderDealsList()}</div>
        )}
      </div>
    );
  }

  function renderDealsList() {
    const stageLabels: Record<string, { label: string; color: string }> = {
      lead: { label: "Lead", color: "#6B7280" },
      outreach: { label: "Outreach", color: "#3B82F6" },
      negotiating: { label: "Negotiating", color: "#4B9CD3" },
      contracted: { label: "Contracted", color: "#F59E0B" },
      in_progress: { label: "In Progress", color: "#10B981" },
      delivered: { label: "Delivered", color: "#06B6D4" },
      invoiced: { label: "Invoiced", color: "#F97316" },
      paid: { label: "Paid", color: "#22C55E" },
      completed: { label: "Completed", color: "#4B9CD3" },
    };

    // Pipeline stage order for the progress dots
    const PIPELINE_ORDER = ["lead", "outreach", "negotiating", "contracted", "in_progress", "delivered", "invoiced", "paid", "completed"];

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "0 4px" }}>
          <Handshake size={14} style={{ color: "#10B981" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Active Deals ({dealEvents.length})
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dealEvents.map((deal) => {
            const stage = stageLabels[deal.stage] ?? { label: deal.stage, color: "#6B7280" };
            const initials = deal.title.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const fmtDate = (d: string) => {
              try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); } catch { return d; }
            };
            const stageIdx = PIPELINE_ORDER.indexOf(deal.stage);
            const paymentPct = deal.value && deal.value > 0 && deal.paidAmount
              ? Math.round((deal.paidAmount / deal.value) * 100) : 0;
            const delTotal = deal.deliverablesCount ?? 0;
            const delDone = deal.completedDeliverables ?? 0;

            // Days until end
            let daysLeft: number | null = null;
            if (deal.endDate) {
              daysLeft = Math.ceil((new Date(deal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            }

            return (
              <div
                key={deal.id}
                onClick={() => setSelectedDeal(deal)}
                style={{
                  padding: "16px 18px",
                  borderRadius: 12,
                  background: "var(--color-surface-card)",
                  border: "1px solid rgba(16,185,129,0.12)",
                  cursor: "pointer",
                  transition: "border-color 0.15s, transform 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${stage.color}40`;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(16,185,129,0.12)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Row 1: Brand + Value */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                    {deal.logoUrl ? (
                      <img src={deal.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: 10,
                        background: `linear-gradient(135deg, ${stage.color}aa, ${stage.color})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)" }}>{deal.title}</span>
                        <span style={{
                          padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                          background: `${stage.color}18`, color: stage.color,
                          textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>
                          {stage.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 11, color: "var(--color-ink-secondary)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} />
                          {fmtDate(deal.startDate)}
                          {deal.endDate && deal.endDate !== deal.startDate && ` — ${fmtDate(deal.endDate)}`}
                        </span>
                        {deal.contactEmail && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Send size={10} />
                            {deal.contactEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Value */}
                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 90 }}>
                    {deal.value != null && deal.value > 0 ? (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#34D399" }}>
                          ${deal.value.toLocaleString()}
                        </div>
                        {deal.paidAmount != null && deal.paidAmount > 0 && (
                          <div style={{ fontSize: 10, color: "var(--color-ink-secondary)", marginTop: 2 }}>
                            ${deal.paidAmount.toLocaleString()} paid
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-muted)" }}>--</div>
                    )}
                  </div>
                </div>

                {/* Row 2: Details grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 12,
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid rgba(var(--accent-rgb),0.06)",
                }}>
                  {/* Pipeline progress */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                      Pipeline
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {PIPELINE_ORDER.map((s, i) => (
                        <div
                          key={s}
                          style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            background: i <= stageIdx ? stage.color : "rgba(var(--accent-rgb),0.08)",
                            transition: "background 0.3s",
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--color-ink-muted)", marginTop: 3 }}>
                      Step {stageIdx + 1} of {PIPELINE_ORDER.length}
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                      Deliverables
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                      {delTotal > 0 ? `${delDone}/${delTotal} done` : "None yet"}
                    </div>
                  </div>

                  {/* Payment */}
                  {deal.value != null && deal.value > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                        Payment
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(var(--accent-rgb),0.08)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${paymentPct}%`, borderRadius: 2, background: paymentPct === 100 ? "#22C55E" : "#34D399", transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>{paymentPct}%</span>
                      </div>
                    </div>
                  )}

                  {/* Deadline */}
                  {daysLeft !== null && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                        Deadline
                      </div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: daysLeft < 0 ? "#EF4444" : daysLeft < 7 ? "#F59E0B" : "var(--color-ink)",
                      }}>
                        {daysLeft < 0 ? "Overdue" : daysLeft === 0 ? "Due today" : `${daysLeft} days left`}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes preview */}
                {deal.notes && (
                  <div style={{
                    marginTop: 10,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "rgba(var(--accent-rgb),0.04)",
                    fontSize: 11,
                    color: "var(--color-ink-secondary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    <FileText size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                    {deal.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

// ─── Deal Event Modal ──────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "#6B7280" },
  outreach: { label: "Outreach", color: "#3B82F6" },
  negotiating: { label: "Negotiating", color: "#4B9CD3" },
  contracted: { label: "Contracted", color: "#F59E0B" },
  in_progress: { label: "In Progress", color: "#10B981" },
  delivered: { label: "Delivered", color: "#06B6D4" },
  invoiced: { label: "Invoiced", color: "#F97316" },
  paid: { label: "Paid", color: "#22C55E" },
  completed: { label: "Completed", color: "#4B9CD3" },
};

function DealEventModal({
  deal,
  onClose,
  onViewProposal,
}: {
  deal: DealEvent;
  onClose: () => void;
  onViewProposal?: () => void;
}) {
  const stageInfo = STAGE_LABELS[deal.stage] ?? { label: deal.stage, color: "#6B7280" };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };

  const initials = deal.title
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm border border-rule bg-surface-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-ink-muted)",
            padding: 4,
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {deal.logoUrl ? (
              <img
                src={deal.logoUrl}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${stageInfo.color}aa, ${stageInfo.color})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
                {deal.title}
              </h3>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  padding: "3px 10px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  background: `${stageInfo.color}18`,
                  color: stageInfo.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {stageInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Value */}
          {deal.value != null && deal.value > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <DollarSign size={14} style={{ color: "#34D399", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Deal Value
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#34D399", marginTop: 2 }}>
                  ${deal.value.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Dates */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar size={14} style={{ color: "var(--color-ink-secondary)", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Timeline
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)", marginTop: 2 }}>
                {formatDate(deal.startDate)}
                {deal.endDate && deal.endDate !== deal.startDate && (
                  <> — {formatDate(deal.endDate)}</>
                )}
              </div>
            </div>
          </div>

          {/* Deal ID */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Handshake size={14} style={{ color: "var(--color-ink-secondary)", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Deal ID
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-ink-muted)", marginTop: 2, fontFamily: "monospace" }}>
                {deal.id.slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "12px 20px 16px",
            borderTop: "1px solid rgba(var(--accent-rgb),0.08)",
            display: "flex",
            gap: 8,
          }}
        >
          <a
            href="/dashboard/deals"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 12px",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              background: "#10B981",
              border: "none",
              borderRadius: 6,
              textDecoration: "none",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <ExternalLink size={12} />
            View in Deals
          </a>
          {onViewProposal && (
            <button
              onClick={onViewProposal}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--color-ink)",
                background: "rgba(var(--accent-rgb),0.08)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                borderRadius: 6,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <FileText size={12} />
              View Proposal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
