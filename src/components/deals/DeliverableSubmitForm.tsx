"use client";

import { useState } from "react";
import { Send, Loader2, Link2 } from "lucide-react";
import { submitDeliverable } from "@/lib/actions/deals";

interface Props {
  deliverableId: string;
  onSubmitted?: () => void;
}

export function DeliverableSubmitForm({ deliverableId, onSubmitted }: Props) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    const result = await submitDeliverable(deliverableId, url.trim(), note.trim() || undefined);

    if ("error" in result) {
      setError(result.error);
    } else {
      setUrl("");
      setNote("");
      onSubmitted?.();
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        background: "var(--color-surface-inset)",
        border: "1px solid rgba(75,156,211,0.12)",
        borderRadius: 10,
        padding: 14,
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Link2 size={12} style={{ color: "rgba(75,156,211,0.7)" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Submit Deliverable Link
        </span>
      </div>

      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--color-surface-card)",
          border: "1px solid rgba(75,156,211,0.15)",
          borderRadius: 8,
          color: "var(--color-ink)",
          fontSize: 12,
          fontFamily: "inherit",
          outline: "none",
          marginBottom: 8,
          boxSizing: "border-box",
        }}
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g., 'Posted during peak hours')"
        rows={2}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "var(--color-surface-card)",
          border: "1px solid rgba(75,156,211,0.15)",
          borderRadius: 8,
          color: "var(--color-ink)",
          fontSize: 12,
          fontFamily: "inherit",
          outline: "none",
          resize: "none",
          marginBottom: 8,
          boxSizing: "border-box",
        }}
      />

      {error && (
        <div style={{ fontSize: 11, color: "#EF4444", marginBottom: 8 }}>{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !url.trim()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 16px",
          background: loading || !url.trim() ? "rgba(75,156,211,0.3)" : "rgba(75,156,211,0.9)",
          border: "none",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          color: "#fff",
          cursor: loading || !url.trim() ? "not-allowed" : "pointer",
          fontFamily: "inherit",
        }}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
        Submit for Review
      </button>
    </div>
  );
}
