"use client";

import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/lib/contexts/view-mode";
import { AddProfileModal } from "./AddProfileModal";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { PLATFORM_CONFIG, type SocialProfile } from "@/types";

interface ProfileSelectorProps {
  profiles: SocialProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showAll?: boolean;
  onSelectAll?: () => void;
}

export function ProfileSelector({
  profiles,
  selectedId,
  onSelect,
  showAll,
  onSelectAll,
}: ProfileSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";

  const selected = profiles.find((p) => p.id === selectedId);

  const chipBase = cn(
    "flex shrink-0 items-center gap-1.5 border px-3.5 py-1.5 text-xs font-semibold transition-all",
    !ed && "rounded-lg",
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-2">
        {/* Profile chips */}
        <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-x-auto">
          {showAll && (
            <button
              onClick={() => onSelectAll?.()}
              className={cn(
                chipBase,
                selectedId === null
                  ? ed
                    ? "border-editorial-red bg-editorial-red/8 text-editorial-red"
                    : "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                  : ed
                    ? "border-rule bg-surface-card text-ink-secondary hover:border-editorial-red hover:text-ink"
                    : "border-rule bg-surface-card text-yellow-400/70 hover:border-yellow-400 hover:text-yellow-400",
              )}
            >
              All
            </button>
          )}
          {profiles.map((profile) => {
            const config = PLATFORM_CONFIG[profile.platform];
            const isActive = profile.id === selectedId;
            return (
              <button
                key={profile.id}
                onClick={() => onSelect(profile.id)}
                className={cn(
                  chipBase,
                  isActive
                    ? ed
                      ? "border-editorial-red bg-editorial-red/8 text-editorial-red"
                      : "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                    : ed
                      ? "border-rule bg-surface-card text-ink-secondary hover:border-editorial-red hover:text-ink"
                      : "border-rule bg-surface-card text-yellow-400/70 hover:border-yellow-400 hover:text-yellow-400",
                )}
              >
                <PlatformIcon platform={profile.platform} size={14} />
                <span>@{profile.handle}</span>
                {profile.followers_count > 0 && (
                  <span className="text-[10px] text-ink-muted">
                    {formatCount(profile.followers_count)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add button */}
        <button
          onClick={() => setShowModal(true)}
          className={cn(
            "flex shrink-0 items-center gap-1 border border-rule bg-surface-card px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary transition-all hover:border-editorial-red hover:text-ink",
            !ed && "rounded-lg",
          )}
        >
          <Plus size={12} />
          Add
        </button>

        {/* Mobile dropdown */}
        {profiles.length > 0 && (
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 text-xs text-ink-secondary"
            >
              <ChevronDown size={14} />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 border border-rule bg-surface-card py-1 shadow-lg">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      onSelect(profile.id);
                      setShowDropdown(false);
                    }}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-xs",
                      profile.id === selectedId
                        ? "bg-surface-raised text-ink"
                        : "text-ink-secondary hover:bg-surface-raised",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <PlatformIcon platform={profile.platform} size={14} />
                      @{profile.handle}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AddProfileModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
