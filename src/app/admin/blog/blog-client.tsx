"use client";

import { useState, useTransition, useMemo } from "react";
import { Loader2, Eye, EyeOff, X } from "lucide-react";
import { createPost, updatePost, deletePost } from "@/lib/actions/admin";
import type { Post } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: Post["status"] }) {
  const color =
    status === "published"
      ? "text-editorial-green"
      : status === "archived"
        ? "text-ink-muted"
        : "text-ink-secondary";
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-widest ${color}`}
    >
      {status}
    </span>
  );
}

type StatusFilter = "all" | "published" | "draft" | "archived";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
];

export function BlogClient({ posts }: { posts: Post[] }) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newStatus, setNewStatus] = useState<string>("draft");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editExcerpt, setEditExcerpt] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Filtered posts
  const filteredPosts = useMemo(() => {
    if (statusFilter === "all") return posts;
    return posts.filter((p) => p.status === statusFilter);
  }, [posts, statusFilter]);

  // Post being previewed
  const previewPost = useMemo(
    () => posts.find((p) => p.id === previewId) ?? null,
    [posts, previewId],
  );

  function handleCreate() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await createPost({
        title: newTitle.trim(),
        content: newContent.trim(),
        type: "blog",
        excerpt: newExcerpt.trim() || undefined,
        tags: newTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: newStatus,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
        setNewTitle("");
        setNewContent("");
        setNewExcerpt("");
        setNewTags("");
        setNewStatus("draft");
      }
    });
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditExcerpt(post.excerpt ?? "");
    setEditTags(post.tags.join(", "));
    setEditStatus(post.status);
  }

  function handleUpdate(id: string) {
    if (!editTitle.trim() || !editContent.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updatePost(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        excerpt: editExcerpt.trim() || undefined,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
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
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deletePost(id);
      if (result.error) setActionError(result.error);
    });
  }

  function handleQuickToggle(post: Post) {
    const nextStatus = post.status === "draft" ? "published" : "draft";
    setActionError(null);
    startTransition(async () => {
      const result = await updatePost(post.id, { status: nextStatus });
      if (result.error) setActionError(result.error);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-3xl font-bold text-ink">Blog</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
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
          <div className="font-mono text-2xl font-bold text-ink">
            {posts.filter((p) => p.status === "draft").length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Drafts
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink-muted">
            {posts.filter((p) => p.status === "archived").length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Archived
          </div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {new Set(posts.flatMap((p) => p.tags ?? [])).size}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Unique Tags
          </div>
        </div>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex gap-0 border border-rule mb-6 w-fit">
        {STATUS_FILTERS.map((filter) => {
          const count =
            filter.key === "all"
              ? posts.length
              : posts.filter((p) => p.status === filter.key).length;
          return (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors border-r border-rule last:border-r-0 ${
                statusFilter === filter.key
                  ? "bg-ink text-surface-card"
                  : "text-ink-muted hover:text-ink hover:bg-surface-raised"
              }`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
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
            New Blog Post
          </p>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Content (markdown or HTML)"
            rows={6}
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <input
            type="text"
            value={newExcerpt}
            onChange={(e) => setNewExcerpt(e.target.value)}
            placeholder="Excerpt"
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
          <div className="flex items-center gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={isPending || !newTitle.trim() || !newContent.trim()}
              className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                "Create"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Post Listing - Card Layout */}
      <div className="space-y-0 border border-rule divide-y divide-rule">
        {filteredPosts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            {statusFilter === "all"
              ? "No blog posts found."
              : `No ${statusFilter} posts.`}
          </div>
        ) : (
          filteredPosts.map((post) =>
            editingId === post.id ? (
              <div
                key={post.id}
                className="bg-surface-card px-4 py-4"
              >
                <div className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                    Edit Post
                  </p>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Content (markdown or HTML)"
                    rows={6}
                    className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                  />
                  <input
                    type="text"
                    value={editExcerpt}
                    onChange={(e) => setEditExcerpt(e.target.value)}
                    placeholder="Excerpt"
                    className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                  />
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags (comma separated)"
                    className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
                  />
                  <div className="flex items-center gap-3">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="border border-rule bg-transparent px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button
                      onClick={() => handleUpdate(post.id)}
                      disabled={isPending}
                      className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
                    >
                      {isPending ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={post.id}
                className="px-4 py-3 hover:bg-surface-raised/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-ink truncate">
                        {post.title}
                      </h3>
                      <StatusBadge status={post.status} />
                    </div>
                    {post.excerpt && (
                      <p className="text-xs text-ink-secondary mb-1.5 line-clamp-1">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4">
                      {post.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="border border-rule px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted"
                            >
                              {tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span className="text-[10px] text-ink-muted">
                              +{post.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="font-mono text-[11px] text-ink-muted">
                        {post.published_at
                          ? formatDate(post.published_at)
                          : formatDate(post.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        setPreviewId(previewId === post.id ? null : post.id)
                      }
                      className="text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
                      title="Preview content"
                    >
                      {previewId === post.id ? (
                        <EyeOff size={12} />
                      ) : (
                        <Eye size={12} />
                      )}
                      Preview
                    </button>
                    <button
                      onClick={() => handleQuickToggle(post)}
                      disabled={isPending}
                      className="text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:underline disabled:opacity-40"
                    >
                      {post.status === "draft" ? "Publish" : "Draft"}
                    </button>
                    <button
                      onClick={() => startEdit(post)}
                      className="text-[11px] font-bold uppercase tracking-widest text-ink-secondary hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={isPending}
                      className="text-[11px] font-bold uppercase tracking-widest text-editorial-red hover:underline disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Preview Panel */}
                {previewId === post.id && (
                  <div className="mt-3 border border-rule bg-surface-cream p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        Content Preview
                      </p>
                      <button
                        onClick={() => setPreviewId(null)}
                        className="text-ink-muted hover:text-ink transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-ink font-serif"
                      dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                  </div>
                )}
              </div>
            ),
          )
        )}
      </div>

      {/* Footer */}
      <div className="mt-4">
        <p className="text-xs text-ink-muted font-mono">
          Showing {filteredPosts.length} of {posts.length} post
          {posts.length !== 1 ? "s" : ""}
          {statusFilter !== "all" && (
            <span>
              {" "}
              &middot; Filtered by{" "}
              <span className="text-ink-secondary">{statusFilter}</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
