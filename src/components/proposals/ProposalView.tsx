"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRightLeft,
  Ban,
  Send,
  Edit3,
  Loader2,
  Calendar,
  DollarSign,
  Package,
  User,
  ArrowRight,
} from "lucide-react";
import type { Proposal, ProposalStatus, ProposalDeliverable, ProposalEvent, TrustScore } from "@/types";
import { TrustBadge } from "@/components/deals/TrustBadge";
import { getTrustScore } from "@/lib/dal/trust";
import {
  updateProposalStatus,
  counterProposal,
  convertToDeal,
  type CounterOfferInput,
} from "@/lib/actions/proposals";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  draft: { label: "Draft", color: "#94A3B8", bg: "rgba(148,163,184,0.1)", icon: Edit3 },
  pending: { label: "Pending", color: "#FFB84D", bg: "rgba(255,184,77,0.1)", icon: Clock },
  negotiating: { label: "Negotiating", color: "var(--color-editorial-blue)", bg: "rgba(var(--accent-rgb),0.1)", icon: ArrowRightLeft },
  accepted: { label: "Accepted", color: "#34D399", bg: "rgba(52,211,153,0.1)", icon: CheckCircle2 },
  declined: { label: "Declined", color: "#EF4444", bg: "rgba(239,68,68,0.1)", icon: XCircle },
  expired: { label: "Expired", color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: Clock },
  cancelled: { label: "Cancelled", color: "#6B7280", bg: "rgba(107,114,128,0.1)", icon: Ban },
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface-card)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 14,
  padding: 24,
};

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

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProposalViewProps {
  proposal: Proposal & { events?: ProposalEvent[] };
  currentUserId: string;
  onBack?: () => void;
  onDealCreated?: (dealId: string) => void;
  /** Base path for deal links: "/dashboard/business" (creator) or "/brand/deals" (brand) */
  dealBasePath?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProposalView({
  proposal,
  currentUserId,
  onBack,
  onDealCreated,
  dealBasePath = "/dashboard/business?tab=deals",
}: ProposalViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [localStatus, setLocalStatus] = useState(proposal.status);

  // Counter offer form
  const [counterAmount, setCounterAmount] = useState(proposal.total_amount ?? 0);
  const [counterNotes, setCounterNotes] = useState("");

  const [otherTrustScore, setOtherTrustScore] = useState<TrustScore | null>(null);

  const isSender = proposal.sender_id === currentUserId;
  const isReceiver = proposal.receiver_id === currentUserId;

  const otherParty = isSender ? proposal.receiver : proposal.sender;
  const otherPartyId = isSender ? proposal.receiver_id : proposal.sender_id;
  const statusConfig = STATUS_CONFIG[localStatus];

  useEffect(() => {
    if (otherPartyId) {
      getTrustScore(otherPartyId).then(setOtherTrustScore);
    }
  }, [otherPartyId]);
  const StatusIcon = statusConfig.icon;

  const deliverables = (proposal.deliverables ?? []) as ProposalDeliverable[];
  const events = (proposal.events ?? []) as ProposalEvent[];

  // ─── Actions ────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: ProposalStatus) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await updateProposalStatus(proposal.id, newStatus);

    if (result.error) {
      setError(result.error);
    } else {
      setLocalStatus(newStatus);
      setSuccess(`Proposal ${newStatus}.`);
    }
    setLoading(false);
  };

  const handleCounter = async () => {
    setLoading(true);
    setError(null);

    const counterOffer: CounterOfferInput = {
      total_amount: counterAmount,
      notes: counterNotes || undefined,
    };

    const result = await counterProposal(proposal.id, counterOffer);

    if (result.error) {
      setError(result.error);
    } else {
      setLocalStatus("negotiating");
      setShowCounter(false);
      setSuccess("Counter offer submitted.");
    }
    setLoading(false);
  };

  const handleConvertToDeal = async () => {
    setLoading(true);
    setError(null);

    const result = await convertToDeal(proposal.id);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Deal created successfully!");
      if (result.dealId && onDealCreated) {
        onDealCreated(result.dealId);
      }
    }
    setLoading(false);
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-ink-secondary)",
                fontSize: 12,
                cursor: "pointer",
                padding: 0,
                marginBottom: 8,
                fontFamily: "inherit",
              }}
            >
              &larr; Back to proposals
            </button>
          )}
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-ink, #E2E8F0)",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {proposal.title}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              fontSize: 12,
              color: "var(--color-ink-secondary)",
            }}
          >
            <User size={13} />
            {isSender ? "Sent to" : "Received from"}{" "}
            <span style={{ fontWeight: 600, color: "var(--color-ink, #E2E8F0)" }}>
              {otherParty?.company_name ?? otherParty?.full_name ?? "Unknown"}
            </span>
            <TrustBadge trustScore={otherTrustScore} size="sm" />
          </div>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: statusConfig.bg,
            borderRadius: 20,
            color: statusConfig.color,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <StatusIcon size={14} />
          {statusConfig.label}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10,
            color: "#EF4444",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.2)",
            borderRadius: 10,
            color: "#34D399",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {success}
        </div>
      )}

      {/* Description */}
      {proposal.description && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <p
            style={{
              fontSize: 14,
              color: "var(--color-ink, #E2E8F0)",
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            {proposal.description}
          </p>
        </div>
      )}

      {/* Dates & Payment Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <DollarSign size={14} color="#34D399" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase" }}>
              Total Value
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#34D399" }}>
            ${(proposal.total_amount ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
            {proposal.payment_type?.replace("_", " ")} - {proposal.currency}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Calendar size={14} color="var(--color-editorial-blue)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase" }}>
              Campaign Window
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--color-ink, #E2E8F0)", fontWeight: 600 }}>
            {proposal.start_date
              ? new Date(proposal.start_date).toLocaleDateString()
              : "TBD"}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
            {proposal.end_date
              ? `to ${new Date(proposal.end_date).toLocaleDateString()}`
              : "No end date"}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Package size={14} color="#FFB84D" />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase" }}>
              Deliverables
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink, #E2E8F0)" }}>
            {deliverables.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
            {deliverables.reduce((sum, d) => sum + (d.quantity ?? 1), 0)} total items
          </div>
        </div>
      </div>

      {/* Deliverables Table */}
      <div style={{ ...cardStyle, marginBottom: 16, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--color-ink-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Deliverables
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.06)" }}>
                {["Platform", "Content Type", "Qty", "Deadline", "Amount"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 16px",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--color-ink-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {deliverables.map((d, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom:
                      idx < deliverables.length - 1
                        ? "1px solid rgba(var(--accent-rgb),0.04)"
                        : "none",
                  }}
                >
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-ink, #E2E8F0)", fontWeight: 600 }}>
                    {d.platform}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-ink, #E2E8F0)" }}>
                    {d.content_type}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--color-ink, #E2E8F0)" }}>
                    {d.quantity}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--color-ink-secondary)" }}>
                    {d.deadline
                      ? new Date(d.deadline).toLocaleDateString()
                      : "--"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#34D399" }}>
                    {d.amount != null ? `$${d.amount.toLocaleString()}` : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Counter Offer Form (inline) */}
      {showCounter && (
        <div style={{ ...cardStyle, marginBottom: 16, border: "1px solid rgba(var(--accent-rgb),0.25)" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--color-editorial-blue)",
              marginBottom: 16,
            }}
          >
            Submit Counter Offer
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Counter Amount ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                style={inputStyle}
                value={counterAmount || ""}
                onChange={(e) =>
                  setCounterAmount(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input
                style={inputStyle}
                placeholder="Reason or additional terms..."
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setShowCounter(false)}
              style={{
                padding: "8px 18px",
                background: "var(--color-surface-card)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                borderRadius: 8,
                color: "var(--color-ink-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || counterAmount <= 0}
              onClick={handleCounter}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                background: "var(--color-editorial-blue)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Submit Counter
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-ink-secondary)",
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Timeline
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {events.map((event, idx) => (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  gap: 14,
                  position: "relative",
                  paddingBottom: idx < events.length - 1 ? 16 : 0,
                }}
              >
                {/* Line */}
                {idx < events.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 9,
                      top: 20,
                      bottom: 0,
                      width: 1,
                      background: "rgba(var(--accent-rgb),0.12)",
                    }}
                  />
                )}
                {/* Dot */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(var(--accent-rgb),0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--color-editorial-blue)",
                    }}
                  />
                </div>
                {/* Content */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink, #E2E8F0)" }}>
                    {formatEventType(event.event_type)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 2 }}>
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Disclaimer */}
      <div style={{
        padding: "12px 16px",
        background: "rgba(234,179,8,0.06)",
        border: "1px solid rgba(234,179,8,0.15)",
        borderRadius: 12,
        fontSize: 11,
        lineHeight: 1.5,
        color: "var(--color-ink-secondary)",
        marginBottom: 16,
      }}>
        <span style={{ fontWeight: 700, color: "rgba(234,179,8,0.85)" }}>Disclaimer: </span>
        Go Virall facilitates connections only. All payments and financial agreements are handled directly between brand and creator.
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {/* Receiver actions */}
        {isReceiver && ["pending", "negotiating"].includes(localStatus) && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange("declined")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10,
                color: "#EF4444",
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              <XCircle size={14} />
              Decline
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowCounter(!showCounter)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "rgba(var(--accent-rgb),0.1)",
                border: "1px solid rgba(var(--accent-rgb),0.2)",
                borderRadius: 10,
                color: "var(--color-editorial-blue)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <ArrowRightLeft size={14} />
              Counter
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange("accepted")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "#34D399",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              Accept
            </button>
          </>
        )}

        {/* Sender actions */}
        {isSender && ["pending", "negotiating"].includes(localStatus) && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusChange("cancelled")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "rgba(107,114,128,0.1)",
              border: "1px solid rgba(107,114,128,0.2)",
              borderRadius: 10,
              color: "#6B7280",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <Ban size={14} />
            Cancel Proposal
          </button>
        )}

        {/* Sender can send a draft */}
        {isSender && localStatus === "draft" && (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleStatusChange("pending")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "var(--color-editorial-blue)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <Send size={14} />
            Send Proposal
          </button>
        )}

        {/* Convert to Deal (when accepted) */}
        {localStatus === "accepted" && !proposal.deal_id && (
          <button
            type="button"
            disabled={loading}
            onClick={handleConvertToDeal}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "linear-gradient(135deg, var(--color-editorial-blue), #6D28D9)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRight size={14} />
            )}
            Convert to Deal
          </button>
        )}

        {/* Link to existing deal */}
        {proposal.deal_id && (
          <a
            href={`${dealBasePath}${dealBasePath.includes("?") ? "&" : "?"}deal=${proposal.deal_id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.2)",
              borderRadius: 10,
              color: "#34D399",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <MessageSquare size={14} />
            View Deal
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    created_draft: "Proposal drafted",
    sent: "Proposal sent",
    pending: "Proposal sent for review",
    accepted: "Proposal accepted",
    declined: "Proposal declined",
    cancelled: "Proposal cancelled",
    negotiating: "Moved to negotiation",
    counter_offer: "Counter offer submitted",
    converted_to_deal: "Converted to deal",
    expired: "Proposal expired",
  };
  return map[type] ?? type.replace(/_/g, " ");
}
