"use client";

import { useState, useCallback } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  MapPin,
  DollarSign,
  Users,
  TrendingUp,
  Shield,
  Film,
  Tag,
} from "lucide-react";

export interface CreatorFilters {
  query: string;
  niches: string[];
  platforms: string[];
  followerMin: number;
  followerMax: number;
  engagementMin: number;
  engagementMax: number;
  aqsMin: number;
  location: string;
  budgetMin: number;
  budgetMax: number;
  contentTypes: string[];
}

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
  "Photography",
  "Sports",
  "Health",
  "Business",
];

const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
  "threads",
  "pinterest",
  "twitch",
];

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

const CONTENT_TYPES = [
  "Photos",
  "Short Video",
  "Long Video",
  "Reels",
  "Stories",
  "Live Stream",
  "Blog Post",
  "Podcast",
  "Newsletter",
  "Thread",
];

const defaultFilters: CreatorFilters = {
  query: "",
  niches: [],
  platforms: [],
  followerMin: 0,
  followerMax: 0,
  engagementMin: 0,
  engagementMax: 0,
  aqsMin: 0,
  location: "",
  budgetMin: 0,
  budgetMax: 0,
  contentTypes: [],
};

interface CreatorSearchProps {
  onSearch: (filters: CreatorFilters) => void;
  isLoading?: boolean;
}

export default function CreatorSearch({ onSearch, isLoading }: CreatorSearchProps) {
  const [filters, setFilters] = useState<CreatorFilters>(defaultFilters);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    niche: true,
    platform: true,
    followers: false,
    engagement: false,
    location: false,
    budget: false,
    content: false,
    aqs: false,
  });

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleNiche = useCallback((niche: string) => {
    setFilters((prev) => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter((n) => n !== niche)
        : [...prev.niches, niche],
    }));
  }, []);

  const togglePlatform = useCallback((platform: string) => {
    setFilters((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }, []);

  const toggleContentType = useCallback((ct: string) => {
    setFilters((prev) => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(ct)
        ? prev.contentTypes.filter((c) => c !== ct)
        : [...prev.contentTypes, ct],
    }));
  }, []);

  const handleApply = useCallback(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  const handleClear = useCallback(() => {
    setFilters(defaultFilters);
    onSearch(defaultFilters);
  }, [onSearch]);

  const hasActiveFilters =
    filters.query ||
    filters.niches.length > 0 ||
    filters.platforms.length > 0 ||
    filters.followerMin > 0 ||
    filters.followerMax > 0 ||
    filters.engagementMin > 0 ||
    filters.engagementMax > 0 ||
    filters.aqsMin > 0 ||
    filters.location ||
    filters.budgetMin > 0 ||
    filters.budgetMax > 0 ||
    filters.contentTypes.length > 0;

  const activeCount = [
    filters.niches.length > 0,
    filters.platforms.length > 0,
    filters.followerMin > 0 || filters.followerMax > 0,
    filters.engagementMin > 0 || filters.engagementMax > 0,
    filters.aqsMin > 0,
    !!filters.location,
    filters.budgetMin > 0 || filters.budgetMax > 0,
    filters.contentTypes.length > 0,
  ].filter(Boolean).length;

  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid rgba(75,156,211,0.12)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid rgba(75,156,211,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SlidersHorizontal size={15} style={{ color: "var(--color-ink-secondary)" }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--color-ink)",
              letterSpacing: -0.2,
            }}
          >
            Filters
          </span>
          {activeCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                background: "var(--color-editorial-red)",
                borderRadius: 10,
                padding: "2px 7px",
                lineHeight: "14px",
              }}
            >
              {activeCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-ink-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "inherit",
            }}
          >
            <X size={12} />
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: "12px 18px" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-ink-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search creators..."
            value={filters.query}
            onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleApply();
            }}
            style={{
              width: "100%",
              background: "var(--color-surface-inset)",
              border: "1px solid rgba(75,156,211,0.1)",
              borderRadius: 8,
              padding: "9px 10px 9px 32px",
              fontSize: 12,
              color: "var(--color-ink)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Filter Sections */}
      <div style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
        {/* Niche */}
        <FilterSection
          title="Niche"
          icon={<Tag size={13} />}
          expanded={expandedSections.niche}
          onToggle={() => toggleSection("niche")}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {NICHES.map((niche) => (
              <button
                key={niche}
                onClick={() => toggleNiche(niche)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                  border: filters.niches.includes(niche)
                    ? "1px solid rgba(75,156,211,0.4)"
                    : "1px solid rgba(75,156,211,0.1)",
                  background: filters.niches.includes(niche)
                    ? "rgba(75,156,211,0.15)"
                    : "var(--color-surface-inset)",
                  color: filters.niches.includes(niche)
                    ? "rgba(75,156,211,0.9)"
                    : "var(--color-ink-secondary)",
                }}
              >
                {niche}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Platform */}
        <FilterSection
          title="Platform"
          icon={<Users size={13} />}
          expanded={expandedSections.platform}
          onToggle={() => toggleSection("platform")}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PLATFORMS.map((platform) => (
              <label
                key={platform}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--color-ink-secondary)",
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.platforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                  style={{
                    accentColor: "rgba(75,156,211,0.8)",
                    width: 14,
                    height: 14,
                  }}
                />
                {PLATFORM_LABELS[platform] ?? platform}
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Follower Range */}
        <FilterSection
          title="Followers"
          icon={<Users size={13} />}
          expanded={expandedSections.followers}
          onToggle={() => toggleSection("followers")}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <RangeInput
              placeholder="Min"
              value={filters.followerMin}
              onChange={(v) => setFilters((prev) => ({ ...prev, followerMin: v }))}
            />
            <span style={{ color: "var(--color-ink-muted)", fontSize: 12, alignSelf: "center" }}>
              to
            </span>
            <RangeInput
              placeholder="Max"
              value={filters.followerMax}
              onChange={(v) => setFilters((prev) => ({ ...prev, followerMax: v }))}
            />
          </div>
        </FilterSection>

        {/* Engagement Rate */}
        <FilterSection
          title="Engagement Rate"
          icon={<TrendingUp size={13} />}
          expanded={expandedSections.engagement}
          onToggle={() => toggleSection("engagement")}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <RangeInput
              placeholder="Min %"
              value={filters.engagementMin}
              onChange={(v) => setFilters((prev) => ({ ...prev, engagementMin: v }))}
              suffix="%"
            />
            <span style={{ color: "var(--color-ink-muted)", fontSize: 12, alignSelf: "center" }}>
              to
            </span>
            <RangeInput
              placeholder="Max %"
              value={filters.engagementMax}
              onChange={(v) => setFilters((prev) => ({ ...prev, engagementMax: v }))}
              suffix="%"
            />
          </div>
        </FilterSection>

        {/* AQS Minimum */}
        <FilterSection
          title="Audience Quality Score"
          icon={<Shield size={13} />}
          expanded={expandedSections.aqs}
          onToggle={() => toggleSection("aqs")}
        >
          <RangeInput
            placeholder="Minimum AQS (0-100)"
            value={filters.aqsMin}
            onChange={(v) => setFilters((prev) => ({ ...prev, aqsMin: v }))}
          />
        </FilterSection>

        {/* Location */}
        <FilterSection
          title="Location"
          icon={<MapPin size={13} />}
          expanded={expandedSections.location}
          onToggle={() => toggleSection("location")}
        >
          <input
            type="text"
            placeholder="e.g. Los Angeles, United States"
            value={filters.location}
            onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
            style={{
              width: "100%",
              background: "var(--color-surface-inset)",
              border: "1px solid rgba(75,156,211,0.1)",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 12,
              color: "var(--color-ink)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </FilterSection>

        {/* Budget Range */}
        <FilterSection
          title="Budget Range"
          icon={<DollarSign size={13} />}
          expanded={expandedSections.budget}
          onToggle={() => toggleSection("budget")}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <RangeInput
              placeholder="Min $"
              value={filters.budgetMin}
              onChange={(v) => setFilters((prev) => ({ ...prev, budgetMin: v }))}
              prefix="$"
            />
            <span style={{ color: "var(--color-ink-muted)", fontSize: 12, alignSelf: "center" }}>
              to
            </span>
            <RangeInput
              placeholder="Max $"
              value={filters.budgetMax}
              onChange={(v) => setFilters((prev) => ({ ...prev, budgetMax: v }))}
              prefix="$"
            />
          </div>
        </FilterSection>

        {/* Content Types */}
        <FilterSection
          title="Content Type"
          icon={<Film size={13} />}
          expanded={expandedSections.content}
          onToggle={() => toggleSection("content")}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct}
                onClick={() => toggleContentType(ct)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 16,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                  border: filters.contentTypes.includes(ct)
                    ? "1px solid rgba(75,156,211,0.4)"
                    : "1px solid rgba(75,156,211,0.1)",
                  background: filters.contentTypes.includes(ct)
                    ? "rgba(75,156,211,0.15)"
                    : "var(--color-surface-inset)",
                  color: filters.contentTypes.includes(ct)
                    ? "rgba(75,156,211,0.9)"
                    : "var(--color-ink-secondary)",
                }}
              >
                {ct}
              </button>
            ))}
          </div>
        </FilterSection>
      </div>

      {/* Action buttons */}
      <div
        style={{
          padding: "14px 18px",
          borderTop: "1px solid rgba(75,156,211,0.08)",
          display: "flex",
          gap: 8,
        }}
      >
        <button
          onClick={handleApply}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "10px 0",
            background: "var(--color-editorial-red)",
            border: "none",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: "#ffffff",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: isLoading ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Search size={13} />
          {isLoading ? "Searching..." : "Apply Filters"}
        </button>
      </div>
    </div>
  );
}

