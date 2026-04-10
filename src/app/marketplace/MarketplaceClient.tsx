"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  TrendingUp,
  Shield,
  ChevronRight,
  ArrowUpDown,
  ChevronLeft,
  Sparkles,
  Dumbbell,
  Cpu,
  Utensils,
  Plane,
  Gamepad2,
  Shirt,
  Heart,
  GraduationCap,
  Music,
  Palette,
  Camera,
  Trophy,
  Activity,
  Briefcase,
  Tag,
  MapPin,
  BadgeCheck,
  Send,
  Eye,
  Instagram,
  Youtube,
  Twitter,
  Linkedin,
  AtSign,
  Pin,
  Twitch,
  ArrowRight,
  Star,
} from "lucide-react";
import { searchCreators } from "@/lib/actions/marketplace";
import CreatorProfile from "@/components/brand/CreatorProfile";
import type { CreatorMarketplaceProfile } from "@/types";
import type { MarketplaceStats, CategoryCount } from "@/lib/dal/marketplace";

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
} as const;

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  Fitness: <Dumbbell size={20} />,
  Beauty: <Sparkles size={20} />,
  Tech: <Cpu size={20} />,
  Food: <Utensils size={20} />,
  Travel: <Plane size={20} />,
  Gaming: <Gamepad2 size={20} />,
  Fashion: <Shirt size={20} />,
  Lifestyle: <Heart size={20} />,
  Education: <GraduationCap size={20} />,
  Music: <Music size={20} />,
  Art: <Palette size={20} />,
  Photography: <Camera size={20} />,
  Sports: <Trophy size={20} />,
  Health: <Activity size={20} />,
  Finance: <TrendingUp size={20} />,
  Business: <Briefcase size={20} />,
};

// Default categories when DB has none
const DEFAULT_CATEGORIES: CategoryCount[] = [
  { name: "Fitness", count: 0, icon: "dumbbell" },
  { name: "Beauty", count: 0, icon: "sparkles" },
  { name: "Tech", count: 0, icon: "cpu" },
  { name: "Food", count: 0, icon: "utensils" },
  { name: "Travel", count: 0, icon: "plane" },
  { name: "Gaming", count: 0, icon: "gamepad-2" },
  { name: "Fashion", count: 0, icon: "shirt" },
  { name: "Lifestyle", count: 0, icon: "heart" },
  { name: "Education", count: 0, icon: "graduation-cap" },
  { name: "Music", count: 0, icon: "music" },
];

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

function getPlatformIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "instagram": return <Instagram size={12} />;
    case "youtube": return <Youtube size={12} />;
    case "twitter": return <Twitter size={12} />;
    case "linkedin": return <Linkedin size={12} />;
    case "tiktok": return <Music size={12} />;
    case "threads": return <AtSign size={12} />;
    case "pinterest": return <Pin size={12} />;
    case "twitch": return <Twitch size={12} />;
    default: return <Users size={12} />;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MarketplaceClientProps {
  featuredCreators: CreatorMarketplaceProfile[];
  stats: MarketplaceStats;
  categories: CategoryCount[];
}

