"use client";

import { useState, useCallback, useTransition } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Sparkles, X } from "lucide-react";
import CreatorSearch from "@/components/brand/CreatorSearch";
import type { CreatorFilters } from "@/components/brand/CreatorSearch";
import CreatorCard from "@/components/brand/CreatorCard";
import CreatorProfile from "@/components/brand/CreatorProfile";
import { ProposalBuilder } from "@/components/proposals/ProposalBuilder";
import type { CreatorPlatformInfo, CreatorPricingStats } from "@/components/proposals/ProposalBuilder";
import { searchCreators, getEnrichedCreatorProfile } from "@/lib/actions/marketplace";
import type { CreatorMarketplaceProfile, EnrichedCreatorProfile } from "@/types";

interface DiscoverClientProps {
  initialCreators: CreatorMarketplaceProfile[];
  initialTotal: number;
}

// Helper to check if creator data is enriched
function isEnriched(
  c: CreatorMarketplaceProfile | EnrichedCreatorProfile,
): c is EnrichedCreatorProfile {
  return "social_profiles" in c && Array.isArray((c as EnrichedCreatorProfile).social_profiles);
}

export default function DiscoverClient({
  initialCreators,
  initialTotal,
}: DiscoverClientProps) {
  const [creators, setCreators] = useState<CreatorMarketplaceProfile[]>(initialCreators);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / 20));
  const [sortBy, setSortBy] = useState<"relevance" | "followers" | "engagement" | "aqs">(
    "relevance",
  );
  const [selectedCreator, setSelectedCreator] = useState<EnrichedCreatorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [hasSearched, setHasSearched] = useState(initialCreators.length > 0);
  const [currentFilters, setCurrentFilters] = useState<CreatorFilters | null>(null);
  const [isPending, startTransition] = useTransition();

  // Proposal builder state
  const [proposalTarget, setProposalTarget] = useState<{
    creator: CreatorMarketplaceProfile | EnrichedCreatorProfile;
    platforms: CreatorPlatformInfo[];
    stats: CreatorPricingStats;
  } | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(false);

  const performSearch = useCallback(
    (filters: CreatorFilters, pageNum: number, sort: string) => {
      startTransition(async () => {
        const result = await searchCreators({
          query: filters.query || undefined,
          niches: filters.niches.length > 0 ? filters.niches : undefined,
          platforms: filters.platforms.length > 0 ? filters.platforms : undefined,
          followerMin: filters.followerMin || undefined,
          followerMax: filters.followerMax || undefined,
          engagementMin: filters.engagementMin || undefined,
          engagementMax: filters.engagementMax || undefined,
          aqsMin: filters.aqsMin || undefined,
          location: filters.location || undefined,
          budgetMin: filters.budgetMin || undefined,
          budgetMax: filters.budgetMax || undefined,
          contentTypes: filters.contentTypes.length > 0 ? filters.contentTypes : undefined,
          sortBy: sort as "relevance" | "followers" | "engagement" | "aqs",
          page: pageNum,
          limit: 20,
        });

        if (result.success) {
          setCreators(result.success.creators);
          setTotal(result.success.total);
          setPage(result.success.page);
          setTotalPages(result.success.totalPages);
          setHasSearched(true);
        }
      });
    },
    [],
  );

  const handleSearch = useCallback(
    (filters: CreatorFilters) => {
      setCurrentFilters(filters);
      setPage(1);
      performSearch(filters, 1, sortBy);
    },
    [sortBy, performSearch],
  );

  const handleSortChange = useCallback(
    (newSort: "relevance" | "followers" | "engagement" | "aqs") => {
      setSortBy(newSort);
      if (currentFilters) {
        performSearch(currentFilters, 1, newSort);
      }
    },
    [currentFilters, performSearch],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages) return;
      setPage(newPage);
      if (currentFilters) {
        performSearch(currentFilters, newPage, sortBy);
      }
    },
    [currentFilters, sortBy, totalPages, performSearch],
  );

  const handleViewProfile = useCallback(async (creator: CreatorMarketplaceProfile) => {
    setLoadingProfile(true);
    const result = await getEnrichedCreatorProfile(creator.profile_id);
    if (result.success) {
      setSelectedCreator(result.success);
    } else {
      setSelectedCreator({
        ...creator,
        social_profiles: [],
        aqs_breakdown: null,
        growth_metrics: [],
        smo_score: null,
        earnings_estimate: null,
        top_content: [],
      });
    }
    setLoadingProfile(false);
  }, []);

  // Build proposal target from enriched data
  const buildProposalTarget = useCallback(
    (enriched: EnrichedCreatorProfile) => {
      const platforms: CreatorPlatformInfo[] = enriched.social_profiles.map((sp) => ({
        platform: sp.platform,
        handle: sp.handle ?? "",
        followers_count: sp.followers_count ?? 0,
        engagement_rate: sp.engagement_rate ?? 0,
      }));

      const stats: CreatorPricingStats = {
        total_followers: enriched.total_followers,
        avg_engagement: enriched.avg_engagement_rate,
        aqs: enriched.aqs_breakdown?.overall_score ?? enriched.audience_quality_score ?? null,
        earnings_estimate: enriched.earnings_estimate ?? null,
      };

      setProposalTarget({ creator: enriched, platforms, stats });
    },
    [],
  );

  const handleSendProposal = useCallback(
    async (creator: CreatorMarketplaceProfile) => {
      // If we already have enriched data from the profile modal, use it
      if (selectedCreator && selectedCreator.profile_id === creator.profile_id) {
        buildProposalTarget(selectedCreator);
        setSelectedCreator(null); // close profile modal
        return;
      }

      // Otherwise fetch enriched data
      setLoadingProposal(true);
      const result = await getEnrichedCreatorProfile(creator.profile_id);
      if (result.success) {
        buildProposalTarget(result.success);
      } else {
        // Fallback with basic info
        const platforms: CreatorPlatformInfo[] = creator.platforms_active.map((p) => ({
          platform: p,
          handle: "",
          followers_count: 0,
          engagement_rate: 0,
        }));
        setProposalTarget({
          creator,
          platforms,
          stats: {
            total_followers: creator.total_followers,
            avg_engagement: creator.avg_engagement_rate,
            aqs: creator.audience_quality_score,
            earnings_estimate: null,
          },
        });
      }
      setLoadingProposal(false);
    },
    [selectedCreator, buildProposalTarget],
  );

  const handleStartConversation = useCallback((creator: CreatorMarketplaceProfile) => {
    window.location.href = `/brand/messages?to=${creator.profile_id}`;
  }, []);

  const handleBrowseAll = useCallback(() => {
    const emptyFilters: CreatorFilters = {
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
    setCurrentFilters(emptyFilters);
    performSearch(emptyFilters, 1, sortBy);
  }, [sortBy, performSearch]);

  const handleProposalSuccess = useCallback((proposalId: string) => {
    setProposalTarget(null);
    // Navigate to the proposal detail
    window.location.href = `/brand/proposals`;
  }, []);

  return (
    <div
      style={{
        fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--color-ink)",
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Discover Creators
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-secondary)",
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          Find the perfect creators for your brand campaigns
        </p>
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Sidebar — Filters */}
        <div
          style={{
            position: "sticky",
            top: 20,
          }}
        >
          <CreatorSearch onSearch={handleSearch} isLoading={isPending} />
        </div>

        {/* Main content */}
        <div>
          {!hasSearched ? (
            /* Initial empty state */
            <div
              style={{
                background: "var(--color-surface-card)",
                border: "1px solid rgba(75,156,211,0.12)",
                borderRadius: 16,
                padding: "60px 40px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "rgba(75,156,211,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <Sparkles size={28} style={{ color: "rgba(75,156,211,0.7)" }} />
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  margin: "0 0 8px",
                }}
              >
                Discover Top Creators
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-secondary)",
                  maxWidth: 400,
                  margin: "0 auto 24px",
                  lineHeight: 1.6,
                }}
              >
                Use the filters on the left to search for creators by niche, platform,
                follower count, engagement rate, and more. Find the perfect match for your
                brand campaigns.
              </p>
              <button
                onClick={handleBrowseAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 24px",
                  background: "var(--color-editorial-red)",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#ffffff",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Search size={15} />
                Browse All Creators
              </button>
            </div>
          ) : (
            <>
              {/* Results header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-secondary)",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {isPending ? "Searching..." : `${total} creator${total !== 1 ? "s" : ""} found`}
                </p>

                {/* Sort dropdown */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ArrowUpDown size={13} style={{ color: "var(--color-ink-muted)" }} />
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      handleSortChange(
                        e.target.value as "relevance" | "followers" | "engagement" | "aqs",
                      )
                    }
                    style={{
                      background: "var(--color-surface-card)",
                      border: "1px solid rgba(75,156,211,0.12)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      color: "var(--color-ink)",
                      fontFamily: "inherit",
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

              {/* Creator grid */}
              {creators.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 16,
                    opacity: isPending ? 0.6 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {creators.map((creator) => (
                    <CreatorCard
                      key={creator.id}
                      creator={creator}
                      onViewProfile={handleViewProfile}
                      onSendProposal={handleSendProposal}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--color-surface-card)",
                    border: "1px solid rgba(75,156,211,0.12)",
                    borderRadius: 12,
                    padding: "48px 32px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--color-ink-secondary)",
                      margin: 0,
                    }}
                  >
                    No creators match your filters. Try adjusting your search criteria.
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
                    marginTop: 24,
                    paddingTop: 20,
                    borderTop: "1px solid rgba(75,156,211,0.08)",
                  }}
                >
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      background: "var(--color-surface-card)",
                      border: "1px solid rgba(75,156,211,0.12)",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color: page <= 1 ? "var(--color-ink-muted)" : "var(--color-ink-secondary)",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      opacity: page <= 1 ? 0.5 : 1,
                    }}
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            border:
                              pageNum === page
                                ? "1px solid rgba(75,156,211,0.3)"
                                : "1px solid rgba(75,156,211,0.08)",
                            background:
                              pageNum === page
                                ? "rgba(75,156,211,0.15)"
                                : "var(--color-surface-card)",
                            fontSize: 12,
                            fontWeight: pageNum === page ? 700 : 500,
                            color:
                              pageNum === page
                                ? "rgba(75,156,211,0.9)"
                                : "var(--color-ink-secondary)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      background: "var(--color-surface-card)",
                      border: "1px solid rgba(75,156,211,0.12)",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      color:
                        page >= totalPages
                          ? "var(--color-ink-muted)"
                          : "var(--color-ink-secondary)",
                      cursor: page >= totalPages ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      opacity: page >= totalPages ? 0.5 : 1,
                    }}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Loading overlay (profile) */}
      {loadingProfile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--color-surface-card)",
              borderRadius: 12,
              padding: "24px 32px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink-secondary)",
            }}
          >
            Loading creator profile...
          </div>
        </div>
      )}

      {/* Loading overlay (proposal) */}
      {loadingProposal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "var(--color-surface-card)",
              borderRadius: 12,
              padding: "24px 32px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-ink-secondary)",
            }}
          >
            Preparing smart proposal...
          </div>
        </div>
      )}

      {/* Creator Profile Modal */}
      {selectedCreator && !loadingProfile && (
        <CreatorProfile
          creator={selectedCreator}
          onClose={() => setSelectedCreator(null)}
          onSendProposal={handleSendProposal}
          onStartConversation={handleStartConversation}
          isSlideOver
        />
      )}

      {/* Proposal Builder Modal */}
      {proposalTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setProposalTarget(null);
          }}
        >
          <div
            style={{
              background: "#1a1a2e",
              borderRadius: 16,
              maxWidth: 760,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
              padding: "32px 28px",
              border: "1px solid rgba(75,156,211,0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setProposalTarget(null)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(75,156,211,0.08)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--color-ink-secondary)",
                zIndex: 1,
              }}
            >
              <X size={16} />
            </button>

            {/* Title */}
            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--color-ink)",
                  margin: 0,
                  letterSpacing: -0.3,
                }}
              >
                Send Proposal
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-ink-secondary)",
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                Create a collaboration proposal with smart pricing recommendations
              </p>
            </div>

            <ProposalBuilder
              receiverId={proposalTarget.creator.profile_id}
              receiverName={
                proposalTarget.creator.profile?.full_name ?? "Creator"
              }
              proposalType="brand_to_creator"
              creatorPlatforms={proposalTarget.platforms}
              creatorStats={proposalTarget.stats}
              onSuccess={handleProposalSuccess}
              onCancel={() => setProposalTarget(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
