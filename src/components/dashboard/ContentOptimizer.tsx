"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Sparkles,
  Copy,
  Check,
  Clock,
  Hash,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileSelector } from "./ProfileSelector";
import { optimizeContent, getOptimizationHistory } from "@/lib/ai/content-optimizer";
import type { SocialProfile, ContentOptimization } from "@/types";

interface ContentOptimizerProps {
  profiles: SocialProfile[];
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "threads", label: "Threads" },
];

const CONTENT_TYPES = [
  { value: "post", label: "Post" },
  { value: "reel", label: "Reel / Short" },
  { value: "story", label: "Story" },
  { value: "video", label: "Video" },
  { value: "thread", label: "Thread" },
  { value: "carousel", label: "Carousel" },
];

// ── Small Circular Gauge ──

function MiniGauge({ value, size = 64 }: { value: number; size?: number }) {
  const color =
    value >= 70 ? "#22C55E" : value >= 40 ? "#F59E0B" : "#EF4444";
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-rule)"
          strokeWidth="4"
          opacity="0.3"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

// ── Copy Button ──

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex shrink-0 items-center gap-1 border border-rule px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary transition-colors hover:border-ink-muted hover:text-ink",
        className,
      )}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Tone Analysis Bar ──

function ToneBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "#22C55E" : value >= 60 ? "#3B82F6" : value >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
          {label}
        </span>
        <span className="text-xs font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-surface-raised">
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Main Component ──

