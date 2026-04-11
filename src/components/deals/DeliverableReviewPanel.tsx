"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Loader2, ExternalLink } from "lucide-react";
import { reviewDeliverable } from "@/lib/actions/deals";
import { DeliverablePreview } from "./DeliverablePreview";
import type { DealDeliverable } from "@/types";

interface Props {
  deliverable: DealDeliverable;
  onReviewed?: () => void;
}

export function DeliverableReviewPanel({ deliverable, onReviewed }: Props) {
  const [showRevision, setShowRevision] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "approve" | "request_revision") => {
    setLoading(true);
    setError(null);

    const result = await reviewDeliverable(
      deliverable.id,
      action,
      action === "request_revision" ? comment : undefined,
    );

    if ("error" in result) {
      setError(result.error);
    } else {
      setComment("");
      setShowRevision(false);
      onReviewed?.();
    }
    setLoading(false);
  };

  const latestSubmission = deliverable.submissions?.[0];

  return (
    <div
      style={{
        background: "var(--color-surface-inset)",
        border: "1px solid rgba(var(--accent-rgb),0.12)",
        borderRadius: 10,
        padding: 14,
        marginTop: 8,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        Review Submission
      </div>

      {/* Preview of submitted content */}
      {latestSubmission ? (
        <DeliverablePreview
          url={latestSubmission.url}
          platform={latestSubmission.platform_detected}
          oembedData={latestSubmission.oembed_data}
        />
      ) : deliverable.submission_url ? (
        <a
          href={deliverable.submission_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--color-editorial-blue)",
            textDecoration: "none",
            marginBottom: 10,
            wordBreak: "break-all",
          }}
        >
          {deliverable.submission_url}
          <ExternalLink size={11} />
        </a>
      ) : null}

      {latestSubmission?.note && (
        <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", fontStyle: "italic", marginTop: 6, marginBottom: 10 }}>
          Creator note: &ldquo;{latestSubmission.note}&rdquo;
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: "#EF4444", marginBottom: 8 }}>{error}</div>
      )}

      {/* Revision comment input */}
      {showRevision && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Explain what needs to change..."
          rows={3}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "var(--color-surface-card)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 8,
            color: "var(--color-ink)",
            fontSize: 12,
            fontFamily: "inherit",
            outline: "none",
            resize: "none",
            marginBottom: 8,
            boxSizing: "border-box",
          }}
        />
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => handleAction("approve")}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 16px",
            background: "#22C55E",
            border: "none",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? <Loader2 size={12} /> : <CheckCircle2 size={12} />}
          Approve
        </button>

        {!showRevision ? (
          <button
            onClick={() => setShowRevision(true)}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              color: "#F59E0B",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RotateCcw size={12} />
            Request Revision
          </button>
        ) : (
          <button
            onClick={() => handleAction("request_revision")}
            disabled={loading || !comment.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 16px",
              background: loading || !comment.trim() ? "rgba(245,158,11,0.3)" : "#F59E0B",
              border: "none",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              cursor: loading || !comment.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <RotateCcw size={12} />
            Send Revision Request
          </button>
        )}
      </div>
    </div>
  );
}
