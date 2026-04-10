"use client";

import { useCallback, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  TrendingUp,
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
  ArrowRight,
} from "lucide-react";
import type { CreatorMarketplaceProfile, TrustScore } from "@/types";
import { TrustBadge } from "@/components/deals/TrustBadge";
import { TrustScoreDetail } from "@/components/deals/TrustScoreDetail";
import { getTrustScore } from "@/lib/dal/trust";

// ─── Constants ────────────────────────────────────────────────────────────────

const C = {
  bg: "#0B1928",
  surface: "#0D1E35",
  card: "#112240",
  cardElevated: "#1A2F50",
  primary: "#FFB84D",
  secondary: "#FFD280",
  purple: "#4B9CD3",
  text: "#E8F0FA",
  textSecondary: "#8BACC8",
  border: "rgba(75,156,211,0.12)",
  borderGold: "rgba(255,184,77,0.15)",
  success: "#4ADE80",
  red: "#e74c3c",
  blue: "#5b9cf5",
} as const;

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

function getAqsColor(aqs: number | null): string {
  if (!aqs) return C.textSecondary;
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

function getPlatformIcon(platform: string, size = 18) {
  switch (platform.toLowerCase()) {
    case "instagram": return <Instagram size={size} />;
    case "youtube": return <Youtube size={size} />;
    case "twitter": return <Twitter size={size} />;
    case "linkedin": return <Linkedin size={size} />;
    case "tiktok": return <Music size={size} />;
    case "threads": return <AtSign size={size} />;
    case "pinterest": return <Pin size={size} />;
    case "twitch": return <Twitch size={size} />;
    default: return <Globe size={size} />;
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

// ─── Component ────────────────────────────────────────────────────────────────

interface CreatorPublicPageProps {
  creator: CreatorMarketplaceProfile;
}

export default function CreatorPublicPage({ creator }: CreatorPublicPageProps) {
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

  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);

  useEffect(() => {
    getTrustScore(creator.profile_id).then(setTrustScore);
  }, [creator.profile_id]);

  const rateEntries = Object.entries(creator.rate_card).map(([key, value]) => {
    const parts = key.split("_");
    return {
      key,
      platform: parts.length > 1 ? parts[0] : "General",
      contentType: parts.length > 1 ? parts.slice(1).join(" ") : parts[0],
      rate: value,
    };
  });

  const handleContact = useCallback(() => {
    window.location.href = `/brand/proposals?creator=${creator.profile_id}`;
  }, [creator.profile_id]);

  return (
    <div
      style={{
        fontFamily: font,
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          padding: "16px 0",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: C.primary,
              textDecoration: "none",
              letterSpacing: -0.5,
            }}
          >
            Go Virall
          </Link>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Link
              href="/marketplace"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Marketplace
            </Link>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.textSecondary,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/register?type=brand"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                background: C.primary,
                padding: "8px 18px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "32px 24px 80px",
        }}
      >
        {/* Back link */}
        <Link
          href="/marketplace"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: C.textSecondary,
            textDecoration: "none",
            marginBottom: 28,
          }}
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>

        {/* Profile Hero */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: "40px 32px",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
            {creator.profile?.avatar_url ? (
              <img
                src={creator.profile.avatar_url}
                alt={name}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: `3px solid ${C.purple}30`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.purple}40, ${C.red})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#ffffff",
                  border: `3px solid ${C.purple}30`,
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
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: C.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `2px solid ${C.card}`,
                }}
              >
                <BadgeCheck size={22} style={{ color: C.blue }} />
              </div>
            )}
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: C.text,
              margin: "0 0 6px",
              letterSpacing: -0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {name}
            {creator.has_verified_profiles && (
              <ShieldCheck size={22} style={{ color: "#10B981", flexShrink: 0 }} />
            )}
          </h1>
          {niche && (
            <div
              style={{
                fontSize: 14,
                color: C.textSecondary,
                fontWeight: 500,
                marginBottom: 8,
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
                fontSize: 13,
                color: C.textSecondary,
                marginBottom: 16,
              }}
            >
              <MapPin size={14} />
              {location}
            </div>
          )}
          {bio && (
            <p
              style={{
                fontSize: 14,
                color: C.textSecondary,
                lineHeight: 1.7,
                maxWidth: 550,
                margin: "0 auto 24px",
              }}
            >
              {bio}
            </p>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              onClick={handleContact}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: C.red,
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                color: "#ffffff",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              <Send size={15} />
              Contact for Collaboration
            </button>
            <button
              onClick={() => {
                window.location.href = `/brand/messages?to=${creator.profile_id}`;
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: "transparent",
                border: `1px solid ${C.purple}25`,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                color: C.text,
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              <MessageCircle size={15} />
              Message
            </button>
          </div>

          {/* Ownership verification warning */}
          {!creator.has_verified_profiles && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 20px",
                background: "rgba(245,158,11,0.08)",
                border: `1px solid rgba(245,158,11,0.2)`,
                borderRadius: 10,
                marginTop: 20,
              }}
            >
              <ShieldAlert size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600 }}>
                This creator has not yet verified ownership of their social profiles
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard
            icon={<Users size={18} style={{ color: `${C.purple}90` }} />}
            label="Total Followers"
            value={formatFollowers(creator.total_followers)}
          />
          <StatCard
            icon={<TrendingUp size={18} style={{ color: C.success }} />}
            label="Avg Engagement"
            value={`${creator.avg_engagement_rate.toFixed(1)}%`}
          />
          <StatCard
            icon={<Shield size={18} style={{ color: aqsColor }} />}
            label="Audience Quality"
            value={
              creator.audience_quality_score
                ? `${getAqsGrade(creator.audience_quality_score)} (${creator.audience_quality_score})`
                : "Not scored"
            }
          />
          <StatCard
            icon={<Film size={18} style={{ color: C.blue }} />}
            label="Content Types"
            value={
              creator.content_types.length > 0
                ? creator.content_types.slice(0, 2).join(", ")
                : "Various"
            }
          />
          {trustScore && (
            <TrustScoreDetail trustScore={trustScore} />
          )}
        </div>

        {/* Platforms */}
        {creator.platforms_active.length > 0 && (
          <Section title="Active Platforms">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {creator.platforms_active.map((platform) => (
                <div
                  key={platform}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 18px",
                    background: C.card,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <span style={{ color: C.textSecondary }}>
                    {getPlatformIcon(platform)}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    {PLATFORM_LABELS[platform.toLowerCase()] ?? platform}
                  </span>
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
                background: C.card,
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 120px",
                  padding: "12px 18px",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  Platform
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  Content Type
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    textAlign: "right",
                  }}
                >
                  Rate
                </span>
              </div>
              {rateEntries.map((entry) => (
                <div
                  key={entry.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 120px",
                    padding: "12px 18px",
                    borderBottom: `1px solid ${C.purple}06`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: C.textSecondary,
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                  >
                    {entry.platform}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: C.textSecondary,
                      fontWeight: 500,
                      textTransform: "capitalize",
                    }}
                  >
                    {entry.contentType}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: C.text,
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    ${entry.rate.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            {creator.minimum_budget !== null && creator.minimum_budget > 0 && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  color: C.textSecondary,
                }}
              >
                <DollarSign size={14} />
                Minimum budget:{" "}
                <strong style={{ color: C.text }}>
                  ${creator.minimum_budget.toLocaleString()}
                </strong>
              </div>
            )}
          </Section>
        )}

        {/* Categories */}
        {creator.categories.length > 0 && (
          <Section title="Categories">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {creator.categories.map((cat) => (
                <span
                  key={cat}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.textSecondary,
                    background: `${C.purple}10`,
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: `1px solid ${C.purple}15`,
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {creator.languages.map((lang) => (
                <span
                  key={lang}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: C.textSecondary,
                    background: `${C.purple}08`,
                    padding: "6px 14px",
                    borderRadius: 16,
                    border: `1px solid ${C.purple}10`,
                  }}
                >
                  {lang}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Past Brands */}
        {creator.past_brands.length > 0 && (
          <Section title="Past Brand Collaborations">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {creator.past_brands.map((brand) => (
                <div
                  key={brand}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: C.card,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  <Star size={13} style={{ color: C.primary }} />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.text,
                    }}
                  >
                    {brand}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Highlight Reel */}
        {creator.highlight_reel.length > 0 && (
          <Section title="Highlight Reel">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {creator.highlight_reel.map((item, idx) => {
                const url = (item.url as string) ?? (item.thumbnail as string) ?? "";
                const title = (item.title as string) ?? `Content ${idx + 1}`;
                return (
                  <div
                    key={idx}
                    style={{
                      aspectRatio: "1/1",
                      borderRadius: 12,
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: 12,
                    }}
                  >
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: C.blue,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={20} />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textAlign: "center",
                            color: C.textSecondary,
                            lineHeight: 1.3,
                          }}
                        >
                          {title}
                        </span>
                      </a>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          textAlign: "center",
                          color: C.textSecondary,
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

        {/* Bottom CTA */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.borderGold}`,
            borderRadius: 16,
            padding: "36px 32px",
            textAlign: "center",
            marginTop: 32,
          }}
        >
          <h3
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: C.text,
              margin: "0 0 10px",
            }}
          >
            Want to collaborate with {name}?
          </h3>
          <p
            style={{
              fontSize: 14,
              color: C.textSecondary,
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}
          >
            Sign up as a brand on Go Virall to send proposals, negotiate terms, and manage
            your influencer campaigns.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              onClick={handleContact}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: C.red,
                border: "none",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                color: "#ffffff",
                cursor: "pointer",
                fontFamily: font,
              }}
            >
              <Send size={15} />
              Contact for Collaboration
            </button>
            <Link
              href="/register?type=brand"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: C.primary,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                color: C.bg,
                textDecoration: "none",
              }}
            >
              Sign Up Free
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        style={{
          padding: "32px 24px",
          borderTop: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12, color: C.textSecondary, margin: 0 }}>
          Go Virall - Social Intelligence Platform for Creators and Brands
        </p>
      </footer>
    </div>
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
        background: C.card,
        borderRadius: 12,
        padding: "18px 20px",
        border: `1px solid ${C.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {icon}
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: C.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: C.text,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
