"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { syncSocialProfile, deleteSocialProfile } from "@/lib/actions/profiles";
import { PlatformIcon } from "@/components/icons/PlatformIcons";
import { AddProfileModal } from "@/components/dashboard/AddProfileModal";
import { PLATFORM_CONFIG, type SocialProfile, type SocialPlatform } from "@/types";
import { formatCompact } from "@/lib/utils";

const ALL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
  "threads",
  "pinterest",
  "twitch",
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ConnectedAccountsTab({
  socialProfiles,
}: {
  socialProfiles: SocialProfile[];
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const connectedPlatforms = new Set(socialProfiles.map((p) => p.platform));
  const unconnectedPlatforms = ALL_PLATFORMS.filter(
    (p) => !connectedPlatforms.has(p),
  );

  function handleSync(profileId: string) {
    setSyncingId(profileId);
    startTransition(async () => {
      await syncSocialProfile(profileId);
      setSyncingId(null);
    });
  }

  function handleDisconnect(profileId: string) {
    if (!confirm("Are you sure you want to disconnect this account? All associated data will be deleted.")) return;
    setDisconnectingId(profileId);
    startTransition(async () => {
      await deleteSocialProfile(profileId);
      setDisconnectingId(null);
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-lg font-bold text-ink">
          Connected Social Accounts
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-ink px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors"
        >
          + Connect New Account
        </button>
      </div>

      {/* Connected accounts */}
      <div className="space-y-0">
        {socialProfiles.map((sp) => {
          const config = PLATFORM_CONFIG[sp.platform];
          const isSyncing = syncingId === sp.id;
          const isDisconnecting = disconnectingId === sp.id;

          return (
            <div
              key={sp.id}
              className="flex items-center gap-4 border-b border-rule py-4 first:pt-0 last:border-b-0"
            >
              {/* Platform icon */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: config.color }}
              >
                <PlatformIcon platform={sp.platform} size={20} />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  @{sp.handle}
                </p>
                <p className="text-[11px] text-ink-muted font-mono">
                  {config.label} &middot; {formatCompact(sp.followers_count)}{" "}
                  followers &middot; Connected {formatDate(sp.created_at)}
                </p>
              </div>

              {/* Status & actions */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:inline-block bg-editorial-green/10 text-editorial-green text-[9px] font-bold uppercase tracking-widest px-2 py-0.5">
                  Active
                </span>
                <span className="hidden md:inline-block text-[10px] text-ink-muted font-mono">
                  Synced {timeAgo(sp.last_synced_at)}
                </span>
                <button
                  onClick={() => handleSync(sp.id)}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 border border-rule px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink hover:border-ink-muted disabled:opacity-50 transition-colors"
                >
                  {isSyncing && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                  Sync Now
                </button>
                <button
                  onClick={() => handleDisconnect(sp.id)}
                  disabled={isDisconnecting}
                  className="text-[10px] font-semibold uppercase tracking-widest text-editorial-red hover:text-editorial-red/70 disabled:opacity-50 transition-colors"
                >
                  {isDisconnecting ? "..." : "Disconnect"}
                </button>
              </div>
            </div>
          );
        })}

        {/* Unconnected platforms */}
        {unconnectedPlatforms.map((platform) => {
          const config = PLATFORM_CONFIG[platform];
          return (
            <div
              key={platform}
              className="flex items-center gap-4 border-b border-rule py-4 last:border-b-0 opacity-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted">
                <PlatformIcon platform={platform} size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-ink-muted">{config.label}</p>
                <p className="text-[11px] text-ink-faint font-mono">
                  Not connected
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-ink px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-surface-cream hover:bg-ink/80 transition-colors"
              >
                Connect
              </button>
            </div>
          );
        })}
      </div>

      {/* Data Sync Schedule */}
      <div className="mt-8 border-t border-rule pt-6">
        <p className="editorial-overline mb-3">Data Sync Schedule</p>
        <p className="text-sm text-ink-secondary mb-3">
          Your plan syncs data every <strong className="text-ink">6 hours</strong>.
          Upgrade to Business for 2-hour sync or Enterprise for real-time.
        </p>
        <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden mb-1.5">
          <div
            className="h-full rounded-full bg-editorial-blue"
            style={{ width: "38%" }}
          />
        </div>
        <p className="text-[10px] text-ink-muted font-mono">
          Next sync in 3h 42m
        </p>
      </div>

      {/* Add Profile Modal */}
      <AddProfileModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
