"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  Inbox,
  Clock,
  User,
  DollarSign,
  Package,
  ArrowRight,
  Plus,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { getProposals, getProposal } from "@/lib/actions/proposals";
import { ProposalView } from "@/components/proposals/ProposalView";
import { createClient } from "@/lib/supabase/client";
import type { Proposal } from "@/types";

type ProposalTab = "sent" | "received";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: {
    label: "Draft",
    color: "var(--color-ink-secondary)",
    bg: "rgba(75,156,211,0.08)",
  },
  pending: {
    label: "Pending",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
  },
  negotiating: {
    label: "Negotiating",
    color: "rgba(75,156,211,0.9)",
    bg: "rgba(75,156,211,0.12)",
  },
  accepted: {
    label: "Accepted",
    color: "#10B981",
    bg: "rgba(16,185,129,0.12)",
  },
  declined: {
    label: "Declined",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
  },
  expired: {
    label: "Expired",
    color: "var(--color-ink-muted)",
    bg: "rgba(75,156,211,0.06)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--color-ink-muted)",
    bg: "rgba(75,156,211,0.06)",
  },
};

function formatAmount(amount: number | null): string {
  if (!amount) return "$0";
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ProposalsPage() {
  const [activeTab, setActiveTab] = useState<ProposalTab>("sent");
  const [sentProposals, setSentProposals] = useState<Proposal[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<(Proposal & { events?: unknown[] }) | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Fetch proposals + user ID on mount
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    const [sentResult, receivedResult] = await Promise.all([
      getProposals({ type: "sent" }),
      getProposals({ type: "received" }),
    ]);
    setSentProposals(sentResult.data ?? []);
    setReceivedProposals(receivedResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProposals();
    // Get current user ID for ProposalView
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setCurrentUserId(data.user.id);
      });
  }, [fetchProposals]);

  const proposals = activeTab === "sent" ? sentProposals : receivedProposals;

  const handleViewProposal = useCallback(async (proposal: Proposal) => {
    setLoadingDetail(true);
    const result = await getProposal(proposal.id);
    if (result.data) {
      setSelectedProposal(result.data as Proposal & { events?: unknown[] });
    }
    setLoadingDetail(false);
  }, []);

  const handleDealCreated = useCallback((_dealId: string) => {
    fetchProposals();
  }, [fetchProposals]);

  // If viewing a single proposal
  if (selectedProposal && !loadingDetail) {
    return (
      <div
        style={{
          fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
        }}
      >
        <button
          onClick={() => setSelectedProposal(null)}
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
            color: "var(--color-ink-secondary)",
            cursor: "pointer",
            fontFamily: "inherit",
            marginBottom: 20,
          }}
        >
          <ChevronLeft size={14} />
          Back to Proposals
        </button>
        <ProposalView
          proposal={selectedProposal as Proposal & { events?: import("@/types").ProposalEvent[] }}
          currentUserId={currentUserId}
          onBack={() => { setSelectedProposal(null); fetchProposals(); }}
          onDealCreated={handleDealCreated}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            Proposals
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              marginTop: 6,
              fontWeight: 500,
            }}
          >
            Manage collaboration proposals with creators
          </p>
        </div>
        <button
          onClick={() => window.location.href = "/brand/discover"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 22px",
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
          <Plus size={16} />
          New Proposal
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 24,
          borderBottom: "1px solid rgba(75,156,211,0.12)",
        }}
      >
        {(
          [
            { key: "sent", label: "Sent", icon: Send, count: sentProposals.length },
            { key: "received", label: "Received", icon: Inbox, count: receivedProposals.length },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                background: "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--color-editorial-red)"
                  : "2px solid transparent",
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                color: isActive
                  ? "var(--color-editorial-red)"
                  : "var(--color-ink-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -1,
              }}
            >
              <Icon size={15} />
              {tab.label}
              <span
                style={{
                  background: isActive
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(75,156,211,0.08)",
                  color: isActive
                    ? "var(--color-editorial-red)"
                    : "var(--color-ink-secondary)",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 0",
            gap: 10,
          }}
        >
          <Loader2 size={20} style={{ color: "var(--color-ink-secondary)", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--color-ink-secondary)", fontWeight: 600 }}>
            Loading proposals...
          </span>
        </div>
      ) : proposals.length === 0 ? (
        /* Empty state */
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
            {activeTab === "sent" ? (
              <Send size={28} style={{ color: "rgba(75,156,211,0.7)" }} />
            ) : (
              <Inbox size={28} style={{ color: "rgba(75,156,211,0.7)" }} />
            )}
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 8px",
            }}
          >
            {activeTab === "sent"
              ? "No sent proposals"
              : "No received proposals"}
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
            {activeTab === "sent"
              ? "Start by discovering creators and sending them collaboration proposals."
              : "When creators send you proposals, they will appear here."}
          </p>
          {activeTab === "sent" && (
            <button
              onClick={() => window.location.href = "/brand/discover"}
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
              <Plus size={15} />
              Discover Creators
            </button>
          )}
        </div>
      ) : (
        /* Proposals list */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {proposals.map((proposal) => {
            const status = statusConfig[proposal.status] ?? statusConfig.draft;
            const otherParty = activeTab === "sent" ? proposal.receiver : proposal.sender;
            const name = otherParty?.full_name ?? otherParty?.company_name ?? "Unknown";
            const deliverableCount = Array.isArray(proposal.deliverables) ? proposal.deliverables.length : 0;

            return (
              <div
                key={proposal.id}
                onClick={() => handleViewProposal(proposal)}
                style={{
                  background: "var(--color-surface-card)",
                  border: "1px solid rgba(75,156,211,0.12)",
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  cursor: "pointer",
                  transition: "border-color 0.15s ease, transform 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(75,156,211,0.3)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(75,156,211,0.12)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, rgba(75,156,211,0.3), var(--color-editorial-red))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#ffffff",
                    flexShrink: 0,
                  }}
                >
                  {otherParty?.avatar_url ? (
                    <img
                      src={otherParty.avatar_url}
                      alt={name}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--color-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {proposal.title}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: status.bg,
                        fontSize: 9,
                        fontWeight: 700,
                        color: status.color,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 11,
                      color: "var(--color-ink-secondary)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <User size={11} />
                      {name}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <DollarSign size={11} />
                      {formatAmount(proposal.total_amount)}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Package size={11} />
                      {deliverableCount} deliverable{deliverableCount !== 1 ? "s" : ""}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={11} />
                      {formatDate(proposal.created_at)}
                    </span>
                  </div>
                </div>

                {/* Amount + Arrow */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#34D399",
                    }}
                  >
                    {formatAmount(proposal.total_amount)}
                  </span>
                  <ArrowRight
                    size={16}
                    style={{
                      color: "var(--color-ink-secondary)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Loading detail overlay */}
      {loadingDetail && (
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
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Loading proposal details...
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
