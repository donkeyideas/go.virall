"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/lib/contexts/view-mode";
import { ChatClient } from "@/app/dashboard/chat/ChatClient";
import { MessageThreadView } from "@/components/messaging/MessageThread";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";
import {
  sendMessage as sendDM,
  getMessages as fetchMessages,
  markThreadRead,
} from "@/lib/actions/messages";
import { trackEvent } from "@/lib/analytics/track";
import type {
  ChatConversation,
  SocialProfile,
  AIProvider,
  MessageThread,
  DirectMessage,
} from "@/types";

/* ─── Helpers ─── */

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

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── Props ─── */

interface InboxHubClientProps {
  currentUserId: string;
  initialConversations: ChatConversation[];
  profiles: SocialProfile[];
  activeProvider: AIProvider | null;
  threads: MessageThread[];
  initialThreadId?: string;
  initialMessages?: DirectMessage[];
}

export function InboxHubClient({
  currentUserId,
  initialConversations,
  profiles,
  activeProvider,
  threads: initialThreads,
  initialThreadId,
  initialMessages,
}: InboxHubClientProps) {
  const searchParams = useSearchParams();

  // "ai" for the AI assistant, or a thread UUID for DM threads
  const [activeView, setActiveView] = useState<string>(
    initialThreadId ?? "ai",
  );

  // DM state
  const [threads, setThreads] = useState(initialThreads);
  const [messages, setMessages] = useState<DirectMessage[]>(
    initialMessages ?? [],
  );
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [search, setSearch] = useState("");

  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  const card = ed
    ? "border border-rule bg-surface-card"
    : "rounded-[14px] border border-modern-card-border bg-surface-card";

  useEffect(() => {
    trackEvent("page_view", "inbox");
  }, []);

  // Deep-link via ?thread=<id>
  useEffect(() => {
    const threadParam = searchParams.get("thread");
    if (threadParam && threadParam !== activeView) {
      handleSelectThread(threadParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeThread =
    activeView !== "ai"
      ? threads.find((t) => t.id === activeView) ?? null
      : null;

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter((t) => {
      const name = t.other_user?.full_name?.toLowerCase() ?? "";
      const company = t.other_user?.company_name?.toLowerCase() ?? "";
      const preview = t.last_message_preview?.toLowerCase() ?? "";
      return name.includes(q) || company.includes(q) || preview.includes(q);
    });
  }, [threads, search]);

  const handleSelectAI = useCallback(() => {
    setActiveView("ai");
    const url = new URL(window.location.href);
    url.searchParams.delete("thread");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      setActiveView(threadId);

      const url = new URL(window.location.href);
      url.searchParams.set("thread", threadId);
      window.history.replaceState({}, "", url.toString());

      try {
        const msgs = await fetchMessages(threadId);
        setMessages(msgs);
      } catch (err) {
        console.error("[InboxHub] Failed to load messages:", err);
      }

      try {
        await markThreadRead(threadId);
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== threadId) return t;
            const isP1 = t.participant_1 === currentUserId;
            return {
              ...t,
              ...(isP1 ? { unread_count_1: 0 } : { unread_count_2: 0 }),
            };
          }),
        );
      } catch (err) {
        console.error("[InboxHub] Failed to mark read:", err);
      }
    },
    [currentUserId],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (activeView === "ai") return;

      const optimisticMsg: DirectMessage = {
        id: `temp-${Date.now()}`,
        thread_id: activeView,
        sender_id: currentUserId,
        content,
        message_type: "text",
        metadata: {},
        is_read: false,
        read_at: null,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== activeView) return t;
          return {
            ...t,
            last_message_at: new Date().toISOString(),
            last_message_preview: content.slice(0, 120),
          };
        }),
      );

      const result = await sendDM(activeView, content);

      if (result.error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
        throw new Error(result.error);
      }

      if (result.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? result.message! : m)),
        );
      }
    },
    [activeView, currentUserId],
  );

  const handleNewMessage = useCallback(
    (message: DirectMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (activeView !== "ai") {
        markThreadRead(activeView).catch(() => {});
      }
    },
    [activeView],
  );

  const handleThreadCreated = useCallback(
    (threadId: string) => {
      handleSelectThread(threadId);
    },
    [handleSelectThread],
  );

  return (
    <>
      <div className="flex h-[calc(100dvh-148px)] gap-3 overflow-hidden">
        {/* ── Unified Sidebar ── */}
        <div
          className={cn(
            "flex w-72 shrink-0 flex-col overflow-hidden",
            card,
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between p-4",
              ed
                ? "border-b border-rule"
                : "border-b border-modern-card-border/50",
            )}
          >
            <h3 className="text-sm font-bold text-ink">Inbox</h3>
            <button
              onClick={() => setShowNewDialog(true)}
              className={cn(
                "bg-editorial-red px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90",
                !ed && "rounded-full",
              )}
            >
              + New
            </button>
          </div>

          {/* Pinned AI Thread */}
          <div className="px-2 pt-2">
            <div
              onClick={handleSelectAI}
              className={cn(
                "group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-raised",
                !ed && "rounded-[10px]",
                activeView === "ai" && "bg-surface-raised",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-ink">
                  Go Virall AI
                </span>
                <p className="mt-0.5 truncate text-[11px] text-ink-secondary">
                  Your social media strategist
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            className={cn(
              "mx-3 my-1",
              ed
                ? "border-b border-rule"
                : "border-b border-modern-card-border/30",
            )}
          />

          {/* Search */}
          <div className="px-3 py-2">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2",
                ed
                  ? "border border-rule bg-surface-raised"
                  : "rounded-xl border border-modern-card-border bg-surface-raised",
              )}
            >
              <Search size={14} className="shrink-0 text-ink-secondary" />
              <input
                type="text"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border-0 bg-transparent text-xs text-ink outline-none placeholder:text-ink-secondary/50"
              />
            </div>
          </div>

          {/* DM Thread List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {filteredThreads.length === 0 ? (
              <p className="p-4 text-center text-xs text-ink-secondary">
                {search
                  ? "No conversations match."
                  : "No messages yet. Start a conversation!"}
              </p>
            ) : (
              filteredThreads.map((thread) => {
                const isActive = thread.id === activeView;
                const isP1 = thread.participant_1 === currentUserId;
                const unread = isP1
                  ? thread.unread_count_1
                  : thread.unread_count_2;
                const otherUser = thread.other_user;

                return (
                  <div
                    key={thread.id}
                    onClick={() => handleSelectThread(thread.id)}
                    className={cn(
                      "group mb-1 flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-raised",
                      !ed && "rounded-[10px]",
                      isActive && "bg-surface-raised",
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {otherUser?.avatar_url ? (
                        <img
                          src={otherUser.avatar_url}
                          alt={otherUser.full_name ?? "User"}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white",
                            getGradient(otherUser?.id ?? thread.id),
                          )}
                        >
                          {getInitials(
                            otherUser?.full_name || otherUser?.company_name,
                          )}
                        </div>
                      )}
                      {unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-editorial-red px-0.5 text-[8px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-xs text-ink",
                            unread > 0 ? "font-bold" : "font-medium",
                          )}
                        >
                          {otherUser?.full_name ||
                            otherUser?.company_name ||
                            "Unknown User"}
                        </span>
                        <span className="shrink-0 text-[10px] text-ink-secondary">
                          {formatTimeAgo(thread.last_message_at)}
                        </span>
                      </div>
                      {otherUser?.account_type === "brand" &&
                        otherUser.company_name && (
                          <p className="truncate text-[10px] text-editorial-red">
                            {otherUser.company_name}
                          </p>
                        )}
                      {thread.last_message_preview && (
                        <p
                          className={cn(
                            "mt-0.5 truncate text-[11px]",
                            unread > 0
                              ? "font-medium text-ink"
                              : "text-ink-secondary",
                          )}
                        >
                          {thread.last_message_preview}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Main Area ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {activeView === "ai" ? (
            <ChatClient
              initialConversations={initialConversations}
              profiles={profiles}
              activeProvider={activeProvider}
            />
          ) : activeThread ? (
            <MessageThreadView
              thread={activeThread}
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={handleSendMessage}
              onNewMessage={handleNewMessage}
              editorial={ed}
              cardClass={card}
            />
          ) : (
            <div
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-4 px-8",
                card,
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center",
                  !ed && "rounded-2xl",
                )}
                style={{ background: "rgba(var(--accent-rgb),0.1)" }}
              >
                <MessageSquare size={24} className="text-ink-secondary" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-ink">
                  Select a conversation
                </h3>
                <p className="mt-1 max-w-xs text-xs text-ink-secondary">
                  Choose the AI assistant or a conversation from the list.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewConversationDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onThreadCreated={handleThreadCreated}
        editorial={ed}
      />
    </>
  );
}
