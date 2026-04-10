"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Copy,
  Check,
  RefreshCw,
  Flame,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  Loader2,
} from "lucide-react";
import type { TrendingTopic } from "@/types";

/* ─── Constants ─── */

const PLATFORMS = [
  { key: "all", label: "All" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "twitter", label: "Twitter" },
] as const;

const NICHES = [
  "Fashion",
  "Beauty",
  "Tech",
  "Gaming",
  "Food",
  "Travel",
  "Fitness",
  "Lifestyle",
  "Education",
  "Finance",
  "Music",
  "Art",
  "Health",
  "Business",
  "Entertainment",
];

/* ─── Helpers ─── */

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M posts`;
  if (n >= 1_000) return `~${(n / 1_000).toFixed(0)}K posts`;
  return `~${n} posts`;
}

function getTrendScoreColor(score: number): string {
  // Gradient from cool blue (low) to hot red (high)
  if (score >= 80) return "#DC2626";
  if (score >= 60) return "#EA580C";
  if (score >= 40) return "#D97706";
  if (score >= 20) return "#2563EB";
  return "#3182CE";
}

function getTrendScoreLabel(score: number): string {
  if (score >= 90) return "Viral";
  if (score >= 70) return "Hot";
  if (score >= 50) return "Growing";
  if (score >= 30) return "Emerging";
  return "Niche";
}

/* ─── Component ─── */

interface TrendingTopicsProps {
  initialTopics: TrendingTopic[];
  onScanTrends: (
    platform: string,
    niche: string,
  ) => Promise<{ success?: boolean; topics?: TrendingTopic[]; error?: string }>;
}

export function TrendingTopics({
  initialTopics,
  onScanTrends,
}: TrendingTopicsProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>(initialTopics);
  const [platform, setPlatform] = useState("all");
  const [niche, setNiche] = useState("all");
  const [scanning, setScanning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredTopics = topics.filter((t) => {
    if (platform !== "all" && t.platform !== platform) return false;
    if (niche !== "all" && t.niche.toLowerCase() !== niche.toLowerCase())
      return false;
    return true;
  });

  const handleScan = useCallback(async () => {
    if (scanning) return;
    const scanPlatform = platform === "all" ? "instagram" : platform;
    const scanNiche = niche === "all" ? "Lifestyle" : niche;
    setScanning(true);
    try {
      const result = await onScanTrends(scanPlatform, scanNiche);
      if (result.topics && result.topics.length > 0) {
        setTopics((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const newTopics = result.topics!.filter(
            (t) => !existingIds.has(t.id),
          );
          return [...newTopics, ...prev];
        });
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setScanning(false);
    }
  }, [scanning, platform, niche, onScanTrends]);

  const copyHashtags = useCallback(
    (topicId: string, hashtags: string[]) => {
      const text = hashtags.join(" ");
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(topicId);
        setTimeout(() => setCopiedId(null), 2000);
      });
    },
    [],
  );

  const copySingleHashtag = useCallback((hashtag: string) => {
    navigator.clipboard.writeText(hashtag).then(() => {
      setCopiedId(hashtag);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  return (
    <div>
      {/* Header with filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Flame size={20} style={{ color: "#DC2626" }} />
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: -0.3,
            }}
          >
            Trending Topics
          </h2>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-ink-secondary)",
              background: "var(--color-surface-inset)",
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {filteredTopics.length}
          </span>
        </div>

        <button
          onClick={handleScan}
          disabled={scanning}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: scanning
              ? "var(--color-surface-inset)"
              : "var(--color-editorial-red)",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: scanning ? "var(--color-ink-secondary)" : "#ffffff",
            cursor: scanning ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: scanning ? 0.7 : 1,
          }}
        >
          {scanning ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {scanning ? "Scanning..." : "Scan for New Trends"}
        </button>
      </div>

      {/* Platform filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 12,
          overflowX: "auto",
        }}
      >
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border:
                platform === p.key
                  ? "1px solid rgba(var(--accent-rgb),0.3)"
                  : "1px solid rgba(var(--accent-rgb),0.08)",
              background:
                platform === p.key
                  ? "rgba(var(--accent-rgb),0.12)"
                  : "transparent",
              fontSize: 11,
              fontWeight: platform === p.key ? 700 : 600,
              color:
                platform === p.key
                  ? "var(--color-ink)"
                  : "var(--color-ink-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Niche filter */}
      <div style={{ marginBottom: 20 }}>
        <select
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "var(--color-ink)",
            fontFamily: "inherit",
            outline: "none",
            minWidth: 160,
          }}
        >
          <option value="all">All Niches</option>
          {NICHES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Topics grid */}
      {filteredTopics.length === 0 ? (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 12,
            padding: "48px 32px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(var(--accent-rgb),0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <TrendingUp size={24} style={{ color: "rgba(var(--accent-rgb),0.6)" }} />
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 8px",
            }}
          >
            No Trending Topics Yet
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-secondary)",
              maxWidth: 360,
              margin: "0 auto 20px",
              lineHeight: 1.6,
            }}
          >
            {niche !== "all"
              ? `Select a niche and click "Scan for New Trends" to discover what's trending in ${niche}.`
              : "Select a platform and niche, then click \"Scan for New Trends\" to discover what's hot right now."}
          </p>
          <button
            onClick={handleScan}
            disabled={scanning}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 22px",
              background: "var(--color-editorial-red)",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              color: "#ffffff",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {scanning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Zap size={14} />
            )}
            {scanning ? "Scanning..." : "Scan Trends Now"}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 14,
          }}
        >
          {filteredTopics.map((topic) => {
            const isExpanded = expandedId === topic.id;
            const scoreColor = getTrendScoreColor(topic.trend_score ?? 0);
            const scoreLabel = getTrendScoreLabel(topic.trend_score ?? 0);
            const scorePercent = Math.min(100, topic.trend_score ?? 0);
            const growthPositive = (topic.growth_rate ?? 0) > 0;

            return (
              <div
                key={topic.id}
                style={{
                  background: "var(--color-surface-card)",
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  borderRadius: 12,
                  padding: 18,
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Topic header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <TrendingUp
                        size={14}
                        style={{ color: scoreColor, flexShrink: 0 }}
                      />
                      <h3
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--color-ink)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {topic.topic}
                      </h3>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 10,
                        color: "var(--color-ink-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          textTransform: "capitalize",
                          background: "rgba(var(--accent-rgb),0.08)",
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {topic.platform}
                      </span>
                      <span>{topic.niche}</span>
                    </div>
                  </div>
                  {/* Score badge */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      flexShrink: 0,
                      marginLeft: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        color: scoreColor,
                      }}
                    >
                      {scoreLabel}
                    </span>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: scoreColor,
                        lineHeight: 1,
                      }}
                    >
                      {topic.trend_score ?? 0}
                    </span>
                  </div>
                </div>

                {/* Trend score heat bar */}
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(var(--accent-rgb),0.06)",
                    marginBottom: 12,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${scorePercent}%`,
                      borderRadius: 2,
                      background: `linear-gradient(90deg, #3182CE, ${scoreColor})`,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "var(--color-ink-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    <BarChart3 size={12} />
                    {formatVolume(topic.volume ?? 0)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: 11,
                      fontWeight: 700,
                      color: growthPositive ? "#34D399" : "#EF4444",
                    }}
                  >
                    {growthPositive ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownRight size={12} />
                    )}
                    {growthPositive ? "+" : ""}
                    {topic.growth_rate ?? 0}%
                  </div>
                </div>

                {/* Hashtag chips */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 12,
                  }}
                >
                  {(topic.hashtags ?? []).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => copySingleHashtag(tag)}
                      title={`Copy ${tag}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(var(--accent-rgb),0.12)",
                        background:
                          copiedId === tag
                            ? "rgba(52,211,153,0.12)"
                            : "rgba(var(--accent-rgb),0.06)",
                        fontSize: 10,
                        fontWeight: 600,
                        color:
                          copiedId === tag
                            ? "#34D399"
                            : "var(--color-ink-secondary)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Hash size={9} />
                      {tag.replace(/^#/, "")}
                      {copiedId === tag && <Check size={9} />}
                    </button>
                  ))}
                </div>

                {/* Deep Analysis expandable */}
                {topic.ai_analysis && (
                  <div style={{ marginBottom: 12 }}>
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : topic.id)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: 0,
                        background: "transparent",
                        border: "none",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--color-editorial-blue)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp size={12} />
                      ) : (
                        <ChevronDown size={12} />
                      )}
                      Deep Analysis
                    </button>
                    {isExpanded && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--color-ink-secondary)",
                          lineHeight: 1.6,
                          marginTop: 6,
                          padding: "8px 10px",
                          background: "rgba(var(--accent-rgb),0.04)",
                          borderRadius: 8,
                          borderLeft: "2px solid rgba(var(--accent-rgb),0.2)",
                        }}
                      >
                        {topic.ai_analysis}
                      </p>
                    )}
                  </div>
                )}

                {/* Use These button */}
                <button
                  onClick={() => copyHashtags(topic.id, topic.hashtags ?? [])}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 0",
                    background:
                      copiedId === topic.id
                        ? "rgba(52,211,153,0.12)"
                        : "rgba(var(--accent-rgb),0.06)",
                    border:
                      copiedId === topic.id
                        ? "1px solid rgba(52,211,153,0.3)"
                        : "1px solid rgba(var(--accent-rgb),0.12)",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      copiedId === topic.id
                        ? "#34D399"
                        : "var(--color-ink-secondary)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                  }}
                >
                  {copiedId === topic.id ? (
                    <>
                      <Check size={13} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={13} /> Use These Hashtags
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
