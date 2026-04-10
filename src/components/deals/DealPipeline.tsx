"use client";

import { useCallback, useState } from "react";
import type { Deal, DealDeliverable, DealPipelineStage } from "@/types";
import { DealCard, STAGE_CONFIG } from "./DealCard";
import { updateDealStage } from "@/lib/actions/deals";

// ─── Pipeline Stages Order ──────────────────────────────────────────────────

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

// ─── Props ──────────────────────────────────────────────────────────────────

interface DealPipelineProps {
  deals: (Deal & { deliverables?: DealDeliverable[] })[];
  onDealClick?: (deal: Deal & { deliverables?: DealDeliverable[] }) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DealPipeline({ deals, onDealClick }: DealPipelineProps) {
  const [localDeals, setLocalDeals] = useState(deals);
  const [dragOverStage, setDragOverStage] = useState<DealPipelineStage | null>(null);

  // Group deals by stage
  const dealsByStage = new Map<DealPipelineStage, (Deal & { deliverables?: DealDeliverable[] })[]>();
  for (const stage of PIPELINE_STAGES) {
    dealsByStage.set(stage, []);
  }
  for (const deal of localDeals) {
    const list = dealsByStage.get(deal.pipeline_stage) ?? [];
    list.push(deal);
    dealsByStage.set(deal.pipeline_stage, list);
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────

  const handleDragOver = useCallback(
    (e: React.DragEvent, stage: DealPipelineStage) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverStage(stage);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStage: DealPipelineStage) => {
      e.preventDefault();
      setDragOverStage(null);

      const dealId = e.dataTransfer.getData("text/plain");
      if (!dealId) return;

      const deal = localDeals.find((d) => d.id === dealId);
      if (!deal || deal.pipeline_stage === newStage) return;

      // Optimistic update
      setLocalDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, pipeline_stage: newStage } : d,
        ),
      );

      // Server update
      const result = await updateDealStage(dealId, newStage);
      if (result.error) {
        // Revert on error
        setLocalDeals((prev) =>
          prev.map((d) =>
            d.id === dealId ? { ...d, pipeline_stage: deal.pipeline_stage } : d,
          ),
        );
      }
    },
    [localDeals],
  );

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 8,
        minHeight: 400,
      }}
    >
      {PIPELINE_STAGES.map((stage) => {
        const stageDeals = dealsByStage.get(stage) ?? [];
        const config = STAGE_CONFIG[stage];
        const isDragOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
            style={{
              minWidth: 180,
              flex: "1 1 0%",
              display: "flex",
              flexDirection: "column",
              background: isDragOver
                ? `${config.color}08`
                : "var(--color-surface-inset)",
              border: `1px solid ${
                isDragOver ? `${config.color}40` : "rgba(var(--accent-rgb),0.08)"
              }`,
              borderRadius: 14,
              transition: "border-color 0.2s, background 0.2s",
              overflow: "hidden",
            }}
          >
            {/* Column Header */}
            <div
              style={{
                padding: "14px 16px 10px",
                borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: config.color,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-ink, #E2E8F0)",
                  }}
                >
                  {config.label}
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: config.color,
                  background: `${config.color}15`,
                  padding: "2px 8px",
                  borderRadius: 8,
                }}
              >
                {stageDeals.length}
              </span>
            </div>

            {/* Cards */}
            <div
              style={{
                flex: 1,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                overflowY: "auto",
                minHeight: 80,
              }}
            >
              {stageDeals.length === 0 ? (
                <div
                  style={{
                    padding: "20px 12px",
                    textAlign: "center",
                    fontSize: 11,
                    color: "var(--color-ink-secondary)",
                    opacity: 0.5,
                  }}
                >
                  Drop deals here
                </div>
              ) : (
                stageDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    compact
                    onClick={onDealClick}
                  />
                ))
              )}
            </div>

            {/* Column Total */}
            {stageDeals.length > 0 && (
              <div
                style={{
                  padding: "8px 16px",
                  borderTop: "1px solid rgba(var(--accent-rgb),0.06)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#34D399",
                  textAlign: "right",
                }}
              >
                $
                {stageDeals
                  .reduce((sum, d) => sum + (d.total_value ?? 0), 0)
                  .toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
