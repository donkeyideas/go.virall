"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/track";
import type { ChatConversation, ChatMessage, SocialProfile, AIProvider } from "@/types";

interface ChatClientProps {
  initialConversations: ChatConversation[];
  profiles: SocialProfile[];
  activeProvider: AIProvider | null;
}

const QUICK_ACTIONS = [
  { label: "Content ideas", prompt: "Generate 5 content ideas optimized for my audience based on my recent top-performing posts." },
  { label: "Write captions", prompt: "Write 3 engaging captions for my next post. Make them shareable and include CTAs." },
  { label: "Best hashtags", prompt: "What are the best hashtags for my niche right now? Give me 4 sets: niche, growth, community, and trending." },
  { label: "Analyze my week", prompt: "Analyze my performance over the last 7 days. What worked, what didn't, and what should I do next?" },
  { label: "Growth tips", prompt: "Based on my current metrics and audience, give me 5 specific growth strategies I should implement this week." },
  { label: "Posting schedule", prompt: "Based on my audience activity data, what's my optimal posting schedule for this week?" },
];

/** Simple markdown → JSX renderer for chat messages */
function renderMarkdown(text: string) {
  // Split into lines and process
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ol" | "ul" | null = null;

  function flushList() {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} className={cn("my-2 space-y-1", listType === "ol" ? "list-decimal pl-5" : "list-disc pl-5")}>
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">{item}</li>
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Numbered list: "1. text" or "1) text"
    const olMatch = line.match(/^\s*(\d+)[.)]\s+(.+)/);
    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(inlineFormat(olMatch[2]));
      continue;
    }

    // Bullet list: "- text" or "* text"
    const ulMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(inlineFormat(ulMatch[1]));
      continue;
    }

    // Not a list item — flush any pending list
    flushList();

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      continue;
    }

    // Headings: ### or ## or #
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? "text-base font-bold" : level === 2 ? "text-sm font-bold" : "text-sm font-semibold";
      elements.push(
        <p key={`h-${i}`} className={cn(cls, "mt-3 mb-1")}>{inlineFormat(headingMatch[2])}</p>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed">{inlineFormat(line)}</p>
    );
  }

  flushList();
  return <>{elements}</>;
}

