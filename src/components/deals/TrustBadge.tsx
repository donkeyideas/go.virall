"use client";

import { Shield } from "lucide-react";
import type { TrustScore } from "@/types";

interface Props {
  trustScore: TrustScore | null;
  size?: "sm" | "md";
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

export function TrustBadge({ trustScore, size = "sm" }: Props) {
  // Uber model: everyone starts at 100
  const score = trustScore?.overall_score ?? 100;
  const deals = trustScore?.total_deals_closed ?? 0;
  const grade = getGrade(score);
  const color = getColor(score);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 4 : 6,
      }}
    >
      <Shield size={size === "sm" ? 11 : 14} style={{ color }} />
      <span
        style={{
          fontSize: size === "sm" ? 10 : 13,
          fontWeight: 800,
          color,
          letterSpacing: -0.3,
        }}
      >
        {Math.round(score)}
      </span>
      <span
        style={{
          fontSize: size === "sm" ? 8 : 10,
          fontWeight: 700,
          color,
          letterSpacing: 0.3,
        }}
      >
        {grade}
      </span>
      <span
        style={{
          fontSize: size === "sm" ? 8 : 9,
          color: "var(--color-ink-secondary)",
          fontWeight: 500,
        }}
      >
        {deals} deal{deals !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
