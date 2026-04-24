'use client';

import { useState, useCallback, useEffect, useRef, useTransition } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Sparkles,
  Calendar,
  FileText,
  FilePlus,
  Rocket,
} from 'lucide-react';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminStatusBadge } from '../_components/AdminStatusBadge';
import { AdminModal } from '../_components/AdminModal';
import {
  createSocialPost,
  updateSocialPost,
  deleteSocialPost,
  generateSocialCaption,
} from '../../../lib/actions/admin/social';

/* ── Types ──────────────────────────────────────── */

type SocialPost = {
  id: string;
  platform: string;
  caption: string;
  mediaUrl: string | null;
  status: string;
  tags: string[];
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

type Props = { posts: SocialPost[] };

type Toast = { message: string; type: 'success' | 'error' };

/* ── Constants ──────────────────────────────────── */

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook', 'twitch'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#000000',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  x: '#1DA1F2',
  facebook: '#1877F2',
  twitch: '#9146FF',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

const CHAR_LIMITS: Record<string, number> = {
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  tiktok: 2200,
  youtube: 2200,
  facebook: 2200,
  twitch: 2200,
};

const STATUS_FILTERS = ['all', 'draft', 'scheduled', 'published'] as const;

/* ── Form Defaults ──────────────────────────────── */

type FormState = {
  platform: string;
  caption: string;
  mediaUrl: string;
  scheduledAt: string;
  tags: string;
  aiTopic: string;
};

const EMPTY_FORM: FormState = {
  platform: 'instagram',
  caption: '',
  mediaUrl: '',
  scheduledAt: '',
  tags: '',
  aiTopic: '',
};

/* ── Component ──────────────────────────────────── */

export function SocialClient({ posts: initialPosts }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toast, setToast] = useState<Toast | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [isPending, startTransition] = useTransition();
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

  /* ── KPI Counts ───────────────────────────────── */

  const totalPosts = posts.length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;

  /* ── Filtered Posts ───────────────────────────── */

  const filteredPosts =
    statusFilter === 'all' ? posts : posts.filter((p) => p.status === statusFilter);

  /* ── AI Generation ────────────────────────────── */

  const handleGenerate = async () => {
    if (!form.aiTopic.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateSocialCaption(form.platform, form.aiTopic);
      if ('error' in result) {
        showToast(result.error, 'error');
      } else {
        const hashtagStr = result.hashtags.map((h) => `#${h}`).join(' ');
        const fullCaption = result.caption + (hashtagStr ? '\n\n' + hashtagStr : '');
        setForm((f) => ({
          ...f,
          caption: fullCaption,
          tags: result.hashtags.join(', '),
        }));
        showToast('Caption generated successfully', 'success');
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
    setShowForm(true);
  };

  const openEditForm = (post: SocialPost) => {
    setEditingId(post.id);
    setForm({
      platform: post.platform,
      caption: post.caption,
      mediaUrl: post.mediaUrl ?? '',
      scheduledAt: post.scheduledAt ? post.scheduledAt.slice(0, 16) : '',
      tags: post.tags.join(', '),
      aiTopic: '',
    });
    setShowForm(true);
  };

  const handleSaveDraft = () => {
    startTransition(async () => {
      const tags = form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      if (editingId) {
        const result = await updateSocialPost(editingId, {
          platform: form.platform,
          caption: form.caption,
          mediaUrl: form.mediaUrl || undefined,
          scheduledAt: form.scheduledAt || undefined,
          status: 'draft',
          tags,
        });
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === editingId
                ? {
                    ...p,
                    platform: form.platform,
                    caption: form.caption,
                    mediaUrl: form.mediaUrl || null,
                    scheduledAt: form.scheduledAt || null,
                    status: 'draft',
                    tags,
                  }
                : p,
            ),
          );
          showToast('Post saved as draft', 'success');
          setShowForm(false);
        }
      } else {
        const result = await createSocialPost({
          platform: form.platform,
          caption: form.caption,
          mediaUrl: form.mediaUrl || undefined,
          tags,
        });
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setPosts((prev) => [
            {
              id: crypto.randomUUID(),
              platform: form.platform,
              caption: form.caption,
              mediaUrl: form.mediaUrl || null,
              status: 'draft',
              scheduledAt: null,
              publishedAt: null,
              tags,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          showToast('Post saved as draft', 'success');
          setShowForm(false);
        }
      }
    });
  };

  const handleSchedule = () => {
    if (!form.scheduledAt) {
      showToast('Please select a schedule date and time', 'error');
      return;
    }
    startTransition(async () => {
      const tags = form.tags
        ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      if (editingId) {
        const result = await updateSocialPost(editingId, {
          platform: form.platform,
          caption: form.caption,
          mediaUrl: form.mediaUrl || undefined,
          scheduledAt: form.scheduledAt,
          status: 'scheduled',
          tags,
        });
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setPosts((prev) =>
            prev.map((p) =>
              p.id === editingId
                ? {
                    ...p,
                    platform: form.platform,
                    caption: form.caption,
                    mediaUrl: form.mediaUrl || null,
                    scheduledAt: form.scheduledAt,
                    status: 'scheduled',
                    tags,
                  }
                : p,
            ),
          );
          showToast('Post scheduled', 'success');
          setShowForm(false);
        }
      } else {
        const result = await createSocialPost({
          platform: form.platform,
          caption: form.caption,
          mediaUrl: form.mediaUrl || undefined,
          scheduledAt: form.scheduledAt,
          tags,
        });
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setPosts((prev) => [
            {
              id: crypto.randomUUID(),
              platform: form.platform,
              caption: form.caption,
              mediaUrl: form.mediaUrl || null,
              status: 'scheduled',
              scheduledAt: form.scheduledAt,
              publishedAt: null,
              tags,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          showToast('Post scheduled', 'success');
          setShowForm(false);
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteSocialPost(id);
      if (result.error) {
        showToast(typeof result.error === 'string' ? result.error : 'Delete failed', 'error');
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        showToast('Post deleted', 'success');
      }
      setDeleteConfirmId(null);
    });
  };

  /* ── Derived ──────────────────────────────────── */

  const charLimit = CHAR_LIMITS[form.platform] ?? 2200;
  const captionLength = form.caption.length;
  const isOverLimit = captionLength > charLimit;

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

  /* ── Platform Badge ───────────────────────────── */

  function PlatformBadge({ platform }: { platform: string }) {
    const color = PLATFORM_COLORS[platform] ?? '#6b6e7b';
    const label = PLATFORM_LABELS[platform] ?? platform;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{label}</span>
      </div>
    );
  }

  /* ── Table Columns ────────────────────────────── */

  const columns: AdminColumn<SocialPost>[] = [
    {
      key: 'platform',
      header: 'Platform',
      render: (row) => <PlatformBadge platform={row.platform} />,
      width: '130px',
    },
    {
      key: 'caption',
      header: 'Caption',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.4 }}>
          {row.caption.length > 80 ? row.caption.slice(0, 80) + '...' : row.caption}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AdminStatusBadge status={row.status} />,
      width: '110px',
    },
    {
      key: 'date',
      header: 'Date',
      render: (row) => {
        const date = row.publishedAt || row.scheduledAt;
        return (
          <span
            style={{
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--admin-muted)',
            }}
          >
            {date
              ? new Date(date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : '\u2014'}
          </span>
        );
      },
      width: '160px',
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(row);
            }}
            title="Edit"
            style={{
              padding: '5px 7px',
              background: 'transparent',
              border: '1px solid var(--admin-border)',
              borderRadius: 3,
              color: 'var(--fg)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
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
              padding: '5px 7px',
              background: 'transparent',
              border: '1px solid var(--admin-red)',
              borderRadius: 3,
              color: 'var(--admin-red)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
      width: '100px',
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
              Are you sure you want to delete this social post? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirmId(null)} style={btnSecondary}>
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

      {/* Header */}
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
            Social Posts
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
            Create, schedule, and manage social media content
          </p>
        </div>
        <button
          onClick={openCreateForm}
          style={{
            ...btnPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} />
          New Post
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <AdminStatCard label="Total Posts" value={totalPosts} icon={<FileText size={18} />} />
        <AdminStatCard label="Draft" value={draftCount} icon={<FilePlus size={18} />} accent="amber" />
        <AdminStatCard
          label="Scheduled"
          value={scheduledCount}
          icon={<Calendar size={18} />}
          accent="default"
          sub={scheduledCount > 0 ? `${scheduledCount} pending` : undefined}
        />
        <AdminStatCard label="Published" value={publishedCount} icon={<Rocket size={18} />} accent="green" />
      </div>

      {/* Status Filter */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 16,
          padding: '4px',
          background: 'var(--admin-surface)',
          border: '1px solid var(--admin-border)',
          borderRadius: 4,
          width: 'fit-content',
        }}
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '6px 16px',
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'capitalize',
              background: statusFilter === f ? 'var(--admin-surface-2)' : 'transparent',
              color: statusFilter === f ? 'var(--fg)' : 'var(--admin-muted)',
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {f}
            {f !== 'all' && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  opacity: 0.7,
                }}
              >
                {f === 'draft'
                  ? draftCount
                  : f === 'scheduled'
                    ? scheduledCount
                    : publishedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Post Table */}
      <AdminTable
        columns={columns}
        data={filteredPosts}
        onRowClick={openEditForm}
        emptyMessage={
          statusFilter === 'all'
            ? 'No social posts yet. Create your first post to get started.'
            : `No ${statusFilter} posts found.`
        }
      />

      {/* Create / Edit Modal */}
      {showForm && (
        <AdminModal
          title={editingId ? 'Edit Social Post' : 'New Social Post'}
          onClose={() => setShowForm(false)}
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Platform Select */}
            <div>
              <label style={labelStyle}>Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Generation */}
            <div
              style={{
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
                borderRadius: 4,
                padding: 16,
              }}
            >
              <label style={{ ...labelStyle, color: '#a78bfa' }}>
                Generate with AI
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="Enter a topic or idea (e.g., 'growth tips for creators')"
                  value={form.aiTopic}
                  onChange={(e) => setForm((f) => ({ ...f, aiTopic: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !form.aiTopic.trim()}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor:
                      isGenerating
                        ? 'wait'
                        : !form.aiTopic.trim()
                          ? 'not-allowed'
                          : 'pointer',
                    opacity: isGenerating || !form.aiTopic.trim() ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {isGenerating ? (
                    <>
                      <Loader2
                        size={14}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate
                    </>
                  )}
                </button>
              </div>
              {!form.aiTopic.trim() && !isGenerating && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#a78bfa', opacity: 0.7 }}>
                  Type a topic above, then click Generate
                </p>
              )}
              {isGenerating && (
                <div
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Loader2
                    size={14}
                    style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }}
                  />
                  <span style={{ fontSize: 12, color: '#a78bfa' }}>
                    Generating a {PLATFORM_LABELS[form.platform]} caption...
                  </span>
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <label style={{ ...labelStyle, marginBottom: 0 }}>Caption *</label>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    color: isOverLimit ? 'var(--admin-red)' : 'var(--admin-muted)',
                  }}
                >
                  {captionLength}/{charLimit}
                </span>
              </div>
              <textarea
                placeholder={`Write your ${PLATFORM_LABELS[form.platform]} caption...`}
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                rows={6}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  lineHeight: 1.5,
                  borderColor: isOverLimit
                    ? 'var(--admin-red)'
                    : 'var(--admin-border)',
                }}
              />
              {isOverLimit && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 11,
                    color: 'var(--admin-red)',
                  }}
                >
                  Caption exceeds the {charLimit}-character limit for{' '}
                  {PLATFORM_LABELS[form.platform]}.
                </p>
              )}
            </div>

            {/* Media URL */}
            <div>
              <label style={labelStyle}>Media URL (optional)</label>
              <input
                placeholder="https://example.com/image.jpg"
                value={form.mediaUrl}
                onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Schedule */}
            <div>
              <label style={labelStyle}>
                <Calendar
                  size={11}
                  style={{
                    display: 'inline',
                    verticalAlign: 'middle',
                    marginRight: 4,
                  }}
                />
                Schedule (optional)
              </label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Tags */}
            <div>
              <label style={labelStyle}>Tags (comma-separated)</label>
              <input
                placeholder="creator, growth, tips"
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                style={inputStyle}
              />
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                paddingTop: 8,
                borderTop: '1px solid var(--admin-border)',
              }}
            >
              <button
                onClick={() => setShowForm(false)}
                style={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isPending || !form.caption.trim() || isOverLimit}
                style={{
                  ...btnSecondary,
                  opacity: isPending || !form.caption.trim() || isOverLimit ? 0.5 : 1,
                  cursor:
                    isPending || !form.caption.trim() || isOverLimit
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {isPending ? (
                  <>
                    <Loader2
                      size={13}
                      style={{
                        display: 'inline',
                        verticalAlign: 'middle',
                        marginRight: 4,
                        animation: 'spin 1s linear infinite',
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  'Save as Draft'
                )}
              </button>
              <button
                onClick={handleSchedule}
                disabled={
                  isPending || !form.caption.trim() || !form.scheduledAt || isOverLimit
                }
                style={{
                  ...btnPrimary,
                  background: 'var(--admin-green)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity:
                    isPending || !form.caption.trim() || !form.scheduledAt || isOverLimit
                      ? 0.5
                      : 1,
                  cursor:
                    isPending || !form.caption.trim() || !form.scheduledAt || isOverLimit
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                <Send size={13} />
                {isPending ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Keyframe animations */}
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
