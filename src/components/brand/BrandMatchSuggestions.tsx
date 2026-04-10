"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sparkles,
  User,
  MapPin,
  Eye,
  Send,
  X,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
  MessageSquare,
  DollarSign,
  TrendingUp,
  BarChart3,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  actionGenerateMatches,
  actionUpdateMatchStatus,
} from "@/lib/actions/brand-matching";
import type { BrandCreatorMatch } from "@/types";

/* ─── Helpers ─── */

function getScoreColor(score: number): string {
  if (score >= 90) return "#34D399";
  if (score >= 70) return "#FFB84D";
  return "#6B7280";
}

function getScoreBg(score: number): string {
  if (score >= 90) return "rgba(52,211,153,0.12)";
  if (score >= 70) return "rgba(255,184,77,0.12)";
  return "rgba(107,114,128,0.12)";
}

function getScoreBorder(score: number): string {
  if (score >= 90) return "rgba(52,211,153,0.3)";
  if (score >= 70) return "rgba(255,184,77,0.3)";
  return "rgba(107,114,128,0.3)";
}

/* ─── Platform helpers ─── */

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "IG",
  tiktok: "TT",
  youtube: "YT",
  twitter: "X",
  linkedin: "LI",
  threads: "TH",
  pinterest: "PN",
  twitch: "TW",
};

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

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/* ─── Business Intelligence Helpers ─── */

function estimatePostValue(followers: number, engagementRate: number): { low: number; high: number } {
  // Industry CPM ranges by tier
  let cpmLow: number, cpmHigh: number;
  if (followers >= 10_000_000) { cpmLow = 15; cpmHigh = 35; }
  else if (followers >= 1_000_000) { cpmLow = 10; cpmHigh = 25; }
  else if (followers >= 100_000) { cpmLow = 8; cpmHigh = 20; }
  else if (followers >= 10_000) { cpmLow = 5; cpmHigh = 15; }
  else { cpmLow = 3; cpmHigh = 10; }

  // Use estimated engagement if actual is 0
  const effectiveEng = engagementRate > 0 ? engagementRate : estimateDefaultEngagement(followers);
  const engMultiplier = effectiveEng >= 5 ? 1.5 : effectiveEng >= 3 ? 1.25 : effectiveEng >= 1 ? 1.0 : 0.8;

  const impressions = followers * 0.2; // ~20% avg reach rate
  const low = Math.round((impressions * cpmLow * engMultiplier) / 1000);
  const high = Math.round((impressions * cpmHigh * engMultiplier) / 1000);
  return { low: Math.max(low, 50), high: Math.max(high, 100) };
}

function estimateCollabCost(followers: number, engagementRate: number): { low: number; high: number } {
  // Base rates per follower tier (single sponsored post / campaign deliverable)
  let baseLow: number, baseHigh: number;
  if (followers >= 10_000_000) { baseLow = 100_000; baseHigh = 500_000; }
  else if (followers >= 1_000_000) { baseLow = 20_000; baseHigh = 150_000; }
  else if (followers >= 500_000) { baseLow = 10_000; baseHigh = 50_000; }
  else if (followers >= 100_000) { baseLow = 5_000; baseHigh = 25_000; }
  else if (followers >= 50_000) { baseLow = 2_000; baseHigh = 10_000; }
  else if (followers >= 10_000) { baseLow = 500; baseHigh = 5_000; }
  else { baseLow = 100; baseHigh = 1_000; }

  const effectiveEng = engagementRate > 0 ? engagementRate : estimateDefaultEngagement(followers);
  const engMultiplier = effectiveEng >= 5 ? 1.4 : effectiveEng >= 3 ? 1.2 : effectiveEng >= 1 ? 1.0 : 0.85;
  return {
    low: Math.round(baseLow * engMultiplier),
    high: Math.round(baseHigh * engMultiplier),
  };
}

function estimatePotentialReach(followers: number, platforms: number): { perPost: number; campaign: number } {
  const reachRate = 0.2; // ~20% organic reach
  const perPost = Math.round(followers * reachRate);
  // Campaign = 3-5 posts across platforms
  const campaign = Math.round(perPost * Math.min(platforms, 3) * 3);
  return { perPost, campaign };
}

