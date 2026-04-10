"use client";

import { useCallback } from "react";
import {
  X,
  Users,
  TrendingUp,
  TrendingDown,
  Shield,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Globe,
  BadgeCheck,
  Send,
  MessageCircle,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Music,
  AtSign,
  Pin,
  Twitch,
  ExternalLink,
  DollarSign,
  Star,
  Film,
  Eye,
  Heart,
  MessageSquare,
  AlertTriangle,
  Zap,
} from "lucide-react";
import type { EnrichedCreatorProfile, CreatorMarketplaceProfile } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "N/A";
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function getAqsColor(aqs: number | null): string {
  if (!aqs) return "var(--color-ink-muted)";
  if (aqs >= 90) return "#10B981";
  if (aqs >= 75) return "#F59E0B";
  if (aqs >= 60) return "#F97316";
  return "#EF4444";
}

function getAqsGrade(aqs: number | null): string {
  if (!aqs) return "N/A";
  if (aqs >= 95) return "A+";
  if (aqs >= 90) return "A";
  if (aqs >= 85) return "A-";
  if (aqs >= 80) return "B+";
  if (aqs >= 75) return "B";
  if (aqs >= 70) return "B-";
  if (aqs >= 65) return "C+";
  if (aqs >= 60) return "C";
  return "D";
}

function getGrowthPercent(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function getPlatformIcon(platform: string, size = 16) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <Instagram size={size} />;
    case "youtube":
      return <Youtube size={size} />;
    case "twitter":
      return <Twitter size={size} />;
    case "linkedin":
      return <Linkedin size={size} />;
    case "tiktok":
      return <Music size={size} />;
    case "threads":
      return <AtSign size={size} />;
    case "pinterest":
      return <Pin size={size} />;
    case "twitch":
      return <Twitch size={size} />;
    default:
      return <Globe size={size} />;
  }
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  threads: "Threads",
  pinterest: "Pinterest",
  twitch: "Twitch",
};

// ─── Type Guard ───────────────────────────────────────────────────────────────

