"use client";

import { X, Building2, User, Globe, Mail, ExternalLink } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string;
  company_name: string | null;
  brand_logo_url?: string | null;
  company_website?: string | null;
  industry?: string | null;
  brand_description?: string | null;
  contact_email?: string | null;
}

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile;
}

export function UserProfileModal({ open, onClose, user }: UserProfileModalProps) {
  if (!open) return null;

  const isBrand = user.account_type === "brand";
  const displayName = user.full_name || user.company_name || "Unknown User";
  const avatarUrl = user.avatar_url || user.brand_logo_url;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
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
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(400px, 90vw)",
          background: "var(--color-surface-card)",
          border: "1px solid rgba(75,156,211,0.15)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          zIndex: 201,
          overflow: "hidden",
        }}
      >
        {/* Header gradient */}
        <div
          style={{
            height: 80,
            background: isBrand
              ? "linear-gradient(135deg, rgba(75,156,211,0.3), rgba(75,156,211,0.1))"
              : "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(75,156,211,0.1))",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
              color: "white",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Avatar overlapping header */}
        <div style={{ padding: "0 24px", marginTop: -40 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{
                width: 72,
                height: 72,
                borderRadius: isBrand ? 14 : "50%",
                objectFit: "cover",
                border: "3px solid var(--color-surface-card)",
              }}
            />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: isBrand ? 14 : "50%",
                background: "linear-gradient(135deg, rgba(75,156,211,0.5), var(--color-editorial-red))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
                color: "white",
                border: "3px solid var(--color-surface-card)",
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Profile info */}
        <div style={{ padding: "16px 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink)", margin: 0 }}>
              {displayName}
            </h3>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                padding: "3px 8px",
                borderRadius: 6,
                background: isBrand ? "rgba(59,130,246,0.1)" : "rgba(239,68,68,0.1)",
                color: isBrand ? "#3B82F6" : "var(--color-editorial-red)",
              }}
            >
              {isBrand ? <Building2 size={10} /> : <User size={10} />}
              {isBrand ? "Brand" : "Creator"}
            </span>
          </div>

          {isBrand && user.company_name && user.company_name !== user.full_name && (
            <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", margin: "2px 0 0" }}>
              {user.company_name}
            </p>
          )}

          {/* Details */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {user.industry && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-ink-secondary)" }}>
                <Building2 size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                {user.industry}
              </div>
            )}
            {user.company_website && (
              <a
                href={user.company_website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "#4B9CD3",
                  textDecoration: "none",
                }}
              >
                <Globe size={13} style={{ opacity: 0.7, flexShrink: 0 }} />
                {user.company_website.replace(/^https?:\/\//, "")}
                <ExternalLink size={10} style={{ opacity: 0.5 }} />
              </a>
            )}
            {user.contact_email && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-ink-secondary)" }}>
                <Mail size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                {user.contact_email}
              </div>
            )}
          </div>

          {user.brand_description && (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: "rgba(75,156,211,0.04)",
                borderRadius: 10,
                border: "1px solid rgba(75,156,211,0.08)",
              }}
            >
              <p style={{ fontSize: 12, color: "var(--color-ink-secondary)", lineHeight: 1.6, margin: 0 }}>
                {user.brand_description}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <a
              href={isBrand ? `/brand/discover` : `/dashboard/profiles`}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 10,
                background: "var(--color-editorial-red)",
                color: "white",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                border: "none",
              }}
            >
              View Full Profile
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
