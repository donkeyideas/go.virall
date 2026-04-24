'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote,
  Link, Image, Plus, Trash2, Pencil, Loader2, Sparkles, Eye,
} from 'lucide-react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminStatusBadge } from '../_components/AdminStatusBadge';
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  publishBlogPost,
  generateBlogWithAI,
} from '../../../lib/actions/admin/blog';

/* ── Types ──────────────────────────────────────── */

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  tags: string[];
  coverUrl: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
};

type Props = { posts: BlogPost[] };

type Toast = { message: string; type: 'success' | 'error' };

/* ── Constants ──────────────────────────────────── */

const WEEKLY_LIMIT = 2;
const BEST_DAYS = ['Monday', 'Thursday'];

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can',
  'this', 'that', 'these', 'those', 'not', 'no', 'so', 'if', 'then',
]);

/* ── Helpers ────────────────────────────────────── */

function slugify(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
  return words.slice(0, 5).join('-');
}

function getWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function countPostsThisWeek(posts: BlogPost[]): number {
  const { start, end } = getWeekBounds();
  return posts.filter((p) => {
    if (!p.publishedAt) return false;
    const d = new Date(p.publishedAt);
    return d >= start && d <= end;
  }).length;
}

/* ── Form defaults ──────────────────────────────── */

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tags: string;
  coverUrl: string;
  backlink: string;
  status: 'draft' | 'published';
};

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  tags: '',
  coverUrl: '',
  backlink: '',
  status: 'draft',
};

/* ── Component ──────────────────────────────────── */

