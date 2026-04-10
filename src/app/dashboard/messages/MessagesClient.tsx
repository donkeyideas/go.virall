"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/lib/contexts/view-mode";
import { MessageList } from "@/components/messaging/MessageList";
import { MessageThreadView } from "@/components/messaging/MessageThread";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";
import {
  sendMessage,
  getMessages as fetchMessages,
  markThreadRead,
} from "@/lib/actions/messages";
import type { MessageThread, DirectMessage } from "@/types";

interface MessagesClientProps {
  threads: MessageThread[];
  currentUserId: string;
  initialThreadId?: string;
  initialMessages?: DirectMessage[];
}

export function MessagesClient({
  threads: initialThreads,
  currentUserId,
  initialThreadId,
  initialMessages,
}: MessagesClientProps) {
  const searchParams = useSearchParams();

  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId ?? null,
  );
  const [messages, setMessages] = useState<DirectMessage[]>(
    initialMessages ?? [],
  );
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { viewMode } = useViewMode();
  const ed = viewMode === "editorial";
  const card = ed
    ? "border border-rule bg-surface-card"
    : "rounded-[14px] border border-modern-card-border bg-surface-card";

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  // Deep-link via ?thread=<id>
  useEffect(() => {
    const threadParam = searchParams.get("thread");
    if (threadParam && threadParam !== activeThreadId) {
      handleSelectThread(threadParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      setActiveThreadId(threadId);

      const url = new URL(window.location.href);
      url.searchParams.set("thread", threadId);
      window.history.replaceState({}, "", url.toString());

      try {
        const msgs = await fetchMessages(threadId);
        setMessages(msgs);
      } catch (err) {
        console.error("[MessagesClient] Failed to load messages:", err);
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
        console.error("[MessagesClient] Failed to mark read:", err);
      }
    },
    [currentUserId],
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeThreadId) return;

      const optimisticMsg: DirectMessage = {
        id: `temp-${Date.now()}`,
        thread_id: activeThreadId,
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
          if (t.id !== activeThreadId) return t;
          return {
            ...t,
            last_message_at: new Date().toISOString(),
            last_message_preview: content.slice(0, 120),
          };
        }),
      );

      const result = await sendMessage(activeThreadId, content);

      if (result.error) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== optimisticMsg.id),
        );
        console.error("[MessagesClient] Send failed:", result.error);
        throw new Error(result.error);
      }

      if (result.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id ? result.message! : m,
          ),
        );
      }
    },
    [activeThreadId, currentUserId],
  );

  const handleNewMessage = useCallback(
    (message: DirectMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
      if (activeThreadId) {
        markThreadRead(activeThreadId).catch(() => {});
      }
    },
    [activeThreadId],
  );

  const handleThreadCreated = useCallback(
    (threadId: string) => {
      handleSelectThread(threadId);
    },
    [handleSelectThread],
  );

  return (
    <>
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Sidebar — Thread List (separate card) */}
        {showSidebar && (
          <div className={cn("flex w-72 shrink-0 flex-col overflow-hidden", card)}>
            <MessageList
              threads={threads}
              activeThreadId={activeThreadId}
              currentUserId={currentUserId}
              onSelectThread={handleSelectThread}
              onNewMessage={() => setShowNewDialog(true)}
              editorial={ed}
            />
          </div>
        )}

        {/* Main Area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {/* Header Card */}
          <div className={cn("flex items-center justify-between px-5 py-3", card)}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-xs text-ink-secondary transition-colors hover:text-ink"
              >
                {showSidebar ? "Hide" : "Show"} Threads
              </button>
              <div className={cn("h-4 w-px", ed ? "bg-rule" : "bg-modern-card-border")} />
              <h2 className="text-sm font-bold text-ink">Messages</h2>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-ink-secondary">
              {threads.length} conversation{threads.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Thread View or Empty State */}
          {activeThread ? (
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
            <div className={cn("flex flex-1 flex-col items-center justify-center gap-4 px-8", card)}>
              <div className={cn("flex h-12 w-12 items-center justify-center", ed ? "" : "rounded-2xl")}
                style={{ background: "rgba(var(--accent-rgb),0.1)" }}
              >
                <MessageSquare size={24} className="text-ink-secondary" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-ink">
                  Select a conversation
                </h3>
                <p className="mt-1 max-w-xs text-xs text-ink-secondary">
                  Choose a conversation from the list or start a new one to begin
                  messaging.
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
