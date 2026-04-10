"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchUsers, getOrCreateThread } from "@/lib/actions/messages";

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
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

type UserResult = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string;
  company_name: string | null;
};

interface NewConversationDialogProps {
  open: boolean;
  onClose: () => void;
  onThreadCreated: (threadId: string) => void;
  editorial?: boolean;
}

export function NewConversationDialog({
  open,
  onClose,
  onThreadCreated,
  editorial: ed = false,
}: NewConversationDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await searchUsers(value);
        setResults(users);
      } catch (err) {
        console.error("[NewConversationDialog] Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSelect = async (userId: string) => {
    setIsCreating(true);
    try {
      const result = await getOrCreateThread(userId);
      if (result.thread) {
        onThreadCreated(result.thread.id);
        onClose();
      }
    } catch (err) {
      console.error("[NewConversationDialog] Create thread error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div
        className={cn(
          "relative z-10 w-full max-w-md border bg-surface-card",
          ed ? "border-rule" : "rounded-2xl border-modern-card-border",
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between p-4", ed ? "border-b border-rule" : "border-b border-modern-card-border/50")}>
          <h3 className="text-sm font-bold text-ink">New Conversation</h3>
          <button onClick={onClose} className="text-ink-secondary transition-colors hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className={cn("flex items-center gap-2 px-3 py-2.5", ed ? "border border-rule bg-surface-raised" : "rounded-xl border border-modern-card-border bg-surface-raised")}>
            <Search size={14} className="shrink-0 text-ink-secondary" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-secondary/50"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto px-2 pb-4">
          {isSearching && (
            <p className="px-4 py-3 text-center text-xs text-ink-secondary">Searching...</p>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-4 py-3 text-center text-xs text-ink-secondary">No users found.</p>
          )}

          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.id)}
              disabled={isCreating}
              className={cn(
                "mb-0.5 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised disabled:opacity-50",
                ed ? "" : "rounded-[10px]",
              )}
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name ?? "User"}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white",
                    getGradient(user.id),
                  )}
                >
                  {getInitials(user.full_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">
                  {user.full_name ?? "Unknown User"}
                </p>
                {user.account_type === "brand" && user.company_name && (
                  <p className="truncate text-[10px] text-editorial-red">
                    {user.company_name}
                  </p>
                )}
                <p className="text-[10px] capitalize text-ink-secondary">
                  {user.account_type}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