// ─── Filter Section Wrapper ───────────────────────────────────────────────────

function FilterSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ borderTop: "1px solid rgba(75,156,211,0.06)" }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ color: "var(--color-ink-muted)" }}>{icon}</span>
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-ink)",
          }}
        >
          {title}
        </span>
        {expanded ? (
          <ChevronUp size={14} style={{ color: "var(--color-ink-muted)" }} />
        ) : (
          <ChevronDown size={14} style={{ color: "var(--color-ink-muted)" }} />
        )}
      </button>
      {expanded && <div style={{ padding: "0 18px 14px" }}>{children}</div>}
    </div>
  );
}

// ─── Range Input ──────────────────────────────────────────────────────────────

function RangeInput({
  placeholder,
  value,
  onChange,
  prefix,
  suffix,
}: {
  placeholder: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      {prefix && (
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: "var(--color-ink-muted)",
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type="number"
        placeholder={placeholder}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: "100%",
          background: "var(--color-surface-inset)",
          border: "1px solid rgba(75,156,211,0.1)",
          borderRadius: 8,
          padding: `8px ${suffix ? "24px" : "10px"} 8px ${prefix ? "22px" : "10px"}`,
          fontSize: 12,
          color: "var(--color-ink)",
          outline: "none",
          fontFamily: "inherit",
        }}
      />
      {suffix && (
        <span
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: "var(--color-ink-muted)",
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
