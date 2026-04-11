"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  Clock,
  Handshake,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { TrustScore, TrustScoreHistory } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TrustScorePageProps {
  trustScore: TrustScore | null;
  history: TrustScoreHistory[];
  basePath: "/dashboard" | "/brand";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface-card)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 14,
  padding: "20px 22px",
};

const FACTOR_CONFIG = [
  { key: "completion_rate" as const, label: "Completion Rate", weight: "35%", icon: CheckCircle2, color: "#22C55E", description: "Paid deals / total closed deals", tip: "Complete every deal you commit to" },
  { key: "dispute_rate" as const, label: "Dispute Rate", weight: "25%", icon: AlertTriangle, color: "#F59E0B", description: "Fewer disputes = higher score", tip: "Set clear expectations upfront" },
  { key: "response_time_score" as const, label: "Response Time", weight: "15%", icon: Clock, color: "var(--color-editorial-blue)", description: "Avg deliverable review time", tip: "Respond within 24 hours" },
  { key: "consistency_score" as const, label: "Consistency", weight: "15%", icon: Handshake, color: "#8B5CF6", description: "Matched outcomes with other party", tip: "Report outcomes honestly" },
  { key: "deal_volume_score" as const, label: "Deal Volume", weight: "10%", icon: BarChart3, color: "#EC4899", description: "Total closed deals (log scale)", tip: "Close more platform deals" },
];

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

function getGradeColor(score: number): string {
  if (score >= 90) return "#22C55E";
  if (score >= 75) return "var(--color-editorial-blue)";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function getLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Needs Improvement";
}

// Default score for new users — start at 100 (like Uber's 5-star: you start perfect and maintain it)
const DEFAULT_SCORE: TrustScore = {
  id: "",
  profile_id: "",
  overall_score: 100,
  completion_rate: 100,
  response_time_score: 100,
  dispute_rate: 100,
  consistency_score: 100,
  deal_volume_score: 0,
  total_deals_closed: 0,
  total_deals_completed: 0,
  total_deals_disputed: 0,
  avg_response_hours: null,
  is_public: false,
  last_calculated_at: "",
  created_at: "",
  updated_at: "",
};

