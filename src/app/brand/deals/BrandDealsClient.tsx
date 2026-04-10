"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Handshake,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Package,
  Truck,
  CreditCard,
  Star,
} from "lucide-react";
import type { Deal, DealDeliverable, DealPipelineStage } from "@/types";
import { DealDetail } from "@/components/deals/DealDetail";

const stageConfig: Record<
  DealPipelineStage,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  lead: { label: "Lead", color: "var(--color-ink-secondary)", bg: "rgba(75,156,211,0.08)", icon: Clock },
  outreach: { label: "Outreach", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: AlertCircle },
  negotiating: { label: "Negotiating", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: AlertCircle },
  contracted: { label: "Contracted", color: "rgba(75,156,211,0.9)", bg: "rgba(75,156,211,0.12)", icon: FileText },
  in_progress: { label: "In Progress", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", icon: Package },
  delivered: { label: "Delivered", color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: Truck },
  invoiced: { label: "Invoiced", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", icon: CreditCard },
  paid: { label: "Paid", color: "#10B981", bg: "rgba(16,185,129,0.12)", icon: CheckCircle2 },
  completed: { label: "Completed", color: "rgba(75,156,211,0.9)", bg: "rgba(75,156,211,0.12)", icon: Star },
};

interface Props {
  deals: (Deal & { deliverables?: DealDeliverable[] })[];
  currentUserId?: string;
}

export function BrandDealsClient({ deals, currentUserId }: Props) {
  const [filter, setFilter] = useState<DealPipelineStage | "all">("all");
  const [selectedDeal, setSelectedDeal] = useState<(Deal & { deliverables?: DealDeliverable[] }) | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const didAutoOpen = useRef(false);

  // Auto-open deal from URL query param (e.g., /brand/deals?deal=...) — only once
  useEffect(() => {
    if (didAutoOpen.current) return;
    const dealId = searchParams.get("deal");
    if (dealId) {
      const found = deals.find((d) => d.id === dealId);
      if (found) {
        setSelectedDeal(found);
        didAutoOpen.current = true;
      }
    }
  }, [searchParams, deals]);

  function handleCloseDeal() {
    setSelectedDeal(null);
    // Clear ?deal= from URL so it doesn't re-open
    if (searchParams.get("deal")) {
      router.replace("/brand/deals", { scroll: false });
    }
  }

  const filteredDeals =
    filter === "all" ? deals : deals.filter((d) => d.pipeline_stage === filter);

  return (
    <div
      style={{
        fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--color-ink)",
            margin: 0,
            letterSpacing: -0.5,
          }}
        >
          Deals
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink-secondary)",
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          Track active deals and deliverable progress with creators
        </p>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Total Deals", value: deals.length },
          { label: "Active", value: deals.filter((d) => d.status === "active").length },
          { label: "Pipeline Value", value: `$${deals.reduce((sum, d) => sum + (d.total_value ?? 0), 0).toLocaleString()}` },
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

      {/* Stage filter */}
      <div
        className="scrollbar-none"
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            background:
              filter === "all"
                ? "rgba(75,156,211,0.15)"
                : "var(--color-surface-card)",
            border:
              filter === "all"
                ? "1px solid rgba(75,156,211,0.3)"
                : "1px solid rgba(75,156,211,0.12)",
            fontSize: 11,
            fontWeight: 700,
            color:
              filter === "all"
                ? "rgba(75,156,211,0.9)"
                : "var(--color-ink-secondary)",
            cursor: "pointer",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          All ({deals.length})
        </button>
        {(Object.entries(stageConfig) as [DealPipelineStage, (typeof stageConfig)[DealPipelineStage]][]).map(
          ([key, config]) => {
            const count = deals.filter((d) => d.pipeline_stage === key).length;
            if (count === 0 && filter !== key) return null;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  background:
                    filter === key ? config.bg : "var(--color-surface-card)",
                  border:
                    filter === key
                      ? `1px solid ${config.color}40`
                      : "1px solid rgba(75,156,211,0.12)",
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    filter === key
                      ? config.color
                      : "var(--color-ink-secondary)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {config.label} ({count})
              </button>
            );
          },
        )}
      </div>

      {/* Deals list or empty state */}
      {filteredDeals.length === 0 ? (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(75,156,211,0.12)",
            borderRadius: 16,
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(75,156,211,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Handshake size={28} style={{ color: "rgba(75,156,211,0.7)" }} />
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 8px",
            }}
          >
            No active deals
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              maxWidth: 400,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Once a proposal is accepted, it automatically becomes a deal. Send
            proposals to creators to get started with collaborations.
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
          {filteredDeals.map((deal) => {
            const stage = stageConfig[deal.pipeline_stage] ?? stageConfig.contracted;
            const StageIcon = stage.icon;
            const deliverables = deal.deliverables ?? [];
            const completedDels = deliverables.filter(
              (d) => d.status === "approved",
            ).length;
            const totalDels = deliverables.length;
            const progressPct =
              totalDels > 0 ? Math.round((completedDels / totalDels) * 100) : 0;

            return (
              <div
                key={deal.id}
                onClick={() => setSelectedDeal(deal)}
                style={{
                  background: "var(--color-surface-card)",
                  border: "1px solid rgba(75,156,211,0.12)",
                  borderRadius: 12,
                  padding: "18px 20px",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginBottom: totalDels > 0 ? 12 : 0,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, rgba(75,156,211,0.3), var(--color-editorial-red))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#ffffff",
                      flexShrink: 0,
                    }}
                  >
                    {deal.brand_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "var(--color-ink)",
                        }}
                      >
                        {deal.brand_name}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: stage.bg,
                          fontSize: 9,
                          fontWeight: 700,
                          color: stage.color,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        <StageIcon size={10} />
                        {stage.label}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        fontSize: 11,
                        color: "var(--color-ink-secondary)",
                      }}
                    >
                      {deal.total_value != null && (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <DollarSign size={11} />
                          {deal.total_value.toLocaleString()}
                        </span>
                      )}
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={11} />
                        {new Date(deal.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <ArrowRight
                    size={16}
                    style={{
                      color: "var(--color-ink-secondary)",
                      flexShrink: 0,
                    }}
                  />
                </div>

                {/* Deliverables progress */}
                {totalDels > 0 && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(75,156,211,0.04)",
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--color-ink-secondary)",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Deliverables Progress
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-ink)",
                        }}
                      >
                        {completedDels}/{totalDels} ({progressPct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: "rgba(75,156,211,0.1)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${progressPct}%`,
                          borderRadius: 2,
                          background:
                            progressPct === 100
                              ? "#10B981"
                              : "var(--color-editorial-red)",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Deal Detail Slide-over */}
      {selectedDeal && (
        <DealDetail
          deal={selectedDeal}
          isOpen={true}
          onClose={handleCloseDeal}
          onUpdate={handleCloseDeal}
          userRole="brand"
        />
      )}
    </div>
  );
}
