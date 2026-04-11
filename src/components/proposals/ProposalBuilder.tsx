"use client";

import { useState, useCallback, useMemo } from "react";
import {
  FileText,
  Package,
  DollarSign,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Calendar,
  Send,
  Save,
  Loader2,
  Sparkles,
  Zap,
  Users,
  TrendingUp,
  CheckSquare,
} from "lucide-react";
import { createProposal, type CreateProposalInput } from "@/lib/actions/proposals";
import type { ProposalDeliverable } from "@/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_PLATFORMS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Twitter",
  "LinkedIn",
  "Threads",
  "Pinterest",
  "Twitch",
  "Blog",
  "Newsletter",
  "Podcast",
  "Other",
];

const CONTENT_TYPES = [
  "Feed Post",
  "Reel / Short",
  "Story",
  "Video",
  "Live Stream",
  "Blog Post",
  "Newsletter Mention",
  "Podcast Mention",
  "Review",
  "Unboxing",
  "Tutorial",
  "Giveaway",
  "Other",
];

// ─── Smart Pricing Engine ───────────────────────────────────────────────────

const BASE_RATES: Record<string, Record<string, number>> = {
  instagram: {
    "Feed Post": 10, "Reel / Short": 15, Story: 5, Video: 15,
    "Live Stream": 12, Review: 12, Unboxing: 12, Tutorial: 14, Giveaway: 8, Other: 8,
  },
  tiktok: {
    "Feed Post": 8, "Reel / Short": 10, Story: 4, Video: 10,
    "Live Stream": 8, Review: 10, Unboxing: 10, Tutorial: 12, Giveaway: 6, Other: 6,
  },
  youtube: {
    "Feed Post": 12, "Reel / Short": 10, Story: 5, Video: 25,
    "Live Stream": 20, Review: 22, Unboxing: 20, Tutorial: 25, Giveaway: 10, Other: 15,
  },
  twitter: { "Feed Post": 3, "Reel / Short": 5, Story: 2, Video: 6, Other: 3 },
  linkedin: { "Feed Post": 6, Video: 10, "Newsletter Mention": 8, Other: 5 },
};

const DEFAULT_BASE_RATE = 8;

// Best default content type per platform
const DEFAULT_CONTENT_TYPE: Record<string, string> = {
  instagram: "Reel / Short",
  tiktok: "Video",
  youtube: "Video",
  twitter: "Feed Post",
  linkedin: "Feed Post",
  threads: "Feed Post",
  pinterest: "Feed Post",
  twitch: "Live Stream",
};

export interface CreatorPlatformInfo {
  platform: string;
  handle: string;
  followers_count: number;
  engagement_rate: number;
}

export interface CreatorPricingStats {
  total_followers: number;
  avg_engagement: number;
  aqs: number | null;
  earnings_estimate: {
    per_post_low: number | null;
    per_post_high: number | null;
    monthly_low: number | null;
    monthly_high: number | null;
  } | null;
}

function getEngagementMultiplier(rate: number): number {
  if (rate >= 5) return 2.0;
  if (rate >= 3) return 1.5;
  if (rate >= 1) return 1.0;
  return 0.7;
}

function getAqsMultiplier(aqs: number | null): number {
  if (!aqs) return 1.0;
  if (aqs >= 90) return 1.3;
  if (aqs >= 80) return 1.15;
  if (aqs >= 70) return 1.0;
  return 0.85;
}

