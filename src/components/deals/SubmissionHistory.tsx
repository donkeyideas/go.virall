"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { getDeliverableSubmissions } from "@/lib/actions/deals";
import { DeliverablePreview } from "./DeliverablePreview";
import type { DeliverableSubmission } from "@/types";

interface Props {
  deliverableId: string;
  refreshKey?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: typeof Clock }> = {
  pending: { label: "Pending Review", color: "#F59E0B", Icon: Clock },
  approved: { label: "Approved", color: "#22C55E", Icon: CheckCircle2 },
  revision_requested: { label: "Revision Requested", color: "#EF4444", Icon: RotateCcw },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function SubmissionHistory({ deliverableId, refreshKey }: Props) {
  const [submissions, setSubmissions] = useState<DeliverableSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getDeliverableSubmissions(deliverableId).then((result) => {
      if (cancelled) return;
      if ("data" in result) {
        setSubmissions(result.data);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [deliverableId, refreshKey]);

  if (loading) {
    return (
      <div style={{ padding: "12px 0", textAlign: "center" }}>
        <Loader2 size={14} style={{ color: "var(--color-editorial-blue)" }} />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", padding: "8px 0", fontStyle: "italic" }}>
        No submissions yet.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        Submission History ({submissions.length})
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {submissions.map((sub, idx) => {
          const config = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending;
          const StatusIcon = config.Icon;

          return (
            <div
              key={sub.id}
              style={{
                paddingLeft: 12,
                position: "relative",
              }}
            >
              {/* Status + time */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <StatusIcon size={11} style={{ color: config.color }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: config.color }}>
                  {config.label}
                </span>
                <span style={{ fontSize: 9, color: "var(--color-ink-secondary)" }}>
                  {timeAgo(sub.created_at)}
                </span>
                {idx === 0 && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: "var(--color-editorial-blue)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Latest
                  </span>
                )}
              </div>

              {/* Preview */}
              <DeliverablePreview
                url={sub.url}
                platform={sub.platform_detected}
                oembedData={sub.oembed_data}
              />

              {/* Creator note */}
              {sub.note && (
                <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", fontStyle: "italic", marginBottom: 4 }}>
                  &ldquo;{sub.note}&rdquo;
                </div>
              )}

              {/* Reviewer comment */}
              {sub.review_comment && (
                <div
                  style={{
                    fontSize: 11,
                    color: sub.status === "revision_requested" ? "#EF4444" : "var(--color-ink-secondary)",
                    background: sub.status === "revision_requested" ? "rgba(239,68,68,0.08)" : "transparent",
                    padding: sub.status === "revision_requested" ? "6px 10px" : 0,
                    borderRadius: 6,
                    marginTop: 4,
                  }}
                >
                  <strong>Review:</strong> {sub.review_comment}
                </div>
              )}

              {/* Submitter */}
              {sub.submitter && (
                <div style={{ fontSize: 9, color: "var(--color-ink-secondary)", marginTop: 4 }}>
                  Submitted by {sub.submitter.full_name}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