export function BlogClient({ posts: initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState<Toast | null>(null);
  const [preview, setPreview] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);

  /* ── Toast ────────────────────────────────────── */

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  /* ── Publishing Cadence ───────────────────────── */

  const postsThisWeek = countPostsThisWeek(posts);
  const cadenceRatio = postsThisWeek / WEEKLY_LIMIT;
  const cadenceColor =
    postsThisWeek === WEEKLY_LIMIT
      ? 'var(--admin-green)'
      : postsThisWeek > WEEKLY_LIMIT
        ? 'var(--admin-red)'
        : 'var(--admin-amber)';
  const cadenceText =
    postsThisWeek === 0
      ? `No posts this week. Aim for ${WEEKLY_LIMIT} posts on ${BEST_DAYS.join(' & ')}.`
      : postsThisWeek < WEEKLY_LIMIT
        ? `${postsThisWeek}/${WEEKLY_LIMIT} this week. Publish ${WEEKLY_LIMIT - postsThisWeek} more for optimal cadence.`
        : postsThisWeek === WEEKLY_LIMIT
          ? `${WEEKLY_LIMIT}/${WEEKLY_LIMIT} weekly target hit. Great cadence!`
          : `${postsThisWeek}/${WEEKLY_LIMIT} this week. Over-publishing can dilute SEO impact.`;

  /* ── Editor Toolbar Helpers ───────────────────── */

  const wrapSelection = useCallback((before: string, after: string) => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    const replacement = before + selected + after;
    const newValue = ta.value.substring(0, start) + replacement + ta.value.substring(end);
    setForm((f) => ({ ...f, body: newValue }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }, []);

  const insertAtCursor = useCallback((text: string) => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const newValue = ta.value.substring(0, start) + text + ta.value.substring(start);
    setForm((f) => ({ ...f, body: newValue }));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + text.length, start + text.length);
    });
  }, []);

  const toolbarActions = [
    { icon: Bold, label: 'Bold', action: () => wrapSelection('<strong>', '</strong>') },
    { icon: Italic, label: 'Italic', action: () => wrapSelection('<em>', '</em>') },
    { icon: Heading2, label: 'H2', action: () => wrapSelection('<h2>', '</h2>') },
    { icon: Heading3, label: 'H3', action: () => wrapSelection('<h3>', '</h3>') },
    { icon: List, label: 'Bullet List', action: () => {
      const ta = editorRef.current;
      if (!ta) return;
      const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
      const items = selected.split('\n').filter((l) => l.trim());
      if (items.length > 0) {
        const html = '<ul>\n' + items.map((li) => `  <li>${li.trim()}</li>`).join('\n') + '\n</ul>';
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = ta.value.substring(0, start) + html + ta.value.substring(end);
        setForm((f) => ({ ...f, body: newValue }));
      } else {
        insertAtCursor('<ul>\n  <li></li>\n</ul>');
      }
    }},
    { icon: ListOrdered, label: 'Numbered List', action: () => {
      const ta = editorRef.current;
      if (!ta) return;
      const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd);
      const items = selected.split('\n').filter((l) => l.trim());
      if (items.length > 0) {
        const html = '<ol>\n' + items.map((li) => `  <li>${li.trim()}</li>`).join('\n') + '\n</ol>';
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newValue = ta.value.substring(0, start) + html + ta.value.substring(end);
        setForm((f) => ({ ...f, body: newValue }));
      } else {
        insertAtCursor('<ol>\n  <li></li>\n</ol>');
      }
    }},
    { icon: Quote, label: 'Blockquote', action: () => wrapSelection('<blockquote>', '</blockquote>') },
    { icon: Link, label: 'Insert Link', action: () => {
      const url = prompt('Enter URL:');
      if (url) {
        const ta = editorRef.current;
        const selected = ta ? ta.value.substring(ta.selectionStart, ta.selectionEnd) : '';
        const text = selected || 'link text';
        wrapSelection(`<a href="${url}">`, '</a>');
        if (!selected) {
          const ta2 = editorRef.current;
          if (ta2) {
            const pos = ta2.selectionStart;
            const before = `<a href="${url}">`;
            const newValue = ta2.value.substring(0, pos) + text + ta2.value.substring(pos);
            setForm((f) => ({ ...f, body: newValue }));
            requestAnimationFrame(() => {
              ta2.focus();
              ta2.setSelectionRange(pos, pos + text.length);
            });
          }
        }
      }
    }},
    { icon: Image, label: 'Insert Image', action: () => {
      const src = prompt('Enter image URL:');
      if (src) {
        const alt = prompt('Enter alt text:') || '';
        insertAtCursor(`<img src="${src}" alt="${alt}" style="max-width:100%;border-radius:4px;" />`);
      }
    }},
  ];

  /* ── AI Generation ────────────────────────────── */

  const handleGenerate = async () => {
    if (!form.title.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateBlogWithAI(form.title, form.backlink || undefined);
      if ('error' in result) {
        showToast(result.error, 'error');
      } else {
        setForm((f) => ({
          ...f,
          body: result.content,
          excerpt: result.excerpt,
          tags: result.tags.join(', '),
        }));
        showToast('Blog content generated successfully', 'success');
      }
    } catch {
      showToast('AI generation failed unexpectedly', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── CRUD Handlers ────────────────────────────── */

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPreview(false);
    setView('form');
  };

  const openEditForm = (post: BlogPost) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      body: post.body,
      tags: post.tags.join(', '),
      coverUrl: post.coverUrl ?? '',
      backlink: '',
      status: post.status as 'draft' | 'published',
    });
    setPreview(false);
    setView('form');
  };

  const handleSave = (publishNow: boolean) => {
    startTransition(async () => {
      const tags = form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const slug = form.slug || slugify(form.title);
      const status = publishNow ? 'published' : form.status;

      if (editingId) {
        const result = await updateBlogPost(editingId, {
          title: form.title,
          slug,
          excerpt: form.excerpt || undefined,
          body: form.body,
          tags,
          coverUrl: form.coverUrl || undefined,
          status,
        });
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === editingId
                ? {
                    ...p,
                    title: form.title,
                    slug,
                    excerpt: form.excerpt || null,
                    body: form.body,
                    tags,
                    coverUrl: form.coverUrl || null,
                    status,
                    publishedAt:
                      status === 'published' && !p.publishedAt
                        ? new Date().toISOString()
                        : p.publishedAt,
                  }
                : p,
            ),
          );
          showToast('Post updated successfully', 'success');
          setView('list');
        }
      } else {
        const result = await createBlogPost({
          title: form.title,
          slug,
          excerpt: form.excerpt || undefined,
          body: form.body,
          tags,
          coverUrl: form.coverUrl || undefined,
          status,
        });
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setPosts((prev) => [
            {
              id: crypto.randomUUID(),
              title: form.title,
              slug,
              excerpt: form.excerpt || null,
              body: form.body,
              tags,
              coverUrl: form.coverUrl || null,
              status,
              publishedAt: status === 'published' ? new Date().toISOString() : null,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          showToast('Post created successfully', 'success');
          setView('list');
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteBlogPost(id);
      if (result.error) {
        showToast(typeof result.error === 'string' ? result.error : 'Delete failed', 'error');
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        showToast('Post deleted', 'success');
      }
      setDeleteConfirmId(null);
    });
  };

  const handleTogglePublish = (post: BlogPost) => {
    startTransition(async () => {
      if (post.status === 'published') {
        const result = await updateBlogPost(post.id, { status: 'draft' });
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setPosts((prev) =>
            prev.map((p) => (p.id === post.id ? { ...p, status: 'draft' } : p)),
          );
          showToast('Post unpublished', 'success');
        }
      } else {
        const result = await publishBlogPost(post.id);
        if (result.error) {
          showToast(typeof result.error === 'string' ? result.error : 'Publish failed', 'error');
        } else {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post.id
                ? { ...p, status: 'published', publishedAt: p.publishedAt || new Date().toISOString() }
                : p,
            ),
          );
          showToast('Post published', 'success');
        }
      }
    });
  };

  /* ── Styles ───────────────────────────────────── */

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    background: 'var(--admin-surface-2)',
    border: '1px solid var(--admin-border)',
    borderRadius: 4,
    color: 'var(--fg)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--admin-muted)',
    marginBottom: 6,
  };

  const btnPrimary: React.CSSProperties = {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 500,
    background: 'var(--admin-red)',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    color: 'var(--fg)',
    border: '1px solid var(--admin-border)',
    borderRadius: 4,
    cursor: 'pointer',
  };

  const btnToolbar: React.CSSProperties = {
    padding: '5px 7px',
    background: 'transparent',
    border: '1px solid var(--admin-border)',
    borderRadius: 3,
    color: 'var(--admin-muted)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  };

  /* ── Table Columns ────────────────────────────── */

  const columns: AdminColumn<BlogPost>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{row.title}</span>
          <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--admin-muted)', marginTop: 2 }}>
            /{row.slug}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AdminStatusBadge status={row.status} />,
      width: '100px',
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (row) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {row.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 3,
                background: 'var(--admin-surface-2)',
                color: 'var(--admin-muted)',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {t}
            </span>
          ))}
          {row.tags.length > 3 && (
            <span style={{ fontSize: 10, color: 'var(--admin-muted)' }}>
              +{row.tags.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      render: (row) => (
        <span
          style={{
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--admin-muted)',
          }}
        >
          {row.publishedAt
            ? new Date(row.publishedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '\u2014'}
        </span>
      ),
      width: '120px',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePublish(row);
            }}
            disabled={isPending}
            title={row.status === 'published' ? 'Unpublish' : 'Publish'}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              background: row.status === 'published' ? 'transparent' : 'var(--admin-green)',
              color: row.status === 'published' ? 'var(--admin-amber)' : '#fff',
              border: row.status === 'published' ? '1px solid var(--admin-amber)' : 'none',
              borderRadius: 3,
              cursor: isPending ? 'wait' : 'pointer',
              fontWeight: 500,
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {row.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(row);
            }}
            title="Edit"
            style={{
              ...btnToolbar,
              color: 'var(--fg)',
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirmId(row.id);
            }}
            title="Delete"
            style={{
              ...btnToolbar,
              color: 'var(--admin-red)',
              borderColor: 'var(--admin-red)',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
      width: '200px',
    },
  ];

  /* ── Render ───────────────────────────────────── */

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 10000,
            padding: '12px 20px',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            color: '#fff',
            background:
              toast.type === 'success' ? 'var(--admin-green)' : 'var(--admin-red)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 4,
              padding: 24,
              maxWidth: 400,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 16,
                fontFamily: 'Fraunces, serif',
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            >
              Delete Post
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--admin-muted)' }}>
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isPending}
                style={{
                  ...btnPrimary,
                  background: 'var(--admin-red)',
                  opacity: isPending ? 0.6 : 1,
                  cursor: isPending ? 'wait' : 'pointer',
                }}
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'list' ? (
        /* ═══════════════════════════════════════════ LIST VIEW ═══ */
        <div>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontFamily: 'Fraunces, serif',
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.02em',
                }}
              >
                Blog & Guides
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
                {posts.length} post{posts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={openCreateForm} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} />
              New Post
            </button>
          </div>

          {/* Publishing Cadence */}
          <div
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 4,
              padding: '16px 20px',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--admin-muted)',
                }}
              >
                Weekly Cadence
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: cadenceColor,
                }}
              >
                {postsThisWeek}/{WEEKLY_LIMIT}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                background: 'var(--admin-surface-2)',
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: `${Math.min(cadenceRatio * 100, 100)}%`,
                  height: '100%',
                  background: cadenceColor,
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--admin-muted)' }}>
              {cadenceText} Best days: <strong style={{ color: 'var(--fg)' }}>{BEST_DAYS.join(' & ')}</strong>.
            </p>
          </div>

          {/* Table */}
          <AdminTable
            columns={columns}
            data={posts}
            onRowClick={openEditForm}
            emptyMessage="No blog posts yet. Create your first post to get started."
          />
        </div>
      ) : (
        /* ═══════════════════════════════════════════ FORM VIEW ═══ */
        <div>
          {/* Form Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontFamily: 'Fraunces, serif',
                  fontWeight: 700,
                  color: 'var(--fg)',
                  letterSpacing: '-0.02em',
                }}
              >
                {editingId ? 'Edit Post' : 'New Post'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
                {editingId ? 'Update your blog post' : 'Create a new blog post'}
              </p>
            </div>
            <button onClick={() => setView('list')} style={btnSecondary}>
              Back to Posts
            </button>
          </div>

          <div
            style={{
              background: 'var(--admin-surface)',
              border: '1px solid var(--admin-border)',
              borderRadius: 4,
              padding: 24,
            }}
          >
            {/* Title + AI Generation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Title *</label>
                <input
                  placeholder="e.g. How to Grow on TikTok in 2026"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: slugify(e.target.value),
                    }))
                  }
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !form.title.trim()}
                  style={{
                    ...btnPrimary,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    opacity: isGenerating || !form.title.trim() ? 0.6 : 1,
                    cursor: isGenerating ? 'wait' : !form.title.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Loading Notice */}
            {isGenerating && (
              <div
                style={{
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 4,
                  padding: '12px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Loader2 size={16} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#a78bfa' }}>
                  AI is writing your blog post. This typically takes 30-60 seconds...
                </span>
              </div>
            )}

            {/* Slug + Backlink row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Slug</label>
                <input
                  placeholder="auto-generated-from-title"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Backlink URL (for AI)</label>
                <input
                  placeholder="https://example.com/page-to-link"
                  value={form.backlink}
                  onChange={(e) => setForm((f) => ({ ...f, backlink: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Excerpt */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Excerpt</label>
              <input
                placeholder="Short description for SEO (auto-filled by AI)"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Tags + Cover URL */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Tags (comma-separated)</label>
                <input
                  placeholder="tiktok, growth, strategy"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Cover Image URL</label>
                <input
                  placeholder="https://images.unsplash.com/..."
                  value={form.coverUrl}
                  onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* HTML Editor */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>Content (HTML)</label>
                <button
                  onClick={() => setPreview((p) => !p)}
                  style={{
                    ...btnToolbar,
                    fontSize: 11,
                    gap: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: preview ? '#8b5cf6' : 'var(--admin-muted)',
                    borderColor: preview ? '#8b5cf6' : 'var(--admin-border)',
                  }}
                >
                  <Eye size={12} />
                  {preview ? 'Editor' : 'Preview'}
                </button>
              </div>

              {!preview && (
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    marginBottom: 8,
                    padding: '6px 8px',
                    background: 'var(--admin-surface-2)',
                    border: '1px solid var(--admin-border)',
                    borderBottom: 'none',
                    borderRadius: '4px 4px 0 0',
                  }}
                >
                  {toolbarActions.map((tool) => (
                    <button
                      key={tool.label}
                      onClick={tool.action}
                      title={tool.label}
                      style={btnToolbar}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'var(--admin-surface)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--fg)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--admin-muted)';
                      }}
                    >
                      <tool.icon size={14} />
                    </button>
                  ))}
                </div>
              )}

              {preview ? (
                <div
                  style={{
                    minHeight: 320,
                    maxHeight: 600,
                    overflowY: 'auto',
                    padding: 20,
                    background: 'var(--admin-surface-2)',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 4,
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: 'var(--fg)',
                  }}
                  dangerouslySetInnerHTML={{ __html: form.body || '<p style="color:var(--admin-muted)">Nothing to preview yet.</p>' }}
                />
              ) : (
                <textarea
                  ref={editorRef}
                  placeholder="Write or generate HTML content..."
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={18}
                  style={{
                    ...inputStyle,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    lineHeight: 1.6,
                    resize: 'vertical',
                    minHeight: 320,
                    borderRadius: form.body ? '0 0 4px 4px' : '0 0 4px 4px',
                  }}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 16,
                borderTop: '1px solid var(--admin-border)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--admin-muted)' }}>
                {form.body.length > 0 && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {form.body.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setView('list')}
                  style={btnSecondary}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={isPending || !form.title.trim() || !form.body.trim()}
                  style={{
                    ...btnSecondary,
                    opacity: isPending || !form.title.trim() || !form.body.trim() ? 0.5 : 1,
                    cursor:
                      isPending || !form.title.trim() || !form.body.trim()
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {isPending ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={isPending || !form.title.trim() || !form.body.trim()}
                  style={{
                    ...btnPrimary,
                    background: 'var(--admin-green)',
                    opacity: isPending || !form.title.trim() || !form.body.trim() ? 0.5 : 1,
                    cursor:
                      isPending || !form.title.trim() || !form.body.trim()
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {isPending ? 'Publishing...' : editingId ? 'Update & Publish' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyframe animation for spinner and toast */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
