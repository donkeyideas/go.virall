"use client";

import { Shield } from "lucide-react";
import type { TrustScore } from "@/types";

interface Props {
  trustScore: TrustScore;
}

function getGrade(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  return "D";
}

function getColor(score: number): string {
  if (score >= 90) return "#22C55E";
  if (score >= 75) return "rgba(75,156,211,0.9)";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function getLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Improvement";
}

const SUB_SCORES: { key: keyof TrustScore; label: string; weight: string }[] = [
  { key: "completion_rate", label: "Completion Rate", weight: "35%" },
  { key: "dispute_rate", label: "Dispute Rate", weight: "25%" },
  { key: "response_time_score", label: "Response Time", weight: "15%" },
  { key: "consistency_score", label: "Consistency", weight: "15%" },
  { key: "deal_volume_score", label: "Deal Volume", weight: "10%" },
];

export function TrustScoreDetail({ trustScore }: Props) {
  const grade = getGrade(trustScore.overall_score);
  const color = getColor(trustScore.overall_score);
  const label = getLabel(trustScore.overall_score);

  return (
    <div
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid rgba(75,156,211,0.12)",
        borderRadius: 14,
        padding: "20px 22px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: `${color}15`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Shield size={24} style={{ color }} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -1 }}>
              {Math.round(trustScore.overall_score)}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color }}>{grade}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", fontWeight: 600 }}>
            {label} — {trustScore.total_deals_closed} deal{trustScore.total_deals_closed !== 1 ? "s" : ""} closed
          </div>
        </div>
      </div>

      {/* Sub-score bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SUB_SCORES.map(({ key, label: subLabel, weight }) => {
          const val = Number(trustScore[key]) || 0;
          const barColor = getColor(val);

          return (
            <div key={key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)" }}>
                  {subLabel}
                  <span style={{ fontSize: 8, color: "var(--color-ink-secondary)", marginLeft: 4, opacity: 0.6 }}>
                    ({weight})
                  </span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: barColor }}>
                  {Math.round(val)}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(75,156,211,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, val)}%`,
                    background: barColor,
                    borderRadius: 2,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid rgba(75,156,211,0.08)",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)" }}>
            {trustScore.total_deals_completed}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.3 }}>
            Completed
          </div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)" }}>
            {trustScore.total_deals_disputed}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.3 }}>
            Disputed
          </div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)" }}>
            {trustScore.avg_response_hours != null ? `${Math.round(trustScore.avg_response_hours)}h` : "—"}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.3 }}>
            Avg Response
          </div>
        </div>
      </div>
    </div>
  );
}
