"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => Promise<void>;
  placeholder?: string;
  editorial?: boolean;
  cardClass?: string;
}

export function MessageInput({
  onSend,
  placeholder = "Type a message...",
  editorial: ed = false,
  cardClass: card = "",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setValue("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await onSend(trimmed);
    } catch (err) {
      setValue(trimmed);
      console.error("[MessageInput] Send failed:", err);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("p-4", card)}>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isSending}
          className={cn(
            "flex-1 resize-none bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder-ink-secondary/50 outline-none transition-colors focus:border-editorial-red",
            ed ? "border border-rule" : "rounded-[14px] border border-modern-card-border",
          )}
          style={{ maxHeight: "120px" }}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isSending}
          className={cn(
            "shrink-0 bg-editorial-red px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50",
            ed ? "" : "rounded-[14px]",
          )}
        >
          Send
        </button>
      </div>
    </div>
  );
}
