"use client";

import { Clock, Package, Mail, FileText, Calendar } from "lucide-react";
import type { Deal, DealDeliverable, DealPipelineStage } from "@/types";

// ─── Constants ──────────────────────────────────────────────────────────────

export const STAGE_CONFIG: Record<
  DealPipelineStage,
  { label: string; color: string }
> = {
  lead: { label: "Lead", color: "#6B7280" },
  outreach: { label: "Outreach", color: "#3B82F6" },
  negotiating: { label: "Negotiating", color: "#4B9CD3" },
  contracted: { label: "Contracted", color: "#F59E0B" },
  in_progress: { label: "In Progress", color: "#10B981" },
  delivered: { label: "Delivered", color: "#06B6D4" },
  invoiced: { label: "Invoiced", color: "#F97316" },
  paid: { label: "Paid", color: "#22C55E" },
  completed: { label: "Completed", color: "#4B9CD3" },
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface DealCardProps {
  deal: Deal & { deliverables?: DealDeliverable[] };
  onClick?: (deal: Deal & { deliverables?: DealDeliverable[] }) => void;
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DealCard({ deal, onClick, compact = false }: DealCardProps) {
  const stage = STAGE_CONFIG[deal.pipeline_stage] ?? STAGE_CONFIG.lead;
  const deliverables = deal.deliverables ?? [];
  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter(
    (d) => d.status === "approved",
  ).length;
  const progress =
    totalDeliverables > 0
      ? Math.round((completedDeliverables / totalDeliverables) * 100)
      : 0;

  // Find nearest deadline
  const nextDeadline = deliverables
    .filter((d) => d.deadline && d.status !== "approved")
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];

  const daysUntilDeadline = nextDeadline?.deadline
    ? Math.ceil(
        (new Date(nextDeadline.deadline).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const initials = deal.brand_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (compact) {
    return (
      <div
        onClick={() => onClick?.(deal)}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", deal.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        style={{
          background: "var(--color-surface-card)",
          borderRadius: 10,
          padding: 12,
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-ink, #E2E8F0)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
          >
            {deal.brand_name}
          </div>
        </div>

        {deal.total_value != null && deal.total_value > 0 && (
          <div style={{ fontSize: 14, fontWeight: 800, color: "#34D399", marginBottom: 8 }}>
            ${deal.total_value.toLocaleString()}
          </div>
        )}

        {/* Progress bar */}
        {totalDeliverables > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                height: 4,
                background: "rgba(var(--accent-rgb),0.08)",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: stage.color,
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                fontSize: 10,
                color: "var(--color-ink-secondary)",
              }}
            >
              <span>
                {completedDeliverables}/{totalDeliverables} done
              </span>
              {daysUntilDeadline !== null && (
                <span
                  style={{
                    color: daysUntilDeadline < 3 ? "#EF4444" : "var(--color-ink-secondary)",
                    fontWeight: daysUntilDeadline < 3 ? 700 : 400,
                  }}
                >
                  {daysUntilDeadline < 0
                    ? "Overdue"
                    : daysUntilDeadline === 0
                      ? "Due today"
                      : `${daysUntilDeadline}d left`}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Payment percentage
  const paymentPercent =
    deal.total_value && deal.total_value > 0
      ? Math.round((deal.paid_amount / deal.total_value) * 100)
      : 0;

  const createdDate = new Date(deal.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Full card (for list view)
  return (
    <div
      onClick={() => onClick?.(deal)}
      style={{
        background: "var(--color-surface-card)",
        border: "1px solid rgba(var(--accent-rgb),0.12)",
        borderRadius: 14,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "border-color 0.2s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.borderColor = `${stage.color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(var(--accent-rgb),0.12)";
      }}
    >
      {/* Row 1: Brand info + value */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 14, flex: 1 }}>
          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: `linear-gradient(135deg, ${stage.color}aa, ${stage.color})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink, #E2E8F0)" }}>
                {deal.brand_name}
              </div>
              <span
                style={{
                  padding: "3px 10px",
                  background: `${stage.color}18`,
                  color: stage.color,
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {stage.label}
              </span>
            </div>
            {/* Contact + date */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 5, fontSize: 11, color: "var(--color-ink-secondary)" }}>
              {deal.contact_email && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Mail size={11} />
                  {deal.contact_email}
                </span>
              )}
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Calendar size={11} />
                {createdDate}
              </span>
            </div>
          </div>
        </div>

        {/* Value block */}
        <div style={{ textAlign: "right", flexShrink: 0, minWidth: 100 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#34D399" }}>
            {deal.total_value != null && deal.total_value > 0
              ? `$${deal.total_value.toLocaleString()}`
              : "--"}
          </div>
          {deal.paid_amount > 0 && (
            <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 2 }}>
              ${deal.paid_amount.toLocaleString()} paid
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Details grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid rgba(var(--accent-rgb),0.06)",
        }}
      >
        {/* Deliverables */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={13} style={{ color: "var(--color-ink-secondary)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Deliverables
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink, #E2E8F0)", marginTop: 1 }}>
              {totalDeliverables > 0
                ? `${completedDeliverables}/${totalDeliverables} done`
                : "None yet"}
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={13} style={{ color: daysUntilDeadline !== null && daysUntilDeadline < 3 ? "#EF4444" : "var(--color-ink-secondary)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Next Deadline
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: daysUntilDeadline !== null && daysUntilDeadline < 3
                  ? "#EF4444"
                  : "var(--color-ink, #E2E8F0)",
                marginTop: 1,
              }}
            >
              {daysUntilDeadline === null
                ? "No deadline"
                : daysUntilDeadline < 0
                  ? "Overdue"
                  : daysUntilDeadline === 0
                    ? "Due today"
                    : `${daysUntilDeadline} days left`}
            </div>
          </div>
        </div>

        {/* Payment progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              border: `2px solid ${paymentPercent === 100 ? "#22C55E" : "#34D399"}`,
              background: paymentPercent === 100 ? "#22C55E" : "transparent",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Payment
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: "rgba(var(--accent-rgb),0.08)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${paymentPercent}%`,
                    background: paymentPercent === 100 ? "#22C55E" : "#34D399",
                    borderRadius: 2,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink, #E2E8F0)", whiteSpace: "nowrap" }}>
                {paymentPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Notes preview */}
        {deal.notes && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={13} style={{ color: "var(--color-ink-secondary)", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Notes
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-ink, #E2E8F0)",
                  marginTop: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {deal.notes}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deliverables progress bar (when there are deliverables) */}
      {totalDeliverables > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              height: 4,
              background: "rgba(var(--accent-rgb),0.08)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: stage.color,
                borderRadius: 2,
                transition: "width 0.3s",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              fontSize: 10,
              color: "var(--color-ink-secondary)",
            }}
          >
            <span>Deliverable progress</span>
            <span style={{ fontWeight: 700 }}>{progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
