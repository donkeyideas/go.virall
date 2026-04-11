"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { getProposal } from "@/lib/actions/proposals";
import { ProposalView } from "./ProposalView";
import type { Proposal, ProposalEvent } from "@/types";

interface ProposalModalProps {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  currentUserId: string;
}

export function ProposalModal({ open, onClose, proposalId, currentUserId }: ProposalModalProps) {
  const [proposal, setProposal] = useState<(Proposal & { events?: ProposalEvent[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const isBrand = pathname.startsWith("/brand");
  const dealBasePath = isBrand ? "/brand/deals" : "/dashboard/business?tab=deals";

  useEffect(() => {
    if (!open || !proposalId) return;

    setLoading(true);
    setError(null);

    getProposal(proposalId).then((result) => {
      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("data" in result && result.data) {
        setProposal(result.data as Proposal & { events?: ProposalEvent[] });
      }
      setLoading(false);
    });
  }, [open, proposalId]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 200,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(760px, 92vw)",
          maxHeight: "90vh",
          background: "var(--color-surface-card)",
          border: "1px solid rgba(var(--accent-rgb),0.15)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          zIndex: 201,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
        }}
      >
        {/* Close button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.1)",
          }}
        >
          <h3
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Proposal Details
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(var(--accent-rgb),0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-secondary)",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 0",
                gap: 10,
              }}
            >
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-editorial-blue)" }} />
              <span style={{ fontSize: 13, color: "var(--color-ink-secondary)" }}>
                Loading proposal...
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "var(--color-ink-secondary)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && proposal && (
            <ProposalView
              proposal={proposal}
              currentUserId={currentUserId}
              onBack={onClose}
              dealBasePath={dealBasePath}
            />
          )}
        </div>
      </div>
    </>
  );
}