function isEnriched(c: CreatorMarketplaceProfile | EnrichedCreatorProfile): c is EnrichedCreatorProfile {
  return "social_profiles" in c;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CreatorProfileProps {
  creator: CreatorMarketplaceProfile | EnrichedCreatorProfile;
  onClose?: () => void;
  onSendProposal?: (creator: CreatorMarketplaceProfile) => void;
  onStartConversation?: (creator: CreatorMarketplaceProfile) => void;
  isSlideOver?: boolean;
  showContactCTA?: boolean;
  contactLabel?: string;
}

export default function CreatorProfile({
  creator,
  onClose,
  onSendProposal,
  onStartConversation,
  isSlideOver = false,
  showContactCTA = true,
  contactLabel,
}: CreatorProfileProps) {
  const name = creator.profile?.full_name ?? "Creator";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const bio = creator.profile?.bio;
  const niche = creator.profile?.niche ?? creator.categories[0] ?? "";
  const location = creator.profile?.location;
  const aqsColor = getAqsColor(creator.audience_quality_score);
  const enriched = isEnriched(creator) ? creator : null;

  const handleSendProposal = useCallback(() => {
    onSendProposal?.(creator);
  }, [creator, onSendProposal]);

  const handleStartConversation = useCallback(() => {
    onStartConversation?.(creator);
  }, [creator, onStartConversation]);

  // Parse rate card entries
  const rateEntries = Object.entries(creator.rate_card ?? {}).map(([key, value]) => {
    const parts = key.split("_");
    return {
      key,
      platform: parts.length > 1 ? parts[0] : "General",
      contentType: parts.length > 1 ? parts.slice(1).join(" ") : parts[0],
      rate: value,
    };
  });

  return (
    <>
      {/* Backdrop */}
      {isSlideOver && onClose && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 999,
          }}
        />
      )}

      {/* Modal container */}
      <div
        style={
          isSlideOver
            ? {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "94%",
                maxWidth: 720,
                maxHeight: "90vh",
                background: "var(--color-surface-card)",
                border: "1px solid rgba(75,156,211,0.15)",
                borderRadius: 16,
                zIndex: 1000,
                overflowY: "auto",
                boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
              }
            : {}
        }
      >
        {/* Header with close button */}
        {isSlideOver && onClose && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "var(--color-surface-card)",
              borderBottom: "1px solid rgba(75,156,211,0.08)",
              borderRadius: "16px 16px 0 0",
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              Creator Profile
            </span>
            <button
              onClick={onClose}
              style={{
                background: "rgba(75,156,211,0.08)",
                border: "none",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--color-ink-secondary)",
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div style={{ padding: isSlideOver ? "24px 20px" : 0 }}>
          {/* Profile Hero */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 28,
              paddingBottom: 24,
              borderBottom: "1px solid rgba(75,156,211,0.08)",
            }}
          >
            {/* Avatar */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              {creator.profile?.avatar_url ? (
                <img
                  src={creator.profile.avatar_url}
                  alt={name}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "3px solid rgba(75,156,211,0.15)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, rgba(75,156,211,0.3), var(--color-editorial-red))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#ffffff",
                    border: "3px solid rgba(75,156,211,0.15)",
                  }}
                >
                  {initials}
                </div>
              )}
              {creator.is_verified && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--color-surface-card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--color-surface-card)",
                  }}
                >
                  <BadgeCheck size={18} style={{ color: "var(--color-editorial-blue)" }} />
                </div>
              )}
            </div>

            {/* Name & Info */}
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: "0 0 4px",
                letterSpacing: -0.3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {name}
              {creator.has_verified_profiles && (
                <ShieldCheck size={18} style={{ color: "#10B981", flexShrink: 0 }} />
              )}
            </h2>
            {niche && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-secondary)",
                  fontWeight: 500,
                  marginBottom: 6,
                }}
              >
                {niche}
              </div>
            )}
            {location && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  color: "var(--color-ink-muted)",
                }}
              >
                <MapPin size={13} />
                {location}
              </div>
            )}
            {bio && (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-secondary)",
                  lineHeight: 1.6,
                  maxWidth: 400,
                  margin: "14px auto 0",
                }}
              >
                {bio}
              </p>
            )}
          </div>

          {/* Ownership verification warning */}
          {!creator.has_verified_profiles && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <ShieldAlert size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>
                This creator has not yet verified ownership of their social profiles
              </span>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <StatCard
              icon={<Users size={15} style={{ color: "rgba(75,156,211,0.6)" }} />}
              label="Followers"
              value={formatFollowers(creator.total_followers)}
            />
            <StatCard
              icon={<TrendingUp size={15} style={{ color: "#10B981" }} />}
              label="Engagement"
              value={`${creator.avg_engagement_rate.toFixed(1)}%`}
            />
            <StatCard
              icon={<Shield size={15} style={{ color: aqsColor }} />}
              label="AQS"
              value={
                creator.audience_quality_score
                  ? `${getAqsGrade(creator.audience_quality_score)} (${creator.audience_quality_score})`
                  : "N/A"
              }
            />
          </div>

          {/* SMO Score + Earnings Row (enriched only) */}
          {enriched && (enriched.smo_score || enriched.earnings_estimate) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: enriched.smo_score && enriched.earnings_estimate ? "1fr 1fr" : "1fr",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {enriched.smo_score && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(75,156,211,0.08), rgba(75,156,211,0.03))",
                    borderRadius: 10,
                    padding: "14px 16px",
                    border: "1px solid rgba(75,156,211,0.12)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Zap size={14} style={{ color: "rgba(75,156,211,0.7)" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      SMO Score
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink)", letterSpacing: -0.5 }}>
                      {enriched.smo_score}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-ink-muted)", fontWeight: 500 }}>/100</span>
                  </div>
                </div>
              )}
              {enriched.earnings_estimate && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.03))",
                    borderRadius: 10,
                    padding: "14px 16px",
                    border: "1px solid rgba(16,185,129,0.12)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <DollarSign size={14} style={{ color: "#10B981" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                      Est. Monthly Earnings
                    </span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)", letterSpacing: -0.3 }}>
                    {formatCurrency(enriched.earnings_estimate.monthly_low)} – {formatCurrency(enriched.earnings_estimate.monthly_high)}
                  </div>
                  {enriched.earnings_estimate.per_post_low != null && (
                    <div style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 4, fontWeight: 500 }}>
                      {formatCurrency(enriched.earnings_estimate.per_post_low)} – {formatCurrency(enriched.earnings_estimate.per_post_high)} per post
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Platform Breakdown (enriched) */}
          {enriched && enriched.social_profiles.length > 0 && (
            <Section title="Platform Breakdown">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {enriched.social_profiles.map((sp) => {
                  const gm = enriched.growth_metrics.find(
                    (g) => g.platform === sp.platform,
                  );
                  const followerGrowth = gm
                    ? getGrowthPercent(gm.followers_current, gm.followers_previous)
                    : null;

                  return (
                    <div
                      key={sp.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        background: "var(--color-surface-inset)",
                        borderRadius: 10,
                        border: "1px solid rgba(75,156,211,0.06)",
                      }}
                    >
                      <div style={{ color: "var(--color-ink-secondary)", flexShrink: 0 }}>
                        {getPlatformIcon(sp.platform, 18)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>
                            {PLATFORM_LABELS[sp.platform.toLowerCase()] ?? sp.platform}
                          </span>
                          {sp.verified && (
                            <BadgeCheck size={12} style={{ color: "var(--color-editorial-blue)" }} />
                          )}
                          <span style={{ fontSize: 11, color: "var(--color-ink-muted)", fontWeight: 500 }}>
                            @{sp.handle}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                          <MiniStat label="Followers" value={formatFollowers(sp.followers_count)} />
                          <MiniStat
                            label="Engagement"
                            value={sp.engagement_rate != null ? `${sp.engagement_rate.toFixed(1)}%` : "—"}
                          />
                          <MiniStat label="Posts" value={sp.posts_count?.toLocaleString() ?? "—"} />
                          {followerGrowth !== null && (
                            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                              {followerGrowth >= 0 ? (
                                <TrendingUp size={10} style={{ color: "#10B981" }} />
                              ) : (
                                <TrendingDown size={10} style={{ color: "#EF4444" }} />
                              )}
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: followerGrowth >= 0 ? "#10B981" : "#EF4444",
                                }}
                              >
                                {followerGrowth >= 0 ? "+" : ""}
                                {followerGrowth.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Fallback: Active Platforms (non-enriched only) */}
          {!enriched && creator.platforms_active.length > 0 && (
            <Section title="Active Platforms">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {creator.platforms_active.map((platform) => (
                  <div
                    key={platform}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      background: "rgba(75,156,211,0.06)",
                      borderRadius: 10,
                      border: "1px solid rgba(75,156,211,0.1)",
                    }}
                  >
                    <span style={{ color: "var(--color-ink-secondary)" }}>
                      {getPlatformIcon(platform, 15)}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>
                      {PLATFORM_LABELS[platform.toLowerCase()] ?? platform}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* AQS Breakdown (enriched) */}
          {enriched?.aqs_breakdown && (
            <Section title="Audience Quality Breakdown">
              <div
                style={{
                  background: "var(--color-surface-inset)",
                  borderRadius: 10,
                  padding: "16px",
                  border: "1px solid rgba(75,156,211,0.06)",
                }}
              >
                {/* Overall grade badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: `${getAqsColor(enriched.aqs_breakdown.overall_score)}18`,
                        border: `2px solid ${getAqsColor(enriched.aqs_breakdown.overall_score)}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 900,
                        color: getAqsColor(enriched.aqs_breakdown.overall_score),
                      }}
                    >
                      {enriched.aqs_breakdown.grade ?? getAqsGrade(enriched.aqs_breakdown.overall_score)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink)" }}>
                        {enriched.aqs_breakdown.overall_score}/100
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-ink-muted)", fontWeight: 500 }}>
                        Overall Score
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ScoreBar label="Engagement Quality" score={enriched.aqs_breakdown.engagement_quality} color="#4B9CD3" />
                  <ScoreBar label="Follower Authenticity" score={enriched.aqs_breakdown.follower_authenticity} color="#10B981" />
                  <ScoreBar label="Growth Health" score={enriched.aqs_breakdown.growth_health} color="#F59E0B" />
                  <ScoreBar label="Content Consistency" score={enriched.aqs_breakdown.content_consistency} color="#3B82F6" />
                </div>

                {/* Risk flags */}
                {enriched.aqs_breakdown.risk_flags.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(75,156,211,0.06)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                      <AlertTriangle size={12} style={{ color: "#F97316" }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#F97316", textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Risk Flags
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {enriched.aqs_breakdown.risk_flags.map((flag) => (
                        <span
                          key={flag}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#F97316",
                            background: "rgba(249,115,22,0.08)",
                            padding: "3px 8px",
                            borderRadius: 6,
                            border: "1px solid rgba(249,115,22,0.15)",
                          }}
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Content Performance (enriched) */}
          {enriched && enriched.growth_metrics.length > 0 && (
            <Section title="Content Performance">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                }}
              >
                {enriched.growth_metrics.map((gm) => (
                  <div
                    key={gm.platform}
                    style={{
                      background: "var(--color-surface-inset)",
                      borderRadius: 10,
                      padding: "12px",
                      border: "1px solid rgba(75,156,211,0.06)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ color: "var(--color-ink-secondary)", marginBottom: 6 }}>
                      {getPlatformIcon(gm.platform, 14)}
                    </div>
                    {gm.avg_likes != null && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginBottom: 2 }}>
                        <Heart size={9} style={{ color: "#EF4444" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>
                          {formatFollowers(gm.avg_likes)}
                        </span>
                      </div>
                    )}
                    {gm.avg_comments != null && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginBottom: 2 }}>
                        <MessageSquare size={9} style={{ color: "#3B82F6" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>
                          {formatFollowers(gm.avg_comments)}
                        </span>
                      </div>
                    )}
                    {gm.avg_views != null && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                        <Eye size={9} style={{ color: "#4B9CD3" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>
                          {formatFollowers(gm.avg_views)}
                        </span>
                      </div>
                    )}
                    <div style={{ fontSize: 9, color: "var(--color-ink-muted)", marginTop: 4, fontWeight: 500, textTransform: "uppercase" }}>
                      Avg per post
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Audience Demographics (enriched) */}
          {enriched?.aqs_breakdown?.audience_demographics && Object.keys(enriched.aqs_breakdown.audience_demographics).length > 0 && (
            <Section title="Audience Demographics">
              <div
                style={{
                  background: "var(--color-surface-inset)",
                  borderRadius: 10,
                  padding: "14px",
                  border: "1px solid rgba(75,156,211,0.06)",
                }}
              >
                {Object.entries(enriched.aqs_breakdown.audience_demographics).map(([key, value]) => {
                  // Handle different demographic formats
                  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                    return (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
                          {key.replace(/_/g, " ")}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {Object.entries(value as Record<string, unknown>).slice(0, 5).map(([k, v]) => (
                            <span
                              key={k}
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "var(--color-ink-secondary)",
                                background: "rgba(75,156,211,0.06)",
                                padding: "4px 8px",
                                borderRadius: 6,
                              }}
                            >
                              {k}: {typeof v === "number" ? `${v}%` : String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(75,156,211,0.04)" }}>
                      <span style={{ fontSize: 11, color: "var(--color-ink-muted)", textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink)" }}>{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Top Content (enriched) */}
          {enriched && enriched.top_content.length > 0 && (
            <Section title="Top Performing Content">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {enriched.top_content.map((tc, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "var(--color-surface-inset)",
                      borderRadius: 8,
                      border: "1px solid rgba(75,156,211,0.06)",
                    }}
                  >
                    <div style={{ color: "var(--color-ink-secondary)" }}>
                      {getPlatformIcon(tc.platform, 14)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {tc.url ? (
                        <a
                          href={tc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: 11,
                            color: "var(--color-editorial-blue)",
                            textDecoration: "none",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {tc.url}
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--color-ink-muted)" }}>Post #{i + 1}</span>
                      )}
                    </div>
                    {tc.likes != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                        <Heart size={10} style={{ color: "#EF4444" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>
                          {formatFollowers(tc.likes)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Rate Card */}
          {rateEntries.length > 0 && (
            <Section title="Rate Card">
              <div
                style={{
                  background: "var(--color-surface-inset)",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid rgba(75,156,211,0.08)",
                }}
              >
                {/* Table header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 100px",
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(75,156,211,0.08)",
                  }}
                >
                  <TableHeader>Platform</TableHeader>
                  <TableHeader>Content Type</TableHeader>
                  <TableHeader style={{ textAlign: "right" }}>Rate</TableHeader>
                </div>
                {/* Table rows */}
                {rateEntries.map((entry) => (
                  <div
                    key={entry.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 100px",
                      padding: "10px 14px",
                      borderBottom: "1px solid rgba(75,156,211,0.04)",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--color-ink-secondary)", fontWeight: 500, textTransform: "capitalize" }}>
                      {entry.platform}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-ink-secondary)", fontWeight: 500, textTransform: "capitalize" }}>
                      {entry.contentType}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 700, textAlign: "right" }}>
                      ${entry.rate.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              {creator.minimum_budget !== null && creator.minimum_budget > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--color-ink-secondary)",
                  }}
                >
                  <DollarSign size={13} />
                  Minimum budget: <strong>${creator.minimum_budget.toLocaleString()}</strong>
                </div>
              )}
            </Section>
          )}

          {/* Categories */}
          {creator.categories.length > 0 && (
            <Section title="Categories">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {creator.categories.map((cat) => (
                  <span
                    key={cat}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-ink-secondary)",
                      background: "rgba(75,156,211,0.08)",
                      padding: "5px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(75,156,211,0.1)",
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Languages */}
          {creator.languages.length > 0 && (
            <Section title="Languages">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {creator.languages.map((lang) => (
                  <span
                    key={lang}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-ink-secondary)",
                      background: "rgba(75,156,211,0.06)",
                      padding: "5px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(75,156,211,0.08)",
                    }}
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Past Brands */}
          {(creator.past_brands ?? []).length > 0 && (
            <Section title="Past Brand Collaborations">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(creator.past_brands ?? []).map((brand) => (
                  <div
                    key={brand}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 14px",
                      background: "var(--color-surface-inset)",
                      borderRadius: 8,
                      border: "1px solid rgba(75,156,211,0.08)",
                    }}
                  >
                    <Star size={12} style={{ color: "var(--color-editorial-gold)" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>
                      {brand}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Highlight Reel */}
          {(creator.highlight_reel ?? []).length > 0 && (
            <Section title="Highlight Reel">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 8,
                }}
              >
                {(creator.highlight_reel ?? []).map((item, idx) => {
                  const url = (item.url as string) ?? (item.thumbnail as string) ?? "";
                  const title = (item.title as string) ?? `Content ${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      style={{
                        aspectRatio: "1/1",
                        borderRadius: 10,
                        background: "rgba(75,156,211,0.06)",
                        border: "1px solid rgba(75,156,211,0.1)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: 10,
                        overflow: "hidden",
                      }}
                    >
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "var(--color-editorial-blue)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                            textDecoration: "none",
                          }}
                        >
                          <ExternalLink size={18} />
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              textAlign: "center",
                              color: "var(--color-ink-secondary)",
                              lineHeight: 1.3,
                            }}
                          >
                            {title}
                          </span>
                        </a>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textAlign: "center",
                            color: "var(--color-ink-muted)",
                          }}
                        >
                          {title}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* CTAs */}
          {showContactCTA && (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 28,
                paddingTop: 20,
                borderTop: "1px solid rgba(75,156,211,0.08)",
              }}
            >
              {onSendProposal && (
                <button
                  onClick={handleSendProposal}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 0",
                    background: "var(--color-editorial-red)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.85";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  <Send size={14} />
                  {contactLabel ?? "Send Proposal"}
                </button>
              )}
              {onStartConversation && (
                <button
                  onClick={handleStartConversation}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 0",
                    background: "transparent",
                    border: "1px solid rgba(75,156,211,0.2)",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--color-ink-secondary)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(75,156,211,0.4)";
                    e.currentTarget.style.color = "var(--color-ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(75,156,211,0.2)";
                    e.currentTarget.style.color = "var(--color-ink-secondary)";
                  }}
                >
                  <MessageCircle size={14} />
                  Start Conversation
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface-inset)",
        borderRadius: 10,
        padding: "12px 14px",
        border: "1px solid rgba(75,156,211,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        {icon}
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "var(--color-ink-muted)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "var(--color-ink)",
          letterSpacing: -0.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "var(--color-ink-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>{value}</div>
    </div>
  );
}

function ScoreBar({ label, score, color }: { label: string; score: number | null; color: string }) {
  const pct = score ?? 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: score != null ? color : "var(--color-ink-muted)" }}>
          {score != null ? `${score}/100` : "N/A"}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 3,
          background: "rgba(75,156,211,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 3,
            background: color,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function TableHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "var(--color-ink-muted)",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--color-ink)",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 12,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
