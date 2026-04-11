"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Clock, Loader2, Lock } from "lucide-react";
import {
  submitClosureOutcome,
  getClosureOutcomes,
  updateClosureOutcome,
} from "@/lib/actions/deals";
import type { DealClosureOutcomeType, DealClosureOutcome } from "@/types";

interface Props {
  dealId: string;
  closureStatus: string | null;
  finalOutcome: string | null;
  disputeDeadline: string | null;
  isFromPlatform: boolean;
  pipelineStage: string;
}

const OUTCOMES: { value: DealClosureOutcomeType; label: string; description: string }[] = [
  { value: "paid", label: "Paid", description: "Payment was made in full" },
  { value: "partially_paid", label: "Partially Paid", description: "Only part of the agreed amount was paid" },
  { value: "not_paid", label: "Not Paid", description: "No payment was received" },
  { value: "cancelled", label: "Cancelled", description: "Both parties agreed to walk away" },
];

const OUTCOME_COLORS: Record<string, string> = {
  paid: "#22C55E",
  partially_paid: "#F59E0B",
  not_paid: "#EF4444",
  cancelled: "#6B7280",
  disputed: "#EF4444",
  stale: "#6B7280",
};

function daysLeft(deadline: string | null): number {
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));
}

export function DealClosurePanel({
  dealId,
  closureStatus,
  finalOutcome,
  disputeDeadline,
  isFromPlatform,
  pipelineStage,
}: Props) {
  const [selectedOutcome, setSelectedOutcome] = useState<DealClosureOutcomeType | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myOutcome, setMyOutcome] = useState<DealClosureOutcome | null>(null);
  const [otherOutcome, setOtherOutcome] = useState<DealClosureOutcome | null>(null);
  const [canSeeOther, setCanSeeOther] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const closableStages = ["delivered", "invoiced", "paid", "completed"];
  const shouldShow = isFromPlatform && closableStages.includes(pipelineStage);

  useEffect(() => {
    if (!shouldShow) return;
    let cancelled = false;
    setLoadingData(true);
    getClosureOutcomes(dealId).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setLoadingData(false);
        return;
      }
      setMyOutcome(result.myOutcome);
      setOtherOutcome(result.otherOutcome);
      setCanSeeOther(result.canSeeOther);
      if (result.myOutcome) {
        setSelectedOutcome(result.myOutcome.outcome);
      }
      setLoadingData(false);
    });
    return () => { cancelled = true; };
  }, [dealId, shouldShow]);

  if (!shouldShow) return null;

  const handleSubmit = async () => {
    if (!selectedOutcome) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = myOutcome
      ? await updateClosureOutcome(dealId, selectedOutcome, notes || undefined)
      : await submitClosureOutcome(dealId, selectedOutcome, notes || undefined);

    if ("error" in result) {
      setError(result.error);
    } else if ("matched" in result) {
      const r = result as { success: true; matched: boolean; disputed: boolean };
      if (r.matched) setMessage("Deal closed! Both parties agreed.");
      else if (r.disputed) setMessage("Outcomes don't match. 7-day resolution window started.");
      else setMessage("Outcome submitted. Waiting for the other party.");
    } else {
      setMessage("Outcome updated.");
    }
    setLoading(false);
  };

  if (loadingData) {
    return (
      <div style={{ padding: "20px 0", textAlign: "center" }}>
        <Loader2 size={16} style={{ color: "var(--color-editorial-blue)" }} />
      </div>
    );
  }

  // ─── Matched state ────────────────────────────────────────
  if (closureStatus === "matched" && finalOutcome) {
    const outcomeLbl = finalOutcome.replace(/_/g, " ");
    return (
      <div
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 12,
          padding: "18px 20px",
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <CheckCircle2 size={16} style={{ color: "#22C55E" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#22C55E" }}>Deal Closed</span>
          <Lock size={11} style={{ color: "#22C55E" }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
          Both parties agreed: <strong style={{ color: OUTCOME_COLORS[finalOutcome] ?? "#22C55E", textTransform: "capitalize" }}>{outcomeLbl}</strong>
        </div>
      </div>
    );
  }

  // ─── Stale state ──────────────────────────────────────────
  if (closureStatus === "stale") {
    return (
      <div
        style={{
          background: "rgba(107,114,128,0.08)",
          border: "1px solid rgba(107,114,128,0.2)",
          borderRadius: 12,
          padding: "18px 20px",
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={16} style={{ color: "#6B7280" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#6B7280" }}>Deal Marked Stale</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--color-ink-secondary)", marginTop: 6 }}>
          This deal was automatically closed due to 30 days of inactivity.
        </div>
      </div>
    );
  }

  // ─── Disputed state ───────────────────────────────────────
  const isDisputed = closureStatus === "disputed";
  const remaining = daysLeft(disputeDeadline);

  return (
    <div
      style={{
        background: isDisputed ? "rgba(239,68,68,0.06)" : "var(--color-surface-inset)",
        border: `1px solid ${isDisputed ? "rgba(239,68,68,0.2)" : "rgba(var(--accent-rgb),0.12)"}`,
        borderRadius: 12,
        padding: "18px 20px",
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {isDisputed ? (
          <AlertTriangle size={16} style={{ color: "#EF4444" }} />
        ) : (
          <CheckCircle2 size={16} style={{ color: "var(--color-editorial-blue)" }} />
        )}
        <span style={{ fontSize: 13, fontWeight: 700, color: isDisputed ? "#EF4444" : "var(--color-ink)" }}>
          {isDisputed ? "Deal Outcome Disputed" : "Close This Deal"}
        </span>
      </div>

      {isDisputed && (
        <div style={{ fontSize: 11, color: "#EF4444", marginBottom: 12, lineHeight: 1.5 }}>
          Outcomes don&apos;t match. {remaining > 0 ? `${remaining} day${remaining !== 1 ? "s" : ""} left to resolve.` : "Resolution window expired."}
          {" "}Update your outcome if needed.
        </div>
      )}

      {/* Show other party's outcome if visible */}
      {canSeeOther && otherOutcome && (
        <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginBottom: 12, padding: "8px 12px", background: "var(--color-surface-card)", borderRadius: 8 }}>
          Other party reported: <strong style={{ color: OUTCOME_COLORS[otherOutcome.outcome] ?? "var(--color-ink)", textTransform: "capitalize" }}>
            {otherOutcome.outcome.replace(/_/g, " ")}
          </strong>
          {otherOutcome.notes && <span> — &ldquo;{otherOutcome.notes}&rdquo;</span>}
        </div>
      )}

      {/* My submitted outcome (waiting) */}
      {myOutcome && closureStatus === "pending_closure" && (
        <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginBottom: 12, padding: "8px 12px", background: "rgba(var(--accent-rgb),0.06)", borderRadius: 8 }}>
          <strong>You reported:</strong>{" "}
          <span style={{ color: OUTCOME_COLORS[myOutcome.outcome], textTransform: "capitalize", fontWeight: 700 }}>
            {myOutcome.outcome.replace(/_/g, " ")}
          </span>
          {" "}— Waiting for the other party to confirm.
        </div>
      )}

      {/* Info banner (only if not yet submitted) */}
      {!myOutcome && !isDisputed && (
        <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
          Both parties must independently report the deal outcome. Outcomes are revealed once both have submitted.
        </div>
      )}

      {/* Outcome selector */}
      {(!myOutcome || isDisputed) && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {OUTCOMES.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: selectedOutcome === opt.value ? "var(--color-surface-card)" : "transparent",
                  border: selectedOutcome === opt.value
                    ? `1px solid ${OUTCOME_COLORS[opt.value]}40`
                    : "1px solid transparent",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="closure_outcome"
                  value={opt.value}
                  checked={selectedOutcome === opt.value}
                  onChange={() => setSelectedOutcome(opt.value)}
                  style={{ accentColor: OUTCOME_COLORS[opt.value] }}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-ink-secondary)" }}>
                    {opt.description}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            style={{
              width: "100%",
              padding: "8px 12px",
              background: "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.15)",
              borderRadius: 8,
              color: "var(--color-ink)",
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
              resize: "none",
              marginBottom: 10,
              boxSizing: "border-box",
            }}
          />

          {error && <div style={{ fontSize: 11, color: "#EF4444", marginBottom: 8 }}>{error}</div>}
          {message && <div style={{ fontSize: 11, color: "#22C55E", marginBottom: 8 }}>{message}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading || !selectedOutcome}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 20px",
              background: !selectedOutcome ? "rgba(var(--accent-rgb),0.3)" : "var(--color-editorial-blue)",
              border: "none",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              cursor: !selectedOutcome || loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {loading && <Loader2 size={12} />}
            {myOutcome ? "Update Outcome" : "Submit Outcome"}
          </button>
        </>
      )}
    </div>
  );
}
