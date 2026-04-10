"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Copy,
  Check,
  Share2,
  Shield,
  Star,
  Heart,
  MessageCircle,
  Play,
  Image as ImageIcon,
  ExternalLink,
  Award,
  TrendingUp,
  Users,
  BarChart3,
  Printer,
} from "lucide-react";
import { formatCompact, cn } from "@/lib/utils";
import type { Profile, SocialProfile, TrustScore } from "@/types";
import { TrustBadge } from "@/components/deals/TrustBadge";
import { getTrustScore } from "@/lib/dal/trust";
import type {
  MediaKitData,
  MediaKitAQS,
  MediaKitTopPost,
  MediaKitBrandCollab,
  MediaKitRateCard,
  MediaKitSocialStats,
} from "@/lib/dal/media-kit";

/* ─── Types ─── */

interface DemographicRow {
  label: string;
  pct: number;
  color: string;
}

interface CollabRow {
  brand: string;
  detail: string;
}

interface Section {
  id: string;
  label: string;
  visible: boolean;
}

/* ─── Constants ─── */

const COLOR_OPTIONS = [
  { label: "Red", value: "bg-editorial-red" },
  { label: "Blue", value: "bg-editorial-blue" },
  { label: "Gold", value: "bg-editorial-gold" },
  { label: "Green", value: "bg-editorial-green" },
];

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitter: "X",
  linkedin: "LinkedIn",
  threads: "Threads",
  pinterest: "Pinterest",
  twitch: "Twitch",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#00f2ea",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  threads: "var(--color-ink-muted)",
  pinterest: "#E60023",
  twitch: "#9146FF",
};

const INDUSTRY_AVG_ENGAGEMENT = 2.5; // industry average engagement rate %

/* ─── Helper ─── */

