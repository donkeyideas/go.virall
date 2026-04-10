"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, BadgeCheck, Building2, User, FileText, X, Loader2 } from "lucide-react";
import { UserProfileModal } from "./UserProfileModal";
import { ProposalModal } from "@/components/proposals/ProposalModal";
import { ProposalBuilder } from "@/components/proposals/ProposalBuilder";
import type { CreatorPlatformInfo, CreatorPricingStats } from "@/components/proposals/ProposalBuilder";
import { findProposalIdByThread } from "@/lib/actions/proposals";
import { getEnrichedCreatorProfile } from "@/lib/actions/marketplace";
import { TrustBadge } from "@/components/deals/TrustBadge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getTrustScore } from "@/lib/dal/trust";
import type { MessageThread as ThreadType, DirectMessage, TrustScore } from "@/types";
import { MessageInput } from "./MessageInput";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-purple-600",
  "from-lime-500 to-green-600",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time}`;
}

function shouldShowDateSeparator(
  current: DirectMessage,
  previous: DirectMessage | null,
): boolean {
  if (!previous) return true;
  const currDate = new Date(current.created_at).toDateString();
  const prevDate = new Date(previous.created_at).toDateString();
  return currDate !== prevDate;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface MessageThreadProps {
  thread: ThreadType;
  messages: DirectMessage[];
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
  onBack?: () => void;
  onNewMessage: (message: DirectMessage) => void;
  editorial?: boolean;
  cardClass?: string;
}

export function MessageThreadView({
  thread,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
  onNewMessage,
  editorial: ed = false,
  cardClass: card = "",
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [proposalModalId, setProposalModalId] = useState<string | null>(null);
  const [otherTrustScore, setOtherTrustScore] = useState<TrustScore | null>(null);
  const [showProposalBuilder, setShowProposalBuilder] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalData, setProposalData] = useState<{
    platforms: CreatorPlatformInfo[];
    stats: CreatorPricingStats;
  } | null>(null);
  const otherUser = thread.other_user;

  // Fetch other user's trust score
  useEffect(() => {
    if (!otherUser?.id) return;
    setOtherTrustScore(null);
    getTrustScore(otherUser.id).then(setOtherTrustScore).catch(() => {});
  }, [otherUser?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          if (newMsg.sender_id !== currentUserId) {
            onNewMessage(newMsg);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.id, currentUserId, onNewMessage]);

  // Handle opening ProposalBuilder — fetch creator data
  const handleOpenProposal = useCallback(async () => {
    if (!otherUser?.id) return;
    setProposalLoading(true);
    try {
      const result = await getEnrichedCreatorProfile(otherUser.id);
      if (result.success) {
        const enriched = result.success;
        const platforms: CreatorPlatformInfo[] = enriched.social_profiles.map((sp) => ({
          platform: sp.platform,
          handle: sp.handle ?? "",
          followers_count: sp.followers_count ?? 0,
          engagement_rate: sp.engagement_rate ?? 0,
        }));
        const stats: CreatorPricingStats = {
          total_followers: enriched.total_followers,
          avg_engagement: enriched.avg_engagement_rate,
          aqs: enriched.aqs_breakdown?.overall_score ?? enriched.audience_quality_score ?? null,
          earnings_estimate: enriched.earnings_estimate ?? null,
        };
        setProposalData({ platforms, stats });
      } else {
        // Fallback with minimal data
        setProposalData({
          platforms: [],
          stats: { total_followers: 0, avg_engagement: 0, aqs: null, earnings_estimate: null },
        });
      }
      setShowProposalBuilder(true);
    } catch {
      setProposalData({
        platforms: [],
        stats: { total_followers: 0, avg_engagement: 0, aqs: null, earnings_estimate: null },
      });
      setShowProposalBuilder(true);
    } finally {
      setProposalLoading(false);
    }
  }, [otherUser?.id]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {/* Header Card */}
      <div className={cn("flex items-center gap-3 px-5 py-3", card)}>
        {onBack && (
          <button
            onClick={onBack}
            className="shrink-0 p-1.5 text-ink-secondary transition-colors hover:text-ink lg:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* Avatar — clickable */}
        <button
          onClick={() => setShowProfile(true)}
          className="shrink-0 cursor-pointer border-none bg-transparent p-0"
        >
          {otherUser?.avatar_url ? (
            <img
              src={otherUser.avatar_url}
              alt={otherUser.full_name ?? "User"}
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white",
                getGradient(otherUser?.id ?? thread.id),
              )}
            >
              {getInitials(otherUser?.full_name || otherUser?.company_name)}
            </div>
          )}
        </button>

        {/* Name + badge */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="cursor-pointer truncate border-none bg-transparent p-0 text-sm font-bold text-ink hover:underline"
            >
              {otherUser?.full_name || otherUser?.company_name || "Unknown User"}
            </button>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 bg-editorial-red/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                otherUser?.account_type === "brand" ? "text-blue-400" : "text-editorial-red",
                !ed && "rounded-full",
              )}
            >
              {otherUser?.account_type === "brand" ? (
                <Building2 size={10} />
              ) : (
                <User size={10} />
              )}
              {otherUser?.account_type === "brand" ? "Brand" : "Creator"}
            </span>
            <TrustBadge trustScore={otherTrustScore} size="sm" />
          </div>
          {otherUser?.account_type === "brand" && otherUser.company_name && (
            <p className="truncate text-[11px] text-ink-secondary">
              {otherUser.company_name}
            </p>
          )}
        </div>

        {/* Send Proposal button */}
        {otherUser?.account_type !== "brand" && (
          <button
            onClick={handleOpenProposal}
            disabled={proposalLoading}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border-none px-3 py-1.5 text-[11px] font-bold transition-colors"
            style={{
              background: "var(--color-editorial-red)",
              color: "#fff",
              cursor: proposalLoading ? "wait" : "pointer",
              opacity: proposalLoading ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {proposalLoading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Send Proposal
          </button>
        )}
      </div>

      {/* Messages Card */}
      <div className={cn("min-h-0 flex-1 overflow-hidden", card)}>
        <div ref={scrollContainerRef} className="flex h-full flex-col overflow-y-auto px-5 py-5">
          <div className="mx-auto mt-auto max-w-3xl w-full space-y-1">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const isSent = msg.sender_id === currentUserId;
              const isSystem = msg.message_type === "system";
              const isProposal = msg.message_type === "proposal";
              const showDate = shouldShowDateSeparator(msg, prev);

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="flex items-center justify-center py-4">
                      <div className={cn("px-3 py-1 text-[10px] font-medium text-ink-secondary", ed ? "border border-rule bg-surface-raised" : "rounded-full border border-modern-card-border bg-surface-raised")}>
                        {formatDateSeparator(msg.created_at)}
                      </div>
                    </div>
                  )}

                  {/* System message */}
                  {isSystem && (
                    <div className="flex justify-center py-2">
                      <p className="max-w-sm text-center text-[11px] italic text-ink-secondary">
                        {msg.content}
                      </p>
                    </div>
                  )}

                  {/* Proposal message */}
                  {isProposal && !isSystem && (
                    <div className={cn("flex py-1", isSent ? "justify-end" : "justify-start")}>
                      <div className={cn("w-full max-w-[340px] p-4", ed ? "border border-rule bg-surface-raised" : "rounded-2xl border border-modern-card-border bg-surface-raised")}>
                        <div className="mb-2 flex items-center gap-2">
                          <BadgeCheck size={14} className="text-editorial-red" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-editorial-red">
                            Proposal
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-ink">
                          {msg.content}
                        </p>
                        {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                          <div className={cn("mt-3 p-2.5", ed ? "border border-rule bg-surface-card" : "rounded-lg border border-modern-card-border/50 bg-surface-card")}>
                            {msg.metadata.amount ? (
                              <p className="text-xs font-semibold text-ink">
                                Amount: ${Number(msg.metadata.amount).toLocaleString()}
                              </p>
                            ) : null}
                            {msg.metadata.title ? (
                              <p className="text-xs text-ink-secondary">
                                {String(msg.metadata.title)}
                              </p>
                            ) : null}
                          </div>
                        )}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const pId = msg.metadata?.proposal_id as string | undefined;
                            if (pId) {
                              setProposalModalId(pId);
                            } else {
                              // Fallback: find proposal by thread ID (for older messages without proposal_id in metadata)
                              const found = await findProposalIdByThread(thread.id);
                              if (found) setProposalModalId(found);
                            }
                          }}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border-none bg-editorial-red/10 px-3 py-2 text-[11px] font-bold text-editorial-red transition-colors hover:bg-editorial-red/20"
                          style={{ cursor: "pointer", fontFamily: "inherit" }}
                        >
                          View Proposal Details
                        </button>
                        <p className="mt-2 text-right text-[10px] text-ink-secondary">
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Regular text message */}
                  {!isSystem && !isProposal && (
                    <div className={cn("flex py-0.5", isSent ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] px-4 py-2.5",
                          isSent
                            ? cn("bg-editorial-red text-white", !ed && "rounded-2xl rounded-br-md")
                            : cn("text-ink", ed ? "border border-rule bg-surface-raised" : "rounded-2xl rounded-bl-md border border-modern-card-border"),
                        )}
                        style={!isSent && !ed ? { background: "rgba(75, 156, 211, 0.12)", borderColor: "rgba(75, 156, 211, 0.2)" } : undefined}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-right text-[10px]",
                            isSent ? "text-white/50" : "text-ink-secondary",
                          )}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Card */}
      <MessageInput onSend={onSendMessage} editorial={ed} cardClass={card} />

      {/* Proposal Modal */}
      {proposalModalId && (
        <ProposalModal
          open={!!proposalModalId}
          onClose={() => setProposalModalId(null)}
          proposalId={proposalModalId}
          currentUserId={currentUserId}
        />
      )}

      {/* User Profile Modal */}
      {otherUser && (
        <UserProfileModal
          open={showProfile}
          onClose={() => setShowProfile(false)}
          user={{
            id: otherUser.id,
            full_name: otherUser.full_name,
            avatar_url: otherUser.avatar_url,
            account_type: otherUser.account_type,
            company_name: otherUser.company_name,
            brand_logo_url: (otherUser as Record<string, unknown>).brand_logo_url as string | null | undefined,
            company_website: (otherUser as Record<string, unknown>).company_website as string | null | undefined,
            industry: (otherUser as Record<string, unknown>).industry as string | null | undefined,
            brand_description: (otherUser as Record<string, unknown>).brand_description as string | null | undefined,
            contact_email: (otherUser as Record<string, unknown>).contact_email as string | null | undefined,
          }}
        />
      )}

      {/* Proposal Builder Modal */}
      {showProposalBuilder && otherUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProposalBuilder(false);
          }}
        >
          <div
            style={{
              background: "#1a1a2e",
              borderRadius: 16,
              maxWidth: 760,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
              padding: "32px 28px",
              border: "1px solid rgba(75,156,211,0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={() => setShowProposalBuilder(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(75,156,211,0.08)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "var(--color-ink-secondary)",
                zIndex: 1,
              }}
            >
              <X size={16} />
            </button>

            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--color-ink)",
                  margin: 0,
                  letterSpacing: -0.3,
                }}
              >
                Send Proposal to {otherUser.full_name || "Creator"}
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-ink-secondary)",
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                Create a collaboration proposal with smart pricing recommendations
              </p>
            </div>

            <ProposalBuilder
              receiverId={otherUser.id}
              receiverName={otherUser.full_name || "Creator"}
              proposalType="brand_to_creator"
              creatorPlatforms={proposalData?.platforms}
              creatorStats={proposalData?.stats}
              onSuccess={() => {
                setShowProposalBuilder(false);
                setProposalData(null);
                // Refresh messages to show the new proposal message
                window.location.reload();
              }}
              onCancel={() => {
                setShowProposalBuilder(false);
                setProposalData(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
