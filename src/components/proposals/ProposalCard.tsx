"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Ban,
  Edit3,
  Package,
  ChevronRight,
} from "lucide-react";
import type { Proposal, ProposalStatus, ProposalDeliverable } from "@/types";

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

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProposalCardProps {
  proposal: Proposal;
  currentUserId: string;
  onClick?: (proposal: Proposal) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProposalCard({ proposal, currentUserId, onClick }: ProposalCardProps) {
  const isSender = proposal.sender_id === currentUserId;
  const otherParty = isSender ? proposal.receiver : proposal.sender;
  const otherName =
    otherParty?.company_name ?? otherParty?.full_name ?? "Unknown";

  const statusConfig = STATUS_CONFIG[proposal.status];
  const StatusIcon = statusConfig.icon;

  const deliverables = (proposal.deliverables ?? []) as ProposalDeliverable[];
  const totalDeliverables = deliverables.reduce(
    (sum, d) => sum + (d.quantity ?? 1),
    0,
  );

  const initials = otherName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={() => onClick?.(proposal)}
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid rgba(var(--accent-rgb),0.12)",
        borderRadius: 14,
        padding: 18,
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(var(--accent-rgb),0.3)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(var(--accent-rgb),0.12)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        {/* Left: Avatar + Details */}
        <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 0 }}>
          {/* Avatar */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--color-editorial-blue), #6D28D9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--color-ink, #E2E8F0)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {proposal.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--color-ink-secondary)",
                marginTop: 4,
              }}
            >
              {isSender ? "To" : "From"}: {otherName}
            </div>

            {/* Bottom Row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              {/* Deliverables count */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  color: "var(--color-ink-secondary)",
                }}
              >
                <Package size={12} />
                {totalDeliverables} deliverable{totalDeliverables !== 1 ? "s" : ""}
              </div>

              {/* Date */}
              <div style={{ fontSize: 11, color: "var(--color-ink-secondary)" }}>
                {new Date(proposal.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Amount + Status */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#34D399" }}>
            ${(proposal.total_amount ?? 0).toLocaleString()}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              background: statusConfig.bg,
              borderRadius: 12,
              color: statusConfig.color,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <StatusIcon size={11} />
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Open indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
        }}
      >
        <ChevronRight
          size={14}
          style={{ color: "var(--color-ink-secondary)", opacity: 0.4 }}
        />
      </div>
    </div>
  );
}