// ─── Chart Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { breakdown?: Record<string, number> } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  const breakdown = data.payload.breakdown;

  return (
    <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(var(--accent-rgb),0.2)", borderRadius: 10, padding: "12px 16px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", fontSize: 11 }}>
      <div style={{ fontWeight: 700, color: "var(--color-ink)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 20, color: getGradeColor(data.value), marginBottom: 2 }}>
        {Math.round(data.value)} <span style={{ fontSize: 12 }}>{getGrade(data.value)}</span>
      </div>
      {breakdown && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3, borderTop: "1px solid rgba(var(--accent-rgb),0.1)", paddingTop: 8, marginTop: 6 }}>
          {FACTOR_CONFIG.map(({ key, label: lbl, color }) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
              <span style={{ color: "var(--color-ink-secondary)" }}>{lbl}</span>
              <span style={{ fontWeight: 700, color }}>{breakdown[key] != null ? Math.round(breakdown[key]) : "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TrustScorePage({ trustScore, history, basePath }: TrustScorePageProps) {
  const [hoveredFactor, setHoveredFactor] = useState<string | null>(null);

  const isNew = !trustScore;
  const score = trustScore ?? DEFAULT_SCORE;
  const overall = Math.round(score.overall_score);
  const grade = getGrade(overall);
  const gradeColor = getGradeColor(overall);
  const label = getLabel(overall);
  const dealsHref = basePath === "/brand" ? "/brand/deals" : "/dashboard/business";

  // Chart data — use real history or generate a baseline for new users
  const chartData = history.length > 0
    ? history.map((h) => ({
        date: new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: h.overall_score,
        breakdown: h.breakdown as Record<string, number>,
      }))
    : (() => {
        // Generate 6-month baseline starting at 100
        const now = new Date();
        return Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now);
          d.setMonth(d.getMonth() - (5 - i));
          return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            score: 100,
            breakdown: { completion_rate: 100, dispute_rate: 100, response_time_score: 100, consistency_score: 100, deal_volume_score: 0 },
          };
        });
      })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "4px 0" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink)", margin: 0, letterSpacing: -0.5 }}>
            Trust Score
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-ink-secondary)", marginTop: 4 }}>
            Your platform reliability rating — based on deal history
          </p>
        </div>
        {score.last_calculated_at && (
          <span style={{ fontSize: 10, color: "var(--color-ink-muted)", fontWeight: 500, marginTop: 6 }}>
            Updated {new Date(score.last_calculated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        )}
      </div>

      {/* ── Overall Score Hero ── */}
      <div
        style={{
          ...cardStyle,
          padding: "28px 32px",
          display: "flex",
          alignItems: "center",
          gap: 32,
          background: `linear-gradient(135deg, var(--color-surface-card), ${gradeColor}08)`,
        }}
      >
        {/* Score Circle */}
        <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(var(--accent-rgb),0.08)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={gradeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(overall / 100) * 327} 327`}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: gradeColor, letterSpacing: -2, lineHeight: 1 }}>
              {overall}
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor, marginTop: 2 }}>
              {grade}
            </span>
          </div>
        </div>

        {/* Score Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-ink)", marginBottom: 4 }}>
            {label}
          </div>
          <p style={{ fontSize: 12, color: "var(--color-ink-secondary)", lineHeight: 1.6, margin: "0 0 12px" }}>
            {isNew
              ? "You start with a perfect score. Complete deals to maintain it — disputes, slow responses, and incomplete deals will lower your rating."
              : `Based on ${score.total_deals_closed} closed deal${score.total_deals_closed !== 1 ? "s" : ""} — ${score.total_deals_completed} completed, ${score.total_deals_disputed} disputed${score.avg_response_hours != null ? `, ${Math.round(score.avg_response_hours)}h avg response` : ""}.`}
          </p>
          {/* Visibility badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: score.is_public ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)", color: score.is_public ? "#22C55E" : "#F59E0B" }}>
            {score.is_public ? <Eye size={13} /> : <EyeOff size={13} />}
            {score.is_public ? "Public" : isNew ? "Hidden — complete 3 deals to go public" : `Private — ${Math.max(0, 3 - score.total_deals_closed)} more deal${Math.max(0, 3 - score.total_deals_closed) !== 1 ? "s" : ""} to go public`}
          </div>
        </div>
      </div>

      {/* ── Factor Cards (5 individual cards) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {FACTOR_CONFIG.map(({ key, label: factorLabel, weight, icon: Icon, color, description, tip }) => {
          const val = Math.round(Number(score[key]) || 0);
          const isHovered = hoveredFactor === key;

          return (
            <div
              key={key}
              onMouseEnter={() => setHoveredFactor(key)}
              onMouseLeave={() => setHoveredFactor(null)}
              style={{
                ...cardStyle,
                padding: "18px 16px",
                cursor: "default",
                transition: "border-color 0.15s, transform 0.15s",
                borderColor: isHovered ? `${color}40` : "rgba(var(--accent-rgb),0.12)",
                transform: isHovered ? "translateY(-2px)" : "none",
              }}
            >
              {/* Icon + Weight */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {weight}
                </span>
              </div>

              {/* Score */}
              <div style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}>
                {val}
              </div>

              {/* Label */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink)", marginBottom: 2 }}>
                {factorLabel}
              </div>
              <div style={{ fontSize: 9, color: "var(--color-ink-secondary)", marginBottom: 10, lineHeight: 1.3 }}>
                {description}
              </div>

              {/* Progress Bar */}
              <div style={{ height: 6, borderRadius: 3, background: "rgba(var(--accent-rgb),0.08)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, val)}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    borderRadius: 3,
                    transition: "width 0.8s ease",
                  }}
                />
              </div>

              {/* Hover Tip */}
              {isHovered && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${color}15`, fontSize: 10, color: "var(--color-ink-secondary)", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color }}>Tip:</span> {tip}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Score History Chart ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={16} style={{ color: "var(--color-editorial-blue)" }} />
          Score History
        </div>
        {chartData.length >= 2 ? (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTrust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gradeColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={gradeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--accent-rgb),0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-ink-secondary)" }} axisLine={{ stroke: "rgba(var(--accent-rgb),0.1)" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-ink-secondary)" }} axisLine={false} tickLine={false} width={30} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="score" stroke={gradeColor} strokeWidth={2.5} fill="url(#gradTrust)" dot={{ r: 4, fill: gradeColor, strokeWidth: 0 }} activeDot={{ r: 6, fill: gradeColor, strokeWidth: 2, stroke: "var(--color-surface-card)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: "40px 16px", textAlign: "center", background: "rgba(var(--accent-rgb),0.02)", borderRadius: 10 }}>
            <TrendingUp size={28} style={{ color: "rgba(var(--accent-rgb),0.2)", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 12, color: "var(--color-ink-muted)", margin: 0 }}>
              Score history will appear here after multiple deal closures.
            </p>
            {isNew && (
              <Link href={dealsHref} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--color-editorial-blue)", textDecoration: "none" }}>
                Start a deal <ArrowRight size={12} />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Breakdown Table ── */}
      <div style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={16} style={{ color: "var(--color-editorial-blue)" }} />
          Score Breakdown
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.1)" }}>
                {["Factor", "Weight", "Score", "Progress", "Status", "Tip"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACTOR_CONFIG.map(({ key, label: factorLabel, weight, icon: Icon, color, tip }) => {
                const val = Math.round(Number(score[key]) || 0);
                const status = val >= 90 ? "Excellent" : val >= 75 ? "Good" : val >= 60 ? "Fair" : "Improve";
                const statusColor = val >= 90 ? "#22C55E" : val >= 75 ? "var(--color-editorial-blue)" : val >= 60 ? "#F59E0B" : "#EF4444";

                return (
                  <tr key={key} style={{ borderBottom: "1px solid rgba(var(--accent-rgb),0.06)" }}>
                    <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon size={14} style={{ color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>{factorLabel}</span>
                    </td>
                    <td style={{ padding: "12px", color: "var(--color-ink-secondary)", fontWeight: 600 }}>{weight}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontWeight: 800, color: color, fontSize: 14 }}>
                        {val}
                      </span>
                      <span style={{ color: "var(--color-ink-muted)", fontSize: 10, marginLeft: 2 }}>/100</span>
                    </td>
                    <td style={{ padding: "12px", minWidth: 120 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(var(--accent-rgb),0.08)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, val)}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: 0.3 }}>
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontSize: 11, color: "var(--color-ink-secondary)", maxWidth: 200 }}>
                      {tip}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summary row */}
            <tfoot>
              <tr style={{ borderTop: "2px solid rgba(var(--accent-rgb),0.12)" }}>
                <td style={{ padding: "12px", fontWeight: 800, color: "var(--color-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={14} style={{ color: gradeColor }} />
                  Overall
                </td>
                <td style={{ padding: "12px", fontWeight: 700, color: "var(--color-ink-secondary)" }}>100%</td>
                <td style={{ padding: "12px" }}>
                  <span style={{ fontWeight: 900, color: gradeColor, fontSize: 16 }}>
                    {overall}
                  </span>
                  <span style={{ color: "var(--color-ink-muted)", fontSize: 10, marginLeft: 2 }}>/100</span>
                </td>
                <td style={{ padding: "12px", minWidth: 120 }}>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(var(--accent-rgb),0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, overall)}%`, background: `linear-gradient(90deg, ${gradeColor}99, ${gradeColor})`, borderRadius: 4, transition: "width 0.8s ease" }} />
                  </div>
                </td>
                <td style={{ padding: "12px" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: gradeColor }}>
                    {grade}
                  </span>
                </td>
                <td style={{ padding: "12px", fontSize: 11, color: "var(--color-ink-secondary)" }}>
                  {isNew ? "Maintain your score" : `${score.total_deals_closed} deals closed`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Quick Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {[
          { label: "Deals Closed", value: String(score.total_deals_closed), color: "var(--color-editorial-blue)", icon: Handshake },
          { label: "Completed", value: String(score.total_deals_completed), color: "#22C55E", icon: CheckCircle2 },
          { label: "Disputed", value: String(score.total_deals_disputed), color: score.total_deals_disputed > 0 ? "#EF4444" : "var(--color-ink-muted)", icon: AlertTriangle },
          { label: "Avg Response", value: score.avg_response_hours != null ? `${Math.round(score.avg_response_hours)}h` : "—", color: "var(--color-editorial-blue)", icon: Clock },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div key={stat.label} style={{ ...cardStyle, padding: "16px 18px", textAlign: "center" }}>
              <StatIcon size={18} style={{ color: stat.color, marginBottom: 8 }} />
              <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, letterSpacing: -1, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── How It Works (collapsed for users with scores) ── */}
      {isNew && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "32px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.6 }}>
            You start with a perfect 100. When deals close, both parties report the outcome — disputes, slow responses, and incomplete deals lower your score. Keep it high by delivering consistently.
          </p>
          <Link href={dealsHref} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "rgba(var(--accent-rgb),0.12)", border: "1px solid rgba(var(--accent-rgb),0.2)", borderRadius: 10, color: "var(--color-editorial-blue)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Go to Deals <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
