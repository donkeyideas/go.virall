"use client";

import { useState, useEffect } from "react";
import {
  X,
  Building2,
  Mail,
  DollarSign,
  Package,
  FileText,
  Link2,
  MessageSquare,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  Send as SendIcon,
  Receipt,
  CreditCard,
} from "lucide-react";
import type { Deal, DealDeliverable, DealPipelineStage, TrustScore } from "@/types";
import { STAGE_CONFIG } from "./DealCard";
import {
  updateDeal,
  updateDealStage,
  addDeliverable,
  updateDeliverable,
  type UpdateDealInput,
  type AddDeliverableInput,
} from "@/lib/actions/deals";
import { getTrustScore } from "@/lib/dal/trust";
import { DeliverableSubmitForm } from "./DeliverableSubmitForm";
import { DeliverableReviewPanel } from "./DeliverableReviewPanel";
import { SubmissionHistory } from "./SubmissionHistory";
import { DealClosurePanel } from "./DealClosurePanel";
import { TrustScoreDetail } from "./TrustScoreDetail";
import { TrustBadge } from "./TrustBadge";

// ─── Constants ──────────────────────────────────────────────────────────────

const PIPELINE_STAGES: DealPipelineStage[] = [
  "lead",
  "outreach",
  "negotiating",
  "contracted",
  "in_progress",
  "delivered",
  "invoiced",
  "paid",
  "completed",
];

const DELIVERABLE_STATUSES: DealDeliverable["status"][] = [
  "pending",
  "in_progress",
  "submitted",
  "revision",
  "approved",
];

const DELIVERABLE_STATUS_CONFIG: Record<
  DealDeliverable["status"],
  { label: string; color: string }
