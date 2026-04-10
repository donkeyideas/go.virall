"use client";

import { useState, useRef, useCallback } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ArrowLeft,
  X,
  Printer,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import type { Organization, SubscriptionData, BillingInvoice } from "@/types";

type StatusFilter = "all" | "paid" | "open" | "draft" | "void";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  paid: { label: "Paid", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
  open: { label: "Open", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  draft: { label: "Draft", color: "rgba(75,156,211,0.9)", bg: "rgba(75,156,211,0.12)" },
  void: { label: "Void", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  unknown: { label: "Unknown", color: "#8B8A9E", bg: "rgba(139,146,158,0.12)" },
};

export function BrandPaymentsClient({
  organization,
  subscription,
  invoices,
  companyName,
  companyLogoUrl,
}: {
  organization: Organization | null;
  subscription: SubscriptionData | null;
  invoices: BillingInvoice[];
  companyName?: string | null;
  companyLogoUrl?: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewingInvoice, setViewingInvoice] = useState<BillingInvoice | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(() => {
    if (viewingInvoice?.invoice_pdf) {
      window.open(viewingInvoice.invoice_pdf, "_blank");
    }
  }, [viewingInvoice]);

  const filteredInvoices =
    statusFilter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === statusFilter);

  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const openAmount = invoices
    .filter((inv) => inv.status === "open")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const currentPlan = organization?.plan ?? "free";

  const summaryCards = [
    {
      label: "Total Paid",
      value: `$${totalPaid.toFixed(2)}`,
      icon: CheckCircle2,
      color: "#10B981",
      gradient: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))",
    },
    {
      label: "Outstanding",
      value: `$${openAmount.toFixed(2)}`,
      icon: Clock,
      color: "#F59E0B",
      gradient: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))",
    },
    {
      label: "Current Plan",
      value: currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1),
      icon: CreditCard,
      color: "rgba(75,156,211,0.9)",
      gradient: "linear-gradient(135deg, rgba(75,156,211,0.12), rgba(75,156,211,0.04))",
    },
  ];

  return (
    <div style={{ fontFamily: "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(.invoice-print-target),
          body > * > *:not(.invoice-print-target) { display: none !important; }
          .invoice-print-target { display: block !important; position: fixed; inset: 0; z-index: 99999; }
          .invoice-modal-backdrop { background: white !important; }
          .invoice-modal-card { border: none !important; box-shadow: none !important; max-width: 100% !important; height: auto !important; }
          .invoice-modal-header-actions { display: none !important; }
          .invoice-body { background: white !important; color: #111 !important; }
          .invoice-body * { color: #111 !important; }
          .invoice-body .inv-label { color: #666 !important; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Link
            href="/brand/settings"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-ink-secondary)",
              textDecoration: "none",
              marginBottom: 8,
            }}
          >
            <ArrowLeft size={12} />
            Back to Settings
          </Link>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            Payments & Invoices
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              marginTop: 6,
              fontWeight: 500,
            }}
          >
            View your billing history and download invoices
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              style={{
                background: card.gradient,
                border: "1px solid rgba(75,156,211,0.12)",
                borderRadius: 14,
                padding: "18px 20px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(75,156,211,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={16} style={{ color: card.color }} />
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--color-ink-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--color-ink)",
                  letterSpacing: -0.5,
                }}
              >
                {card.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
          Invoice History
        </h2>
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "paid", "open", "void"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                background:
                  statusFilter === status ? "rgba(75,156,211,0.15)" : "transparent",
                border:
                  statusFilter === status
                    ? "1px solid rgba(75,156,211,0.3)"
                    : "1px solid transparent",
                fontSize: 10,
                fontWeight: 700,
                color:
                  statusFilter === status
                    ? "rgba(75,156,211,0.9)"
                    : "var(--color-ink-secondary)",
                cursor: "pointer",
                fontFamily: "inherit",
                textTransform: "capitalize",
              }}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Table or empty state */}
      {filteredInvoices.length === 0 ? (
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
            <CreditCard size={28} style={{ color: "rgba(75,156,211,0.7)" }} />
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: "0 0 8px",
            }}
          >
            No invoices yet
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink-secondary)",
              maxWidth: 400,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Invoices will appear here once you subscribe to a paid plan.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1px solid rgba(75,156,211,0.12)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr 0.8fr 0.8fr 0.5fr",
              padding: "10px 20px",
              background: "rgba(75,156,211,0.04)",
              borderBottom: "1px solid rgba(75,156,211,0.08)",
            }}
          >
            {["Date", "Description", "Amount", "Status", ""].map((header) => (
              <div
                key={header || "actions"}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--color-ink-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                {header}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {filteredInvoices.map((inv, idx) => {
            const config = statusConfig[inv.status] || statusConfig.unknown;
            return (
              <div
                key={inv.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr 0.8fr 0.8fr 0.5fr",
                  padding: "12px 20px",
                  alignItems: "center",
                  borderBottom:
                    idx < filteredInvoices.length - 1
                      ? "1px solid rgba(75,156,211,0.06)"
                      : "none",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-ink-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Calendar size={12} />
                  {inv.date}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                  {inv.description}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--color-ink)",
                  }}
                >
                  ${inv.amount.toFixed(2)}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: config.color,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {config.label}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => setViewingInvoice(inv)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#818CF8",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: 0,
                    }}
                  >
                    Invoice
                    <ExternalLink size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Custom Invoice Modal ─────────────────────────────────── */}
      {viewingInvoice && (
        <div
          className="invoice-print-target"
          onClick={() => setViewingInvoice(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            className="invoice-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid rgba(75,156,211,0.15)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal action bar */}
            <div
              className="invoice-modal-header-actions"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "12px 20px",
                borderBottom: "1px solid rgba(75,156,211,0.08)",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <button
                onClick={handlePrint}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  background: "rgba(75,156,211,0.1)",
                  border: "1px solid rgba(75,156,211,0.2)",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(75,156,211,0.9)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <Printer size={13} />
                Print
              </button>
              <button
                onClick={handleDownloadPdf}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  background: "rgba(75,156,211,0.1)",
                  border: "1px solid rgba(75,156,211,0.2)",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(75,156,211,0.9)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <FileDown size={13} />
                Save PDF
              </button>
              <button
                onClick={() => setViewingInvoice(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(75,156,211,0.06)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--color-ink-secondary)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Invoice body */}
            <div
              ref={invoiceRef}
              className="invoice-body"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "32px 36px 40px",
              }}
            >
              {/* Company header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, rgba(75,156,211,0.3), var(--color-editorial-red))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#fff",
                      }}
                    >
                      {(companyName ?? "GV").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-ink)", letterSpacing: -0.3 }}>
                      {companyName || "Go Virall"}
                    </div>
                    <div className="inv-label" style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 1 }}>
                      {viewingInvoice.customer_email ?? ""}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)", letterSpacing: -0.5 }}>
                    INVOICE
                  </div>
                  {viewingInvoice.number && (
                    <div className="inv-label" style={{ fontSize: 11, color: "var(--color-ink-secondary)", marginTop: 2 }}>
                      #{viewingInvoice.number}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice metadata */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
                <div>
                  <div className="inv-label" style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                    Invoice Date
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
                    {viewingInvoice.date}
                  </div>
                </div>
                {viewingInvoice.period_start && viewingInvoice.period_end && (
                  <div>
                    <div className="inv-label" style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                      Billing Period
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
                      {viewingInvoice.period_start} — {viewingInvoice.period_end}
                    </div>
                  </div>
                )}
                <div>
                  <div className="inv-label" style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                    Status
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {viewingInvoice.status === "paid" && <CheckCircle2 size={14} style={{ color: "#10B981" }} />}
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: (statusConfig[viewingInvoice.status] ?? statusConfig.unknown).color,
                      textTransform: "capitalize",
                    }}>
                      {(statusConfig[viewingInvoice.status] ?? statusConfig.unknown).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              {viewingInvoice.customer_name && (
                <div style={{ marginBottom: 28 }}>
                  <div className="inv-label" style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                    Bill To
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink)" }}>
                    {viewingInvoice.customer_name}
                  </div>
                  {viewingInvoice.customer_email && (
                    <div className="inv-label" style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>
                      {viewingInvoice.customer_email}
                    </div>
                  )}
                </div>
              )}

              {/* Line items table */}
              <div style={{ borderRadius: 10, border: "1px solid rgba(75,156,211,0.1)", overflow: "hidden", marginBottom: 24 }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 0.5fr 0.8fr 0.8fr", padding: "10px 16px", background: "rgba(75,156,211,0.04)" }}>
                  {["Description", "Qty", "Unit Price", "Amount"].map((h) => (
                    <div key={h} className="inv-label" style={{ fontSize: 9, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.8, textAlign: h === "Description" ? "left" : "right" }}>
                      {h}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {viewingInvoice.line_items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 0.5fr 0.8fr 0.8fr",
                      padding: "12px 16px",
                      borderTop: "1px solid rgba(75,156,211,0.06)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 500 }}>
                      {item.description}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-ink-secondary)", textAlign: "right" }}>
                      {item.quantity}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-ink-secondary)", textAlign: "right" }}>
                      ${item.unit_amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink)", textAlign: "right" }}>
                      ${item.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: 240 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                    <span className="inv-label" style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>Subtotal</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>${viewingInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  {viewingInvoice.tax > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                      <span className="inv-label" style={{ fontSize: 12, color: "var(--color-ink-secondary)" }}>Tax</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-ink)" }}>${viewingInvoice.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6, borderTop: "2px solid rgba(75,156,211,0.15)" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink)" }}>Total</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--color-ink)" }}>${viewingInvoice.amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              {viewingInvoice.payment_method_last4 && (
                <div style={{ marginTop: 24, padding: "14px 16px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={14} style={{ color: "#10B981" }} />
                    <span style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 600 }}>
                      Paid with {viewingInvoice.payment_method_brand
                        ? viewingInvoice.payment_method_brand.charAt(0).toUpperCase() + viewingInvoice.payment_method_brand.slice(1)
                        : "Card"} ending in {viewingInvoice.payment_method_last4}
                    </span>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(75,156,211,0.08)", textAlign: "center" }}>
                <div className="inv-label" style={{ fontSize: 11, color: "var(--color-ink-secondary)" }}>
                  Go Virall — Social Intelligence Platform
                </div>
                <div className="inv-label" style={{ fontSize: 10, color: "var(--color-ink-secondary)", marginTop: 4, opacity: 0.6 }}>
                  This invoice was generated automatically. For questions, contact support@govirall.com
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
