"use client";

import { useState } from "react";
import { Handshake, CalendarDays, DollarSign } from "lucide-react";
import { ContentCalendar } from "@/components/dashboard/ContentCalendar";
import { ProposalModal } from "@/components/proposals/ProposalModal";
import type { DealEvent } from "@/components/dashboard/ContentCalendar";

interface BrandCalendarClientProps {
  dealEvents: DealEvent[];
  currentUserId: string;
}

export function BrandCalendarClient({ dealEvents, currentUserId }: BrandCalendarClientProps) {
  const [proposalModalId, setProposalModalId] = useState<string | null>(null);

  const now = new Date();
  const dealsThisMonth = dealEvents.filter((d) => {
    const start = new Date(d.startDate);
    return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
  });
  const totalValue = dealEvents.reduce((sum, d) => sum + (d.value ?? 0), 0);

  function handleDealClick(deal: DealEvent) {
    if (deal.proposalId) {
      setProposalModalId(deal.proposalId);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 148px)", fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <div className="rounded-[14px] border border-modern-card-border bg-surface-card px-5 py-4">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Handshake size={16} style={{ color: "#10B981" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Active Deals
            </span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)" }}>
            {dealEvents.length}
          </span>
        </div>
        <div className="rounded-[14px] border border-modern-card-border bg-surface-card px-5 py-4">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <CalendarDays size={16} style={{ color: "rgba(75,156,211,0.9)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              This Month
            </span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)" }}>
            {dealsThisMonth.length}
          </span>
        </div>
        <div className="rounded-[14px] border border-modern-card-border bg-surface-card px-5 py-4">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <DollarSign size={16} style={{ color: "#F59E0B" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Pipeline Value
            </span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)" }}>
            ${totalValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Calendar — fills remaining space */}
      <div className="rounded-[14px] border border-modern-card-border bg-surface-card overflow-hidden" style={{ flex: 1, minHeight: 0 }}>
        <ContentCalendar
          posts={[]}
          dealEvents={dealEvents}
          onDayClick={() => {}}
          onPostClick={() => {}}
          onNewPost={() => {}}
          onDealClick={handleDealClick}
        />
      </div>

      {/* Proposal modal */}
      {proposalModalId && (
        <ProposalModal
          open={!!proposalModalId}
          onClose={() => setProposalModalId(null)}
          proposalId={proposalModalId}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
