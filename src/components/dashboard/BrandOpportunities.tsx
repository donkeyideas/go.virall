"use client";

import { useState, useCallback } from "react";
import {
  Briefcase,
  Building2,
  MapPin,
  Heart,
  X,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  actionGenerateCreatorOpportunities,
  actionUpdateMatchStatus,
  actionExpressInterest,
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

/* ─── Component ─── */

interface BrandOpportunitiesProps {
  initialMatches: BrandCreatorMatch[];
}

export function BrandOpportunities({
  initialMatches,
}: BrandOpportunitiesProps) {
  const [matches, setMatches] = useState<BrandCreatorMatch[]>(initialMatches);
  const [generating, setGenerating] = useState(false);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const visibleMatches = matches.filter((m) => m.status !== "dismissed");

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const result = await actionGenerateCreatorOpportunities();
      if (result.matches && result.matches.length > 0) {
        setMatches(result.matches);
      }
    } catch {
      // Silent fail
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  const handleExpressInterest = useCallback(async (matchId: string) => {
    setActingOnId(matchId);
    try {
      const result = await actionExpressInterest(matchId);
      if (result.success) {
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId ? { ...m, status: "interested" as const } : m,
          ),
        );
      }
    } catch {
      // Silent fail
    } finally {
      setActingOnId(null);
    }
  }, []);

  const handleDismiss = useCallback(async (matchId: string) => {
    setActingOnId(matchId);
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
      setActingOnId(null);
    }
  }, []);

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
          <Briefcase size={20} style={{ color: "rgba(var(--accent-rgb),0.7)" }} />
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: -0.3,
            }}
          >
            Brand Opportunities
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
            {visibleMatches.length}
          </span>
        </div>

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
            color: generating ? "var(--color-ink-secondary)" : "#ffffff",
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
          {generating ? "Finding Opportunities..." : "Find Opportunities"}
        </button>
      </div>

      {/* Cards */}
      {visibleMatches.length === 0 ? (
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
            <Briefcase
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
            No Brand Matches Yet
          </h3>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink-secondary)",
              maxWidth: 400,
              margin: "0 auto 20px",
              lineHeight: 1.6,
            }}
          >
            Complete your marketplace profile to get matched with brands.
            We analyze your niche, audience, and content style to find
            the best brand partnership opportunities for you.
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
            {generating ? "Finding..." : "Find Brand Opportunities"}
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
          {visibleMatches.map((match) => {
            const brand = match.brand;
            const scoreColor = getScoreColor(match.match_score);
            const isInterested = match.status === "interested";
            const isActing = actingOnId === match.id;

            const initials = (
              brand?.company_name ||
              brand?.full_name ||
              ""
            )
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "??";

            return (
              <div
                key={match.id}
                style={{
                  background: "var(--color-surface-card)",
                  border: isInterested
                    ? "1px solid rgba(52,211,153,0.25)"
                    : "1px solid rgba(var(--accent-rgb),0.12)",
                  borderRadius: 12,
                  padding: 18,
                  transition: "border-color 0.15s ease",
                  position: "relative",
                }}
              >
                {/* Interested badge */}
                {isInterested && (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: "rgba(52,211,153,0.12)",
                      border: "1px solid rgba(52,211,153,0.2)",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#34D399",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    <CheckCircle2 size={10} />
                    Interest Sent
                  </div>
                )}

                {/* Brand header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 14,
                    paddingRight: isInterested ? 100 : 0,
                  }}
                >
                  {/* Brand avatar */}
                  {brand?.avatar_url ? (
                    <img
                      src={brand.avatar_url}
                      alt={brand.company_name || brand.full_name || ""}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background:
                          "linear-gradient(135deg, rgba(var(--accent-rgb),0.2), rgba(var(--accent-rgb),0.4))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Building2
                        size={20}
                        style={{ color: "rgba(var(--accent-rgb),0.7)" }}
                      />
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
                      {brand?.company_name || brand?.full_name || "Unknown Brand"}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink-secondary)",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {brand?.industry && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Building2 size={10} />
                          {brand.industry}
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

                {/* What the brand is looking for */}
                {match.brand_interests &&
                  Object.keys(match.brand_interests).length > 0 && (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "10px 12px",
                        background: "rgba(var(--accent-rgb),0.04)",
                        borderRadius: 8,
                      }}
                    >
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
                        What They&apos;re Looking For
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {Object.entries(match.brand_interests)
                          .filter(([, v]) => v && String(v).length > 0)
                          .slice(0, 4)
                          .map(([key, value]) => (
                            <span
                              key={key}
                              style={{
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: "var(--color-surface-card)",
                                border:
                                  "1px solid rgba(var(--accent-rgb),0.1)",
                                fontSize: 10,
                                fontWeight: 600,
                                color: "var(--color-ink-secondary)",
                              }}
                            >
                              {key.replace(/_/g, " ")}:{" "}
                              {typeof value === "string"
                                ? value.length > 50
                                  ? value.slice(0, 50) + "..."
                                  : value
                                : String(value)}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Match reasons */}
                {match.match_reasons && match.match_reasons.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
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
                      Why You&apos;re a Good Fit
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

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  {!isInterested ? (
                    <>
                      <button
                        onClick={() => handleDismiss(match.id)}
                        disabled={isActing}
                        style={{
                          flex: "0 0 auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          padding: "9px 14px",
                          background: "transparent",
                          border: "1px solid rgba(var(--accent-rgb),0.15)",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--color-ink-muted)",
                          cursor: isActing ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        {isActing ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <X size={12} />
                        )}
                        Not Interested
                      </button>
                      <button
                        onClick={() => handleExpressInterest(match.id)}
                        disabled={isActing}
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
                          cursor: isActing ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: isActing ? 0.7 : 1,
                        }}
                      >
                        {isActing ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Heart size={13} />
                        )}
                        Express Interest
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "9px 0",
                        background: "rgba(52,211,153,0.08)",
                        border: "1px solid rgba(52,211,153,0.2)",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#34D399",
                      }}
                    >
                      <CheckCircle2 size={13} />
                      Interest Sent — Brand will be notified
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