> = {
  pending: { label: "Pending", color: "#6B7280" },
  in_progress: { label: "In Progress", color: "#3B82F6" },
  submitted: { label: "Submitted", color: "#F59E0B" },
  revision: { label: "Revision", color: "#EF4444" },
  approved: { label: "Approved", color: "#22C55E" },
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--color-surface-inset)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 8,
  color: "var(--color-ink, #E2E8F0)",
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface-card)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 14,
  padding: 24,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--color-ink-secondary)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface DealDetailProps {
  deal: Deal & { deliverables?: DealDeliverable[]; brand_logo_url?: string | null };
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  userRole?: "creator" | "brand";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DealDetail({ deal, isOpen, onClose, onUpdate, userRole = "creator" }: DealDetailProps) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit state
  const [brandName, setBrandName] = useState(deal.brand_name);
  const [contactEmail, setContactEmail] = useState(deal.contact_email ?? "");
  const [totalValue, setTotalValue] = useState(deal.total_value ?? 0);
  const [paidAmount, setPaidAmount] = useState(deal.paid_amount ?? 0);
  const [notes, setNotes] = useState(deal.notes ?? "");
  const [localStage, setLocalStage] = useState(deal.pipeline_stage);
  const [localDeliverables, setLocalDeliverables] = useState(deal.deliverables ?? []);

  // Trust score for the other party
  const [otherTrustScore, setOtherTrustScore] = useState<TrustScore | null>(null);
  const [showTrustDetail, setShowTrustDetail] = useState(false);

  useEffect(() => {
    // For creators: show brand's trust score. For brands: we'd need creator profile ID.
    if (deal.brand_profile_id && userRole === "creator") {
      getTrustScore(deal.brand_profile_id).then(setOtherTrustScore);
    }
  }, [deal.brand_profile_id, userRole]);

  // Deliverable verification
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());
  const [showSubmitForm, setShowSubmitForm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // New deliverable form
  const [showNewDeliverable, setShowNewDeliverable] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newContentType, setNewContentType] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);

  // Reset form when deal changes
  useEffect(() => {
    setBrandName(deal.brand_name);
    setContactEmail(deal.contact_email ?? "");
    setTotalValue(deal.total_value ?? 0);
    setPaidAmount(deal.paid_amount ?? 0);
    setNotes(deal.notes ?? "");
    setLocalStage(deal.pipeline_stage);
    setLocalDeliverables(deal.deliverables ?? []);
    setEditMode(false);
    setMessage(null);
  }, [deal]);

  const stageConfig = STAGE_CONFIG[localStage];

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleStageChange = async (newStage: DealPipelineStage) => {
    const prev = localStage;
    setLocalStage(newStage);
    const result = await updateDealStage(deal.id, newStage);
    if (result.error) {
      setLocalStage(prev);
      setMessage({ type: "error", text: result.error });
    } else {
      onUpdate?.();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    const updates: UpdateDealInput = {};
    if (brandName !== deal.brand_name) updates.brand_name = brandName;
    if (contactEmail !== (deal.contact_email ?? "")) updates.contact_email = contactEmail;
    if (totalValue !== (deal.total_value ?? 0)) updates.total_value = totalValue;
    if (paidAmount !== (deal.paid_amount ?? 0)) updates.paid_amount = paidAmount;
    if (notes !== (deal.notes ?? "")) updates.notes = notes;

    const result = await updateDeal(deal.id, updates);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Deal updated." });
      setEditMode(false);
      onUpdate?.();
    }
    setLoading(false);
  };

  const handleAddDeliverable = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);

    const data: AddDeliverableInput = {
      title: newTitle,
      platform: newPlatform || undefined,
      content_type: newContentType || undefined,
      deadline: newDeadline || undefined,
      payment_amount: newPaymentAmount || undefined,
    };

    const result = await addDeliverable(deal.id, data);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      // Add locally for immediate feedback
      setLocalDeliverables((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          deal_id: deal.id,
          title: newTitle,
          platform: newPlatform || null,
          content_type: newContentType || null,
          deadline: newDeadline || null,
          status: "pending" as const,
          payment_amount: newPaymentAmount || null,
          submission_url: null,
          submitted_at: null,
          reviewed_at: null,
          reviewed_by: null,
          revision_comment: null,
          created_at: new Date().toISOString(),
        },
      ]);
      setShowNewDeliverable(false);
      setNewTitle("");
      setNewPlatform("");
      setNewContentType("");
      setNewDeadline("");
      setNewPaymentAmount(0);
      onUpdate?.();
    }
    setLoading(false);
  };

  const handleDeliverableStatus = async (
    deliverableId: string,
    newStatus: DealDeliverable["status"],
  ) => {
    // Optimistic
    setLocalDeliverables((prev) =>
      prev.map((d) => (d.id === deliverableId ? { ...d, status: newStatus } : d)),
    );

    const result = await updateDeliverable(deliverableId, { status: newStatus });
    if (result.error) {
      // Revert
      setLocalDeliverables(deal.deliverables ?? []);
      setMessage({ type: "error", text: result.error });
    } else {
      onUpdate?.();
    }
  };

  // Quick actions
  const handleMarkDelivered = () => handleStageChange("delivered");
  const handleSendInvoice = () => handleStageChange("invoiced");
  const handleMarkPaid = () => handleStageChange("paid");

  // ─── Render ────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
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
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
        }}
      >
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(var(--accent-rgb),0.1)",
            flexShrink: 0,
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
            Deal Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(var(--accent-rgb),0.08)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--color-ink-secondary)",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Title + Status row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 24,
              marginTop: 16,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--color-ink, #E2E8F0)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {brandName}
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  fontSize: 12,
                  color: "var(--color-ink-secondary)",
                }}
              >
                {deal.brand_logo_url ? (
                  <img
                    src={deal.brand_logo_url}
                    alt={brandName}
                    style={{ width: 20, height: 20, borderRadius: 6, objectFit: "cover" }}
                  />
                ) : (
                  <Building2 size={13} />
                )}
                {contactEmail && (
                  <>
                    <Mail size={11} />
                    <span>{contactEmail}</span>
                  </>
                )}
                {deal.is_from_platform && otherTrustScore && (
                  <TrustBadge trustScore={otherTrustScore} size="sm" />
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background: `${stageConfig.color}18`,
                borderRadius: 20,
                color: stageConfig.color,
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <Package size={14} />
              {stageConfig.label}
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div
              style={{
                padding: "10px 16px",
                background:
                  message.type === "error"
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(52,211,153,0.1)",
                border: `1px solid ${
                  message.type === "error"
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(52,211,153,0.2)"
                }`,
                borderRadius: 10,
                color: message.type === "error" ? "#EF4444" : "#34D399",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {message.text}
            </div>
          )}

          {/* Notes / Description */}
          {!editMode && notes && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-ink, #E2E8F0)",
                  margin: 0,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {notes}
              </p>
            </div>
          )}

          {/* KPI Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {/* Total Value */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <DollarSign size={14} color="#34D399" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase" }}>
                  Total Value
                </span>
              </div>
              {editMode ? (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  style={inputStyle}
                  value={totalValue || ""}
                  onChange={(e) =>
                    setTotalValue(parseFloat(e.target.value) || 0)
                  }
                />
              ) : (
                <div style={{ fontSize: 22, fontWeight: 800, color: "#34D399" }}>
                  ${totalValue.toLocaleString()}
                </div>
              )}
            </div>

            {/* Paid Amount */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CreditCard size={14} color="var(--color-editorial-blue)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase" }}>
                  Paid Amount
                </span>
              </div>
              {editMode ? (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  style={inputStyle}
                  value={paidAmount || ""}
                  onChange={(e) =>
                    setPaidAmount(parseFloat(e.target.value) || 0)
                  }
                />
              ) : (
                <>
                  <div style={{ fontSize: 13, color: "var(--color-ink, #E2E8F0)", fontWeight: 600 }}>
                    ${paidAmount.toLocaleString()}
                  </div>
                  {totalValue > 0 && (
                    <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
                      {Math.round((paidAmount / totalValue) * 100)}% of total
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Deliverables count */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Package size={14} color="#FFB84D" />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase" }}>
                  Deliverables
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink, #E2E8F0)" }}>
                {localDeliverables.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 4 }}>
                {localDeliverables.filter((d) => d.status === "approved").length} completed
              </div>
            </div>
          </div>

          {/* Edit Details Section (collapsed by default) */}
          {editMode && (
            <div
              style={{
                ...cardStyle,
                marginBottom: 16,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>
                    <Building2 size={10} style={{ marginRight: 4 }} />
                    Brand Name
                  </label>
                  <input
                    style={inputStyle}
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    <Mail size={10} style={{ marginRight: 4 }} />
                    Contact Email
                  </label>
                  <input
                    style={inputStyle}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>
                  <FileText size={10} style={{ marginRight: 4 }} />
                  Notes
                </label>
                <textarea
                  style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes..."
                />
              </div>
            </div>
          )}

          {/* Pipeline Stage */}
          <div style={{ ...cardStyle, marginBottom: 16, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Pipeline Stage
              </span>
              {!editMode && (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  style={{
                    padding: "4px 12px",
                    background: "rgba(var(--accent-rgb),0.08)",
                    border: "1px solid rgba(var(--accent-rgb),0.15)",
                    borderRadius: 6,
                    color: "var(--color-editorial-blue)",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Edit Details
                </button>
              )}
            </div>
            <div style={{ padding: "12px 20px" }}>
              <div style={{ position: "relative" }}>
                <select
                  value={localStage}
                  onChange={(e) =>
                    handleStageChange(e.target.value as DealPipelineStage)
                  }
                  style={{
                    ...inputStyle,
                    appearance: "none",
                    paddingRight: 32,
                    color: stageConfig.color,
                    fontWeight: 700,
                  }}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_CONFIG[s].label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-ink-secondary)",
                    pointerEvents: "none",
                  }}
                />
              </div>
              {editMode && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setBrandName(deal.brand_name);
                      setContactEmail(deal.contact_email ?? "");
                      setTotalValue(deal.total_value ?? 0);
                      setPaidAmount(deal.paid_amount ?? 0);
                      setNotes(deal.notes ?? "");
                    }}
                    style={{
                      padding: "6px 14px",
                      background: "var(--color-surface-card)",
                      border: "1px solid rgba(var(--accent-rgb),0.12)",
                      borderRadius: 8,
                      color: "var(--color-ink-secondary)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSave}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 14px",
                      background: "var(--color-editorial-blue)",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {loading && <Loader2 size={11} className="animate-spin" />}
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trust Score — other party */}
          {deal.is_from_platform && otherTrustScore && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowTrustDetail((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--color-surface-card)",
                  border: "1px solid rgba(var(--accent-rgb),0.12)",
                  borderRadius: 14,
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Brand Trust Score
                </span>
                <TrustBadge trustScore={otherTrustScore} size="sm" />
              </button>
              {showTrustDetail && (
                <div style={{ marginTop: 10 }}>
                  <TrustScoreDetail trustScore={otherTrustScore} />
                </div>
              )}
            </div>
          )}

          {/* Deliverables */}
          <div style={{ ...cardStyle, marginBottom: 16, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-ink-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Package size={13} />
                Deliverables ({localDeliverables.length})
              </div>
              <button
                type="button"
                onClick={() => setShowNewDeliverable(!showNewDeliverable)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  background: "rgba(var(--accent-rgb),0.08)",
                  border: "1px solid rgba(var(--accent-rgb),0.15)",
                  borderRadius: 6,
                  color: "var(--color-editorial-blue)",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Plus size={11} />
                Add
              </button>
            </div>

            {/* New Deliverable Form */}
            {showNewDeliverable && (
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(var(--accent-rgb),0.08)",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>Title *</label>
                    <input
                      style={inputStyle}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Instagram Reel"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Platform</label>
                    <input
                      style={inputStyle}
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value)}
                      placeholder="Instagram, TikTok..."
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Content Type</label>
                    <input
                      style={inputStyle}
                      value={newContentType}
                      onChange={(e) => setNewContentType(e.target.value)}
                      placeholder="Reel, Story..."
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Deadline</label>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Payment ($)</label>
                    <input
                      type="number"
                      min={0}
                      style={inputStyle}
                      value={newPaymentAmount || ""}
                      onChange={(e) =>
                        setNewPaymentAmount(parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setShowNewDeliverable(false)}
                    style={{
                      padding: "6px 12px",
                      background: "var(--color-surface-card)",
                      border: "1px solid rgba(var(--accent-rgb),0.12)",
                      borderRadius: 6,
                      color: "var(--color-ink-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={loading || !newTitle.trim()}
                    onClick={handleAddDeliverable}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 12px",
                      background: "var(--color-editorial-blue)",
                      border: "none",
                      borderRadius: 6,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {loading && <Loader2 size={11} className="animate-spin" />}
                    Add Deliverable
                  </button>
                </div>
              </div>
            )}

            {/* Deliverable List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {localDeliverables.length === 0 ? (
                <div
                  style={{
                    padding: "20px 20px",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--color-ink-secondary)",
                  }}
                >
                  No deliverables yet. Add one above.
                </div>
              ) : (
                localDeliverables.map((d) => {
                  const dConfig = DELIVERABLE_STATUS_CONFIG[d.status];
                  const isExpanded = expandedDeliverables.has(d.id);
                  const showSubmit = showSubmitForm === d.id;
                  const canSubmit = userRole === "creator" && ["pending", "in_progress", "revision"].includes(d.status);
                  const canReview = userRole === "brand" && d.status === "submitted";

                  return (
                    <div
                      key={d.id}
                      style={{
                        borderTop: "1px solid rgba(var(--accent-rgb),0.06)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Main row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 20px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink, #E2E8F0)" }}>
                            {d.title}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 10, color: "var(--color-ink-secondary)", flexWrap: "wrap" }}>
                            {d.platform && <span>{d.platform}</span>}
                            {d.deadline && (
                              <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Clock size={9} />
                                {new Date(d.deadline).toLocaleDateString()}
                              </span>
                            )}
                            {d.payment_amount != null && (
                              <span style={{ color: "#34D399", fontWeight: 700 }}>
                                ${d.payment_amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {/* Revision comment */}
                          {d.status === "revision" && d.revision_comment && (
                            <div style={{ fontSize: 10, color: "#EF4444", marginTop: 4, lineHeight: 1.4 }}>
                              Revision: {d.revision_comment}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {/* Status badge */}
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: dConfig.color,
                              textTransform: "uppercase",
                              letterSpacing: 0.4,
                            }}
                          >
                            {dConfig.label}
                          </span>

                          {/* Action button */}
                          {canSubmit && (
                            <button
                              type="button"
                              onClick={() => setShowSubmitForm(showSubmit ? null : d.id)}
                              style={{
                                padding: "4px 10px",
                                background: "rgba(var(--accent-rgb),0.1)",
                                border: "1px solid rgba(var(--accent-rgb),0.2)",
                                borderRadius: 6,
                                color: "var(--color-editorial-blue)",
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Submit
                            </button>
                          )}
                          {canReview && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedDeliverables((prev) => {
                                  const next = new Set(prev);
                                  next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                                  return next;
                                });
                              }}
                              style={{
                                padding: "4px 10px",
                                background: "rgba(245,158,11,0.1)",
                                border: "1px solid rgba(245,158,11,0.2)",
                                borderRadius: 6,
                                color: "#F59E0B",
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Review
                            </button>
                          )}

                          {/* Expand toggle for history */}
                          {d.status !== "pending" && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedDeliverables((prev) => {
                                  const next = new Set(prev);
                                  next.has(d.id) ? next.delete(d.id) : next.add(d.id);
                                  return next;
                                });
                              }}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 4,
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--color-ink-secondary)",
                                transform: isExpanded ? "rotate(180deg)" : "none",
                                transition: "transform 0.15s ease",
                              }}
                            >
                              <ChevronDown size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Submit form (creator) */}
                      {showSubmit && (
                        <div style={{ padding: "0 14px 14px" }}>
                          <DeliverableSubmitForm
                            deliverableId={d.id}
                            onSubmitted={() => {
                              setShowSubmitForm(null);
                              setRefreshKey((k) => k + 1);
                              onUpdate?.();
                            }}
                          />
                        </div>
                      )}

                      {/* Review panel (brand) + submission history */}
                      {isExpanded && (
                        <div style={{ padding: "0 14px 14px" }}>
                          {canReview && (
                            <DeliverableReviewPanel
                              deliverable={d}
                              onReviewed={() => {
                                setRefreshKey((k) => k + 1);
                                onUpdate?.();
                              }}
                            />
                          )}
                          <SubmissionHistory
                            deliverableId={d.id}
                            refreshKey={refreshKey}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Links */}
          {(deal.proposal_id || deal.thread_id || deal.contract_url) && (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {deal.proposal_id && (
                <a
                  href={userRole === "brand" ? `/brand/proposals?id=${deal.proposal_id}` : `/dashboard/business?tab=proposals&id=${deal.proposal_id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    background: "rgba(var(--accent-rgb),0.06)",
                    border: "1px solid rgba(var(--accent-rgb),0.12)",
                    borderRadius: 6,
                    color: "var(--color-editorial-blue)",
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Link2 size={11} />
                  View Proposal
                </a>
              )}
              {deal.thread_id && (
                <a
                  href={userRole === "brand" ? `/brand/messages?thread=${deal.thread_id}` : `/dashboard/inbox?tab=messages&thread=${deal.thread_id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    background: "rgba(var(--accent-rgb),0.06)",
                    border: "1px solid rgba(var(--accent-rgb),0.12)",
                    borderRadius: 6,
                    color: "var(--color-editorial-blue)",
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <MessageSquare size={11} />
                  Message Thread
                </a>
              )}
              {deal.contract_url && (
                <a
                  href={deal.contract_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    background: "rgba(var(--accent-rgb),0.06)",
                    border: "1px solid rgba(var(--accent-rgb),0.12)",
                    borderRadius: 6,
                    color: "var(--color-editorial-blue)",
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <FileText size={11} />
                  Contract
                </a>
              )}
            </div>
          )}

          {/* Payment Tracking */}
          {totalValue > 0 && (
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ ...labelStyle, marginBottom: 10 }}>Payment Progress</div>
              <div
                style={{
                  height: 8,
                  background: "rgba(var(--accent-rgb),0.08)",
                  borderRadius: 4,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.round((paidAmount / totalValue) * 100))}%`,
                    background: "linear-gradient(90deg, #34D399, #22C55E)",
                    borderRadius: 4,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "#34D399", fontWeight: 700 }}>
                  ${paidAmount.toLocaleString()} paid
                </span>
                <span style={{ color: "var(--color-ink-secondary)" }}>
                  ${totalValue.toLocaleString()} total
                </span>
              </div>
            </div>
          )}

          {/* Deal Closure Panel (Honor System) */}
          <DealClosurePanel
            dealId={deal.id}
            closureStatus={deal.closure_status ?? null}
            finalOutcome={deal.final_outcome ?? null}
            disputeDeadline={deal.dispute_deadline ?? null}
            isFromPlatform={deal.is_from_platform}
            pipelineStage={localStage}
          />

          {/* Disclaimer */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(255,184,77,0.06)",
              border: "1px solid rgba(255,184,77,0.15)",
              borderRadius: 10,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 11, color: "#FFB84D", fontWeight: 700 }}>
              Disclaimer:
            </span>{" "}
            <span style={{ fontSize: 11, color: "var(--color-ink-secondary)" }}>
              Go Virall facilitates connections only. All payments and financial
              agreements are handled directly between brand and creator.
            </span>
          </div>

          {/* Action buttons (right-aligned, like ProposalView) */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {["contracted", "in_progress"].includes(localStage) && (
              <button
                type="button"
                onClick={handleMarkDelivered}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "10px 20px",
                  background: "rgba(6,182,212,0.1)",
                  border: "1px solid rgba(6,182,212,0.2)",
                  borderRadius: 8,
                  color: "#06B6D4",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <CheckCircle2 size={13} />
                Mark Delivered
              </button>
            )}
            {localStage === "delivered" && (
              <button
                type="button"
                onClick={handleSendInvoice}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "10px 20px",
                  background: "rgba(249,115,22,0.1)",
                  border: "1px solid rgba(249,115,22,0.2)",
                  borderRadius: 8,
                  color: "#F97316",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Receipt size={13} />
                Send Invoice
              </button>
            )}
            {localStage === "invoiced" && (
              <button
                type="button"
                onClick={handleMarkPaid}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "10px 20px",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 8,
                  color: "#22C55E",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <DollarSign size={13} />
                Mark Paid
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