function gradeColor(grade: string | null): string {
  if (!grade) return "var(--color-ink-muted)";
  if (grade.startsWith("A")) return "var(--color-editorial-green)";
  if (grade.startsWith("B")) return "var(--color-editorial-blue)";
  if (grade.startsWith("C")) return "var(--color-editorial-gold)";
  return "var(--color-editorial-red)";
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

/* ─── Component ─── */

export function MediaKitTab({
  profile,
  socialProfiles,
  mediaKitData,
}: {
  profile: Profile | null;
  socialProfiles: SocialProfile[];
  mediaKitData?: MediaKitData | null;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  // Derive data from mediaKitData if available, otherwise from socialProfiles
  const aqs = mediaKitData?.aqs ?? null;
  const topPosts = mediaKitData?.topPosts ?? [];
  const brandCollabsFromDeals = mediaKitData?.brandCollabs ?? [];
  const rateCard = mediaKitData?.rateCard ?? null;
  const marketplaceProfile = mediaKitData?.marketplaceProfile ?? null;
  const socialStats = mediaKitData?.socialStats ?? [];

  const totalFollowers = mediaKitData?.totalFollowers ??
    socialProfiles.reduce((s, p) => s + p.followers_count, 0);
  const avgEngagementRate = mediaKitData?.avgEngagementRate ??
    (() => {
      const rates = socialProfiles.map((p) => p.engagement_rate).filter((r): r is number => r !== null);
      return rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 0;
    })();

  const avgLikesPerPost = (() => {
    let totalLikes = 0;
    let totalPostCount = 0;
    for (const p of socialProfiles) {
      const posts = (p as unknown as { recent_posts?: { likesCount?: number }[] }).recent_posts;
      if (posts?.length) {
        totalLikes += posts.reduce((s, post) => s + (post.likesCount || 0), 0);
        totalPostCount += posts.length;
      }
    }
    return totalPostCount > 0 ? Math.round(totalLikes / totalPostCount) : 0;
  })();

  const handle = profile?.display_name ?? socialProfiles[0]?.handle ?? "username";
  const initial = (profile?.full_name ?? "U")[0].toUpperCase();

  // ── Trust score ──
  const [myTrustScore, setMyTrustScore] = useState<TrustScore | null>(null);

  useEffect(() => {
    if (profile?.id) {
      getTrustScore(profile.id).then(setMyTrustScore);
    }
  }, [profile?.id]);

  // ── Slug state ──
  const [slug, setSlug] = useState(handle);
  const [editingSlug, setEditingSlug] = useState(false);
  const [copied, setCopied] = useState(false);
  const mediaKitUrl = `govirall.app/mediakit/${slug}`;

  function handleCopyLink() {
    navigator.clipboard.writeText(`https://${mediaKitUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Bio state ──
  const [bio, setBio] = useState(
    profile?.bio ??
      `Helping ${formatCompact(totalFollowers)}+ followers build wardrobes they love on any budget. Specializing in capsule wardrobes, sustainable fashion & budget styling.`,
  );
  const [editingBio, setEditingBio] = useState(false);

  // ── Demographics state (auto-populate from AQS if available) ──
  const [demographics, setDemographics] = useState<DemographicRow[]>(() => {
    if (aqs?.audienceDemographics && Object.keys(aqs.audienceDemographics).length > 0) {
      const demos = aqs.audienceDemographics as Record<string, unknown>;
      const rows: DemographicRow[] = [];
      const colors = ["bg-editorial-red", "bg-editorial-blue", "bg-editorial-gold", "bg-editorial-green"];

      // Handle common demographic data structures
      if (demos.age_groups && typeof demos.age_groups === "object") {
        const ageGroups = demos.age_groups as Record<string, number>;
        Object.entries(ageGroups).forEach(([label, pct], i) => {
          rows.push({ label, pct: typeof pct === "number" ? pct : 0, color: colors[i % colors.length] });
        });
      } else if (demos.gender && typeof demos.gender === "object") {
        const genders = demos.gender as Record<string, number>;
        Object.entries(genders).forEach(([label, pct], i) => {
          rows.push({ label, pct: typeof pct === "number" ? pct : 0, color: colors[i % colors.length] });
        });
      } else {
        // Fallback: try top-level keys as demographics
        Object.entries(demos).forEach(([label, value], i) => {
          if (typeof value === "number" && value > 0 && value <= 100) {
            rows.push({ label, pct: value, color: colors[i % colors.length] });
          }
        });
      }

      if (rows.length > 0) return rows;
    }
    // Fallback defaults
    return [
      { label: "Female 25-34", pct: 42, color: "bg-editorial-red" },
      { label: "Female 18-24", pct: 28, color: "bg-editorial-red" },
      { label: "Male 25-34", pct: 14, color: "bg-editorial-blue" },
      { label: "Other", pct: 16, color: "bg-editorial-gold" },
    ];
  });
  const [editingDemo, setEditingDemo] = useState(false);
  const [newDemoLabel, setNewDemoLabel] = useState("");
  const [newDemoPct, setNewDemoPct] = useState("");
  const [newDemoColor, setNewDemoColor] = useState("bg-editorial-red");

  // ── Collaborations state (auto-populate from deals) ──
  const [collabs, setCollabs] = useState<CollabRow[]>(() => {
    if (brandCollabsFromDeals.length > 0) {
      return brandCollabsFromDeals.map((d) => ({
        brand: d.brandName,
        detail: d.dealValue > 0 ? fmtCurrency(d.dealValue) : d.status,
      }));
    }
    return [
      { brand: "Nike Running", detail: "3 Reels" },
      { brand: "Glossier", detail: "1 Post + Stories" },
      { brand: "Zara", detail: "UGC Campaign" },
      { brand: "Revolve", detail: "2 Reels" },
      { brand: "Sephora", detail: "Stories Series" },
    ];
  });
  const [editingCollabs, setEditingCollabs] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newDetail, setNewDetail] = useState("");

  // ── Sections (order + visibility) — expanded with new sections ──
  const [sections, setSections] = useState<Section[]>([
    { id: "profile", label: "Profile Header", visible: true },
    { id: "platforms", label: "Platform Stats", visible: true },
    { id: "stats", label: "Key Stats", visible: true },
    { id: "aqs", label: "Audience Quality Score", visible: aqs !== null },
    { id: "engagement", label: "Engagement vs Industry", visible: true },
    { id: "topPosts", label: "Top Performing Posts", visible: topPosts.length > 0 },
    { id: "demographics", label: "Audience Demographics", visible: true },
    { id: "collabs", label: "Past Collaborations", visible: true },
    { id: "rateCard", label: "Rate Card", visible: rateCard !== null },
  ]);

  const toggleVisibility = useCallback((id: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
  }, []);

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  // ── Helpers ──
  function addDemographic() {
    if (!newDemoLabel.trim() || !newDemoPct) return;
    setDemographics([...demographics, { label: newDemoLabel.trim(), pct: Number(newDemoPct), color: newDemoColor }]);
    setNewDemoLabel("");
    setNewDemoPct("");
  }

  function addCollab() {
    if (!newBrand.trim()) return;
    setCollabs([...collabs, { brand: newBrand.trim(), detail: newDetail.trim() }]);
    setNewBrand("");
    setNewDetail("");
  }

  function handleDownloadPDF() {
    // Use browser print with print-specific CSS
    const printContent = printRef.current;
    if (!printContent) return;

    const style = document.createElement("style");
    style.setAttribute("data-media-kit-print", "true");
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        [data-media-kit-preview], [data-media-kit-preview] * { visibility: visible !important; }
        [data-media-kit-preview] {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          background: white !important;
          color: #1a1a1a !important;
          padding: 24px !important;
        }
        [data-media-kit-preview] .editorial-overline { color: #666 !important; }
        [data-media-kit-preview] [style*="color: var(--color-ink-muted)"] { color: #999 !important; }
        [data-hidden-badge] { display: none !important; }
        nav, footer, [data-section-controls] { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      document.head.querySelectorAll("[data-media-kit-print]").forEach((el) => el.remove());
    }, 500);
  }

  // ── Render individual sections ──

  function renderProfile() {
    return (
      <div className="text-center mb-6">
        {/* Avatar */}
        <div
          className="mx-auto flex items-center justify-center rounded-full mb-3"
          style={{
            width: 80,
            height: 80,
            background: "linear-gradient(135deg, var(--color-editorial-red), var(--color-editorial-blue))",
            border: "3px solid rgba(var(--accent-rgb),0.2)",
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800, color: "white" }}>{initial}</span>
        </div>

        {/* Name + AQS badge inline */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <h4
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {profile?.full_name ?? "Your Name"}
          </h4>
          {aqs && aqs.grade && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                background: `${gradeColor(aqs.grade)}20`,
                color: gradeColor(aqs.grade),
                border: `1px solid ${gradeColor(aqs.grade)}30`,
              }}
            >
              <Shield size={10} />
              AQS {aqs.grade}
            </span>
          )}
          {marketplaceProfile?.isVerified && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                background: "rgba(91,156,245,0.15)",
                color: "var(--color-editorial-blue)",
              }}
            >
              <Check size={10} />
              Verified
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--color-ink-muted)", margin: 0 }}>
          @{handle}
          {profile?.niche ? ` \u00B7 ${profile.niche}` : ""}
          {profile?.location ? ` \u00B7 ${profile.location}` : ""}
        </p>

        {/* Bio */}
        {editingBio ? (
          <div className="mt-3 max-w-md mx-auto">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full border border-rule bg-surface-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted resize-y"
              style={{ borderRadius: 8 }}
            />
            <button
              onClick={() => setEditingBio(false)}
              style={{
                marginTop: 4,
                padding: "4px 12px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: "var(--color-ink)",
                color: "var(--color-surface-cream)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <p
            onClick={() => setEditingBio(true)}
            className="cursor-pointer"
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              marginTop: 12,
              maxWidth: 480,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.6,
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid transparent",
            }}
            title="Click to edit"
          >
            {bio}
          </p>
        )}
      </div>
    );
  }

  function renderPlatforms() {
    const platformData =
      socialStats.length > 0
        ? socialStats
        : socialProfiles.map((p) => ({
            platform: p.platform,
            handle: p.handle,
            followers: p.followers_count,
            engagementRate: p.engagement_rate,
            verified: p.verified,
            avatarUrl: p.avatar_url,
          }));

    if (platformData.length === 0) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: 24,
            color: "var(--color-ink-muted)",
            fontSize: 13,
          }}
          className="mb-6"
        >
          Connect social accounts to display platform stats.
        </div>
      );
    }

    return (
      <div
        className="mb-6"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(160px, 1fr))`,
          gap: 12,
        }}
      >
        {platformData.map((p) => (
          <div
            key={`${p.platform}-${p.handle}`}
            style={{
              background: "var(--color-surface-inset)",
              borderRadius: 10,
              padding: 16,
              borderLeft: `3px solid ${PLATFORM_COLORS[p.platform] ?? "var(--color-ink-muted)"}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: PLATFORM_COLORS[p.platform] ?? "var(--color-ink-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {PLATFORM_ICONS[p.platform] ?? p.platform}
              </span>
              {p.verified && (
                <Check
                  size={12}
                  style={{ color: "var(--color-editorial-blue)" }}
                />
              )}
            </div>
            <p
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: "0 0 2px 0",
                letterSpacing: "-0.02em",
              }}
            >
              {formatCompact(p.followers)}
            </p>
            <p style={{ fontSize: 11, color: "var(--color-ink-muted)", margin: 0 }}>
              @{p.handle}
              {p.engagementRate !== null && p.engagementRate > 0 && (
                <> &middot; {p.engagementRate.toFixed(1)}% ER</>
              )}
            </p>
          </div>
        ))}
      </div>
    );
  }

  function renderStats() {
    return (
      <div
        className="mb-6"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {[
          { label: "Total Followers", value: formatCompact(totalFollowers), color: "var(--color-editorial-red)" },
          { label: "Avg Likes/Post", value: avgLikesPerPost > 0 ? formatCompact(avgLikesPerPost) : "---", color: "var(--color-editorial-blue)" },
          { label: "Engagement Rate", value: avgEngagementRate > 0 ? `${avgEngagementRate.toFixed(1)}%` : "---", color: "var(--color-editorial-green)" },
          { label: "Est. Reach", value: formatCompact(Math.round(totalFollowers * 0.31)), color: "var(--color-editorial-gold)" },
          { label: "Post Rate", value: `$${formatCompact(Math.round(totalFollowers * 0.01))}`, color: "var(--color-editorial-blue)" },
          { label: "Platforms", value: String((socialStats.length || socialProfiles.length)), color: "var(--color-ink-secondary)" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 10,
              padding: 14,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--color-ink-muted)",
                margin: "0 0 6px 0",
              }}
            >
              {stat.label}
            </p>
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: stat.color,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {stat.value}
            </p>
          </div>
        ))}
        {myTrustScore && (
          <div
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 10,
              padding: 14,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--color-ink-muted)",
                margin: "0 0 6px 0",
              }}
            >
              Trust Score
            </p>
            <TrustBadge trustScore={myTrustScore} size="md" />
          </div>
        )}
      </div>
    );
  }

  function renderAQS() {
    if (!aqs) {
      return (
        <div
          className="mb-6"
          style={{
            textAlign: "center",
            padding: 24,
            background: "var(--color-surface-inset)",
            borderRadius: 10,
            color: "var(--color-ink-muted)",
            fontSize: 13,
          }}
        >
          <Shield size={24} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
          Audience Quality Score not yet calculated. Run an audience analysis to generate your AQS.
        </div>
      );
    }

    const metrics = [
      { label: "Engagement Quality", value: aqs.engagementQuality, icon: Heart },
      { label: "Follower Authenticity", value: aqs.followerAuthenticity, icon: Users },
      { label: "Growth Health", value: aqs.growthHealth, icon: TrendingUp },
      { label: "Content Consistency", value: aqs.contentConsistency, icon: BarChart3 },
    ];

    return (
      <div className="mb-6">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-ink-muted)",
              margin: 0,
            }}
          >
            Audience Quality Score
          </p>
          {aqs.riskFlags.length > 0 && (
            <span style={{ fontSize: 10, color: "var(--color-editorial-red)" }}>
              {aqs.riskFlags.length} risk flag{aqs.riskFlags.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Main AQS display */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {/* Score circle */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: `conic-gradient(${gradeColor(aqs.grade)} ${(aqs.overallScore / 100) * 360}deg, rgba(var(--accent-rgb),0.1) 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                background: "var(--color-surface-card)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: gradeColor(aqs.grade),
                  lineHeight: 1,
                }}
              >
                {aqs.overallScore}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-ink-muted)",
                }}
              >
                / 100
              </span>
            </div>
          </div>

          {/* Grade */}
          <div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: gradeColor(aqs.grade),
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {aqs.grade ?? "--"}
            </div>
            <p style={{ fontSize: 12, color: "var(--color-ink-muted)", margin: "4px 0 0 0" }}>
              Overall Grade
            </p>
          </div>

          {/* Sub-metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1, minWidth: 200 }}>
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.label}
                  style={{
                    background: "var(--color-surface-inset)",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Icon size={12} style={{ color: "var(--color-ink-muted)" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-muted)" }}>
                      {m.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: m.value !== null ? "var(--color-ink)" : "var(--color-ink-muted)",
                    }}
                  >
                    {m.value !== null ? m.value : "--"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderEngagement() {
    const userRate = avgEngagementRate;
    const industryRate = INDUSTRY_AVG_ENGAGEMENT;
    const maxRate = Math.max(userRate, industryRate, 5);
    const userWidth = (userRate / maxRate) * 100;
    const industryWidth = (industryRate / maxRate) * 100;
    const isAboveAvg = userRate > industryRate;

    return (
      <div className="mb-6">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-ink-muted)",
              margin: 0,
            }}
          >
            Engagement Rate vs Industry
          </p>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: isAboveAvg ? "var(--color-editorial-green)" : "var(--color-editorial-red)",
            }}
          >
            {isAboveAvg ? "Above" : "Below"} Average
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Your engagement */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>
                Your Rate
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: isAboveAvg ? "var(--color-editorial-green)" : "var(--color-editorial-red)",
                }}
              >
                {userRate.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 5,
                background: "var(--color-surface-inset)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${userWidth}%`,
                  borderRadius: 5,
                  background: isAboveAvg
                    ? "var(--color-editorial-green)"
                    : "var(--color-editorial-red)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Industry average */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink-secondary)" }}>
                Industry Average
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--color-ink-muted)",
                }}
              >
                {industryRate.toFixed(1)}%
              </span>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 5,
                background: "var(--color-surface-inset)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${industryWidth}%`,
                  borderRadius: 5,
                  background: "var(--color-ink-muted)",
                  opacity: 0.5,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderTopPosts() {
    if (topPosts.length === 0) {
      return (
        <div
          className="mb-6"
          style={{
            textAlign: "center",
            padding: 24,
            background: "var(--color-surface-inset)",
            borderRadius: 10,
            color: "var(--color-ink-muted)",
            fontSize: 13,
          }}
        >
          <Star size={24} style={{ margin: "0 auto 8px auto", opacity: 0.4 }} />
          No posts data available yet. Connect your accounts and sync to show top posts.
        </div>
      );
    }

    return (
      <div className="mb-6">
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--color-ink-muted)",
            margin: "0 0 12px 0",
          }}
        >
          Top Performing Posts
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {topPosts.slice(0, 6).map((post, i) => (
            <div
              key={post.id || i}
              style={{
                background: "var(--color-surface-inset)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {/* Post thumbnail */}
              <div
                style={{
                  width: "100%",
                  height: 120,
                  background: "var(--color-surface-raised)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.caption?.slice(0, 40) ?? "Post"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <ImageIcon size={24} style={{ color: "var(--color-ink-faint)" }} />
                )}
                {post.isVideo && (
                  <div
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Play size={10} style={{ color: "white" }} />
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    background: PLATFORM_COLORS[post.platform] ?? "rgba(0,0,0,0.6)",
                    color: "white",
                    textTransform: "uppercase",
                  }}
                >
                  {PLATFORM_ICONS[post.platform] ?? post.platform}
                </div>
              </div>
              {/* Metrics */}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Heart size={11} style={{ color: "var(--color-editorial-red)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>
                      {formatCompact(post.likesCount)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <MessageCircle size={11} style={{ color: "var(--color-editorial-blue)" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)" }}>
                      {formatCompact(post.commentsCount)}
                    </span>
                  </div>
                </div>
                {post.caption && (
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--color-ink-muted)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {post.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderDemographics() {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-ink-muted)",
              margin: 0,
            }}
          >
            Audience Demographics
          </p>
          <button
            onClick={() => setEditingDemo(!editingDemo)}
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-ink-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {editingDemo ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {demographics.map((d, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>{d.label}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>{d.pct}%</span>
                  {editingDemo && (
                    <button
                      onClick={() => setDemographics(demographics.filter((_, j) => j !== i))}
                      style={{
                        color: "var(--color-editorial-red)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div
                style={{
                  height: 8,
                  width: "100%",
                  borderRadius: 4,
                  background: "var(--color-surface-raised)",
                  overflow: "hidden",
                }}
              >
                <div
                  className={d.color}
                  style={{ height: "100%", borderRadius: 4, width: `${d.pct}%`, transition: "width 0.3s ease" }}
                />
              </div>
            </div>
          ))}
        </div>
        {editingDemo && (
          <div className="mt-3 flex items-end gap-2 flex-wrap">
            <div>
              <label style={{ fontSize: 9, color: "var(--color-ink-muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Label</label>
              <input
                value={newDemoLabel}
                onChange={(e) => setNewDemoLabel(e.target.value)}
                placeholder="e.g. Male 18-24"
                style={{
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  background: "var(--color-surface-raised)",
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "var(--color-ink)",
                  outline: "none",
                  borderRadius: 6,
                  width: 130,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 9, color: "var(--color-ink-muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>%</label>
              <input
                type="number"
                value={newDemoPct}
                onChange={(e) => setNewDemoPct(e.target.value)}
                placeholder="0"
                min={0}
                max={100}
                style={{
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  background: "var(--color-surface-raised)",
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "var(--color-ink)",
                  outline: "none",
                  borderRadius: 6,
                  width: 60,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 9, color: "var(--color-ink-muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Color</label>
              <select
                value={newDemoColor}
                onChange={(e) => setNewDemoColor(e.target.value)}
                style={{
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  background: "var(--color-surface-raised)",
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "var(--color-ink)",
                  outline: "none",
                  borderRadius: 6,
                }}
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addDemographic}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: "var(--color-ink)",
                color: "var(--color-surface-cream)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <Plus size={10} /> Add
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderCollabs() {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-ink-muted)",
              margin: 0,
            }}
          >
            Past Collaborations
          </p>
          <button
            onClick={() => setEditingCollabs(!editingCollabs)}
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--color-ink-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {editingCollabs ? "Done" : "Edit"}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {collabs.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "var(--color-surface-inset)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Award size={14} style={{ color: "var(--color-editorial-gold)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>{c.brand}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--color-ink-muted)", fontFamily: "var(--font-mono)" }}>{c.detail}</span>
                {editingCollabs && (
                  <button
                    onClick={() => setCollabs(collabs.filter((_, j) => j !== i))}
                    style={{
                      color: "var(--color-editorial-red)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {editingCollabs && (
          <div className="mt-3 flex items-end gap-2 flex-wrap">
            <div>
              <label style={{ fontSize: 9, color: "var(--color-ink-muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Brand</label>
              <input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="e.g. Adidas"
                style={{
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  background: "var(--color-surface-raised)",
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "var(--color-ink)",
                  outline: "none",
                  borderRadius: 6,
                  width: 130,
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 9, color: "var(--color-ink-muted)", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Detail</label>
              <input
                value={newDetail}
                onChange={(e) => setNewDetail(e.target.value)}
                placeholder="e.g. 2 Reels"
                style={{
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  background: "var(--color-surface-raised)",
                  padding: "4px 8px",
                  fontSize: 12,
                  color: "var(--color-ink)",
                  outline: "none",
                  borderRadius: 6,
                  width: 130,
                }}
              />
            </div>
            <button
              onClick={addCollab}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: "var(--color-ink)",
                color: "var(--color-surface-cream)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <Plus size={10} /> Add
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderRateCard() {
    if (!rateCard || Object.keys(rateCard).length === 0) {
      return (
        <div
          className="mb-6"
          style={{
            textAlign: "center",
            padding: 24,
            background: "var(--color-surface-inset)",
            borderRadius: 10,
            color: "var(--color-ink-muted)",
            fontSize: 13,
          }}
        >
          No rate card configured. Set up your pricing in the marketplace profile.
        </div>
      );
    }

    return (
      <div className="mb-6">
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--color-ink-muted)",
            margin: "0 0 12px 0",
          }}
        >
          Rate Card
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {Object.entries(rateCard).map(([type, price]) => (
            <div
              key={type}
              style={{
                background: "var(--color-surface-inset)",
                borderRadius: 10,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {type.replace(/_/g, " ")}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "var(--color-editorial-green)",
                }}
              >
                {fmtCurrency(price)}
              </span>
            </div>
          ))}
        </div>
        {marketplaceProfile?.minimumBudget !== undefined && marketplaceProfile.minimumBudget !== null && (
          <p style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 8 }}>
            Minimum budget: {fmtCurrency(marketplaceProfile.minimumBudget)}
          </p>
        )}
      </div>
    );
  }

  const renderMap: Record<string, () => React.ReactNode> = {
    profile: renderProfile,
    platforms: renderPlatforms,
    stats: renderStats,
    aqs: renderAQS,
    engagement: renderEngagement,
    topPosts: renderTopPosts,
    demographics: renderDemographics,
    collabs: renderCollabs,
    rateCard: renderRateCard,
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "var(--color-ink)",
            margin: 0,
          }}
        >
          Media Kit Editor
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleDownloadPDF}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              background: "var(--color-ink)",
              color: "var(--color-surface-cream)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Printer size={12} />
            Download PDF
          </button>
          <button
            onClick={handleCopyLink}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              background: "var(--color-editorial-red)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <Share2 size={12} />
            Share Link
          </button>
        </div>
      </div>

      {/* Public URL */}
      <div
        style={{
          background: "var(--color-surface-inset)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--color-ink-muted)",
            margin: "0 0 8px 0",
          }}
        >
          Public Media Kit URL
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {editingSlug ? (
            <div style={{ display: "flex", alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              <span style={{ color: "var(--color-ink-muted)" }}>govirall.app/mediakit/</span>
              <input
                autoFocus
                value={slug}
                onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: "2px solid var(--color-editorial-blue)",
                  padding: "2px 4px",
                  fontSize: 13,
                  color: "var(--color-editorial-blue)",
                  outline: "none",
                  width: 130,
                  fontFamily: "var(--font-mono)",
                }}
                onKeyDown={(e) => e.key === "Enter" && setEditingSlug(false)}
              />
            </div>
          ) : (
            <a
              href={`https://${mediaKitUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                color: "var(--color-editorial-blue)",
                fontFamily: "var(--font-mono)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {mediaKitUrl}
              <ExternalLink size={12} />
            </a>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={handleCopyLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-ink-secondary)",
                background: "var(--color-surface-card)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={10} style={{ color: "var(--color-editorial-green)" }} /> : <Copy size={10} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={() => setEditingSlug(!editingSlug)}
              style={{
                padding: "4px 10px",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-ink-secondary)",
                background: "var(--color-surface-card)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {editingSlug ? "Save" : "Edit Slug"}
            </button>
          </div>
        </div>
      </div>

      {/* Section Controls */}
      <div
        data-section-controls
        style={{
          background: "var(--color-surface-inset)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          borderRadius: 12,
          padding: 14,
          marginBottom: 20,
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--color-ink-muted)",
            margin: "0 0 10px 0",
          }}
        >
          Sections -- Reorder &amp; Toggle Visibility
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sections.map((section, idx) => (
            <div
              key={section.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: "var(--color-surface-card)",
                border: "1px solid rgba(var(--accent-rgb),0.08)",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <button
                  onClick={() => moveSection(idx, -1)}
                  disabled={idx === 0}
                  style={{
                    color: "var(--color-ink-muted)",
                    background: "transparent",
                    border: "none",
                    cursor: idx === 0 ? "default" : "pointer",
                    opacity: idx === 0 ? 0.2 : 1,
                    padding: 0,
                  }}
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveSection(idx, 1)}
                  disabled={idx === sections.length - 1}
                  style={{
                    color: "var(--color-ink-muted)",
                    background: "transparent",
                    border: "none",
                    cursor: idx === sections.length - 1 ? "default" : "pointer",
                    opacity: idx === sections.length - 1 ? 0.2 : 1,
                    padding: 0,
                  }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>
                {section.label}
              </span>
              <button
                onClick={() => toggleVisibility(section.id)}
                title={section.visible ? "Visible on public page" : "Hidden from public page"}
                style={{
                  color: section.visible ? "var(--color-editorial-green)" : "var(--color-ink-faint)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Card — renders sections in order */}
      <div
        ref={printRef}
        data-media-kit-preview
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.12)",
          borderRadius: 12,
          padding: 32,
        }}
      >
        {sections.map((section) => {
          const renderer = renderMap[section.id];
          if (!renderer) return null;

          return (
            <div
              key={section.id}
              style={{
                position: "relative",
                opacity: section.visible ? 1 : 0.25,
                pointerEvents: section.visible ? "auto" : "none",
                userSelect: section.visible ? "auto" : "none",
                transition: "opacity 0.2s ease",
              }}
            >
              {!section.visible && (
                <div
                  data-hidden-badge
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  <span
                    style={{
                      background: "var(--color-surface-card)",
                      border: "1px solid rgba(var(--accent-rgb),0.12)",
                      padding: "4px 12px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--color-ink-muted)",
                    }}
                  >
                    Hidden
                  </span>
                </div>
              )}
              {renderer()}
            </div>
          );
        })}

        {/* Footer branding */}
        <div
          style={{
            textAlign: "center",
            paddingTop: 20,
            borderTop: "1px solid rgba(var(--accent-rgb),0.08)",
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-faint)" }}>
            Powered by{" "}
            <span style={{ color: "var(--color-editorial-red)" }}>Go</span>
            <span style={{ color: "var(--color-ink-muted)" }}>Virall</span>
          </span>
        </div>
      </div>

      {/* Footer */}
      <p
        style={{
          fontSize: 12,
          color: "var(--color-ink-muted)",
          textAlign: "center",
          margin: "16px 0 0 0",
        }}
      >
        Use controls above to reorder sections &middot; Click text to edit &middot; Toggle visibility with the eye icon
      </p>
    </div>
  );
}
