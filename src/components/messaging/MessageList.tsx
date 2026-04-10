"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageThread } from "@/types";

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

interface MessageListProps {
  threads: MessageThread[];
  activeThreadId: string | null;
  currentUserId: string;
  onSelectThread: (threadId: string) => void;
  onNewMessage: () => void;
  editorial?: boolean;
}

export function MessageList({
  threads,
  activeThreadId,
  currentUserId,
  onSelectThread,
  onNewMessage,
  editorial: ed = false,
}: MessageListProps) {
  const [search, setSearch] = useState("");

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={cn("flex items-center justify-between p-4", ed ? "border-b border-rule" : "border-b border-modern-card-border/50")}>
        <h3 className="text-sm font-bold text-ink">Threads</h3>
        <button
          onClick={onNewMessage}
          className={cn("bg-editorial-red px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90", !ed && "rounded-full")}
        >
          + New
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className={cn("flex items-center gap-2 px-3 py-2", ed ? "border border-rule bg-surface-raised" : "rounded-xl border border-modern-card-border bg-surface-raised")}>
          <Search size={14} className="shrink-0 text-ink-secondary" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-0 bg-transparent text-xs text-ink outline-none placeholder:text-ink-secondary/50"
          />
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredThreads.length === 0 ? (
          <p className="p-4 text-center text-xs text-ink-secondary">
            {search ? "No conversations match your search." : "No messages yet. Start a conversation!"}
          </p>
        ) : (
          filteredThreads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const isP1 = thread.participant_1 === currentUserId;
            const unread = isP1 ? thread.unread_count_1 : thread.unread_count_2;
            const otherUser = thread.other_user;

            return (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={cn(
                  "group mb-1 flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-raised",
                  ed ? "" : "rounded-[10px]",
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
                      {getInitials(otherUser?.full_name || otherUser?.company_name)}
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
                    <span className={cn("truncate text-xs text-ink", unread > 0 ? "font-bold" : "font-medium")}>
                      {otherUser?.full_name || otherUser?.company_name || "Unknown User"}
                    </span>
                    <span className="shrink-0 text-[10px] text-ink-secondary">
                      {formatTimeAgo(thread.last_message_at)}
                    </span>
                  </div>
                  {otherUser?.account_type === "brand" && otherUser.company_name && (
                    <p className="truncate text-[10px] text-editorial-red">
                      {otherUser.company_name}
                    </p>
                  )}
                  {thread.last_message_preview && (
                    <p className={cn("mt-0.5 truncate text-[11px]", unread > 0 ? "font-medium text-ink" : "text-ink-secondary")}>
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
  );
}
