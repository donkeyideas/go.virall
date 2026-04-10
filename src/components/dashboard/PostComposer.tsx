"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Sparkles,
  Hash,
  Image,
  Clock,
  Send,
  Save,
  CheckCircle,
  Loader2,
  Trash2,
  Copy,
  AlertTriangle,
  Eye,
  Upload,
  Link2,
  Video,
} from "lucide-react";
import type { ScheduledPost, SocialPlatform, SocialProfile } from "@/types";
import {
  createPost,
  updatePost,
  deletePost,
  markAsPublished,
  cancelPost,
  duplicatePost,
  aiOptimizeContent,
  aiSuggestHashtags,
  uploadPostMedia,
} from "@/lib/actions/publishing";

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

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  twitter: 280,
  tiktok: 4000,
  linkedin: 3000,
  youtube: 5000,
  threads: 500,
  pinterest: 500,
  twitch: 300,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#6B7280",
  scheduled: "#3182CE",
  publishing: "#F59E0B",
  published: "#34D399",
  failed: "#EF4444",
  cancelled: "#9CA3AF",
};

const ALL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
  "threads",
  "pinterest",
  "twitch",
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface PostComposerProps {
  post?: ScheduledPost | null;
  profiles: SocialProfile[];
  defaultDate?: Date;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PostComposer({
  post,
  profiles,
  defaultDate,
  onClose,
  onSaved,
}: PostComposerProps) {
  const isEditing = !!post;

  // Form state — auto-select the first connected platform for new posts
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(() => {
    if (post) return [post.platform as SocialPlatform];
    const connected = [...new Set(profiles.map((p) => p.platform as SocialPlatform))];
    return connected.length > 0 ? [connected[0]] : [];
  });
  const [content, setContent] = useState(post?.content || "");
  const [hashtags, setHashtags] = useState(post?.hashtags?.join(" ") || "");
  const [mediaUrls, setMediaUrls] = useState<string[]>(post?.media_urls || []);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(() => {
    if (post?.scheduled_at) {
      return new Date(post.scheduled_at).toISOString().slice(0, 10);
    }
    if (defaultDate) {
      return defaultDate.toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [scheduledTime, setScheduledTime] = useState(() => {
    if (post?.scheduled_at) {
      const d = new Date(post.scheduled_at);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    return "12:00";
  });
  // Auto-select the matching profile for the auto-selected platform
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(() => {
    if (post?.social_profile_id) return post.social_profile_id;
    if (!post && profiles.length > 0) return profiles[0].id;
    return null;
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [suggestingHashtags, setSuggestingHashtags] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"compose" | "media" | "schedule">("compose");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal state for duplicate & delete confirmations
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [dupDate, setDupDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dupTime, setDupTime] = useState("12:00");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Derived state
  const status = post?.status || "draft";

  // Get the minimum character limit across selected platforms
  const minCharLimit = selectedPlatforms.length > 0
    ? Math.min(...selectedPlatforms.map((p) => PLATFORM_CHAR_LIMITS[p] || 2200))
    : 2200;

  const charCount = content.length;
  const isOverLimit = charCount > minCharLimit;
  const isNearLimit = charCount > minCharLimit * 0.9;

  // Available platforms from connected profiles
  const connectedPlatforms = [...new Set(profiles.map((p) => p.platform))];

  // Toggle platform + auto-select matching profile
  function togglePlatform(platform: SocialPlatform) {
    setSelectedPlatforms((prev) => {
      const next = prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform];
      // Auto-select the first profile matching the newly selected platform
      if (!prev.includes(platform)) {
        const match = profiles.find((p) => p.platform === platform);
        if (match) setSelectedProfileId(match.id);
      }
      return next;
    });
  }

  // Media handling — images (uploaded) + video URLs (pasted)
  function removeMediaUrl(index: number) {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function addVideoUrl() {
    setVideoUrls((prev) => [...prev, ""]);
  }

  function updateVideoUrl(index: number, value: string) {
    setVideoUrls((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function removeVideoUrl(index: number) {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileUpload(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const totalMedia = mediaUrls.length + fileArray.length;
    if (totalMedia > 10) {
      setError(`Max 10 images. You have ${mediaUrls.length}, tried to add ${fileArray.length}.`);
      return;
    }

    setUploading(true);
    setError(null);

    for (const file of fileArray) {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadPostMedia(fd);
      if (result.error) {
        setError(result.error);
        break;
      }
      if (result.url) {
        setMediaUrls((prev) => [...prev, result.url!]);
      }
    }

    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  // Build scheduled_at from date + time
  function getScheduledAt(): string {
    const [yearStr, monthStr, dayStr] = scheduledDate.split("-");
    const [hourStr, minStr] = scheduledTime.split(":");
    const d = new Date(
      parseInt(yearStr),
      parseInt(monthStr) - 1,
      parseInt(dayStr),
      parseInt(hourStr),
      parseInt(minStr),
    );
    return d.toISOString();
  }

  // Parse hashtags string into array
  function parseHashtags(): string[] {
    return hashtags
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter((h) => h.length > 0)
      .map((h) => (h.startsWith("#") ? h : `#${h}`));
  }

  // ─── Actions ──────────────────────────────────────────────────────────

  async function handleSaveAsDraft() {
    if (selectedPlatforms.length === 0) {
      setError("Select at least one platform.");
      return;
    }
    if (!content.trim()) {
      setError("Content cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const cleanMedia = [...mediaUrls, ...videoUrls].filter((u) => u.trim().length > 0);
      const hashtagList = parseHashtags();

      if (isEditing && post) {
        const result = await updatePost(post.id, {
          content,
          platform: selectedPlatforms[0],
          media_urls: cleanMedia,
          hashtags: hashtagList,
          scheduled_at: getScheduledAt(),
          social_profile_id: selectedProfileId,
          status: "draft",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        // Create one post per platform
        for (const platform of selectedPlatforms) {
          const result = await createPost({
            platform,
            content,
            media_urls: cleanMedia,
            hashtags: hashtagList,
            scheduled_at: getScheduledAt(),
            social_profile_id: selectedProfileId,
            status: "draft",
          });
          if (result.error) {
            setError(result.error);
            return;
          }
        }
      }

      onSaved();
      onClose();
    } catch {
      setError("Failed to save post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule() {
    if (selectedPlatforms.length === 0) {
      setError("Select at least one platform.");
      return;
    }
    if (!content.trim()) {
      setError("Content cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const cleanMedia = [...mediaUrls, ...videoUrls].filter((u) => u.trim().length > 0);
      const hashtagList = parseHashtags();
      const scheduledAt = getScheduledAt();

      if (isEditing && post) {
        const result = await updatePost(post.id, {
          content,
          platform: selectedPlatforms[0],
          media_urls: cleanMedia,
          hashtags: hashtagList,
          scheduled_at: scheduledAt,
          social_profile_id: selectedProfileId,
          status: "scheduled",
        });
        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        for (const platform of selectedPlatforms) {
          const result = await createPost({
            platform,
            content,
            media_urls: cleanMedia,
            hashtags: hashtagList,
            scheduled_at: scheduledAt,
            social_profile_id: selectedProfileId,
            status: "scheduled",
          });
          if (result.error) {
            setError(result.error);
            return;
          }
        }
      }

      onSaved();
      onClose();
    } catch {
      setError("Failed to schedule post.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishNow() {
    if (!post) return;
    setSaving(true);
    setError(null);

    try {
      const result = await markAsPublished(post.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to mark as published.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!post) return;
    setSaving(true);
    setError(null);
    try {
      const result = await deletePost(post.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to delete post.");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  }

  async function handleDuplicateConfirm() {
    if (!post) return;
    setSaving(true);
    setError(null);
    try {
      // Build local date from user-chosen date + time
      const [y, m, d] = dupDate.split("-").map(Number);
      const [h, min] = dupTime.split(":").map(Number);
      const localDate = new Date(y, m - 1, d, h, min);

      const result = await duplicatePost(post.id, localDate.toISOString());
      if (result.error) {
        setError(`Duplicate failed: ${result.error}`);
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(`Duplicate failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(false);
      setShowDuplicateModal(false);
    }
  }

  async function handleCancel() {
    if (!post) return;
    setSaving(true);
    try {
      const result = await cancelPost(post.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Failed to cancel post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAIOptimize() {
    if (!content.trim()) {
      setError("Write some content first.");
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError("Select a platform first.");
      return;
    }

    setOptimizing(true);
    setError(null);

    try {
      const result = await aiOptimizeContent(content, selectedPlatforms[0]);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setContent(result.data);
      }
    } catch {
      setError("Optimization failed.");
    } finally {
      setOptimizing(false);
    }
  }

  async function handleAISuggestHashtags() {
    if (!content.trim()) {
      setError("Write some content first.");
      return;
    }

    setSuggestingHashtags(true);
    setError(null);

    try {
      const platform = selectedPlatforms[0] || "instagram";
      const result = await aiSuggestHashtags(content, platform);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        setHashtags(result.data.join(" "));
      }
    } catch {
      setError("Failed to suggest hashtags.");
    } finally {
      setSuggestingHashtags(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ─── Styles ───────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--color-surface-inset)",
    border: "1px solid rgba(var(--accent-rgb),0.12)",
    borderRadius: 8,
    color: "var(--color-ink)",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--color-ink-secondary)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  // ─── Preview Renderer ────────────────────────────────────────────────

  function renderPreview(platform: SocialPlatform) {
    const color = PLATFORM_COLORS[platform];
    const label = PLATFORM_LABELS[platform];
    const limit = PLATFORM_CHAR_LIMITS[platform] || 2200;
    const truncated = content.length > limit ? content.slice(0, limit) + "..." : content;
    const hashtagList = parseHashtags();

    return (
      <div
        key={platform}
        style={{
          padding: 16,
          borderRadius: 10,
          border: `1px solid ${color}30`,
          background: `${color}08`,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${color}20`,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: color,
            }}
          >
            {label} Preview
          </span>
          {content.length > limit && (
            <span
              style={{
                fontSize: 10,
                color: "#EF4444",
                fontWeight: 600,
                marginLeft: "auto",
              }}
            >
              Content exceeds {limit} char limit
            </span>
          )}
        </div>

        {/* Simplified post mockup */}
        <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: `${color}30`,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              Your Account
            </span>
            <p
              style={{
                fontSize: 12,
                color: "var(--color-ink)",
                lineHeight: 1.5,
                margin: "4px 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {truncated}
            </p>
            {hashtagList.length > 0 && (
              <p
                style={{
                  fontSize: 11,
                  color: color,
                  margin: "4px 0 0",
                  wordBreak: "break-word",
                }}
              >
                {hashtagList.join(" ")}
              </p>
            )}
          </div>
        </div>

        {/* Media preview */}
        {mediaUrls.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: mediaUrls.length === 1 ? "1fr" : "1fr 1fr",
              gap: 4,
              marginTop: 8,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {mediaUrls.slice(0, 4).map((url, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  aspectRatio: mediaUrls.length === 1 ? "16/9" : "1",
                  background: "var(--color-surface-inset)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Media ${idx + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {idx === 3 && mediaUrls.length > 4 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    +{mediaUrls.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {videoUrls.filter((u) => u.trim()).length > 0 && (
          <div
            style={{
              marginTop: 6,
              padding: "6px 10px",
              borderRadius: 6,
              background: `${color}10`,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Video size={14} style={{ color: `${color}80` }} />
            <span style={{ fontSize: 10, color: "var(--color-ink-muted)" }}>
              {videoUrls.filter((u) => u.trim()).length} video link(s)
            </span>
          </div>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 998,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 540,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 48px)",
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              {isEditing ? "Edit Post" : "Create Post"}
            </h2>
            {isEditing && (
              <div
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: `${STATUS_COLORS[status] || "#6B7280"}20`,
                  color: STATUS_COLORS[status] || "#6B7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {status}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--color-surface-inset)",
              border: "none",
              color: "var(--color-ink-secondary)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
            flexShrink: 0,
          }}
        >
          {(
            [
              { key: "compose", label: "Compose" },
              { key: "media", label: "Media" },
              { key: "schedule", label: "Schedule" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "10px 0",
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                background: "transparent",
                color:
                  activeTab === tab.key
                    ? "var(--color-editorial-blue)"
                    : "var(--color-ink-secondary)",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid var(--color-editorial-blue)"
                    : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
          }}
        >
          {/* Error banner */}
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#EF4444",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle size={14} />
              {error}
              <button
                onClick={() => setError(null)}
                style={{
                  marginLeft: "auto",
                  background: "none",
                  border: "none",
                  color: "#EF4444",
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* ─── Compose Tab ─── */}
          {activeTab === "compose" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Platform selector */}
              <div>
                <label style={labelStyle}>Platforms</label>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {ALL_PLATFORMS.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform);
                    const isConnected = connectedPlatforms.includes(platform);
                    const color = PLATFORM_COLORS[platform];

                    return (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        disabled={isEditing}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          border: `1px solid ${isSelected ? color : "rgba(var(--accent-rgb),0.12)"}`,
                          background: isSelected ? `${color}18` : "transparent",
                          color: isSelected ? color : "var(--color-ink-secondary)",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: isEditing ? "default" : "pointer",
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          opacity: isEditing ? 0.6 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: isSelected ? color : "var(--color-ink-muted)",
                          }}
                        />
                        {PLATFORM_LABELS[platform]}
                        {isConnected && (
                          <CheckCircle
                            size={10}
                            style={{ color: "var(--color-editorial-green)", marginLeft: 2 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {!isEditing && selectedPlatforms.length > 1 && (
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--color-ink-muted)",
                      marginTop: 6,
                    }}
                  >
                    A separate post will be created for each selected platform.
                  </p>
                )}
              </div>

              {/* Connected profile */}
              {profiles.length > 0 && (
                <div>
                  <label style={labelStyle}>Profile</label>
                  <select
                    value={selectedProfileId || ""}
                    onChange={(e) => setSelectedProfileId(e.target.value || null)}
                    style={{
                      ...inputStyle,
                      appearance: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">No specific profile</option>
                    {profiles
                      .filter(
                        (p) =>
                          selectedPlatforms.length === 0 ||
                          selectedPlatforms.includes(p.platform),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.display_name || p.handle} ({p.platform})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Content textarea */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Content</label>
                  <button
                    onClick={handleAIOptimize}
                    disabled={optimizing}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "rgba(var(--accent-rgb),0.1)",
                      border: "1px solid rgba(var(--accent-rgb),0.15)",
                      color: "var(--color-editorial-blue)",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: optimizing ? "default" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      opacity: optimizing ? 0.7 : 1,
                    }}
                  >
                    {optimizing ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} />
                    )}
                    {optimizing ? "Optimizing..." : "Optimize"}
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post content here..."
                  rows={6}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 120,
                    lineHeight: 1.5,
                  }}
                />
                {/* Character count */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isOverLimit
                        ? "#EF4444"
                        : isNearLimit
                          ? "#F59E0B"
                          : "var(--color-ink-muted)",
                    }}
                  >
                    {charCount} / {minCharLimit}
                  </span>

                  {/* Per-platform warnings */}
                  {selectedPlatforms.length > 1 && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {selectedPlatforms
                        .filter((p) => charCount > PLATFORM_CHAR_LIMITS[p])
                        .map((p) => (
                          <span
                            key={p}
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: "rgba(239,68,68,0.1)",
                              color: "#EF4444",
                            }}
                          >
                            {PLATFORM_LABELS[p]}: over {PLATFORM_CHAR_LIMITS[p]}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <label style={{ ...labelStyle, marginBottom: 0 }}>
                    <Hash size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                    Hashtags
                  </label>
                  <button
                    onClick={handleAISuggestHashtags}
                    disabled={suggestingHashtags}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "rgba(var(--accent-rgb),0.1)",
                      border: "1px solid rgba(var(--accent-rgb),0.15)",
                      color: "var(--color-editorial-blue)",
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: suggestingHashtags ? "default" : "pointer",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      opacity: suggestingHashtags ? 0.7 : 1,
                    }}
                  >
                    {suggestingHashtags ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Sparkles size={10} />
                    )}
                    {suggestingHashtags ? "Generating..." : "Suggest"}
                  </button>
                </div>
                <input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#trending #viral #content"
                  style={inputStyle}
                />
                <p style={{ fontSize: 10, color: "var(--color-ink-muted)", marginTop: 4 }}>
                  Separate with spaces or commas. # prefix optional.
                </p>
              </div>

              {/* Preview toggle */}
              <div>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: showPreview ? "rgba(var(--accent-rgb),0.1)" : "transparent",
                    border: "1px solid rgba(var(--accent-rgb),0.12)",
                    color: "var(--color-editorial-blue)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Eye size={12} />
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>

                {showPreview && selectedPlatforms.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {selectedPlatforms.map((platform) => renderPreview(platform))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Media Tab ─── */}
          {activeTab === "media" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* ── Image Upload Section ── */}
              <div>
                <label style={labelStyle}>
                  <Upload size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                  Images
                </label>
                <p style={{ fontSize: 11, color: "var(--color-ink-muted)", margin: "-4px 0 8px" }}>
                  Upload up to 10 images (JPEG, PNG, GIF, WebP). Max 10 MB each.
                </p>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  style={{
                    padding: "24px 16px",
                    borderRadius: 10,
                    border: `2px dashed ${dragOver ? "var(--color-editorial-blue)" : "rgba(var(--accent-rgb),0.15)"}`,
                    background: dragOver ? "rgba(var(--accent-rgb),0.04)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  {uploading ? (
                    <Loader2 size={24} style={{ color: "var(--color-editorial-blue)", animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Upload size={24} style={{ color: "var(--color-ink-muted)" }} />
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-secondary)" }}>
                    {uploading ? "Uploading..." : "Drop images here or click to browse"}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--color-ink-muted)" }}>
                    {mediaUrls.length}/10 images
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files);
                      e.target.value = "";
                    }
                  }}
                />

                {/* Uploaded image thumbnails */}
                {mediaUrls.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    {mediaUrls.map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          aspectRatio: "1",
                          borderRadius: 8,
                          overflow: "hidden",
                          background: "var(--color-surface-inset)",
                          border: "1px solid rgba(var(--accent-rgb),0.08)",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Upload ${idx + 1}`}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <button
                          onClick={() => removeMediaUrl(idx)}
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "rgba(0,0,0,0.65)",
                            border: "none",
                            color: "#fff",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 0,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Divider ── */}
              <div style={{ height: 1, background: "rgba(var(--accent-rgb),0.08)" }} />

              {/* ── Video URL Section ── */}
              <div>
                <label style={labelStyle}>
                  <Video size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                  Video Links
                </label>
                <p style={{ fontSize: 11, color: "var(--color-ink-muted)", margin: "-4px 0 8px" }}>
                  Paste YouTube, TikTok, or other video URLs.
                </p>

                {videoUrls.map((url, idx) => (
                  <div
                    key={idx}
                    style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}
                  >
                    <div style={{ position: "relative", flex: 1 }}>
                      <Link2
                        size={13}
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--color-ink-muted)",
                        }}
                      />
                      <input
                        value={url}
                        onChange={(e) => updateVideoUrl(idx, e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        style={{ ...inputStyle, paddingLeft: 32 }}
                      />
                    </div>
                    <button
                      onClick={() => removeVideoUrl(idx)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: "rgba(239,68,68,0.1)",
                        border: "none",
                        color: "#EF4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addVideoUrl}
                  style={{
                    padding: "8px 0",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px dashed rgba(var(--accent-rgb),0.15)",
                    color: "var(--color-editorial-blue)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  + Add Video URL
                </button>
              </div>
            </div>
          )}

          {/* ─── Schedule Tab ─── */}
          {activeTab === "schedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={labelStyle}>
                  <Clock size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Scheduled preview */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: "var(--color-surface-inset)",
                  border: "1px solid rgba(var(--accent-rgb),0.08)",
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink-secondary)",
                    margin: "0 0 4px",
                  }}
                >
                  Scheduled for
                </p>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--color-ink)",
                    margin: 0,
                  }}
                >
                  {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>

              {/* Note about manual publishing */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "rgba(59,130,246,0.08)",
                  border: "1px solid rgba(59,130,246,0.15)",
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-editorial-blue)",
                    fontWeight: 600,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Posts are scheduled locally. When the time arrives, you can manually publish them to
                  each platform and then mark them as published here. Automatic publishing will be
                  available once platform API integrations are connected.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid rgba(var(--accent-rgb),0.12)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flexShrink: 0,
          }}
        >
          {/* Edit mode extra actions */}
          {isEditing && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <button
                onClick={() => setShowDuplicateModal(true)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  color: "var(--color-ink-secondary)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Copy size={12} />
                Duplicate
              </button>
              {status !== "published" && status !== "cancelled" && (
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    borderRadius: 8,
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.15)",
                    color: "#EF4444",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <X size={12} />
                  Cancel Post
                </button>
              )}
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#EF4444",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}

          {/* Primary actions */}
          <div style={{ display: "flex", gap: 8 }}>
            {/* Save as Draft */}
            {status !== "published" && (
              <button
                onClick={handleSaveAsDraft}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: "var(--color-surface-inset)",
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  color: "var(--color-ink)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Draft
              </button>
            )}

            {/* Schedule */}
            {status !== "published" && (
              <button
                onClick={handleSchedule}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: "#3182CE",
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Clock size={14} />
                )}
                Schedule
              </button>
            )}

            {/* Mark Published (only for scheduled/draft) */}
            {isEditing && status !== "published" && status !== "cancelled" && (
              <button
                onClick={handlePublishNow}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: "#34D399",
                  border: "none",
                  color: "#000",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Published
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Duplicate Modal ─── */}
      {showDuplicateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowDuplicateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a2332",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
              padding: 28,
              width: 380,
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(49,130,206,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Copy size={18} style={{ color: "#3182CE" }} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>
                  Duplicate Post
                </h3>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                  Choose when to schedule the copy
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  Date
                </label>
                <input
                  type="date"
                  value={dupDate}
                  onChange={(e) => setDupDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  Time
                </label>
                <input
                  type="time"
                  value={dupTime}
                  onChange={(e) => setDupTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowDuplicateModal(false)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicateConfirm}
                disabled={saving}
                style={{
                  flex: 1.3,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: "#3182CE",
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                Duplicate & Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#1a2332",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
              padding: 28,
              width: 380,
              maxWidth: "100%",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "rgba(239,68,68,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Trash2 size={24} style={{ color: "#EF4444" }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
              Delete Post
            </h3>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "0 0 24px", lineHeight: 1.5 }}>
              This will permanently delete this post.<br />This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 8,
                  background: "#EF4444",
                  border: "none",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: saving ? "default" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
