"use client";

import { useState, useCallback } from "react";
import {
  Hash,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import { TrendingTopics } from "@/components/dashboard/TrendingTopics";
import {
  actionScanTrends,
  actionGetHashtagRecommendations,
} from "@/lib/actions/trends";
import type { TrendingTopic } from "@/types";

/* ─── Constants ─── */

const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "twitter", label: "Twitter" },
];

const NICHES = [
  "Fashion",
  "Beauty",
  "Tech",
  "Gaming",
  "Food",
  "Travel",
  "Fitness",
  "Lifestyle",
  "Sports",
  "Education",
  "Finance",
  "Music",
  "Art",
  "Health",
  "Business",
  "Entertainment",
];

/* ─── Component ─── */

interface HashtagsClientProps {
  initialTopics: TrendingTopic[];
}

export function HashtagsClient({ initialTopics }: HashtagsClientProps) {
  // Hashtag analyzer state
  const [content, setContent] = useState("");
  const [analyzerPlatform, setAnalyzerPlatform] = useState("instagram");
  const [analyzerNiche, setAnalyzerNiche] = useState("Lifestyle");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    hashtags: string[];
    reasoning: string;
    predicted_reach_boost: number;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const result = await actionGetHashtagRecommendations(
        content,
        analyzerPlatform,
        analyzerNiche,
      );
      if (result.error) {
        setAnalysisError(result.error);
      } else if (result.data) {
        setAnalysisResult(result.data);
      }
    } catch {
      setAnalysisError("Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }, [content, analyzerPlatform, analyzerNiche, analyzing]);

  const copyAllHashtags = useCallback(() => {
    if (!analysisResult) return;
    navigator.clipboard
      .writeText(analysisResult.hashtags.join(" "))
      .then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      });
  }, [analysisResult]);

  const copySingle = useCallback((tag: string) => {
    navigator.clipboard.writeText(tag).then(() => {
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 1500);
    });
  }, []);

  return (
    <div
      style={{
        fontFamily:
          "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(var(--accent-rgb),0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Hash size={18} style={{ color: "rgba(var(--accent-rgb),0.7)" }} />
          </div>
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
              Hashtag Intelligence
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--color-ink-secondary)",
                margin: "2px 0 0",
                fontWeight: 500,
              }}
            >
              Discover trending topics and get optimized hashtag
              recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Content Hashtag Analyzer section */}
      <div
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <Sparkles size={16} style={{ color: "rgba(var(--accent-rgb),0.7)" }} />
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Content Hashtag Analyzer
          </h2>
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--color-ink-secondary)",
            marginBottom: 14,
            lineHeight: 1.5,
          }}
        >
          Paste your post content below and we'll suggest the optimal
          hashtag set for maximum reach.
        </p>

        {/* Platform + Niche selectors */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-ink-secondary)",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                display: "block",
                marginBottom: 4,
              }}
            >
              Platform
            </label>
            <select
              value={analyzerPlatform}
              onChange={(e) => setAnalyzerPlatform(e.target.value)}
              style={{
                background: "var(--color-surface-inset)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--color-ink)",
                fontFamily: "inherit",
                outline: "none",
                minWidth: 140,
              }}
            >
              {PLATFORMS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--color-ink-secondary)",
                textTransform: "uppercase",
                letterSpacing: 0.8,
                display: "block",
                marginBottom: 4,
              }}
            >
              Niche
            </label>
            <select
              value={analyzerNiche}
              onChange={(e) => setAnalyzerNiche(e.target.value)}
              style={{
                background: "var(--color-surface-inset)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--color-ink)",
                fontFamily: "inherit",
                outline: "none",
                minWidth: 140,
              }}
            >
              {NICHES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your post caption or content here..."
          rows={5}
          style={{
            width: "100%",
            background: "var(--color-surface-inset)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 13,
            color: "var(--color-ink)",
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            lineHeight: 1.6,
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
          {!content.trim() && (
            <span style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>
              Paste content above to enable
            </span>
          )}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !content.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background:
                analyzing || !content.trim()
                  ? "var(--color-surface-inset)"
                  : "var(--color-editorial-red)",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              color:
                analyzing || !content.trim()
                  ? "var(--color-ink-secondary)"
                  : "#ffffff",
              cursor:
                analyzing || !content.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: analyzing || !content.trim() ? 0.6 : 1,
            }}
          >
            {analyzing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {analyzing ? "Analyzing..." : "Get Hashtag Recommendations"}
          </button>
        </div>

        {/* Error display */}
        {analysisError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 14,
              padding: "10px 14px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8,
              fontSize: 12,
              color: "#EF4444",
              fontWeight: 600,
            }}
          >
            <AlertCircle size={14} />
            {analysisError}
          </div>
        )}

        {/* Analysis results */}
        {analysisResult && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              background: "rgba(var(--accent-rgb),0.04)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  margin: 0,
                }}
              >
                Recommended Hashtags
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#34D399",
                  }}
                >
                  <ArrowUpRight size={13} />+
                  {analysisResult.predicted_reach_boost}% reach boost
                </div>
                <button
                  onClick={copyAllHashtags}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    background: copiedAll
                      ? "rgba(52,211,153,0.12)"
                      : "var(--color-surface-card)",
                    border: copiedAll
                      ? "1px solid rgba(52,211,153,0.3)"
                      : "1px solid rgba(var(--accent-rgb),0.12)",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    color: copiedAll
                      ? "#34D399"
                      : "var(--color-ink-secondary)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {copiedAll ? (
                    <Check size={11} />
                  ) : (
                    <Copy size={11} />
                  )}
                  {copiedAll ? "Copied!" : "Copy All"}
                </button>
              </div>
            </div>

            {/* Hashtag chips */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 14,
              }}
            >
              {analysisResult.hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => copySingle(tag)}
                  title={`Copy ${tag}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border:
                      copiedTag === tag
                        ? "1px solid rgba(52,211,153,0.3)"
                        : "1px solid rgba(var(--accent-rgb),0.15)",
                    background:
                      copiedTag === tag
                        ? "rgba(52,211,153,0.12)"
                        : "var(--color-surface-card)",
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      copiedTag === tag
                        ? "#34D399"
                        : "var(--color-ink)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Hash size={10} />
                  {tag.replace(/^#/, "")}
                  {copiedTag === tag && <Check size={10} />}
                </button>
              ))}
            </div>

            {/* Reasoning */}
            <div
              style={{
                padding: "10px 12px",
                background: "var(--color-surface-card)",
                borderRadius: 8,
                borderLeft: "2px solid rgba(var(--accent-rgb),0.2)",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink-secondary)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {analysisResult.reasoning}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Trending Topics section */}
      <TrendingTopics
        initialTopics={initialTopics}
        onScanTrends={actionScanTrends}
      />
    </div>
  );
}