function calculateSmartPrice(
  platform: string,
  contentType: string,
  platformInfo: CreatorPlatformInfo | undefined,
  stats: CreatorPricingStats | undefined,
): { low: number; high: number; recommended: number } | null {
  if (!stats && !platformInfo) return null;
  const followers = platformInfo?.followers_count ?? stats?.total_followers ?? 0;
  if (followers === 0) return null;

  const followersK = followers / 1000;
  const platformKey = platform.toLowerCase();
  const baseRate =
    BASE_RATES[platformKey]?.[contentType] ??
    BASE_RATES[platformKey]?.Other ??
    DEFAULT_BASE_RATE;

  const engagement = platformInfo?.engagement_rate ?? stats?.avg_engagement ?? 1;
  const engMult = getEngagementMultiplier(engagement);
  const aqsMult = getAqsMultiplier(stats?.aqs ?? null);

  // Use diminishing-returns formula: followersK^0.7 instead of linear
  // This gives realistic pricing across nano ($50) to mega ($20K+) creators
  const scaledFollowers = Math.pow(followersK, 0.7);
  const rawPrice = scaledFollowers * baseRate * engMult * aqsMult;
  const recommended = Math.max(50, Math.round(rawPrice / 10) * 10);
  const low = Math.round(recommended * 0.7);
  const high = Math.round(recommended * 1.4);

  return { low, high, recommended };
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const PAYMENT_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "per_deliverable", label: "Per Deliverable" },
  { value: "revenue_share", label: "Revenue Share" },
  { value: "product_only", label: "Product Only" },
] as const;

const STEPS = [
  { label: "Accounts", icon: CheckSquare },
  { label: "Basic Info", icon: FileText },
  { label: "Deliverables", icon: Package },
  { label: "Payment", icon: DollarSign },
  { label: "Review", icon: CheckCircle2 },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--color-surface-inset)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 10,
  color: "var(--color-ink, #E2E8F0)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-ink-secondary)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface-card)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 14,
  padding: 24,
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProposalBuilderProps {
  receiverId: string;
  receiverName: string;
  proposalType: "brand_to_creator" | "creator_to_brand";
  onSuccess?: (proposalId: string) => void;
  onCancel?: () => void;
  creatorPlatforms?: CreatorPlatformInfo[];
  creatorStats?: CreatorPricingStats;
}

interface DeliverableForm {
  platform: string;
  content_type: string;
  quantity: number;
  deadline: string;
  amount: number;
  description: string;
}

