"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { MessageList } from "@/components/messaging/MessageList";
import { MessageThreadView } from "@/components/messaging/MessageThread";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";
import {
  sendMessage,
  getMessages as fetchMessages,
  markThreadRead,
  getOrCreateThread,
} from "@/lib/actions/messages";
import type { MessageThread, DirectMessage } from "@/types";

interface BrandMessagesClientProps {
  threads: MessageThread[];
  currentUserId: string;
  initialThreadId?: string;
  initialMessages?: DirectMessage[];
  autoMessageUserId?: string;
}

export function BrandMessagesClient({
  threads: initialThreads,
  currentUserId,
  initialThreadId,
  initialMessages,
  autoMessageUserId,
}: BrandMessagesClientProps) {
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

  // Brand dashboard is always "modern" style (no editorial toggle)
  const card = "rounded-[14px] border border-modern-card-border bg-surface-card";

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  // Auto-create thread when ?to=userId is provided (from matches page etc.)
  useEffect(() => {
    if (!autoMessageUserId) return;
    let cancelled = false;

    (async () => {
      const result = await getOrCreateThread(autoMessageUserId);
      if (cancelled) return;
      if (result.success && result.thread) {
        const thread = result.thread;
        // Add thread to list if it's new
        setThreads((prev) => {
          if (prev.some((t) => t.id === thread.id)) return prev;
          return [thread, ...prev];
        });
        handleSelectThread(thread.id);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMessageUserId]);

  // Sync URL when ?thread= param changes
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
      } catch {
        // Message load failed — user sees empty state
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
      } catch {
        // Mark-read is best-effort
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
      <div className="flex h-[calc(100dvh-148px)] gap-3">
        {/* Sidebar */}
        {showSidebar && (
          <div className={`flex w-72 shrink-0 flex-col overflow-hidden ${card}`}>
            <MessageList
              threads={threads}
              activeThreadId={activeThreadId}
              currentUserId={currentUserId}
              onSelectThread={handleSelectThread}
              onNewMessage={() => setShowNewDialog(true)}
            />
          </div>
        )}

        {/* Main Area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {/* Header Card */}
          <div className={`flex items-center justify-between px-5 py-3 ${card}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-xs text-ink-secondary transition-colors hover:text-ink"
              >
                {showSidebar ? "Hide" : "Show"} Threads
              </button>
              <div className="h-4 w-px bg-modern-card-border" />
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
              cardClass={card}
            />
          ) : (
            <div className={`flex flex-1 flex-col items-center justify-center gap-4 px-8 ${card}`}>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ background: "rgba(var(--accent-rgb),0.1)" }}
              >
                <MessageSquare size={24} className="text-ink-secondary" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-ink">
                  Select a conversation
                </h3>
                <p className="mt-1 max-w-xs text-xs text-ink-secondary">
                  Choose a conversation from the list or start a new one to message a creator.
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
      />
    </>
  );
}