function estimateROI(followers: number, engagementRate: number, collabCostLow: number): { multiplier: string; description: string } {
  // When engagement data is missing, estimate based on reach value alone
  const effectiveEng = engagementRate > 0 ? engagementRate : estimateDefaultEngagement(followers);
  const impressions = followers * 0.2;
  const engagedUsers = impressions * (effectiveEng / 100);
  // Avg EMV per engagement: $0.50-$2.00
  const emv = engagedUsers * 1.2;
  const roi = collabCostLow > 0 ? emv / collabCostLow : 0;

  const noData = engagementRate === 0;
  const suffix = noData ? " (estimated — engagement data unavailable)" : "";

  if (roi >= 5) return { multiplier: `${roi.toFixed(1)}x`, description: `Exceptional — high engagement drives strong earned media value${suffix}` };
  if (roi >= 3) return { multiplier: `${roi.toFixed(1)}x`, description: `Strong — good engagement-to-cost ratio for brand campaigns${suffix}` };
  if (roi >= 1.5) return { multiplier: `${roi.toFixed(1)}x`, description: `Solid — reasonable return for brand awareness campaigns${suffix}` };
  return { multiplier: `${roi.toFixed(1)}x`, description: `Moderate — better suited for reach/awareness vs direct conversion${suffix}` };
}

