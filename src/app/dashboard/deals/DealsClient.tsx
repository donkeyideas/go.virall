"use client";

import { useState, useCallback } from "react";
import {
  LayoutGrid,
  List,
  Plus,
  Filter,
  DollarSign,
  Loader2,
  X,
} from "lucide-react";
import type { Deal, DealDeliverable, DealPipelineStage } from "@/types";
import { DealPipeline } from "@/components/deals/DealPipeline";
import { DealCard, STAGE_CONFIG } from "@/components/deals/DealCard";
import { DealDetail } from "@/components/deals/DealDetail";
import { createDeal, getDeal, type CreateDealInput } from "@/lib/actions/deals";

// ─── Constants ────���─────────────────────────────────────────────────────────

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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--color-surface-inset)",
  border: "1px solid rgba(var(--accent-rgb),0.12)",
  borderRadius: 10,
  color: "var(--color-ink, #E2E8F0)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--color-ink-secondary)",
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface DealsClientProps {
  deals: (Deal & { deliverables?: DealDeliverable[] })[];
  accountType?: "creator" | "brand";
}

// ─── Component ────��───────────────────────���─────────────────────────────────

export default function DealsClient({ deals, accountType = "creator" }: DealsClientProps) {
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [stageFilter, setStageFilter] = useState<DealPipelineStage | "all">("all");
  const [selectedDeal, setSelectedDeal] = useState<(Deal & { deliverables?: DealDeliverable[] }) | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localDeals, setLocalDeals] = useState(deals);

  // Add deal form
  const [newBrandName, setNewBrandName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newTotalValue, setNewTotalValue] = useState<number>(0);
  const [newNotes, setNewNotes] = useState("");
  const [newStage, setNewStage] = useState<DealPipelineStage>("lead");

  // Summary stats
  const totalPipelineValue = localDeals.reduce(
    (sum, d) => sum + (d.total_value ?? 0),
    0,
  );
  const activeDeals = localDeals.filter(
    (d) => !["paid", "completed"].includes(d.pipeline_stage),
  ).length;
  const wonDeals = localDeals.filter((d) =>
    ["paid", "completed"].includes(d.pipeline_stage),
  ).length;

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleDealClick = useCallback(
    async (deal: Deal & { deliverables?: DealDeliverable[] }) => {
      // Fetch full deal with deliverables
      const result = await getDeal(deal.id);
      if (result.data) {
        setSelectedDeal(result.data);
      } else {
        setSelectedDeal(deal);
      }
    },
    [],
  );

  const handleAddDeal = async () => {
    if (!newBrandName.trim()) return;
    setLoading(true);

    const data: CreateDealInput = {
      brand_name: newBrandName,
      contact_email: newContactEmail || undefined,
      total_value: newTotalValue || undefined,
      notes: newNotes || undefined,
      pipeline_stage: newStage,
    };

    const result = await createDeal(data);
    if (result.success && result.dealId) {
      // Add to local deals optimistically
      const newDeal: Deal & { deliverables: DealDeliverable[] } = {
        id: result.dealId,
        organization_id: "",
        brand_name: newBrandName,
        contact_email: newContactEmail || null,
        status: "inquiry",
        pipeline_stage: newStage,
        total_value: newTotalValue || null,
        paid_amount: 0,
        notes: newNotes || null,
        proposal_id: null,
        thread_id: null,
        brand_profile_id: null,
        contract_url: null,
        is_from_platform: false,
        closure_status: null,
        closed_at: null,
        dispute_deadline: null,
        final_outcome: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deliverables: [],
      };
      setLocalDeals((prev) => [newDeal, ...prev]);
      setShowAddForm(false);
      setNewBrandName("");
      setNewContactEmail("");
      setNewTotalValue(0);
      setNewNotes("");
      setNewStage("lead");
    }
    setLoading(false);
  };

  const filteredDeals =
    stageFilter === "all"
      ? localDeals
      : localDeals.filter((d) => d.pipeline_stage === stageFilter);

  // ─── Render ────────────���───────────────────────────────────────────

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--color-ink, #E2E8F0)",
              margin: 0,
            }}
          >
            Deal Pipeline
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", margin: "6px 0 0" }}>
            Track and manage your brand collaborations
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {/* View toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {[
              { key: "pipeline" as const, icon: LayoutGrid, label: "Pipeline" },
              { key: "list" as const, icon: List, label: "List" },
            ].map((v) => {
              const isActive = viewMode === v.key;
              const Icon = v.icon;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setViewMode(v.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 16px",
                    background: isActive ? "rgba(var(--accent-rgb),0.12)" : "transparent",
                    border: "none",
                    color: isActive ? "var(--color-editorial-blue)" : "var(--color-ink-secondary)",
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <Icon size={14} />
                  {v.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 20px",
              background: "var(--color-editorial-blue)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <Plus size={14} />
            Add Deal
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pipeline Value
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#34D399", marginTop: 6 }}>
            ${totalPipelineValue.toLocaleString()}
          </div>
        </div>
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Active Deals
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink, #E2E8F0)", marginTop: 6 }}>
            {activeDeals}
          </div>
        </div>
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(var(--accent-rgb),0.12)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Won/Completed
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#22C55E", marginTop: 6 }}>
            {wonDeals}
          </div>
        </div>
      </div>

      {/* Add Deal Form (Modal Overlay) */}
      {showAddForm && (
        <>
          <div
            onClick={() => setShowAddForm(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 100,
              backdropFilter: "blur(4px)",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(480px, 90vw)",
              background: "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 16,
              padding: 28,
              zIndex: 101,
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "var(--color-ink, #E2E8F0)",
                  margin: 0,
                }}
              >
                Add New Deal
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--color-surface-inset)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--color-ink-secondary)",
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Brand Name *</label>
                <input
                  style={inputStyle}
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. Nike, Glossier..."
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Contact Email</label>
                  <input
                    style={inputStyle}
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="contact@brand.com"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Deal Value ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    style={inputStyle}
                    value={newTotalValue || ""}
                    onChange={(e) =>
                      setNewTotalValue(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Pipeline Stage</label>
                <select
                  style={inputStyle}
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as DealPipelineStage)}
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_CONFIG[s].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Any context or details about this deal..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: "10px 20px",
                    background: "var(--color-surface-inset)",
                    border: "1px solid rgba(var(--accent-rgb),0.12)",
                    borderRadius: 10,
                    color: "var(--color-ink-secondary)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading || !newBrandName.trim()}
                  onClick={handleAddDeal}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 24px",
                    background:
                      !newBrandName.trim()
                        ? "rgba(var(--accent-rgb),0.2)"
                        : "var(--color-editorial-blue)",
                    border: "none",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: !newBrandName.trim() || loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <DollarSign size={14} />
                  )}
                  Create Deal
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pipeline View */}
      {viewMode === "pipeline" ? (
        <DealPipeline deals={localDeals} onDealClick={handleDealClick} />
      ) : (
        <>
          {/* List View Filters */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <Filter size={14} style={{ color: "var(--color-ink-secondary)" }} />
            <button
              type="button"
              onClick={() => setStageFilter("all")}
              style={{
                padding: "6px 14px",
                background:
                  stageFilter === "all"
                    ? "rgba(var(--accent-rgb),0.12)"
                    : "var(--color-surface-card)",
                border: `1px solid ${
                  stageFilter === "all"
                    ? "rgba(var(--accent-rgb),0.3)"
                    : "rgba(var(--accent-rgb),0.08)"
                }`,
                borderRadius: 8,
                color:
                  stageFilter === "all"
                    ? "var(--color-editorial-blue)"
                    : "var(--color-ink-secondary)",
                fontSize: 11,
                fontWeight: stageFilter === "all" ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              All ({localDeals.length})
            </button>
            {PIPELINE_STAGES.map((stage) => {
              const count = localDeals.filter(
                (d) => d.pipeline_stage === stage,
              ).length;
              if (count === 0) return null;
              const config = STAGE_CONFIG[stage];
              return (
                <button
                  key={stage}
                  type="button"
                  onClick={() => setStageFilter(stage)}
                  style={{
                    padding: "6px 14px",
                    background:
                      stageFilter === stage
                        ? `${config.color}18`
                        : "var(--color-surface-card)",
                    border: `1px solid ${
                      stageFilter === stage
                        ? `${config.color}40`
                        : "rgba(var(--accent-rgb),0.08)"
                    }`,
                    borderRadius: 8,
                    color:
                      stageFilter === stage
                        ? config.color
                        : "var(--color-ink-secondary)",
                    fontSize: 11,
                    fontWeight: stageFilter === stage ? 700 : 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Deal Cards List */}
          {filteredDeals.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                background: "var(--color-surface-card)",
                border: "1px solid rgba(var(--accent-rgb),0.12)",
                borderRadius: 14,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "rgba(var(--accent-rgb),0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <DollarSign
                  size={24}
                  style={{ color: "var(--color-ink-secondary)" }}
                />
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-ink, #E2E8F0)",
                  marginBottom: 6,
                }}
              >
                No deals yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--color-ink-secondary)",
                  textAlign: "center",
                  maxWidth: 360,
                }}
              >
                Start tracking your brand collaborations by adding a deal or accepting a proposal.
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 20px",
                  background: "var(--color-editorial-blue)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginTop: 20,
                }}
              >
                <Plus size={14} />
                Add Your First Deal
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={handleDealClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Deal Detail Slide-over */}
      {selectedDeal && (
        <DealDetail
          deal={selectedDeal}
          isOpen={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={() => {
            // In a real app, we'd re-fetch deals here
            // For now, close the panel to see the updated pipeline
          }}
          userRole={accountType}
        />
      )}
    </div>
  );
}
