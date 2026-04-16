"use client";

import { useState, useTransition } from "react";
import { X, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { addSocialProfile } from "@/lib/actions/profiles";
import { PLATFORM_CONFIG, type SocialPlatform } from "@/types";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import Link from "next/link";

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

interface AddProfileModalProps {
  open: boolean;
  onClose: () => void;
  onboarding?: boolean;
}

export function AddProfileModal({
  open,
  onClose,
  onboarding = false,
}: AddProfileModalProps) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<SocialPlatform | null>(null);
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [planLimitReached, setPlanLimitReached] = useState(false);
  const [verifiedElsewhere, setVerifiedElsewhere] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlatform || !handle.trim()) return;

    setError(null);
    setPlanLimitReached(false);
    setVerifiedElsewhere(false);
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
        if ("verifiedElsewhere" in result && result.verifiedElsewhere) {
          setVerifiedElsewhere(true);
        }
      } else {
        setHandle("");
        setSelectedPlatform(null);
        onClose();
      }
    });
  }

  function handleBackdropClick() {
    if (!onboarding) onClose();
  }

  // Show upgrade prompt when plan limit is reached
  if (planLimitReached) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={handleBackdropClick}
      >
        <div
          className="w-full max-w-md border border-rule bg-surface-card p-6 shadow-lg text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-editorial-red/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-editorial-red" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="font-serif text-xl font-bold text-ink mb-2">
            Upgrade Your Plan
          </h2>
          <p className="text-sm text-ink-secondary mb-6">
            {error}
          </p>
          <div className="space-y-2">
            <Link
              href="/dashboard/settings?tab=billing"
              onClick={onClose}
              className="block w-full bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/80 text-center"
            >
              View Plans &amp; Upgrade
            </Link>
            <button
              onClick={() => {
                setPlanLimitReached(false);
                setError(null);
                onClose();
              }}
              className="w-full text-xs text-ink-muted hover:text-ink py-2"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg border border-rule bg-surface-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold text-ink">
            {onboarding ? "Connect Your First Profile" : "Add Social Profile"}
          </h2>
          {!onboarding && (
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {onboarding && (
          <p className="mt-2 text-sm text-ink-secondary">
            Select a platform and enter your handle to get started with
            powerful analytics.
          </p>
        )}

        {/* Platform Grid */}
        <div className="mt-5 grid grid-cols-4 gap-2">
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
                className={cn(
                  "flex flex-col items-center gap-2 border px-3 py-3.5 text-xs font-medium transition-colors",
                  isSelected
                    ? "border-editorial-gold bg-surface-raised text-editorial-gold"
                    : "border-rule bg-surface-raised text-ink-secondary hover:border-ink-muted hover:text-ink",
                )}
              >
                <span style={{ color: isSelected ? config.color : undefined }}>
                  <PlatformIcon
                    platform={platform}
                    size={22}
                    className={isSelected ? "" : "opacity-70"}
                  />
                </span>
                <span className="text-[10px] uppercase tracking-wider">
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Handle Input */}
        {selectedPlatform && (
          <form onSubmit={handleSubmit} className="mt-5">
            <label className="editorial-overline mb-1.5 block">
              {PLATFORM_CONFIG[selectedPlatform].label} Handle
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
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
                  className="w-full border border-rule bg-surface-raised py-2.5 pl-8 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
                  autoFocus
                  disabled={isPending}
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !handle.trim()}
                className="bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-surface-cream transition-colors hover:bg-ink/80 disabled:opacity-50"
              >
                {isPending ? "Adding..." : "Add"}
              </button>
            </div>

            {error && verifiedElsewhere ? (
              <div className="mt-3 p-3 bg-editorial-gold/5 border border-editorial-gold/20 flex items-start gap-2">
                <ShieldAlert size={14} className="text-editorial-gold shrink-0 mt-0.5" />
                <p className="text-xs text-ink-secondary">{error}</p>
              </div>
            ) : error ? (
              <p className="mt-2 text-xs text-editorial-red">{error}</p>
            ) : null}
          </form>
        )}

        {/* Cancel for non-onboarding */}
        {!onboarding && !selectedPlatform && (
          <div className="mt-5 text-center">
            <button
              onClick={onClose}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