const emptyDeliverable: DeliverableForm = {
  platform: "Instagram",
  content_type: "Feed Post",
  quantity: 1,
  deadline: "",
  amount: 0,
  description: "",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function ProposalBuilder({
  receiverId,
  receiverName,
  proposalType,
  onSuccess,
  onCancel,
  creatorPlatforms,
  creatorStats,
}: ProposalBuilderProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0: Platform/Account selection
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());

  // Map platform name → info for pricing lookups
  const platformInfoMap = useMemo(() => {
    const map = new Map<string, CreatorPlatformInfo>();
    if (creatorPlatforms) {
      for (const p of creatorPlatforms) {
        map.set(p.platform.toLowerCase(), p);
        const cap = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
        map.set(cap, p);
      }
    }
    return map;
  }, [creatorPlatforms]);

  const hasSmartPricing = !!(creatorPlatforms && creatorPlatforms.length > 0);

  // Smart pricing: compute total suggested amount for selected platforms
  const smartPricingSummary = useMemo(() => {
    if (!hasSmartPricing || selectedPlatforms.size === 0) return null;

    let totalLow = 0;
    let totalHigh = 0;
    let totalRecommended = 0;
    const perPlatform: { platform: string; contentType: string; low: number; high: number; recommended: number; followers: number }[] = [];

    for (const platformKey of selectedPlatforms) {
      const info = platformInfoMap.get(platformKey) ?? platformInfoMap.get(platformKey.toLowerCase());
      const contentType = DEFAULT_CONTENT_TYPE[platformKey.toLowerCase()] ?? "Feed Post";
      const price = calculateSmartPrice(platformKey, contentType, info, creatorStats);

      if (price) {
        totalLow += price.low;
        totalHigh += price.high;
        totalRecommended += price.recommended;
        perPlatform.push({
          platform: platformKey,
          contentType,
          ...price,
          followers: info?.followers_count ?? 0,
        });
      }
    }

    return { totalLow, totalHigh, totalRecommended, perPlatform };
  }, [hasSmartPricing, selectedPlatforms, platformInfoMap, creatorStats]);

  // Step 1: Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Step 2: Deliverables
  const [deliverables, setDeliverables] = useState<DeliverableForm[]>([]);
  const [deliverablesInitialized, setDeliverablesInitialized] = useState(false);

  // Step 3: Payment
  const [paymentType, setPaymentType] = useState<CreateProposalInput["payment_type"]>("fixed");
  const [currency, setCurrency] = useState("USD");
  const [manualTotal, setManualTotal] = useState<number | null>(null);

  const autoTotal = deliverables.reduce((sum, d) => sum + d.amount * d.quantity, 0);
  const totalAmount = manualTotal ?? autoTotal;

  // Available platforms for deliverable dropdowns (only selected ones)
  const availablePlatforms = useMemo(() => {
    if (selectedPlatforms.size > 0) {
      return [...selectedPlatforms, "Other"];
    }
    return ALL_PLATFORMS;
  }, [selectedPlatforms]);

  // Smart pricing helper
  const getRecommendation = useCallback(
    (platform: string, contentType: string) => {
      return calculateSmartPrice(
        platform,
        contentType,
        platformInfoMap.get(platform) ?? platformInfoMap.get(platform.toLowerCase()),
        creatorStats,
      );
    },
    [platformInfoMap, creatorStats],
  );

  // Initialize deliverables from selected platforms when moving to step 2
  const initializeDeliverables = useCallback(() => {
    if (deliverablesInitialized) return;

    if (selectedPlatforms.size > 0) {
      const newDeliverables: DeliverableForm[] = [];
      for (const platform of selectedPlatforms) {
        const contentType = DEFAULT_CONTENT_TYPE[platform.toLowerCase()] ?? "Feed Post";
        const info = platformInfoMap.get(platform) ?? platformInfoMap.get(platform.toLowerCase());
        const price = calculateSmartPrice(platform, contentType, info, creatorStats);

        newDeliverables.push({
          platform,
          content_type: contentType,
          quantity: 1,
          deadline: "",
          amount: price?.recommended ?? 0,
          description: "",
        });
      }
      setDeliverables(newDeliverables);
    } else {
      setDeliverables([{ ...emptyDeliverable }]);
    }
    setDeliverablesInitialized(true);
  }, [selectedPlatforms, platformInfoMap, creatorStats, deliverablesInitialized]);

  // Toggle platform selection
  const togglePlatform = useCallback((platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
    // Reset deliverables so they get re-generated
    setDeliverablesInitialized(false);
  }, []);

  const selectAllPlatforms = useCallback(() => {
    if (!creatorPlatforms) return;
    const all = new Set(
      creatorPlatforms.map((p) => p.platform.charAt(0).toUpperCase() + p.platform.slice(1)),
    );
    setSelectedPlatforms(all);
    setDeliverablesInitialized(false);
  }, [creatorPlatforms]);

  const deselectAllPlatforms = useCallback(() => {
    setSelectedPlatforms(new Set());
    setDeliverablesInitialized(false);
  }, []);

  // ─── Deliverable Handlers ──────────────────────────────────────────────

  const addDeliverable = useCallback(() => {
    const firstPlatform = availablePlatforms[0] ?? "Instagram";
    setDeliverables((prev) => [...prev, { ...emptyDeliverable, platform: firstPlatform }]);
  }, [availablePlatforms]);

  const removeDeliverable = useCallback((index: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateDeliverable = useCallback(
    (index: number, field: keyof DeliverableForm, value: string | number) => {
      setDeliverables((prev) =>
        prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
      );
    },
    [],
  );

  // ─── Validation ────────────────────────────────────────────────────────

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (hasSmartPricing && selectedPlatforms.size === 0) return "Select at least one account.";
    }
    if (s === 1) {
      if (!title.trim()) return "Title is required.";
    }
    if (s === 2) {
      if (deliverables.length === 0) return "Add at least one deliverable.";
      for (const d of deliverables) {
        if (!d.platform) return "Select a platform for all deliverables.";
        if (!d.content_type) return "Select a content type for all deliverables.";
        if (d.quantity < 1) return "Quantity must be at least 1.";
      }
    }
    return null;
  };

  const canAdvance = validateStep(step) === null;

  // ─── Submit ────────────────────────────────────────────────────────────

  const submit = async (asDraft: boolean) => {
    setLoading(true);
    setError(null);

    const proposalDeliverables: ProposalDeliverable[] = deliverables.map((d) => ({
      platform: d.platform.toLowerCase(),
      content_type: d.content_type,
      quantity: d.quantity,
      deadline: d.deadline || null,
      amount: d.amount,
      description: d.description || null,
    }));

    if (!receiverId) {
      setError("Please select a recipient.");
      setLoading(false);
      return;
    }

    const payload: CreateProposalInput = {
      receiver_id: receiverId,
      title,
      description: description || undefined,
      proposal_type: proposalType,
      deliverables: proposalDeliverables,
      total_amount: totalAmount,
      currency,
      payment_type: paymentType,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status: asDraft ? "draft" : "pending",
    };

    const result = await createProposal(payload);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    if (result.proposalId && onSuccess) {
      onSuccess(result.proposalId);
    }
  };

  // ─── Step Navigation ──────────────────────────────────────────────────

  const goNext = useCallback(() => {
    // When moving from step 0 (accounts) to step 1, nothing special
    // When moving from step 1 to step 2, initialize deliverables
    if (step === 1) {
      initializeDeliverables();
    }
    setStep((s) => s + 1);
  }, [step, initializeDeliverables]);

  // ─── Step Renderer ─────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Step 0: Account/Platform Selection ──────────────────────────
      case 0:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)", marginBottom: 4 }}>
                  Select Creator Accounts
                </div>
                <div style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                  Choose which social media accounts to include in the proposal
                </div>
              </div>
              {creatorPlatforms && creatorPlatforms.length > 1 && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={selectAllPlatforms}
                    style={{
                      padding: "5px 12px", background: "rgba(var(--accent-rgb),0.1)",
                      border: "1px solid rgba(var(--accent-rgb),0.2)", borderRadius: 6,
                      fontSize: 11, fontWeight: 600, color: "var(--color-editorial-blue)",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllPlatforms}
                    style={{
                      padding: "5px 12px", background: "var(--color-surface-inset)",
                      border: "1px solid rgba(var(--accent-rgb),0.12)", borderRadius: 6,
                      fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)",
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Account cards */}
            {creatorPlatforms && creatorPlatforms.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {creatorPlatforms
                  .sort((a, b) => b.followers_count - a.followers_count)
                  .map((p) => {
                    const capPlatform = p.platform.charAt(0).toUpperCase() + p.platform.slice(1);
                    const isSelected = selectedPlatforms.has(capPlatform);
                    const defaultContent = DEFAULT_CONTENT_TYPE[p.platform.toLowerCase()] ?? "Feed Post";
                    const price = calculateSmartPrice(capPlatform, defaultContent, p, creatorStats);

                    return (
                      <button
                        key={p.platform}
                        type="button"
                        onClick={() => togglePlatform(capPlatform)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 18px",
                          background: isSelected
                            ? "rgba(var(--accent-rgb),0.1)"
                            : "var(--color-surface-inset)",
                          border: isSelected
                            ? "2px solid rgba(var(--accent-rgb),0.5)"
                            : "2px solid rgba(var(--accent-rgb),0.1)",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                          width: "100%",
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: isSelected
                              ? "2px solid var(--color-editorial-blue)"
                              : "2px solid rgba(var(--accent-rgb),0.25)",
                            background: isSelected ? "var(--color-editorial-blue)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isSelected && <CheckCircle2 size={14} style={{ color: "#fff" }} />}
                        </div>

                        {/* Platform info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>
                              {capPlatform}
                            </span>
                            {p.handle && (
                              <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                                @{p.handle}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-ink-secondary)" }}>
                              <Users size={12} style={{ color: "var(--color-editorial-blue)" }} />
                              <strong style={{ color: "var(--color-ink)", fontWeight: 700 }}>
                                {formatFollowers(p.followers_count)}
                              </strong>
                              followers
                            </span>
                            {p.engagement_rate > 0 && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-ink-secondary)" }}>
                                <TrendingUp size={12} style={{ color: "#10B981" }} />
                                <strong style={{ color: "var(--color-ink)", fontWeight: 700 }}>
                                  {p.engagement_rate.toFixed(1)}%
                                </strong>
                                engagement
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Smart price estimate */}
                        {price && (
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Per post (one-time)
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "#34D399" }}>
                              ${price.recommended.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 9, color: "var(--color-ink-muted)" }}>
                              Range: ${price.low.toLocaleString()} – ${price.high.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div
                style={{
                  padding: "24px 16px",
                  background: "var(--color-surface-inset)",
                  borderRadius: 10,
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--color-ink-secondary)",
                }}
              >
                No social accounts found for this creator.
                You can still create a proposal with custom platforms.
              </div>
            )}

            {/* Summary bar */}
            {smartPricingSummary && selectedPlatforms.size > 0 && (
              <div
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, rgba(52,211,153,0.08), rgba(var(--accent-rgb),0.08))",
                  border: "1px solid rgba(52,211,153,0.2)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={18} style={{ color: "#34D399" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#34D399" }}>
                      Smart Estimate (1 post per account)
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-ink-secondary)" }}>
                      {selectedPlatforms.size} account{selectedPlatforms.size !== 1 ? "s" : ""} selected • one-time cost
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#34D399" }}>
                    ${smartPricingSummary.totalRecommended.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-ink-muted)" }}>
                    Range: ${smartPricingSummary.totalLow.toLocaleString()} – ${smartPricingSummary.totalHigh.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      // ── Step 1: Basic Info ──────────────────────────────────────────
      case 1:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={labelStyle}>Proposal Title *</label>
              <input
                style={inputStyle}
                placeholder="e.g. Summer Product Launch Campaign"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                placeholder="Describe the collaboration, goals, expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Campaign Window <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--color-ink-muted)", marginBottom: 10 }}>
                The time frame for the collaboration. Content must be delivered within this window.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Campaign Start</label>
                  <div style={{ position: "relative" }}>
                    <input type="date" style={inputStyle} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <Calendar size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-secondary)", pointerEvents: "none" }} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Campaign End</label>
                  <div style={{ position: "relative" }}>
                    <input type="date" style={inputStyle} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    <Calendar size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-ink-secondary)", pointerEvents: "none" }} />
                  </div>
                </div>
              </div>
            </div>
            {/* Sending to */}
            <div style={{ padding: "12px 16px", background: "rgba(var(--accent-rgb),0.06)", borderRadius: 10, border: "1px solid rgba(var(--accent-rgb),0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>Sending to:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink, #E2E8F0)" }}>{receiverName}</span>
              </div>
              {selectedPlatforms.size > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {[...selectedPlatforms].map((p) => {
                    const info = platformInfoMap.get(p) ?? platformInfoMap.get(p.toLowerCase());
                    return (
                      <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(var(--accent-rgb),0.1)", color: "var(--color-editorial-blue)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}>
                        {p} {info?.handle ? `@${info.handle}` : ""} • {formatFollowers(info?.followers_count ?? 0)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      // ── Step 2: Deliverables ────────────────────────────────────────
      case 2:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {deliverables.map((d, idx) => (
              <div key={idx} style={{ ...cardStyle, padding: 16, position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-editorial-blue)" }}>
                    Deliverable {idx + 1}
                  </span>
                  {deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDeliverable(idx)}
                      style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Platform</label>
                    <select style={inputStyle} value={d.platform} onChange={(e) => updateDeliverable(idx, "platform", e.target.value)}>
                      {availablePlatforms.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Content Type</label>
                    <select style={inputStyle} value={d.content_type} onChange={(e) => updateDeliverable(idx, "content_type", e.target.value)}>
                      {CONTENT_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Quantity</label>
                    <input type="number" min={1} style={inputStyle} value={d.quantity} onChange={(e) => updateDeliverable(idx, "quantity", parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Deadline</label>
                    <input type="date" style={inputStyle} value={d.deadline} onChange={(e) => updateDeliverable(idx, "deadline", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Amount ($)</label>
                    <input type="number" min={0} step={0.01} style={inputStyle} value={d.amount || ""} placeholder="0.00" onChange={(e) => updateDeliverable(idx, "amount", parseFloat(e.target.value) || 0)} />
                    {hasSmartPricing && (() => {
                      const rec = getRecommendation(d.platform, d.content_type);
                      if (!rec) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => updateDeliverable(idx, "amount", rec.recommended)}
                          style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, padding: "3px 8px", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "#34D399", cursor: "pointer", fontFamily: "inherit" }}
                          title="Click to apply recommended price"
                        >
                          <Zap size={10} />
                          Suggested: ${rec.low.toLocaleString()} – ${rec.high.toLocaleString()} (Apply ${rec.recommended.toLocaleString()})
                        </button>
                      );
                    })()}
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <input style={inputStyle} placeholder="Brief description..." value={d.description} onChange={(e) => updateDeliverable(idx, "description", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addDeliverable}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", background: "rgba(var(--accent-rgb),0.08)", border: "1px dashed rgba(var(--accent-rgb),0.25)", borderRadius: 10, color: "var(--color-editorial-blue)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Plus size={14} /> Add Deliverable
            </button>
          </div>
        );

      // ── Step 3: Payment ─────────────────────────────────────────────
      case 3:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Auto-fill button */}
            {hasSmartPricing && deliverables.some((d) => d.amount === 0) && (
              <button
                type="button"
                onClick={() => {
                  setDeliverables((prev) =>
                    prev.map((d) => {
                      if (d.amount > 0) return d;
                      const rec = getRecommendation(d.platform, d.content_type);
                      return rec ? { ...d, amount: rec.recommended } : d;
                    }),
                  );
                }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", background: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(var(--accent-rgb),0.15))", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 10, color: "#34D399", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                <Sparkles size={15} /> Auto-Fill Smart Prices
              </button>
            )}

            <div>
              <label style={labelStyle}>Payment Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {PAYMENT_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPaymentType(pt.value)}
                    style={{
                      padding: "12px 16px",
                      background: paymentType === pt.value ? "rgba(var(--accent-rgb),0.15)" : "var(--color-surface-inset)",
                      border: `1px solid ${paymentType === pt.value ? "rgba(var(--accent-rgb),0.4)" : "rgba(var(--accent-rgb),0.12)"}`,
                      borderRadius: 10,
                      color: paymentType === pt.value ? "var(--color-editorial-blue)" : "var(--color-ink-secondary)",
                      fontSize: 13,
                      fontWeight: paymentType === pt.value ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Total Amount (auto-calculated: ${autoTotal.toLocaleString()})</label>
                <input
                  type="number" min={0} step={0.01} style={inputStyle}
                  value={manualTotal ?? (autoTotal || "")}
                  placeholder={autoTotal.toFixed(2)}
                  onChange={(e) => { const val = parseFloat(e.target.value); setManualTotal(isNaN(val) ? null : val); }}
                />
                <span style={{ fontSize: 10, color: "var(--color-ink-secondary)", marginTop: 4, display: "block" }}>
                  Leave blank to auto-calculate from deliverables
                </span>
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div style={{ ...cardStyle, padding: 16, background: "rgba(var(--accent-rgb),0.06)", border: "1px solid rgba(var(--accent-rgb),0.1)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Payment Summary
              </div>
              {deliverables.map((d, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: idx < deliverables.length - 1 ? "1px solid rgba(var(--accent-rgb),0.06)" : "none" }}>
                  <span style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                    {d.quantity}x {d.content_type} on {d.platform}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)" }}>
                    ${(d.amount * d.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(var(--accent-rgb),0.12)" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink)" }}>
                  Total ({deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""})
                </span>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#34D399" }}>
                  {currency === "USD" ? "$" : currency}{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--color-ink-muted)", textAlign: "center" }}>
              This is the proposed amount for the collaboration. Final terms are agreed upon directly between both parties.
            </div>
          </div>
        );

      // ── Step 4: Review ──────────────────────────────────────────────
      case 4:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Title & Description */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink, #E2E8F0)", margin: 0, marginBottom: 8 }}>{title}</h3>
              {description && <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", margin: 0, lineHeight: 1.6 }}>{description}</p>}
              {(startDate || endDate) && (
                <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "var(--color-ink-secondary)" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-ink-muted)" }}>Campaign Window:</span>
                  {startDate && <span>{new Date(startDate).toLocaleDateString()}</span>}
                  {startDate && endDate && <span>–</span>}
                  {endDate && <span>{new Date(endDate).toLocaleDateString()}</span>}
                </div>
              )}
              {/* Selected platforms */}
              {selectedPlatforms.size > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {[...selectedPlatforms].map((p) => (
                    <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "rgba(var(--accent-rgb),0.1)", color: "var(--color-editorial-blue)", border: "1px solid rgba(var(--accent-rgb),0.15)" }}>
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Deliverables */}
            <div style={cardStyle}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Deliverables ({deliverables.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deliverables.map((d, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--color-surface-inset)", borderRadius: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink, #E2E8F0)" }}>{d.quantity}x {d.content_type}</span>
                      <span style={{ fontSize: 12, color: "var(--color-ink-secondary)", marginLeft: 8 }}>on {d.platform}</span>
                      {d.deadline && <span style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginLeft: 8 }}>by {new Date(d.deadline).toLocaleDateString()}</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#34D399" }}>
                      ${(d.amount * d.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div style={{ ...cardStyle, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>Total Amount</div>
                  <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 2 }}>
                    {PAYMENT_TYPES.find((p) => p.value === paymentType)?.label} - {currency}
                  </div>
                </div>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#34D399" }}>
                  ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Payment Disclaimer */}
            <div style={{
              padding: "14px 18px",
              background: "rgba(234,179,8,0.06)",
              border: "1px solid rgba(234,179,8,0.15)",
              borderRadius: 12,
              fontSize: 11,
              lineHeight: 1.6,
              color: "var(--color-ink-secondary)",
            }}>
              <div style={{ fontWeight: 700, color: "rgba(234,179,8,0.85)", marginBottom: 4, fontSize: 12 }}>
                Payment Disclaimer
              </div>
              Go Virall facilitates connections between brands and creators. All payments, negotiations, and financial agreements are handled directly between the brand and creator. Go Virall is not responsible for, and does not process, any payments related to proposals or collaborations.
            </div>
          </div>
        );
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Step Progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 32 }}>
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = idx === step;
          const isCompleted = idx < step;
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 10, background: isActive ? "rgba(var(--accent-rgb),0.12)" : "transparent", cursor: isCompleted ? "pointer" : "default" }}
                onClick={() => isCompleted && setStep(idx)}
              >
                <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? "var(--color-editorial-blue)" : isCompleted ? "rgba(52,211,153,0.2)" : "var(--color-surface-inset)", color: isActive ? "#fff" : isCompleted ? "#34D399" : "var(--color-ink-secondary)" }}>
                  {isCompleted ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                </div>
                <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? "var(--color-editorial-blue)" : isCompleted ? "#34D399" : "var(--color-ink-secondary)" }}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{ width: 16, height: 1, background: isCompleted ? "#34D399" : "rgba(var(--accent-rgb),0.12)" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div style={{ ...cardStyle, marginBottom: 20 }}>{renderStep()}</div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#EF4444", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--color-surface-card)", border: "1px solid rgba(var(--accent-rgb),0.12)", borderRadius: 10, color: "var(--color-ink-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {step === 0 && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{ padding: "10px 20px", background: "var(--color-surface-card)", border: "1px solid rgba(var(--accent-rgb),0.12)", borderRadius: 10, color: "var(--color-ink-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              Cancel
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {step === 4 && (
            <button
              type="button"
              disabled={loading}
              onClick={() => submit(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--color-surface-card)", border: "1px solid rgba(var(--accent-rgb),0.12)", borderRadius: 10, color: "var(--color-ink-secondary)", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save as Draft
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={goNext}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", background: canAdvance ? "var(--color-editorial-blue)" : "rgba(var(--accent-rgb),0.2)", border: "none", borderRadius: 10, color: canAdvance ? "#fff" : "var(--color-ink-secondary)", fontSize: 13, fontWeight: 700, cursor: canAdvance ? "pointer" : "not-allowed", fontFamily: "inherit" }}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => submit(false)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 24px", background: loading ? "rgba(var(--accent-rgb),0.2)" : "var(--color-editorial-blue)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send Proposal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
