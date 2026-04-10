"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck, ShieldAlert, Copy, Check } from "lucide-react";
import { syncSocialProfile, deleteSocialProfile } from "@/lib/actions/profiles";
import { generateVerificationCode, checkVerificationCode } from "@/lib/actions/verification";
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

function timeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
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

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [verifyStep, setVerifyStep] = useState<"idle" | "code-shown" | "checking">("idle");
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

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

  function handleStartVerify(profileId: string) {
    setVerifyingId(profileId);
    setVerificationCode(null);
    setVerifyStep("idle");
    setVerifyMessage(null);
    setVerifyError(false);
    setCodeCopied(false);

    startTransition(async () => {
      const result = await generateVerificationCode(profileId);
      if ("error" in result) {
        setVerifyMessage(result.error ?? "Failed to generate code.");
        setVerifyError(true);
        return;
      }
      if (result.autoVerified) {
        setVerifyMessage("Auto-verified (admin).");
        setVerifyError(false);
        setVerifyingId(null);
        return;
      }
      setVerificationCode(result.code ?? null);
      setVerifyStep("code-shown");
    });
  }

  function handleCheckBio(profileId: string) {
    setVerifyStep("checking");
    setVerifyMessage(null);
    setVerifyError(false);

    startTransition(async () => {
      const result = await checkVerificationCode(profileId);
      if ("error" in result) {
        setVerifyMessage(result.error ?? "Verification failed.");
        setVerifyError(true);
        setVerifyStep("code-shown");
        if ("expired" in result && result.expired) {
          setVerificationCode(null);
          setVerifyStep("idle");
        }
        return;
      }
      if (result.verified) {
        setVerifyMessage("Profile ownership verified!");
        setVerifyError(false);
        setVerifyingId(null);
        setVerifyStep("idle");
      } else {
        setVerifyMessage(result.message ?? "Code not found in bio.");
        setVerifyError(true);
        setVerifyStep("code-shown");
      }
    });
  }

  function handleCopyCode() {
    if (!verificationCode) return;
    navigator.clipboard.writeText(verificationCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
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
          const isVerifying = verifyingId === sp.id;

          return (
            <div key={sp.id}>
              <div className="flex items-center gap-4 border-b border-rule py-4 first:pt-0 last:border-b-0">
                {/* Platform icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: config.color }}
                >
                  <PlatformIcon platform={sp.platform} size={20} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink truncate">
                      @{sp.handle}
                    </p>
                    {sp.ownership_verified ? (
                      <span className="inline-flex items-center gap-1 text-editorial-green">
                        <ShieldCheck size={13} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Verified</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-editorial-gold">
                        <ShieldAlert size={13} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Unverified</span>
                      </span>
                    )}
                  </div>
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
                  {!sp.ownership_verified && (
                    <button
                      onClick={() => handleStartVerify(sp.id)}
                      disabled={isVerifying}
                      className="inline-flex items-center gap-1 border border-editorial-gold/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-editorial-gold hover:bg-editorial-gold/5 disabled:opacity-50 transition-colors"
                    >
                      Verify
                    </button>
                  )}
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

              {/* Verification panel (expanded inline) */}
              {isVerifying && verifyStep !== "idle" && (
                <div className="border border-editorial-gold/20 bg-editorial-gold/5 p-5 mb-2">
                  <p className="editorial-overline text-editorial-gold mb-3">Verify Profile Ownership</p>

                  {/* Step 1: Code display */}
                  <div className="mb-4">
                    <p className="text-xs text-ink-secondary mb-2">
                      <strong className="text-ink">Step 1:</strong> Copy this code and add it anywhere in your {config.label} bio.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-surface-cream border border-rule font-mono text-sm text-ink select-all">
                        {verificationCode}
                      </code>
                      <button
                        onClick={handleCopyCode}
                        className="inline-flex items-center gap-1 px-3 py-2 border border-rule text-[10px] font-semibold uppercase tracking-widest text-ink-secondary hover:text-ink transition-colors"
                      >
                        {codeCopied ? <Check size={12} className="text-editorial-green" /> : <Copy size={12} />}
                        {codeCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Instructions */}
                  <p className="text-xs text-ink-secondary mb-4">
                    <strong className="text-ink">Step 2:</strong> Save your bio, then click &quot;Check Bio&quot; below. We&apos;ll scan your live bio to confirm.
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCheckBio(sp.id)}
                      disabled={verifyStep === "checking"}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-surface-cream text-[10px] font-semibold uppercase tracking-widest hover:bg-ink/80 disabled:opacity-50 transition-colors"
                    >
                      {verifyStep === "checking" && <Loader2 size={12} className="animate-spin" />}
                      {verifyStep === "checking" ? "Checking..." : "Check Bio"}
                    </button>
                    <button
                      onClick={() => { setVerifyingId(null); setVerifyStep("idle"); }}
                      className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted hover:text-ink transition-colors"
                    >
                      Cancel
                    </button>
                    {verificationCode && (
                      <span className="text-[10px] text-ink-muted font-mono ml-auto">
                        {timeRemaining(sp.verification_code_expires_at)}
                      </span>
                    )}
                  </div>

                  {/* Result message */}
                  {verifyMessage && (
                    <p className={`mt-3 text-xs font-medium ${verifyError ? "text-editorial-red" : "text-editorial-green"}`}>
                      {verifyMessage}
                    </p>
                  )}

                  <p className="mt-3 text-[10px] text-ink-muted">
                    You can remove the code from your bio after verification. Code expires in 24 hours.
                  </p>
                </div>
              )}

              {/* Verification loading state (generating code) */}
              {isVerifying && verifyStep === "idle" && !verifyMessage && (
                <div className="border border-rule bg-surface-raised p-4 mb-2 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-ink-muted" />
                  <span className="text-xs text-ink-muted">Generating verification code...</span>
                </div>
              )}

              {/* Inline error from generate (e.g., already verified) */}
              {isVerifying && verifyStep === "idle" && verifyMessage && (
                <div className="border border-rule bg-surface-raised p-4 mb-2">
                  <p className={`text-xs font-medium ${verifyError ? "text-editorial-red" : "text-editorial-green"}`}>
                    {verifyMessage}
                  </p>
                </div>
              )}
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

      {/* Data Sync Info */}
      {socialProfiles.length > 0 && (
        <div className="mt-8 border-t border-rule pt-6">
          <p className="editorial-overline mb-3">Data Sync</p>
          <p className="text-sm text-ink-secondary mb-4">
            Use the <strong className="text-ink">Sync Now</strong> button on each account above to pull the latest data from that platform.
          </p>
          <div className="space-y-2">
            {socialProfiles.map((sp) => {
              const config = PLATFORM_CONFIG[sp.platform];
              return (
                <div key={sp.id} className="flex items-center justify-between text-xs">
                  <span className="text-ink font-medium">
                    {config.label} @{sp.handle}
                  </span>
                  <span className="text-ink-muted font-mono text-[11px]">
                    Last synced: {timeAgo(sp.last_synced_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
      <AddProfileModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
}
