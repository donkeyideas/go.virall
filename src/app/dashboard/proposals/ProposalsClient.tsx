"use client";

import { useState, useCallback } from "react";
import {
  Inbox,
  Send,
  Filter,
  FileText,
  Plus,
  ArrowLeft,
} from "lucide-react";
import type { Proposal, ProposalStatus } from "@/types";
import { ProposalCard } from "@/components/proposals/ProposalCard";
import { ProposalView } from "@/components/proposals/ProposalView";
import { ProposalBuilder } from "@/components/proposals/ProposalBuilder";
import { getProposal } from "@/lib/actions/proposals";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: ProposalStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "negotiating", label: "Negotiating" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "draft", label: "Drafts" },
];

// ─── Props ──────────────────────────────────────────────────────────────────

interface ProposalsClientProps {
  proposals: Proposal[];
  currentUserId: string;
  accountType?: "creator" | "brand";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ProposalsClient({
  proposals,
  currentUserId,
  accountType = "creator",
}: ProposalsClientProps) {
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | "all">("all");
  const [selectedProposal, setSelectedProposal] = useState<(Proposal & { events?: unknown[] }) | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const received = proposals.filter((p) => p.receiver_id === currentUserId);
  const sent = proposals.filter((p) => p.sender_id === currentUserId);

  const activeList = tab === "received" ? received : sent;
  const filteredList =
    statusFilter === "all"
      ? activeList
      : activeList.filter((p) => p.status === statusFilter);

  const handleSelectProposal = useCallback(
    async (proposal: Proposal) => {
      // Fetch full proposal with events
      const result = await getProposal(proposal.id);
      if (result.data) {
        setSelectedProposal(result.data as Proposal & { events?: unknown[] });
      } else {
        // Fallback to the basic proposal
        setSelectedProposal(proposal);
      }
    },
    [],
  );

  // ─── Detail View ──────────────────────────────────────────────────────

  if (selectedProposal) {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <ProposalView
          proposal={selectedProposal as Proposal & { events?: import("@/types").ProposalEvent[] }}
          currentUserId={currentUserId}
          onBack={() => setSelectedProposal(null)}
          onDealCreated={() => {
            setSelectedProposal(null);
          }}
        />
      </div>
    );
  }

  // ─── Builder View ─────────────────────────────────────────────────────

  if (showBuilder) {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setShowBuilder(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              color: "var(--color-ink-secondary)",
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            <ArrowLeft size={14} />
            Back to Proposals
          </button>
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--color-ink, #E2E8F0)",
            marginBottom: 12,
          }}
        >
          Create New Proposal
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-secondary)",
            marginBottom: 24,
          }}
        >
          Tip: To send a proposal to a specific creator or brand, start from their profile on the{" "}
          <a href="/marketplace" style={{ color: "#4B9CD3", textDecoration: "underline" }}>Marketplace</a>{" "}
          or{" "}
          <a href="/dashboard/business?tab=opportunities" style={{ color: "#4B9CD3", textDecoration: "underline" }}>Opportunities</a>{" "}
          page.
        </p>
        <ProposalBuilder
          receiverId=""
          receiverName="Select a recipient"
          proposalType={accountType === "brand" ? "brand_to_creator" : "creator_to_brand"}
          onSuccess={() => {
            setShowBuilder(false);
          }}
          onCancel={() => setShowBuilder(false)}
        />
      </div>
    );
  }

  // ─── List View ────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--color-ink, #E2E8F0)",
              margin: 0,
            }}
          >
            Proposals
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              margin: "6px 0 0",
            }}
          >
            Manage your brand collaboration proposals
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBuilder(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            background: "#4B9CD3",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <Plus size={14} />
          New Proposal
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 20,
          borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
        }}
      >
        {[
          { key: "received" as const, label: "Received", icon: Inbox, count: received.length },
          { key: "sent" as const, label: "Sent", icon: Send, count: sent.length },
        ].map((t) => {
          const isActive = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "12px 20px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${isActive ? "#4B9CD3" : "transparent"}`,
                color: isActive ? "#4B9CD3" : "var(--color-ink-secondary)",
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Icon size={14} />
              {t.label}
              <span
                style={{
                  background: isActive
                    ? "rgba(var(--accent-rgb),0.15)"
                    : "var(--color-surface-inset)",
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
        }}
      >
        <Filter size={14} style={{ color: "var(--color-ink-secondary)" }} />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            style={{
              padding: "6px 14px",
              background:
                statusFilter === f.value
                  ? "rgba(var(--accent-rgb),0.12)"
                  : "var(--color-surface-card)",
              border: `1px solid ${
                statusFilter === f.value
                  ? "rgba(var(--accent-rgb),0.3)"
                  : "rgba(var(--accent-rgb),0.08)"
              }`,
              borderRadius: 8,
              color:
                statusFilter === f.value
                  ? "#4B9CD3"
                  : "var(--color-ink-secondary)",
              fontSize: 11,
              fontWeight: statusFilter === f.value ? 700 : 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Proposal List */}
      {filteredList.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            background: "var(--color-surface-card)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(var(--accent-rgb),0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <FileText size={24} style={{ color: "var(--color-ink-secondary)" }} />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-ink, #E2E8F0)",
              marginBottom: 6,
            }}
          >
            {tab === "received"
              ? "No proposals received yet"
              : "No proposals sent yet"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              textAlign: "center",
              maxWidth: 360,
            }}
          >
            {tab === "received"
              ? "When brands send you collaboration proposals, they will appear here."
              : "Create a proposal to start collaborating with brands."}
          </div>
          {tab === "sent" && (
            <button
              type="button"
              onClick={() => setShowBuilder(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "#4B9CD3",
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                marginTop: 20,
              }}
            >
              <Plus size={14} />
              Create Proposal
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredList.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              currentUserId={currentUserId}
              onClick={handleSelectProposal}
            />
          ))}
        </div>
      )}
    </div>
  );
}