export default function MarketplaceClient({
  featuredCreators,
  stats,
  categories,
}: MarketplaceClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<CreatorMarketplaceProfile[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<"relevance" | "followers" | "engagement" | "aqs">(
    "relevance",
  );
  const [selectedCreator, setSelectedCreator] = useState<CreatorMarketplaceProfile | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  const displayCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  const doSearch = useCallback(
    (query: string, category: string | null, pageNum: number, sort: string) => {
      startTransition(async () => {
        const result = await searchCreators({
          query: query || undefined,
          niches: category ? [category] : undefined,
          sortBy: sort as "relevance" | "followers" | "engagement" | "aqs",
          page: pageNum,
          limit: 20,
        });
        if (result.success) {
          setSearchResults(result.success.creators);
          setTotal(result.success.total);
          setPage(result.success.page);
          setTotalPages(result.success.totalPages);
          setShowResults(true);
        }
      });
    },
    [],
  );

  const handleSearch = useCallback(() => {
    doSearch(searchQuery, selectedCategory, 1, sortBy);
  }, [searchQuery, selectedCategory, sortBy, doSearch]);

  const handleCategoryClick = useCallback(
    (catName: string) => {
      setSelectedCategory(catName);
      doSearch("", catName, 1, sortBy);
    },
    [sortBy, doSearch],
  );

  const handleSortChange = useCallback(
    (newSort: "relevance" | "followers" | "engagement" | "aqs") => {
      setSortBy(newSort);
      doSearch(searchQuery, selectedCategory, 1, newSort);
    },
    [searchQuery, selectedCategory, doSearch],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      doSearch(searchQuery, selectedCategory, newPage, sortBy);
    },
    [searchQuery, selectedCategory, sortBy, totalPages, doSearch],
  );

  const handleBack = useCallback(() => {
    setShowResults(false);
    setSelectedCategory(null);
    setSearchQuery("");
  }, []);

  const handleCreatorSlug = useCallback((creator: CreatorMarketplaceProfile) => {
    if (!creator.profile?.full_name) return "#";
    return `/marketplace/${creator.profile.full_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
  }, []);

  const handleSendProposal = useCallback((creator: CreatorMarketplaceProfile) => {
    // Redirect to signup/login if not logged in (handled by the proposals page auth)
    window.location.href = `/brand/proposals?creator=${creator.profile_id}`;
  }, []);

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
            maxWidth: 1200,
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
                color: C.text,
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
              href="/register"
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
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {!showResults ? (
        <>
          {/* Hero Section */}
          <section
            style={{
              padding: "80px 24px 60px",
              textAlign: "center",
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: `${C.purple}15`,
                border: `1px solid ${C.purple}30`,
                borderRadius: 20,
                marginBottom: 20,
              }}
            >
              <Sparkles size={13} style={{ color: C.primary }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>
                Creator Marketplace
              </span>
            </div>

            <h1
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: C.text,
                margin: "0 0 16px",
                letterSpacing: -1.5,
                lineHeight: 1.1,
              }}
            >
              Discover Top{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${C.primary}, ${C.purple})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Creators
              </span>
            </h1>

            <p
              style={{
                fontSize: 17,
                color: C.textSecondary,
                maxWidth: 560,
                margin: "0 auto 36px",
                lineHeight: 1.6,
              }}
            >
              Find the perfect creators for your brand campaigns. Browse by niche,
              engagement rate, audience quality score, and more.
            </p>

            {/* Search bar */}
            <div
              style={{
                maxWidth: 600,
                margin: "0 auto 48px",
                display: "flex",
                gap: 10,
              }}
            >
              <div style={{ flex: 1, position: "relative" }}>
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: 16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textSecondary,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by name, niche, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  style={{
                    width: "100%",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 16px 14px 46px",
                    fontSize: 14,
                    color: C.text,
                    outline: "none",
                    fontFamily: font,
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                style={{
                  padding: "0 28px",
                  background: C.red,
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  fontFamily: font,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                }}
              >
                <Search size={16} />
                Search
              </button>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 40,
                flexWrap: "wrap",
              }}
            >
              <StatBadge
                icon={<Users size={18} style={{ color: C.purple }} />}
                value={stats.totalListed > 0 ? stats.totalListed.toString() : "100+"}
                label="Listed Creators"
              />
              <StatBadge
                icon={<TrendingUp size={18} style={{ color: C.success }} />}
                value={
                  stats.avgEngagement > 0 ? `${stats.avgEngagement.toFixed(1)}%` : "4.5%"
                }
                label="Avg Engagement"
              />
              <StatBadge
                icon={<Tag size={18} style={{ color: C.primary }} />}
                value={
                  stats.categoriesCount > 0 ? stats.categoriesCount.toString() : "10+"
                }
                label="Categories"
              />
              <StatBadge
                icon={<Shield size={18} style={{ color: "#F59E0B" }} />}
                value={
                  stats.totalFollowers > 0
                    ? formatFollowers(stats.totalFollowers)
                    : "50M+"
                }
                label="Total Reach"
              />
            </div>
          </section>

          {/* Categories Section */}
          <section
            style={{
              padding: "40px 24px 60px",
              maxWidth: 1200,
              margin: "0 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: C.text,
                  margin: 0,
                  letterSpacing: -0.5,
                }}
              >
                Browse by Category
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {displayCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "16px 18px",
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: font,
                    transition: "all 0.15s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${C.purple}40`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `${C.purple}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: C.primary,
                      flexShrink: 0,
                    }}
                  >
                    {CATEGORY_ICON_MAP[cat.name] ?? <Tag size={20} />}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.text,
                      }}
                    >
                      {cat.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: C.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {cat.count > 0 ? `${cat.count} creator${cat.count !== 1 ? "s" : ""}` : "Browse"}
                    </div>
                  </div>
                  <ChevronRight
                    size={14}
                    style={{ color: C.textSecondary, marginLeft: "auto" }}
                  />
                </button>
              ))}
            </div>
          </section>

          {/* Featured Creators */}
          {featuredCreators.length > 0 && (
            <section
              style={{
                padding: "40px 24px 60px",
                maxWidth: 1200,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 28,
                }}
              >
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: C.text,
                    margin: 0,
                    letterSpacing: -0.5,
                  }}
                >
                  Featured Creators
                </h2>
                <button
                  onClick={() => doSearch("", null, 1, "relevance")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.primary,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: font,
                  }}
                >
                  View All
                  <ArrowRight size={14} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                }}
              >
                {featuredCreators.map((creator) => (
                  <MarketplaceCreatorCard
                    key={creator.id}
                    creator={creator}
                    onView={() => setSelectedCreator(creator)}
                    onProfilePage={() => {
                      window.location.href = handleCreatorSlug(creator);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Brand CTA */}
          <section
            style={{
              padding: "60px 24px 80px",
              maxWidth: 800,
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.borderGold}`,
                borderRadius: 20,
                padding: "48px 40px",
              }}
            >
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: C.text,
                  margin: "0 0 12px",
                  letterSpacing: -0.5,
                }}
              >
                Ready to Grow Your Brand?
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: C.textSecondary,
                  maxWidth: 500,
                  margin: "0 auto 28px",
                  lineHeight: 1.6,
                }}
              >
                Sign up as a brand to access advanced creator search, send proposals,
                manage campaigns, and track ROI — all in one platform.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                <Link
                  href="/register?type=brand"
                  style={{
                    display: "inline-flex",
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
                  Sign Up as a Brand
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/register?type=creator"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 28px",
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.text,
                    textDecoration: "none",
                  }}
                >
                  List as a Creator
                </Link>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section
            style={{
              padding: "40px 24px 80px",
              maxWidth: 1200,
              margin: "0 auto",
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: 24,
                paddingTop: 40,
              }}
            >
              <BenefitCard
                icon={<Shield size={24} style={{ color: C.primary }} />}
                title="Audience Quality Scores"
                description="Every creator is scored on audience authenticity, engagement quality, and growth health so you can invest with confidence."
              />
              <BenefitCard
                icon={<TrendingUp size={24} style={{ color: C.success }} />}
                title="Real-Time Analytics"
                description="See live performance data, engagement rates, and audience demographics before you reach out."
              />
              <BenefitCard
                icon={<Send size={24} style={{ color: C.purple }} />}
                title="Built-in Proposals"
                description="Send proposals, negotiate terms, and manage deliverables directly within the platform."
              />
            </div>
          </section>

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
        </>
      ) : (
        /* Search Results View */
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "24px 24px 80px",
          }}
        >
          {/* Back button + title */}
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: C.textSecondary,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: font,
                marginBottom: 12,
                padding: 0,
              }}
            >
              <ChevronLeft size={16} />
              Back to Marketplace
            </button>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: C.text,
                margin: 0,
                letterSpacing: -0.5,
              }}
            >
              {selectedCategory ? `${selectedCategory} Creators` : "Search Results"}
            </h1>
          </div>

          {/* Filter bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* Simplified search */}
            <div style={{ display: "flex", gap: 8, flex: 1, maxWidth: 400 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textSecondary,
                  }}
                />
                <input
                  type="text"
                  placeholder="Refine search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  style={{
                    width: "100%",
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "10px 12px 10px 34px",
                    fontSize: 13,
                    color: C.text,
                    outline: "none",
                    fontFamily: font,
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                style={{
                  padding: "0 16px",
                  background: C.red,
                  border: "none",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  fontFamily: font,
                }}
              >
                Search
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  fontSize: 12,
                  color: C.textSecondary,
                  fontWeight: 600,
                }}
              >
                {isPending ? "Searching..." : `${total} result${total !== 1 ? "s" : ""}`}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ArrowUpDown size={13} style={{ color: C.textSecondary }} />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    handleSortChange(
                      e.target.value as "relevance" | "followers" | "engagement" | "aqs",
                    )
                  }
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    color: C.text,
                    fontFamily: font,
                    outline: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <option value="relevance">Relevance</option>
                  <option value="followers">Most Followers</option>
                  <option value="engagement">Highest Engagement</option>
                  <option value="aqs">Best AQS</option>
                </select>
              </div>
            </div>
          </div>

          {/* Creator grid */}
          {searchResults.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
                opacity: isPending ? 0.6 : 1,
                transition: "opacity 0.2s ease",
              }}
            >
              {searchResults.map((creator) => (
                <MarketplaceCreatorCard
                  key={creator.id}
                  creator={creator}
                  onView={() => setSelectedCreator(creator)}
                  onProfilePage={() => {
                    window.location.href = handleCreatorSlug(creator);
                  }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "48px 32px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.textSecondary,
                  margin: 0,
                }}
              >
                {isPending
                  ? "Searching for creators..."
                  : "No creators match your search. Try adjusting your criteria."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                marginTop: 28,
              }}
            >
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: page <= 1 ? `${C.textSecondary}50` : C.textSecondary,
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  fontFamily: font,
                }}
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: page >= totalPages ? `${C.textSecondary}50` : C.textSecondary,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  fontFamily: font,
                }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Creator Profile Slide-over */}
      {selectedCreator && (
        <CreatorProfile
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onSendProposal={handleSendProposal}
          onStartConversation={(creator) => {
            window.location.href = `/brand/messages?to=${creator.profile_id}`;
          }}
          isSlideOver
          contactLabel="Contact for Collaboration"
        />
      )}
    </div>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function StatBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${C.purple}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{value}</div>
        <div style={{ fontSize: 11, color: C.textSecondary, fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "28px 24px",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${C.purple}12`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: C.text,
          margin: "0 0 8px",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: C.textSecondary,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}

function MarketplaceCreatorCard({
  creator,
  onView,
  onProfilePage,
}: {
  creator: CreatorMarketplaceProfile;
  onView: () => void;
  onProfilePage: () => void;
}) {
  const name = creator.profile?.full_name ?? "Creator";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const niche = creator.profile?.niche ?? creator.categories[0] ?? "";
  const location = creator.profile?.location;
  const aqsColor = getAqsColor(creator.audience_quality_score);
  const minRate = creator.rate_card && Object.values(creator.rate_card).length > 0
    ? Math.min(...Object.values(creator.rate_card))
    : null;

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        transition: "transform 0.15s ease, border-color 0.15s ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.01)";
        e.currentTarget.style.borderColor = `${C.purple}30`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.borderColor = C.border;
      }}
      onClick={onView}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          {creator.profile?.avatar_url ? (
            <img
              src={creator.profile.avatar_url}
              alt={name}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.purple}40, ${C.red})`,
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
                background: C.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BadgeCheck size={14} style={{ color: "#5b9cf5" }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: C.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
            {niche}
          </div>
        </div>

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
          }}
        >
          {creator.audience_quality_score
            ? `${getAqsGrade(creator.audience_quality_score)} (${creator.audience_quality_score})`
            : "N/A"}
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 14,
          padding: "10px 14px",
          background: `${C.purple}08`,
          borderRadius: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: C.textSecondary,
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
              color: C.text,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Users size={13} style={{ color: `${C.purple}90` }} />
            {formatFollowers(creator.total_followers)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: C.textSecondary,
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
              color: C.text,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <TrendingUp size={13} style={{ color: C.success }} />
            {creator.avg_engagement_rate.toFixed(1)}%
          </div>
        </div>
        {minRate !== null && (
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: C.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 3,
              }}
            >
              Starting
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              ${minRate}
            </div>
          </div>
        )}
      </div>

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
              color: C.textSecondary,
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
                background: `${C.purple}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.textSecondary,
              }}
            >
              {getPlatformIcon(p)}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onProfilePage();
          }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 0",
            background: "transparent",
            border: `1px solid ${C.purple}25`,
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            color: C.textSecondary,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          <Eye size={13} />
          View Profile
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "9px 0",
            background: C.red,
            border: "none",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            color: "#ffffff",
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          <Send size={12} />
          Contact
        </button>
      </div>
    </div>
  );
}