export function ContentOptimizer({ profiles }: ContentOptimizerProps) {
  const defaultId = profiles[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [draftContent, setDraftContent] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("post");
  const [result, setResult] = useState<ContentOptimization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Suggestions checkboxes
  const [checkedSuggestions, setCheckedSuggestions] = useState<Set<number>>(new Set());

  // History
  const [history, setHistory] = useState<ContentOptimization[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  function handleOptimize() {
    if (!selectedId || !draftContent.trim()) return;
    setError(null);
    setCheckedSuggestions(new Set());

    startTransition(async () => {
      const res = await optimizeContent({
        socialProfileId: selectedId,
        draftContent: draftContent.trim(),
        targetPlatform: platform,
        contentType,
      });

      if ("error" in res && !res.success) {
        setError(res.error);
      } else if (res.success) {
        setResult(res.data);
      }
    });
  }

  async function loadHistory() {
    if (!selectedId) return;
    setShowHistory(!showHistory);
    if (!historyLoaded && selectedId) {
      const h = await getOptimizationHistory(selectedId, 10);
      setHistory(h);
      setHistoryLoaded(true);
    }
  }

  function toggleSuggestion(idx: number) {
    setCheckedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  if (profiles.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-muted">
          Add a social profile to use the Content Optimizer.
        </p>
      </div>
    );
  }

  const tone = (result?.tone_analysis ?? {}) as Record<string, unknown>;

  return (
    <>
      <ProfileSelector
        profiles={profiles}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          setResult(null);
          setHistory([]);
          setHistoryLoaded(false);
        }}
      />

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        {/* ── Left Column: Input ── */}
        <div className="space-y-4">
          {/* Draft Input */}
          <div className="border border-rule bg-surface-card p-5">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              Draft Content
            </label>
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Paste your draft post, caption, or content here..."
              rows={8}
              className="w-full resize-y border border-rule bg-surface-cream px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 focus:border-editorial-red focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-ink-muted">
              {draftContent.length} characters
            </p>
          </div>

          {/* Platform + Content Type */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-rule bg-surface-card p-4">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-editorial-red focus:outline-none"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="border border-rule bg-surface-card p-4">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full border border-rule bg-surface-cream px-3 py-2 text-sm text-ink focus:border-editorial-red focus:outline-none"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>
                    {ct.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optimize Button */}
          <button
            onClick={handleOptimize}
            disabled={isPending || !selectedId || !draftContent.trim()}
            className="flex w-full items-center justify-center gap-2 bg-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Optimize Content
              </>
            )}
          </button>

          {error && (
            <div className="border border-rule bg-surface-raised px-4 py-3 text-sm text-editorial-red">
              {error}
            </div>
          )}

          {/* History toggle */}
          <button
            onClick={loadHistory}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary transition-colors hover:text-ink"
          >
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Past Optimizations
          </button>

          {showHistory && (
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-xs text-ink-muted">No past optimizations found.</p>
              ) : (
                history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setResult(h);
                      setDraftContent(h.draft_content);
                      setPlatform(h.target_platform);
                      if (h.content_type) setContentType(h.content_type);
                      setCheckedSuggestions(new Set());
                    }}
                    className="block w-full border border-rule bg-surface-card p-3 text-left transition-colors hover:border-ink-muted"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">
                        {h.draft_content.slice(0, 60)}
                        {h.draft_content.length > 60 ? "..." : ""}
                      </span>
                      <span className="shrink-0 bg-surface-raised px-2 py-0.5 text-[9px] font-bold uppercase text-ink-secondary">
                        {h.target_platform}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {new Date(h.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {h.predicted_engagement !== null &&
                        ` -- Predicted: ${h.predicted_engagement}%`}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Right Column: Results ── */}
        <div className="space-y-4">
          {/* Processing indicator */}
          {isPending && (
            <div className="border border-rule bg-surface-card p-6">
              <div className="flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-editorial-red" />
                <div>
                  <h3 className="font-serif text-base font-bold text-ink">
                    Optimizing Content
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Analyzing your draft and generating improvements...
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden bg-surface-raised">
                <div
                  className="h-full animate-pulse bg-editorial-red/60 transition-all"
                  style={{ width: "60%" }}
                />
              </div>
            </div>
          )}

          {/* Results */}
          {!isPending && result && (
            <>
              {/* Predicted Engagement */}
              <div className="border border-rule bg-surface-card p-5">
                <div className="flex items-center gap-4">
                  <MiniGauge value={result.predicted_engagement ?? 0} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
                      Predicted Engagement
                    </p>
                    <p className="font-serif text-lg font-bold text-ink">
                      {result.predicted_engagement ?? 0}% estimated
                    </p>
                    <p className="text-[11px] text-ink-secondary">
                      Based on your audience, niche, and content quality
                    </p>
                  </div>
                </div>
              </div>

              {/* Optimized Content */}
              <div className="border border-rule bg-surface-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                    Optimized Content
                  </h4>
                  <CopyButton text={result.optimized_content || ""} />
                </div>
                <textarea
                  value={result.optimized_content || ""}
                  readOnly
                  rows={6}
                  className="w-full resize-y border border-rule bg-surface-cream px-3 py-2.5 text-sm leading-relaxed text-ink focus:border-editorial-red focus:outline-none"
                />
              </div>

              {/* Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="border border-rule bg-surface-card p-5">
                  <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                    <Lightbulb size={13} />
                    Improvement Suggestions
                  </h4>
                  <div className="space-y-2">
                    {result.suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => toggleSuggestion(i)}
                        className="flex w-full items-start gap-2 text-left"
                      >
                        {checkedSuggestions.has(i) ? (
                          <CheckSquare
                            size={14}
                            className="mt-0.5 shrink-0 text-[#22C55E]"
                          />
                        ) : (
                          <Square
                            size={14}
                            className="mt-0.5 shrink-0 text-ink-muted"
                          />
                        )}
                        <span
                          className={cn(
                            "text-xs leading-relaxed",
                            checkedSuggestions.has(i)
                              ? "text-ink-muted line-through"
                              : "text-ink-secondary",
                          )}
                        >
                          {suggestion}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtag Recommendations */}
              {result.hashtag_recommendations &&
                result.hashtag_recommendations.length > 0 && (
                  <div className="border border-rule bg-surface-card p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                        <Hash size={13} />
                        Hashtag Recommendations
                      </h4>
                      <CopyButton
                        text={result.hashtag_recommendations.join(" ")}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {result.hashtag_recommendations.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => navigator.clipboard.writeText(tag)}
                          className="bg-surface-raised px-2 py-1 text-[11px] font-medium text-ink-secondary transition-colors hover:bg-editorial-red/10 hover:text-editorial-red"
                          title="Click to copy"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Best Posting Time */}
              {result.best_posting_time && (
                <div className="border border-rule bg-surface-card p-5">
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                    <Clock size={13} />
                    Best Posting Time
                  </h4>
                  <p className="font-serif text-base font-bold text-ink">
                    {new Date(result.best_posting_time).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              )}

              {/* Tone Analysis */}
              {tone.primary_tone && (
                <div className="border border-rule bg-surface-card p-5">
                  <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                    Tone Analysis
                  </h4>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="bg-surface-raised px-2.5 py-1 text-xs font-semibold text-ink">
                      {String(tone.primary_tone)}
                    </span>
                    {typeof tone.secondary_tone === "string" && tone.secondary_tone && (
                      <span className="bg-surface-raised px-2.5 py-1 text-xs text-ink-secondary">
                        {tone.secondary_tone}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {typeof tone.professionalism_score === "number" && (
                      <ToneBar
                        label="Professionalism"
                        value={tone.professionalism_score as number}
                      />
                    )}
                    {typeof tone.authenticity_score === "number" && (
                      <ToneBar
                        label="Authenticity"
                        value={tone.authenticity_score as number}
                      />
                    )}
                    {typeof tone.emotional_appeal === "number" && (
                      <ToneBar
                        label="Emotional Appeal"
                        value={tone.emotional_appeal as number}
                      />
                    )}
                    {typeof tone.clarity_score === "number" && (
                      <ToneBar
                        label="Clarity"
                        value={tone.clarity_score as number}
                      />
                    )}
                    {typeof tone.virality_potential === "number" && (
                      <ToneBar
                        label="Virality Potential"
                        value={tone.virality_potential as number}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!isPending && !result && !error && (
            <div className="border border-rule bg-surface-card px-6 py-16 text-center">
              <Sparkles size={28} className="mx-auto mb-3 text-ink-muted" />
              <p className="mb-1 font-serif text-base font-bold text-ink">
                Content Optimizer
              </p>
              <p className="text-sm text-ink-secondary">
                Paste your draft content and click Optimize to get smart
                suggestions, predicted engagement, and hashtag recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
