"use client";

import {
  Users,
  TrendingUp,
  MapPin,
  Eye,
  Send,
  BadgeCheck,
  ShieldCheck,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  Music,
  AtSign,
  Pin,
  Twitch,
} from "lucide-react";
import type { CreatorMarketplaceProfile } from "@/types";

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
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

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <Instagram size={12} />;
    case "youtube":
      return <Youtube size={12} />;
    case "twitter":
      return <Twitter size={12} />;
    case "linkedin":
      return <Linkedin size={12} />;
    case "tiktok":
      return <Music size={12} />;
    case "threads":
      return <AtSign size={12} />;
    case "pinterest":
      return <Pin size={12} />;
    case "twitch":
      return <Twitch size={12} />;
    default:
      return <Users size={12} />;
  }
}

function getMinRate(rateCard: Record<string, number> | null | undefined): number | null {
  if (!rateCard) return null;
  const values = Object.values(rateCard);
  if (values.length === 0) return null;
  return Math.min(...values);
}

interface CreatorCardProps {
  creator: CreatorMarketplaceProfile;
  onViewProfile: (creator: CreatorMarketplaceProfile) => void;
  onSendProposal: (creator: CreatorMarketplaceProfile) => void;
}

export default function CreatorCard({
  creator,
  onViewProfile,
  onSendProposal,
}: CreatorCardProps) {
  const name = creator.profile?.full_name ?? "Creator";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const niche = creator.profile?.niche ?? creator.categories[0] ?? "Creator";
  const location = creator.profile?.location;
  const aqsColor = getAqsColor(creator.audience_quality_score);
  const minRate = getMinRate(creator.rate_card);

  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid rgba(75,156,211,0.12)",
        borderRadius: 14,
        padding: 20,
        transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.015)";
        e.currentTarget.style.borderColor = "rgba(75,156,211,0.25)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(75,156,211,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.borderColor = "rgba(75,156,211,0.12)";
        e.currentTarget.style.boxShadow = "none";
      }}
      onClick={() => onViewProfile(creator)}
    >
      {/* Creator header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {creator.profile?.avatar_url ? (
            <img
              src={creator.profile.avatar_url}
              alt={name}
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(75,156,211,0.3), var(--color-editorial-red))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              {initials}
            </div>
          )}
          {creator.is_verified && (
            <div
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--color-surface-card)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BadgeCheck size={14} style={{ color: "var(--color-editorial-blue)" }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {name}
            {creator.has_verified_profiles && (
              <ShieldCheck size={13} style={{ color: "#10B981", flexShrink: 0 }} />
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--color-ink-secondary)",
              marginTop: 2,
            }}
          >
            {niche}
          </div>
        </div>

        {/* AQS Badge — only show when score exists */}
        {creator.audience_quality_score ? (
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: `${aqsColor}15`,
              border: `1px solid ${aqsColor}30`,
              fontSize: 11,
              fontWeight: 800,
              color: aqsColor,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {getAqsGrade(creator.audience_quality_score)} ({creator.audience_quality_score})
          </div>
        ) : null}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 14,
          padding: "10px 14px",
          background: "rgba(75,156,211,0.04)",
          borderRadius: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--color-ink-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 3,
            }}
          >
            Followers
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--color-ink)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Users size={13} style={{ color: "rgba(75,156,211,0.6)" }} />
            {formatFollowers(creator.total_followers)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "var(--color-ink-secondary)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 3,
            }}
          >
            Engagement
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--color-ink)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <TrendingUp size={13} style={{ color: "#10B981" }} />
            {creator.avg_engagement_rate.toFixed(1)}%
          </div>
        </div>
        {minRate !== null && (
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "var(--color-ink-secondary)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 3,
              }}
            >
              Starting
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--color-ink)",
              }}
            >
              ${minRate}
            </div>
          </div>
        )}
      </div>

      {/* Categories */}
      {creator.categories.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: 12,
          }}
        >
          {creator.categories.slice(0, 4).map((cat) => (
            <span
              key={cat}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-ink-secondary)",
                background: "rgba(75,156,211,0.06)",
                padding: "3px 8px",
                borderRadius: 10,
                border: "1px solid rgba(75,156,211,0.08)",
              }}
            >
              {cat}
            </span>
          ))}
          {creator.categories.length > 4 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--color-ink-muted)",
                padding: "3px 8px",
              }}
            >
              +{creator.categories.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Location + Platforms */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        {location && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--color-ink-secondary)",
            }}
          >
            <MapPin size={12} />
            {location}
          </div>
        )}
        <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
          {creator.platforms_active.slice(0, 5).map((p) => (
            <div
              key={p}
              title={p}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "rgba(75,156,211,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-ink-secondary)",
              }}
            >
              {getPlatformIcon(p)}
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile(creator);
          }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 0",
            background: "transparent",
            border: "1px solid rgba(75,156,211,0.2)",
            borderRadius: 8,
            fontSize: 11,
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
          <Eye size={13} />
          View Profile
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSendProposal(creator);
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
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Send size={12} />
          Send Proposal
        </button>
      </div>
    </div>
  );
}
