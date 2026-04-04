"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";
import type { SocialPost } from "@/types";
import {
  createSocialPost,
  updateSocialPost,
  deleteSocialPost,
} from "@/lib/actions/admin";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "published"
      ? "text-editorial-green"
      : status === "scheduled"
        ? "text-editorial-gold"
        : "text-ink-muted";
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-widest ${color}`}
    >
      {status}
    </span>
  );
}

const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#000000",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0077B5",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "Twitter",
  linkedin: "LinkedIn",
};

export function SocialPostsClient({ posts }: { posts: SocialPost[] }) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Create form state
  const [newPlatform, setNewPlatform] = useState<string>("instagram");
  const [newContent, setNewContent] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [newStatus, setNewStatus] = useState<string>("draft");

  // Edit form state
  const [editPlatform, setEditPlatform] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editMediaUrl, setEditMediaUrl] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.platform.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [posts, search]);

  // Platform distribution data
  const platformDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const post of posts) {
      counts[post.platform] = (counts[post.platform] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform,
        label: PLATFORM_LABELS[platform] ?? platform,
        count,
        pct: (count / maxCount) * 100,
        color: PLATFORM_COLORS[platform] ?? "#888888",
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  function handleCreate() {
    if (!newContent.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await createSocialPost({
        platform: newPlatform,
        content: newContent,
        media_url: newMediaUrl || undefined,
        scheduled_at: newScheduledAt || undefined,
        status: newStatus,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
        setNewContent("");
        setNewMediaUrl("");
        setNewScheduledAt("");
        setNewStatus("draft");
        setNewPlatform("instagram");
      }
    });
  }

  function startEdit(post: SocialPost) {
    setEditingId(post.id);
    setEditPlatform(post.platform);
    setEditContent(post.content);
    setEditMediaUrl(post.media_url ?? "");
    setEditScheduledAt(
      post.scheduled_at
        ? new Date(post.scheduled_at).toISOString().slice(0, 16)
        : "",
    );
    setEditStatus(post.status);
  }

  function handleUpdate() {
    if (!editingId || !editContent.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateSocialPost(editingId!, {
        platform: editPlatform,
        content: editContent,
        media_url: editMediaUrl || undefined,
        scheduled_at: editScheduledAt || undefined,
        status: editStatus,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this social post?")) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteSocialPost(id);
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Social Posts
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          {showCreate ? <X size={20} /> : <Plus size={20} />}
          {showCreate ? "Cancel" : "New Post"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {posts.length} total post{posts.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {posts.length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total Posts
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">
            {posts.filter((p) => p.status === "published").length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Published
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">
            {posts.filter((p) => p.status === "scheduled").length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Scheduled
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink-muted">
            {posts.filter((p) => p.status === "draft").length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Drafts
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {new Set(posts.map((p) => p.platform)).size}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Platforms
          </div>
        </div>
      </div>

      {/* Platform Distribution */}
      {platformDistribution.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">
            Platform Distribution
          </p>
          <div className="border border-rule bg-surface-card divide-y divide-rule">
            {platformDistribution.map((item) => (
              <div key={item.platform} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-ink">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-secondary">
                    {item.count} post{item.count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: 'var(--color-surface-raised)' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${item.pct}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by platform, content, status..."
          className="w-full border border-rule bg-transparent py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
        />
      </div>

      {/* Error */}
      {actionError && (
        <div className="mb-4 border border-editorial-red bg-editorial-red/5 px-4 py-2 text-xs text-editorial-red">
          {actionError}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 border border-rule bg-surface-card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
            Create Social Post
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Platform
              </label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
              >
                <option value="draft">draft</option>
                <option value="scheduled">scheduled</option>
                <option value="published">published</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
              Content
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink resize-y"
              placeholder="Post content..."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Media URL
              </label>
              <input
                type="text"
                value={newMediaUrl}
                onChange={(e) => setNewMediaUrl(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Scheduled At
              </label>
              <input
                type="datetime-local"
                value={newScheduledAt}
                onChange={(e) => setNewScheduledAt(e.target.value)}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowCreate(false)}
              className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !newContent.trim()}
              className="border border-rule bg-ink text-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
            >
              {isPending && <Loader2 size={10} className="animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-rule overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Platform
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Content
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Status
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Scheduled
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Published
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Created
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  {search
                    ? "No posts match your search."
                    : "No social posts yet."}
                </td>
              </tr>
            ) : (
              filtered.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-rule hover:bg-surface-raised/50 transition-colors"
                >
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 flex-shrink-0"
                        style={{
                          backgroundColor:
                            PLATFORM_COLORS[post.platform] ?? "#888",
                        }}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary">
                        {post.platform}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink max-w-[280px] truncate">
                    {post.content.length > 80
                      ? post.content.slice(0, 80) + "..."
                      : post.content}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    {formatDate(post.scheduled_at)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    {formatDate(post.published_at)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    {timeAgo(post.created_at)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(post)}
                        className="text-ink-muted hover:text-ink transition-colors"
                        title="Edit"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={isPending}
                        className="text-ink-muted hover:text-editorial-red transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg border border-rule bg-surface-card p-6 space-y-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="font-serif text-lg font-bold text-ink">
                Edit Social Post
              </p>
              <button
                onClick={() => setEditingId(null)}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  Platform
                </label>
                <select
                  value={editPlatform}
                  onChange={(e) => setEditPlatform(e.target.value)}
                  className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                >
                  <option value="draft">draft</option>
                  <option value="scheduled">scheduled</option>
                  <option value="published">published</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                Content
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink resize-y"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  Media URL
                </label>
                <input
                  type="text"
                  value={editMediaUrl}
                  onChange={(e) => setEditMediaUrl(e.target.value)}
                  className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  Scheduled At
                </label>
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingId(null)}
                className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isPending || !editContent.trim()}
                className="border border-rule bg-ink text-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={10} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer count */}
      <div className="mt-4">
        <p className="text-xs text-ink-muted font-mono">
          Showing {filtered.length} of {posts.length} posts
        </p>
      </div>
    </div>
  );
}