/** Inline formatting: **bold**, *italic*, `code` */
function inlineFormat(text: string): React.ReactNode {
  // Process bold, italic, and code inline
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic: *text* (not preceded by *)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    // Code: `text`
    const codeMatch = remaining.match(/`([^`]+?)`/);

    // Find earliest match
    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    // Add text before match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(<strong key={key++}>{first.match[1]}</strong>);
    } else if (first.type === "italic") {
      parts.push(<em key={key++}>{first.match[1]}</em>);
    } else if (first.type === "code") {
      parts.push(
        <code key={key++} className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs">
          {first.match[1]}
        </code>
      );
    }

    remaining = remaining.slice(first.index + first.match[0].length);
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

export function ChatClient({
  initialConversations,
  profiles,
  activeProvider,
}: ChatClientProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const providerLabel = activeProvider
    ? { openai: "GPT-4o", anthropic: "Claude", google: "Gemini", deepseek: "DeepSeek" }[activeProvider]
    : "DeepSeek";

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    trackEvent("page_view", "chat");
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/mobile/chat?conversationId=${convId}`, {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      } else {
        console.error("[ChatClient] Failed to load messages:", res.status);
      }
    } catch (err) {
      console.error("[ChatClient] loadMessages error:", err);
    }
  };

  const selectConversation = async (convId: string) => {
    setActiveConvId(convId);
    await loadMessages(convId);
  };

  const startNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const deleteConversation = async (convId: string) => {
    try {
      const token = await getToken();
      const res = await fetch("/api/mobile/chat", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversationId: convId }),
      });
      if (!res.ok) {
        console.error("[ChatClient] Delete failed:", res.status);
        return;
      }
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        startNewChat();
      }
    } catch (err) {
      console.error("[ChatClient] deleteConversation error:", err);
    }
  };

  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;
    trackEvent("chat_message", "chat", { provider: activeProvider ?? "deepseek" });

    // Optimistic UI
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConvId || "",
      role: "user",
      content: msgText,
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const token = await getToken();
      const res = await fetch("/api/mobile/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msgText,
          conversationId: activeConvId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send message");
      }

      const data = await res.json();

      // Update conversation ID if new
      if (!activeConvId && data.conversationId) {
        setActiveConvId(data.conversationId);
        setConversations((prev) => [
          {
            id: data.conversationId,
            organization_id: "",
            user_id: "",
            title: msgText.slice(0, 80),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      const assistantMsg: ChatMessage = {
        id: `temp-${Date.now()}-reply`,
        conversation_id: data.conversationId || activeConvId || "",
        role: "assistant",
        content: data.text,
        metadata: { provider: data.provider },
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `temp-${Date.now()}-error`,
        conversation_id: activeConvId || "",
        role: "assistant",
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasMessages = messages.length > 0 || activeConvId;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] gap-3">
      {/* Sidebar — Conversation History (separate card) */}
      {showSidebar && (
        <div className="flex w-72 shrink-0 flex-col overflow-hidden rounded-[14px] border border-modern-card-border bg-surface-card">
          <div className="flex items-center justify-between border-b border-modern-card-border/50 p-4">
            <h3 className="text-sm font-bold text-ink">Conversations</h3>
            <button
              onClick={startNewChat}
              className="rounded-full bg-editorial-red px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 && (
              <p className="p-4 text-center text-xs text-ink-secondary">
                No conversations yet. Start a new chat!
              </p>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group mb-1 flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-surface-raised",
                  activeConvId === conv.id && "bg-surface-raised",
                )}
                onClick={() => selectConversation(conv.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">
                    {conv.title || "Untitled"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-secondary">
                    {formatRelativeTime(conv.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="hidden shrink-0 text-[10px] text-ink-secondary hover:text-editorial-red group-hover:block"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Header Card */}
        <div className="flex items-center justify-between rounded-[14px] border border-modern-card-border bg-surface-card px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="text-xs text-ink-secondary transition-colors hover:text-ink"
            >
              {showSidebar ? "Hide" : "Show"} History
            </button>
            <div className="h-4 w-px bg-modern-card-border" />
            <h2 className="text-sm font-bold text-ink">Virall AI</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-ink-secondary">
              Powered by {providerLabel}
            </span>
            {profiles.length > 0 && (
              <span className="rounded-full bg-editorial-red/10 px-2.5 py-0.5 text-[10px] font-semibold text-editorial-red">
                {profiles.length} profile{profiles.length !== 1 ? "s" : ""} connected
              </span>
            )}
          </div>
        </div>

        {/* Messages Card */}
        <div className="flex-1 overflow-hidden rounded-[14px] border border-modern-card-border bg-surface-card">
          <div className="h-full overflow-y-auto px-5 py-5">
            {!hasMessages ? (
              /* Welcome Screen */
              <div className="flex h-full flex-col items-center justify-center">
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-ink">
                    Virall AI
                  </h2>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Your personal social media strategist. Ask me anything about
                    your content, growth, audience, or monetization.
                  </p>
                  {profiles.length === 0 && (
                    <p className="mt-2 text-xs text-editorial-red">
                      Connect a social profile first for personalized advice.
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.prompt)}
                      className="rounded-[14px] border border-modern-card-border bg-surface-raised px-4 py-3 text-left text-xs text-ink-secondary transition-all hover:border-editorial-red/30 hover:text-ink"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message List */
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] px-4 py-3",
                        msg.role === "user"
                          ? "rounded-2xl rounded-br-md bg-editorial-red text-white"
                          : "rounded-2xl rounded-bl-md border border-modern-card-border bg-surface-raised text-ink",
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div>{renderMarkdown(msg.content)}</div>
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      )}
                      {msg.metadata?.provider && (
                        <p className="mt-1.5 text-right text-[10px] opacity-40">
                          {formatProviderName(msg.metadata.provider)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-modern-card-border bg-surface-raised px-4 py-3">
                      <div className="flex gap-1">
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-ink-secondary" />
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-ink-secondary [animation-delay:150ms]" />
                        <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-ink-secondary [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions + Input Card */}
        <div className="rounded-[14px] border border-modern-card-border bg-surface-card p-4">
          {/* Quick action pills (shown when conversation active) */}
          {hasMessages && (
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-3 border-b border-modern-card-border/30">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => sendMessage(action.prompt)}
                  disabled={isLoading}
                  className="shrink-0 rounded-full border border-modern-card-border px-3 py-1 text-[10px] text-ink-secondary transition-colors hover:border-editorial-red/30 hover:text-ink disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {/* Input row */}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your content, growth, audience..."
              rows={1}
              className="flex-1 resize-none rounded-[14px] border border-modern-card-border bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder-ink-secondary/50 outline-none transition-colors focus:border-editorial-red"
              style={{ maxHeight: "120px" }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 rounded-[14px] bg-editorial-red px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helpers

async function getToken(): Promise<string> {
  // Get the Supabase session token from the cookie
  const { createBrowserClient } = await import("@supabase/ssr");
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatProviderName(provider: string): string {
  const cleaned = provider.replace("byok_", "");
  const map: Record<string, string> = {
    openai: "GPT-4o",
    anthropic: "Claude",
    google: "Gemini",
    gemini: "Gemini",
    deepseek: "DeepSeek",
  };
  return map[cleaned] || cleaned;
}