function estimateDefaultEngagement(followers: number): number {
  // Industry avg engagement by tier when actual data is unavailable
  if (followers >= 10_000_000) return 1.2;
  if (followers >= 1_000_000) return 1.8;
  if (followers >= 100_000) return 2.5;
  if (followers >= 10_000) return 3.5;
  return 5.0;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount}`;
}

function getScoreExplanation(score: number): string {
  if (score >= 90) return "This creator is an exceptional fit. Strong alignment in niche, audience demographics, content style, and engagement quality with your brand.";
  if (score >= 70) return "Good alignment between this creator and your brand. Solid niche overlap and audience fit with room for a productive partnership.";
  if (score >= 50) return "Moderate alignment. Some shared audience overlap — consider if their specific content style matches your campaign goals.";
  return "Lower alignment based on available data. May still be worth exploring if their niche is emerging or audience is highly targeted.";
}

/* ─── Types ─── */

interface CreatorSocialStats {
  totalFollowers: number;
  avgEngagement: number;
  platforms: Array<{
    platform: string;
    handle: string;
    followers: number;
    engagement: number | null;
    verified: boolean;
  }>;
  topPlatform: string | null;
  bio: string | null;
  postsCount: number;
}

/* ─── Component ─── */

interface BrandMatchSuggestionsProps {
  initialMatches: BrandCreatorMatch[];
  socialStats?: Record<string, CreatorSocialStats>;
}

export function BrandMatchSuggestions({
  initialMatches,
  socialStats = {},
}: BrandMatchSuggestionsProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<BrandCreatorMatch[]>(initialMatches);
  const [generating, setGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [viewingMatch, setViewingMatch] = useState<BrandCreatorMatch | null>(null);

  // Close modal on Escape
  useEffect(() => {
    if (!viewingMatch) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewingMatch(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [viewingMatch]);

  const filteredMatches = matches.filter(
    (m) => m.status !== "dismissed" && m.match_score >= minScore,
  );

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await actionGenerateMatches();
      if (result.matches && result.matches.length > 0) {
        setMatches(result.matches);
      }
    } catch {
      // Silent fail
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  const handleDismiss = useCallback(
    async (matchId: string) => {
      setDismissingId(matchId);
      try {
        const result = await actionUpdateMatchStatus(matchId, "dismissed");
        if (result.success) {
          setMatches((prev) =>
            prev.map((m) =>
              m.id === matchId ? { ...m, status: "dismissed" as const } : m,
            ),
          );
        }
      } catch {
        // Silent fail
      } finally {
        setDismissingId(null);
      }
    },
    [],
  );

  return (
    <div
      style={{
        fontFamily:
          "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Header */}
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
          <Sparkles size={20} style={{ color: "rgba(var(--accent-rgb),0.7)" }} />
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: -0.3,
            }}
          >
            AI-Matched Creators
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
            {filteredMatches.length}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 14px",
              background: showFilters
                ? "rgba(var(--accent-rgb),0.12)"
                : "var(--color-surface-card)",
              border: showFilters
                ? "1px solid rgba(var(--accent-rgb),0.3)"
                : "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              color: showFilters
                ? "var(--color-ink)"
                : "var(--color-ink-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <SlidersHorizontal size={13} />
            Filter
            {showFilters ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: generating
                ? "var(--color-surface-inset)"
                : "var(--color-editorial-red)",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              color: generating
                ? "var(--color-ink-secondary)"
                : "#ffffff",
              cursor: generating ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {generating ? "Finding Matches..." : "Find New Matches"}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <label
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--color-ink-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              display: "block",
              marginBottom: 8,
            }}
          >
            Minimum Match Score
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--color-editorial-red)" }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: getScoreColor(minScore || 70),
                minWidth: 30,
              }}
            >
              {minScore}+
            </span>
          </div>
        </div>
      )}

      {/* Match cards */}
      {filteredMatches.length === 0 ? (
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
            <Sparkles
              size={24}
              style={{ color: "rgba(var(--accent-rgb),0.6)" }}
            />
          </div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 8px",
            }}
          >
            No Matches Yet
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
            Click &quot;Find New Matches&quot; to let our AI discover the
            best creators for your brand. We&apos;ll analyze niche alignment,
            audience quality, and content fit.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
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
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {generating ? "Finding Matches..." : "Find Creators"}
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
          {filteredMatches.map((match) => {
            const creator = match.creator;
            const scoreColor = getScoreColor(match.match_score);
            const stats = socialStats[match.creator_profile_id];
            const initials = creator?.full_name
              ? creator.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "??";

            return (
              <div
                key={match.id}
                style={{
                  background: "var(--color-surface-card)",
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  borderRadius: 12,
                  padding: 18,
                  transition: "border-color 0.15s ease",
                  position: "relative",
                }}
              >
                {/* Dismiss button */}
                <button
                  onClick={() => handleDismiss(match.id)}
                  disabled={dismissingId === match.id}
                  title="Dismiss"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "transparent",
                    border: "1px solid rgba(var(--accent-rgb),0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "var(--color-ink-muted)",
                    padding: 0,
                  }}
                >
                  {dismissingId === match.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <X size={12} />
                  )}
                </button>

                {/* Creator header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                    paddingRight: 28,
                  }}
                >
                  {/* Avatar */}
                  {creator?.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.full_name || ""}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, rgba(var(--accent-rgb),0.3), var(--color-editorial-red))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#ffffff",
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--color-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {creator?.full_name || "Unknown Creator"}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: "var(--color-ink-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {creator?.niche && (
                        <span>{creator.niche}</span>
                      )}
                      {creator?.location && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <MapPin size={10} />
                          {creator.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score badge */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: getScoreBg(match.match_score),
                      border: `2px solid ${getScoreBorder(match.match_score)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 900,
                        color: scoreColor,
                      }}
                    >
                      {match.match_score}
                    </span>
                  </div>
                </div>

                {/* KPI Stats Row */}
                {stats && stats.totalFollowers > 0 && (
                  <div style={{ display: "flex", gap: 0, marginBottom: 12, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(var(--accent-rgb),0.08)" }}>
                    <div style={{ flex: 1, padding: "8px 10px", background: "rgba(var(--accent-rgb),0.04)", textAlign: "center", borderRight: "1px solid rgba(var(--accent-rgb),0.08)" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink)" }}>{formatFollowers(stats.totalFollowers)}</div>
                      <div style={{ fontSize: 8, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>Followers</div>
                    </div>
                    <div style={{ flex: 1, padding: "8px 10px", background: "rgba(var(--accent-rgb),0.04)", textAlign: "center", borderRight: "1px solid rgba(var(--accent-rgb),0.08)" }}>
                      {stats.avgEngagement > 0 ? (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 800, color: stats.avgEngagement >= 3 ? "#10B981" : stats.avgEngagement >= 1.5 ? "#F59E0B" : "var(--color-ink)" }}>{stats.avgEngagement.toFixed(1)}%</div>
                          <div style={{ fontSize: 8, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>Engagement</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink-muted)" }}>~{estimateDefaultEngagement(stats.totalFollowers).toFixed(1)}%</div>
                          <div style={{ fontSize: 8, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>Est. Eng.</div>
                        </>
                      )}
                    </div>
                    <div style={{ flex: 1, padding: "8px 10px", background: "rgba(var(--accent-rgb),0.04)", textAlign: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink)" }}>{stats.platforms.length}</div>
                      <div style={{ fontSize: 8, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 1 }}>Platforms</div>
                    </div>
                  </div>
                )}

                {/* Platform badges */}
                {stats && stats.platforms.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                    {stats.platforms.slice(0, 5).map((p) => (
                      <span
                        key={p.platform}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: `${PLATFORM_COLORS[p.platform] || "#4B9CD3"}15`,
                          border: `1px solid ${PLATFORM_COLORS[p.platform] || "#4B9CD3"}25`,
                          fontSize: 9,
                          fontWeight: 700,
                          color: PLATFORM_COLORS[p.platform] || "#4B9CD3",
                        }}
                      >
                        {PLATFORM_ICONS[p.platform] || p.platform.slice(0, 2).toUpperCase()}
                        <span style={{ color: "var(--color-ink-secondary)", fontWeight: 600 }}>
                          {formatFollowers(p.followers)}
                        </span>
                        {p.verified && <span style={{ color: "#3B82F6" }}>✓</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Match reasons */}
                {match.match_reasons && match.match_reasons.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: "var(--color-ink-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        marginBottom: 6,
                      }}
                    >
                      Why They Match
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        padding: "0 0 0 14px",
                        listStyle: "disc",
                      }}
                    >
                      {match.match_reasons.slice(0, 3).map((reason, i) => (
                        <li
                          key={i}
                          style={{
                            fontSize: 11,
                            color: "var(--color-ink-secondary)",
                            lineHeight: 1.5,
                            marginBottom: 2,
                          }}
                        >
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Creator strengths tags */}
                {match.creator_strengths &&
                  Object.keys(match.creator_strengths).length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: 14,
                      }}
                    >
                      {Object.entries(match.creator_strengths)
                        .slice(0, 4)
                        .map(([key, value]) => (
                          <span
                            key={key}
                            style={{
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: "rgba(var(--accent-rgb),0.06)",
                              border: "1px solid rgba(var(--accent-rgb),0.1)",
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--color-ink-secondary)",
                            }}
                          >
                            {key.replace(/_/g, " ")}:{" "}
                            {typeof value === "string"
                              ? value
                              : String(value)}
                          </span>
                        ))}
                    </div>
                  )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setViewingMatch(match)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "9px 0",
                      background: "transparent",
                      border: "1px solid rgba(var(--accent-rgb),0.2)",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--color-ink-secondary)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <Eye size={13} />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push(`/brand/messages?to=${match.creator_profile_id}`);
                    }}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "9px 0",
                      background: "var(--color-editorial-red)",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#ffffff",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <Send size={12} />
                    Send Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creator Profile Modal */}
      {viewingMatch && (() => {
        const m = viewingMatch;
        const c = m.creator;
        const scoreColor = getScoreColor(m.match_score);
        const mStats = socialStats[m.creator_profile_id];
        const initials = c?.full_name
          ? c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
          : "??";

        return (
          <div
            onClick={() => setViewingMatch(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--color-surface-card)",
                border: "1px solid rgba(var(--accent-rgb),0.15)",
                borderRadius: 16,
                width: "100%",
                maxWidth: 480,
                maxHeight: "85vh",
                overflowY: "auto",
                fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
              }}
            >
              {/* Header with avatar */}
              <div style={{ padding: "24px 24px 16px", textAlign: "center", position: "relative" }}>
                <button
                  onClick={() => setViewingMatch(null)}
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(var(--accent-rgb),0.08)",
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

                {/* Avatar */}
                {c?.avatar_url ? (
                  <img
                    src={c.avatar_url}
                    alt={c.full_name || ""}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      objectFit: "cover",
                      margin: "0 auto 12px",
                      display: "block",
                      border: "3px solid rgba(var(--accent-rgb),0.15)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(var(--accent-rgb),0.3), var(--color-editorial-red))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      color: "#ffffff",
                      margin: "0 auto 12px",
                    }}
                  >
                    {initials}
                  </div>
                )}

                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink)", margin: "0 0 4px", letterSpacing: -0.3 }}>
                  {c?.full_name || "Unknown Creator"}
                </h2>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 12, color: "var(--color-ink-secondary)" }}>
                  {c?.niche && <span style={{ fontWeight: 600 }}>{c.niche}</span>}
                  {c?.niche && c?.location && <span style={{ color: "var(--color-ink-muted)" }}>·</span>}
                  {c?.location && (
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <MapPin size={11} />
                      {c.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Bio */}
              {mStats?.bio && (
                <div style={{ padding: "0 24px 12px" }}>
                  <p style={{ fontSize: 12, color: "var(--color-ink-secondary)", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
                    {mStats.bio.length > 200 ? mStats.bio.slice(0, 200) + "..." : mStats.bio}
                  </p>
                </div>
              )}

              {/* KPI Stats Grid */}
              {mStats && mStats.totalFollowers > 0 && (
                <div style={{ padding: "0 24px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    <div style={{ background: "rgba(var(--accent-rgb),0.05)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink)" }}>{formatFollowers(mStats.totalFollowers)}</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Total Followers</div>
                    </div>
                    <div style={{ background: "rgba(var(--accent-rgb),0.05)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                      {mStats.avgEngagement > 0 ? (
                        <>
                          <div style={{ fontSize: 20, fontWeight: 800, color: mStats.avgEngagement >= 3 ? "#10B981" : mStats.avgEngagement >= 1.5 ? "#F59E0B" : "var(--color-ink)" }}>{mStats.avgEngagement.toFixed(1)}%</div>
                          <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Avg Engagement</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink-muted)" }}>~{estimateDefaultEngagement(mStats.totalFollowers).toFixed(1)}%</div>
                          <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Est. Engagement</div>
                        </>
                      )}
                    </div>
                    <div style={{ background: "rgba(var(--accent-rgb),0.05)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink)" }}>{mStats.postsCount > 0 ? formatFollowers(mStats.postsCount) : mStats.platforms.length}</div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{mStats.postsCount > 0 ? "Total Posts" : "Platforms"}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Platform breakdown */}
              {mStats && mStats.platforms.length > 0 && (
                <div style={{ padding: "0 24px 16px" }}>
                  <div style={{ background: "rgba(var(--accent-rgb),0.04)", border: "1px solid rgba(var(--accent-rgb),0.1)", borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                      Platform Breakdown
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {mStats.platforms.map((p) => (
                        <div key={p.platform} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, background: `${PLATFORM_COLORS[p.platform] || "#4B9CD3"}18`, fontSize: 10, fontWeight: 800, color: PLATFORM_COLORS[p.platform] || "#4B9CD3", flexShrink: 0 }}>
                            {PLATFORM_ICONS[p.platform] || p.platform.slice(0, 2).toUpperCase()}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", textTransform: "capitalize" }}>{p.platform}</span>
                              {p.verified && <span style={{ fontSize: 10, color: "#3B82F6" }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 10, color: "var(--color-ink-muted)" }}>@{p.handle}</span>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-ink)" }}>{formatFollowers(p.followers)}</div>
                            {p.engagement !== null && (
                              <div style={{ fontSize: 10, color: p.engagement >= 3 ? "#10B981" : "var(--color-ink-muted)" }}>{p.engagement.toFixed(1)}% eng.</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Business Intelligence */}
              {mStats && mStats.totalFollowers > 0 && (() => {
                const postVal = estimatePostValue(mStats.totalFollowers, mStats.avgEngagement);
                const collabCost = estimateCollabCost(mStats.totalFollowers, mStats.avgEngagement);
                const reach = estimatePotentialReach(mStats.totalFollowers, mStats.platforms.length);
                const roi = estimateROI(mStats.totalFollowers, mStats.avgEngagement, collabCost.low);

                return (
                  <div style={{ padding: "0 24px 16px" }}>
                    <div style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(59,130,246,0.06))", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 12, padding: "16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                        <BarChart3 size={13} style={{ color: "#10B981" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8 }}>Business Intelligence</span>
                      </div>

                      {/* 2x2 metric grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                        {/* Estimated Post Value */}
                        <div style={{ background: "rgba(var(--accent-rgb),0.06)", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                            <DollarSign size={11} style={{ color: "#10B981" }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Est. Post Value</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#10B981" }}>
                            {formatCurrency(postVal.low)} – {formatCurrency(postVal.high)}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--color-ink-muted)", marginTop: 2 }}>per sponsored post</div>
                        </div>

                        {/* Collaboration Cost */}
                        <div style={{ background: "rgba(var(--accent-rgb),0.06)", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                            <DollarSign size={11} style={{ color: "#6366F1" }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Collab Cost Range</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#6366F1" }}>
                            {formatCurrency(collabCost.low)} – {formatCurrency(collabCost.high)}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--color-ink-muted)", marginTop: 2 }}>estimated campaign fee</div>
                        </div>

                        {/* Potential Reach */}
                        <div style={{ background: "rgba(var(--accent-rgb),0.06)", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                            <Eye size={11} style={{ color: "#3B82F6" }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Potential Reach</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#3B82F6" }}>
                            {formatFollowers(reach.perPost)}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--color-ink-muted)", marginTop: 2 }}>per post · {formatFollowers(reach.campaign)} campaign</div>
                        </div>

                        {/* ROI Estimate */}
                        <div style={{ background: "rgba(var(--accent-rgb),0.06)", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                            <TrendingUp size={11} style={{ color: "#F59E0B" }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Est. ROI</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#F59E0B" }}>
                            {roi.multiplier}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--color-ink-muted)", marginTop: 2 }}>earned media value</div>
                        </div>
                      </div>

                      {/* ROI description */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 10px", background: "rgba(245,158,11,0.08)", borderRadius: 8 }}>
                        <TrendingUp size={11} style={{ color: "#F59E0B", flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 10, color: "var(--color-ink-secondary)", lineHeight: 1.5, margin: 0 }}>
                          {roi.description}
                        </p>
                      </div>

                      {/* Disclaimer */}
                      <p style={{ fontSize: 8, color: "var(--color-ink-muted)", marginTop: 10, marginBottom: 0, lineHeight: 1.4, fontStyle: "italic" }}>
                        Estimates based on industry benchmarks, follower count, and engagement data. Actual rates vary by niche, content type, exclusivity, and negotiation.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Match score section */}
              <div style={{ padding: "0 24px 16px" }}>
                <div style={{ background: getScoreBg(m.match_score), border: `1px solid ${getScoreBorder(m.match_score)}`, borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: getScoreBg(m.match_score), border: `2px solid ${getScoreBorder(m.match_score)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: scoreColor }}>{m.match_score}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor, marginBottom: 2 }}>
                        Match Score — {m.match_score >= 90 ? "Excellent" : m.match_score >= 70 ? "Good" : m.match_score >= 50 ? "Moderate" : "Emerging"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", lineHeight: 1.4 }}>
                        {m.match_score >= 90 ? "Excellent match for your brand" : m.match_score >= 70 ? "Good match with strong potential" : "Moderate match — worth exploring"}
                      </div>
                    </div>
                  </div>
                  {/* Score explanation */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${getScoreBorder(m.match_score)}` }}>
                    <Info size={12} style={{ color: "var(--color-ink-muted)", flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 10, color: "var(--color-ink-muted)", lineHeight: 1.5, margin: 0 }}>
                      {getScoreExplanation(m.match_score)}
                      {" "}Score is calculated by our AI analyzing niche alignment, audience demographics, engagement quality, content style fit, and brand compatibility on a 0–100 scale.
                    </p>
                  </div>
                </div>
              </div>

              {/* Match reasons */}
              {m.match_reasons && m.match_reasons.length > 0 && (
                <div style={{ padding: "0 24px 16px" }}>
                  <div style={{ background: "rgba(var(--accent-rgb),0.04)", border: "1px solid rgba(var(--accent-rgb),0.1)", borderRadius: 12, padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Target size={13} style={{ color: "var(--color-ink-secondary)" }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8 }}>Why They Match</span>
                    </div>
                    <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
                      {m.match_reasons.map((reason, i) => (
                        <li key={i} style={{ fontSize: 12, color: "var(--color-ink)", lineHeight: 1.6, marginBottom: 3 }}>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Creator strengths */}
              {m.creator_strengths && Object.keys(m.creator_strengths).length > 0 && (
                <div style={{ padding: "0 24px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Award size={13} style={{ color: "var(--color-ink-secondary)" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8 }}>Creator Strengths</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(m.creator_strengths).map(([key, value]) => (
                      <span
                        key={key}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 8,
                          background: "rgba(var(--accent-rgb),0.06)",
                          border: "1px solid rgba(var(--accent-rgb),0.12)",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--color-ink)",
                        }}
                      >
                        {key.replace(/_/g, " ")}: {typeof value === "string" ? value : String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ padding: "8px 24px 20px", display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    setViewingMatch(null);
                    router.push(`/brand/messages?to=${m.creator_profile_id}`);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 0",
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
                  <MessageSquare size={14} />
                  Send Message
                </button>
                <button
                  onClick={() => setViewingMatch(null)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    background: "rgba(var(--accent-rgb),0.08)",
                    border: "1px solid rgba(var(--accent-rgb),0.12)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-ink-secondary)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
