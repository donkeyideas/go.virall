"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Megaphone,
  Calendar,
  DollarSign,
  Play,
  Pause,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  X,
  Clock,
  FileText,
  TrendingUp,
} from "lucide-react";

type CampaignStatus = "draft" | "active" | "paused" | "completed";

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  notes: string | null;
}

const statusConfig: Record<
  CampaignStatus,
  { label: string; color: string; bg: string; icon: typeof Play }
> = {
  draft: { label: "Draft", color: "var(--color-ink-secondary)", bg: "rgba(75,156,211,0.08)", icon: FileEdit },
  active: { label: "Active", color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: Play },
  paused: { label: "Paused", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: Pause },
  completed: { label: "Completed", color: "rgba(75,156,211,0.8)", bg: "rgba(75,156,211,0.1)", icon: CheckCircle2 },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  campaigns: Campaign[];
}

export function BrandCampaignsClient({ campaigns }: Props) {
  const [filter, setFilter] = useState<CampaignStatus | "all">("all");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const filteredCampaigns =
    filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  // Close modal on Escape
  useEffect(() => {
    if (!selectedCampaign) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedCampaign(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedCampaign]);

  function getDaysRemaining(endDate: string | null): string | null {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Ended";
    if (diff === 0) return "Ends today";
    return `${diff} days left`;
  }

  function getDuration(start: string | null, end: string | null): string | null {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "1 day";
    return `${diff} days`;
  }

  return (
    <div style={{ fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)", margin: 0, letterSpacing: -0.5 }}>
            Campaigns
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", marginTop: 6, fontWeight: 500 }}>
            Manage your influencer marketing campaigns
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Campaigns", value: campaigns.length },
          { label: "Active", value: campaigns.filter((c) => c.status === "active").length },
          { label: "Total Budget", value: `$${campaigns.reduce((sum, c) => sum + (c.budget ?? 0), 0).toLocaleString()}` },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid rgba(75,156,211,0.12)",
              borderRadius: 12,
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink)" }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all", "draft", "active", "paused", "completed"] as const).map((status) => {
          const count = status === "all" ? campaigns.length : campaigns.filter((c) => c.status === status).length;
          if (count === 0 && filter !== status && status !== "all") return null;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: "6px 16px",
                borderRadius: 8,
                background: filter === status ? "rgba(75,156,211,0.15)" : "var(--color-surface-card)",
                border: filter === status ? "1px solid rgba(75,156,211,0.3)" : "1px solid rgba(75,156,211,0.12)",
                fontSize: 11,
                fontWeight: 700,
                color: filter === status ? "rgba(75,156,211,0.9)" : "var(--color-ink-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {status === "all" ? `All (${count})` : `${status} (${count})`}
            </button>
          );
        })}
      </div>

      {/* Campaign cards or empty state */}
      {filteredCampaigns.length === 0 ? (
        <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(75,156,211,0.12)", borderRadius: 16, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(75,156,211,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Megaphone size={28} style={{ color: "rgba(75,156,211,0.7)" }} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink)", margin: "0 0 8px" }}>
            No campaigns yet
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", maxWidth: 400, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Campaigns are automatically created when proposals are accepted. Send proposals to creators to get started with collaborations.
          </p>
          <a
            href="/brand/discover"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              background: "var(--color-editorial-red)",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: "#ffffff",
              cursor: "pointer",
              fontFamily: "inherit",
              textDecoration: "none",
            }}
          >
            Discover Creators
            <ArrowRight size={15} />
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredCampaigns.map((campaign) => {
            const st = statusConfig[campaign.status] ?? statusConfig.draft;
            const StatusIcon = st.icon;
            return (
              <div
                key={campaign.id}
                onClick={() => setSelectedCampaign(campaign)}
                style={{
                  background: "var(--color-surface-card)",
                  border: "1px solid rgba(75,156,211,0.12)",
                  borderRadius: 12,
                  padding: "18px 20px",
                  cursor: "pointer",
                  transition: "border-color 0.15s, transform 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(75,156,211,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(75,156,211,0.12)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: st.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Megaphone size={18} style={{ color: st.color }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>
                        {campaign.name}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: st.bg, fontSize: 9, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        <StatusIcon size={10} />
                        {st.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--color-ink-secondary)" }}>
                      {campaign.budget != null && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <DollarSign size={11} />
                          {campaign.budget.toLocaleString()}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} />
                        {formatDate(campaign.start_date)} — {formatDate(campaign.end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {campaign.notes && (
                  <p style={{ marginTop: 10, fontSize: 12, color: "var(--color-ink-secondary)", lineHeight: 1.5, paddingLeft: 54 }}>
                    {campaign.notes.slice(0, 200)}
                    {campaign.notes.length > 200 ? "..." : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Modal */}
      {selectedCampaign && (() => {
        const c = selectedCampaign;
        const st = statusConfig[c.status] ?? statusConfig.draft;
        const StatusIcon = st.icon;
        const daysLeft = getDaysRemaining(c.end_date);
        const duration = getDuration(c.start_date, c.end_date);

        return (
          <div
            onClick={() => setSelectedCampaign(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--color-surface-card)",
                border: "1px solid rgba(75,156,211,0.15)",
                borderRadius: 16,
                width: "100%",
                maxWidth: 520,
                maxHeight: "85vh",
                overflowY: "auto",
                fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
              }}
            >
              {/* Modal header */}
              <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(75,156,211,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: st.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Megaphone size={22} style={{ color: st.color }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-ink)", margin: 0, letterSpacing: -0.3 }}>
                        {c.name}
                      </h2>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 6, background: st.bg, fontSize: 10, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 }}>
                        <StatusIcon size={11} />
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCampaign(null)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(75,156,211,0.08)",
                      border: "none",
                      color: "var(--color-ink-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Detail cards */}
              <div style={{ padding: "16px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {/* Budget */}
                  <div style={{ background: "rgba(75,156,211,0.06)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <DollarSign size={13} style={{ color: "#10B981" }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Budget</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink)" }}>
                      {c.budget != null ? `$${c.budget.toLocaleString()}` : "—"}
                    </span>
                  </div>

                  {/* Duration */}
                  <div style={{ background: "rgba(75,156,211,0.06)", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Clock size={13} style={{ color: "rgba(75,156,211,0.9)" }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Duration</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink)" }}>
                      {duration ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Timeline section */}
                <div style={{ background: "rgba(75,156,211,0.06)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <Calendar size={13} style={{ color: "var(--color-ink-secondary)" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Timeline</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Start</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>{formatDate(c.start_date)}</div>
                    </div>
                    <ArrowRight size={16} style={{ color: "var(--color-ink-muted)", flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>End</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink)" }}>{formatDate(c.end_date)}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  {c.start_date && c.end_date && (() => {
                    const start = new Date(c.start_date).getTime();
                    const end = new Date(c.end_date).getTime();
                    const now = Date.now();
                    const progress = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
                    return (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)" }}>Progress</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: st.color }}>{daysLeft}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "rgba(75,156,211,0.1)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${progress}%`, borderRadius: 3, background: st.color, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Notes section */}
                {c.notes && (
                  <div style={{ background: "rgba(75,156,211,0.06)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <FileText size={13} style={{ color: "var(--color-ink-secondary)" }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Notes</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--color-ink)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
                      {c.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 8,
                    background: "rgba(75,156,211,0.08)",
                    border: "1px solid rgba(75,156,211,0.12)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-ink-secondary)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
