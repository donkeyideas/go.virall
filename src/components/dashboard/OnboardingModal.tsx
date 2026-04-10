"use client";

import { useState, useTransition } from "react";
import { addSocialProfile } from "@/lib/actions/profiles";
import { PLATFORM_CONFIG, type SocialPlatform } from "@/types";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import Link from "next/link";

const C = {
  bg: "#0B1928",
  card: "#112240",
  cardElevated: "#1A2F50",
  primary: "#FFB84D",
  purple: "#4B9CD3",
  text: "#E8F0FA",
  textSecondary: "#8BACC8",
  border: "rgba(var(--accent-rgb),0.15)",
  inputBg: "#0D1E35",
  error: "#EF4444",
};

const PLATFORMS: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
  "threads",
  "pinterest",
  "twitch",
];

interface OnboardingModalProps {
  onClose: () => void;
}

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [planLimitReached, setPlanLimitReached] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatform || !handle.trim()) return;

    setError(null);
    setPlanLimitReached(false);
    const formData = new FormData();
    formData.set("platform", selectedPlatform);
    formData.set("handle", handle.trim());

    startTransition(async () => {
      const result = await addSocialProfile(formData);
      if (result.error) {
        setError(result.error);
        if ("planLimitReached" in result && result.planLimitReached) {
          setPlanLimitReached(true);
        }
      } else {
        setHandle("");
        setSelectedPlatform(null);
        onClose();
      }
    });
  }

  if (planLimitReached) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.6)",
          padding: 16,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "36px 32px",
            textAlign: "center",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.purple}, ${C.primary})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>
            Upgrade Your Plan
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
            {error}
          </p>
          <Link
            href="/dashboard/settings?tab=billing"
            onClick={onClose}
            style={{
              display: "block",
              background: C.primary,
              color: C.bg,
              borderRadius: 10,
              padding: "12px 24px",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            View Plans &amp; Upgrade
          </Link>
          <button
            onClick={() => { setPlanLimitReached(false); setError(null); onClose(); }}
            style={{ background: "none", border: "none", color: C.textSecondary, fontSize: 13, cursor: "pointer", padding: "8px 16px" }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: "36px 32px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${C.purple}, ${C.primary})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.text,
              marginBottom: 8,
            }}
          >
            Connect Your First Profile
          </h2>
          <p
            style={{
              fontSize: 14,
              color: C.textSecondary,
              lineHeight: 1.6,
            }}
          >
            Select a platform and enter your handle to unlock analytics, growth strategies, and content intelligence.
          </p>
        </div>

        {/* Platform Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {PLATFORMS.map((platform) => {
            const config = PLATFORM_CONFIG[platform];
            const isSelected = selectedPlatform === platform;
            return (
              <button
                key={platform}
                type="button"
                onClick={() => {
                  setSelectedPlatform(platform);
                  setError(null);
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "14px 8px",
                  background: isSelected ? C.cardElevated : C.inputBg,
                  border: `1px solid ${isSelected ? C.purple : C.border}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  color: isSelected ? config.color : C.textSecondary,
                }}
              >
                <PlatformIcon
                  platform={platform}
                  size={24}
                  className={isSelected ? "" : "opacity-60"}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    color: isSelected ? C.text : C.textSecondary,
                  }}
                >
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Handle Input */}
        {selectedPlatform && (
          <form onSubmit={handleSubmit}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                color: C.textSecondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              {PLATFORM_CONFIG[selectedPlatform].label} Handle
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: C.textSecondary,
                    fontSize: 14,
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setError(null);
                  }}
                  placeholder="username"
                  autoFocus
                  disabled={isPending}
                  style={{
                    width: "100%",
                    background: C.inputBg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "12px 14px 12px 32px",
                    fontSize: 14,
                    color: C.text,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !handle.trim()}
                style={{
                  background: C.primary,
                  color: C.bg,
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isPending || !handle.trim() ? "not-allowed" : "pointer",
                  opacity: isPending || !handle.trim() ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {isPending ? "Adding..." : "Connect"}
              </button>
            </div>

            {error && (
              <p style={{ marginTop: 8, fontSize: 13, color: C.error }}>
                {error}
              </p>
            )}
          </form>
        )}

        {!selectedPlatform && (
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: C.textSecondary,
              opacity: 0.7,
            }}
          >
            Select a platform above to get started
          </p>
        )}
      </div>
    </div>
  );
}
