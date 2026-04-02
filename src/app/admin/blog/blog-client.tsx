"use client";

import {
  useState,
  useTransition,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Loader2,
  Eye,
  EyeOff,
  X,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  Link2,
  Unlink,
  Undo2,
  Pilcrow,
  Sparkles,
} from "lucide-react";
import {
  createPost,
  updatePost,
  deletePost,
  generateBlogWithAI,
} from "@/lib/actions/admin";
import type { Post } from "@/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

type TabType = "blog" | "guide";
type StatusFilter = "all" | "published" | "draft" | "archived";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
];

/* ------------------------------------------------------------------ */
/* Link Dialog                                                         */
/* ------------------------------------------------------------------ */

function LinkDialog({
  onInsert,
  onClose,
}: {
  onInsert: (url: string, target: string, rel: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [target, setTarget] = useState("_blank");
  const [rel, setRel] = useState("noopener noreferrer");

  return (
    <div className="border border-rule bg-surface-card p-3 space-y-2 absolute z-50 top-full left-0 mt-1 shadow-lg w-80">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
        Insert Link
      </p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="w-full border border-rule bg-transparent px-2 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
        autoFocus
      />
      <div className="flex gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="border border-rule bg-surface-card px-2 py-1 text-[11px] text-ink focus:outline-none [&>option]:bg-surface-card [&>option]:text-ink"
        >
          <option value="_blank">New tab</option>
          <option value="_self">Same tab</option>
        </select>
        <select
          value={rel}
          onChange={(e) => setRel(e.target.value)}
          className="border border-rule bg-surface-card px-2 py-1 text-[11px] text-ink focus:outline-none flex-1 [&>option]:bg-surface-card [&>option]:text-ink"
        >
          <option value="noopener noreferrer">External (noopener)</option>
          <option value="nofollow noopener noreferrer">No-follow</option>
          <option value="dofollow">Do-follow (SEO)</option>
          <option value="">None (internal)</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (url.trim()) onInsert(url.trim(), target, rel);
          }}
          disabled={!url.trim()}
          className="border border-rule px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
        >
          Insert
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HTML Toolbar                                                        */
/* ------------------------------------------------------------------ */

function HtmlToolbar({
  textareaRef,
  content,
  setContent,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  setContent: (v: string) => void;
}) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.substring(start, end) || "text";
      const replacement = `${before}${selected}${after}`;
      const newContent =
        content.substring(0, start) + replacement + content.substring(end);
      setContent(newContent);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = start + before.length;
        ta.selectionEnd = start + before.length + selected.length;
      });
    },
    [content, setContent, textareaRef],
  );

  const insertBlock = useCallback(
    (html: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = ta.selectionStart;
      const newContent =
        content.substring(0, pos) + html + content.substring(pos);
      setContent(newContent);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = pos + html.length;
      });
    },
    [content, setContent, textareaRef],
  );

  const handleLink = useCallback(
    (url: string, target: string, rel: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.substring(start, end) || "link text";
      const relAttr = rel ? ` rel="${rel}"` : "";
      const tag = `<a href="${url}" target="${target}"${relAttr}>${selected}</a>`;
      const newContent =
        content.substring(0, start) + tag + content.substring(end);
      setContent(newContent);
      setShowLinkDialog(false);
      requestAnimationFrame(() => ta.focus());
    },
    [content, setContent, textareaRef],
  );

  const handleUnlink = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const unlinked = selected.replace(/<a[^>]*>(.*?)<\/a>/g, "$1");
    const newContent =
      content.substring(0, start) + unlinked + content.substring(end);
    setContent(newContent);
    requestAnimationFrame(() => ta.focus());
  }, [content, setContent, textareaRef]);

  const handleImage = useCallback(() => {
    const url = window.prompt("Image URL:");
    if (!url) return;
    const alt = window.prompt("Alt text:", "") ?? "";
    insertBlock(`<img src="${url}" alt="${alt}" loading="lazy" />`);
  }, [insertBlock]);

  const handleUndo = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    document.execCommand("undo");
  }, [textareaRef]);

  const buttons: {
    icon: React.ReactNode;
    title: string;
    action: () => void;
  }[] = [
    {
      icon: <Bold size={14} />,
      title: "Bold",
      action: () => wrapSelection("<strong>", "</strong>"),
    },
    {
      icon: <Italic size={14} />,
      title: "Italic",
      action: () => wrapSelection("<em>", "</em>"),
    },
    {
      icon: <Heading2 size={14} />,
      title: "Heading 2",
      action: () => wrapSelection("<h2>", "</h2>"),
    },
    {
      icon: <Heading3 size={14} />,
      title: "Heading 3",
      action: () => wrapSelection("<h3>", "</h3>"),
    },
    {
      icon: <Pilcrow size={14} />,
      title: "Paragraph",
      action: () => wrapSelection("<p>", "</p>"),
    },
    {
      icon: <List size={14} />,
      title: "Bullet list",
      action: () => insertBlock("\n<ul>\n  <li>Item</li>\n</ul>\n"),
    },
    {
      icon: <ListOrdered size={14} />,
      title: "Numbered list",
      action: () => insertBlock("\n<ol>\n  <li>Item</li>\n</ol>\n"),
    },
    {
      icon: <Quote size={14} />,
      title: "Blockquote",
      action: () => wrapSelection("<blockquote>", "</blockquote>"),
    },
    {
      icon: <ImageIcon size={14} />,
      title: "Image",
      action: handleImage,
    },
    {
      icon: <Link2 size={14} />,
      title: "Link",
      action: () => setShowLinkDialog(true),
    },
    {
      icon: <Unlink size={14} />,
      title: "Unlink",
      action: handleUnlink,
    },
    { icon: <Undo2 size={14} />, title: "Undo", action: handleUndo },
  ];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-0.5 border border-rule border-b-0 bg-surface-raised p-1">
        {buttons.map((btn) => (
          <button
            key={btn.title}
            type="button"
            onClick={btn.action}
            title={btn.title}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-card transition-colors rounded"
          >
            {btn.icon}
          </button>
        ))}
      </div>
      {showLinkDialog && (
        <LinkDialog
          onInsert={handleLink}
          onClose={() => setShowLinkDialog(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post Form (Create / Edit)                                           */
/* ------------------------------------------------------------------ */

function PostForm({
  mode,
  tab,
  initialTitle,
  initialSlug,
  initialContent,
  initialExcerpt,
  initialTags,
  initialStatus,
  isPending,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  tab: TabType;
  initialTitle: string;
  initialSlug?: string;
  initialContent: string;
  initialExcerpt: string;
  initialTags: string;
  initialStatus: string;
  isPending: boolean;
  onSubmit: (data: {
    title: string;
    content: string;
    excerpt: string;
    tags: string;
    status: string;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [tags, setTags] = useState(initialTags);
  const [status, setStatus] = useState(initialStatus);
  const [backlink, setBacklink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slug = initialSlug ?? slugify(title);
  const typeLabel = tab === "guide" ? "Guide" : "Blog Post";

  async function handleGenerate() {
    if (!title.trim()) {
      setGenError("Enter a title first.");
      return;
    }
    setIsGenerating(true);
    setGenError(null);
    try {
      const result = await generateBlogWithAI(
        title.trim(),
        tab,
        backlink.trim() || undefined,
      );
      if ("error" in result) {
        setGenError(result.error);
      } else {
        setContent(result.content);
        if (result.excerpt) setExcerpt(result.excerpt);
        if (result.tags.length > 0) setTags(result.tags.join(", "));
      }
    } catch {
      setGenError("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mb-6 border border-rule bg-surface-card p-4 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
        {mode === "create" ? `New ${typeLabel}` : `Edit ${typeLabel}`}
      </p>

      {/* Title + AI Generate */}
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="flex-1 border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !title.trim()}
          className="flex items-center gap-1.5 border border-rule px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-editorial-gold hover:bg-surface-raised transition-colors disabled:opacity-40 whitespace-nowrap"
          title="Generate content with AI"
        >
          {isGenerating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {isGenerating ? "Generating..." : "Generate with AI"}
        </button>
      </div>

      {/* Slug preview */}
      {title.trim() && (
        <div className="text-[11px] text-ink-muted font-mono">
          /{tab === "guide" ? "guides" : "blog"}/{slug}
        </div>
      )}

      {/* Backlink */}
      <input
        type="url"
        value={backlink}
        onChange={(e) => setBacklink(e.target.value)}
        placeholder="Backlink URL (optional) — AI will naturally link to this URL in the post"
        className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
      />

      {genError && (
        <div className="text-xs text-editorial-red">{genError}</div>
      )}

      {/* Content Editor with Toolbar */}
      <div>
        <div className="flex items-center justify-between mb-0">
          <HtmlToolbar
            textareaRef={textareaRef}
            content={content}
            setContent={setContent}
          />
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors"
          >
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div
            className="border border-rule bg-surface-cream p-4 min-h-[200px] prose prose-sm max-w-none text-ink font-serif"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content (HTML)"
            rows={12}
            className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
          />
        )}
      </div>

      {/* Excerpt */}
      <input
        type="text"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="Excerpt (meta description)"
        className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
      />
      {excerpt && (
        <div className="text-[10px] text-ink-muted font-mono">
          {excerpt.length}/160 characters
        </div>
      )}

      {/* Tags */}
      <input
        type="text"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma separated)"
        className="w-full border border-rule bg-transparent px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
      />

      {/* Status + Submit */}
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-rule bg-surface-card px-2 py-1.5 text-xs font-mono text-ink focus:outline-none focus:border-ink [&>option]:bg-surface-card [&>option]:text-ink"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button
          onClick={() => onSubmit({ title, content, excerpt, tags, status })}
          disabled={isPending || !title.trim() || !content.trim()}
          className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors disabled:opacity-40"
        >
          {isPending ? (
            <Loader2 size={20} className="animate-spin" />
          ) : mode === "create" ? (
            "Create"
          ) : (
            "Save"
          )}
        </button>
        <button
          onClick={onCancel}
          className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted hover:bg-surface-raised transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Client Component                                               */
/* ------------------------------------------------------------------ */

export function BlogClient({
  blogPosts,
  guidePosts,
}: {
  blogPosts: Post[];
  guidePosts: Post[];
}) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("blog");

  const posts = tab === "blog" ? blogPosts : guidePosts;

  const filteredPosts = useMemo(() => {
    if (statusFilter === "all") return posts;
    return posts.filter((p) => p.status === statusFilter);
  }, [posts, statusFilter]);

  function handleCreate(data: {
    title: string;
    content: string;
    excerpt: string;
    tags: string;
    status: string;
  }) {
    if (!data.title.trim() || !data.content.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await createPost({
        title: data.title.trim(),
        content: data.content.trim(),
        type: tab,
        excerpt: data.excerpt.trim() || undefined,
        tags: data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: data.status,
      });
      if (result.error) {
        setActionError(result.error);
      } else {
        setShowCreate(false);
      }
    });
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
  }

  function handleUpdate(
    id: string,
    data: {
      title: string;
      content: string;
      excerpt: string;
      tags: string;
      status: string;
    },
  ) {
    if (!data.title.trim() || !data.content.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updatePost(id, {
        title: data.title.trim(),
        content: data.content.trim(),
        excerpt: data.excerpt.trim() || undefined,
        tags: data.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: data.status,
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

  const typeLabel = tab === "guide" ? "Guides" : "Blog Posts";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-3xl font-bold text-ink">Blog</h1>
        <button
          onClick={() => {
            setShowCreate(!showCreate);
            setEditingId(null);
          }}
          className="border border-rule px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink hover:bg-surface-raised transition-colors"
        >
          {showCreate ? "Cancel" : `New ${tab === "guide" ? "Guide" : "Post"}`}
        </button>
      </div>
      <p className="text-xs text-ink-muted mb-4">
        {posts.length} total {typeLabel.toLowerCase()}
      </p>

      {/* Tabs: Blog Posts / Guides */}
      <div className="flex gap-0 border border-rule mb-4 w-fit">
        {(["blog", "guide"] as const).map((t) => {
          const count = t === "blog" ? blogPosts.length : guidePosts.length;
          return (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setStatusFilter("all");
                setShowCreate(false);
                setEditingId(null);
                setPreviewId(null);
              }}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors border-r border-rule last:border-r-0 ${
                tab === t
                  ? "bg-ink text-surface-card"
                  : "text-ink-muted hover:text-ink hover:bg-surface-raised"
              }`}
            >
              {t === "blog" ? "Blog Posts" : "Guides"} ({count})
            </button>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">
            {posts.length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">
            Total
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
        <PostForm
          mode="create"
          tab={tab}
          initialTitle=""
          initialContent=""
          initialExcerpt=""
          initialTags=""
          initialStatus="draft"
          isPending={isPending}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Post Listing */}
      <div className="space-y-0 border border-rule divide-y divide-rule">
        {filteredPosts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            {statusFilter === "all"
              ? `No ${typeLabel.toLowerCase()} found.`
              : `No ${statusFilter} ${typeLabel.toLowerCase()}.`}
          </div>
        ) : (
          filteredPosts.map((post) =>
            editingId === post.id ? (
              <div key={post.id} className="bg-surface-card px-4 py-4">
                <PostForm
                  mode="edit"
                  tab={tab}
                  initialTitle={post.title}
                  initialSlug={post.slug}
                  initialContent={post.content}
                  initialExcerpt={post.excerpt ?? ""}
                  initialTags={post.tags.join(", ")}
                  initialStatus={post.status}
                  isPending={isPending}
                  onSubmit={(data) => handleUpdate(post.id, data)}
                  onCancel={() => setEditingId(null)}
                />
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
          Showing {filteredPosts.length} of {posts.length}{" "}
          {typeLabel.toLowerCase()}
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
