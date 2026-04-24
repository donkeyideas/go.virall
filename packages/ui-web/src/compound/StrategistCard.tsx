'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'ai' | 'user';
  text: string;
};

type Props = {
  messages: Message[];
  quickActions?: string[];
  theme: string;
};

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, '')       // ## headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold**
    .replace(/\*(.+?)\*/g, '$1')     // *italic*
    .replace(/__(.+?)__/g, '$1')     // __bold__
    .replace(/_(.+?)_/g, '$1')       // _italic_
    .replace(/~~(.+?)~~/g, '$1')     // ~~strike~~
    .replace(/`(.+?)`/g, '$1')       // `code`
    .replace(/^[-*+]\s/gm, '• ')     // bullet lists
    .replace(/^\d+\.\s/gm, '')       // numbered lists
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [links](url)
    .replace(/^>\s?/gm, '')          // > blockquotes
    .replace(/---+/g, '')            // --- hr
    .trim();
}

export function StrategistCard({ messages: initialMessages, quickActions, theme }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });
      const json = await res.json();
      const raw = json.data?.reply ?? json.error?.message ?? 'Sorry, I could not process that.';
      setMessages((prev) => [...prev, { role: 'ai', text: stripMarkdown(raw) }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 420,
        ...(isEditorial
          ? {
              background: 'var(--lime)',
              border: '1.5px solid var(--ink)',
              borderRadius: 20,
            }
          : isNeumorphic
          ? {
              background: 'var(--surface, var(--bg))',
              borderRadius: 28,
              boxShadow: 'var(--out-md)',
            }
          : {
              background: 'var(--glass, rgba(255,255,255,.06))',
              backdropFilter: 'blur(24px) saturate(1.2)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
            }),
      }}
    >
      {/* Decorative glow */}
      {!isNeumorphic && (
      <div
        style={{
          position: 'absolute',
          inset: isEditorial ? '-40px -40px auto auto' : '-50% -30% auto auto',
          width: isEditorial ? 160 : 400,
          height: isEditorial ? 160 : 400,
          background: isEditorial
            ? 'var(--hot)'
            : 'radial-gradient(circle, rgba(139,92,246,.4), transparent 70%)',
          filter: isEditorial ? 'blur(30px)' : 'blur(40px)',
          opacity: isEditorial ? 0.8 : 1,
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, position: 'relative' }}>
        <div
          style={{
            width: isEditorial ? 44 : 42,
            height: isEditorial ? 44 : 42,
            borderRadius: isNeumorphic ? 14 : isEditorial ? '50%' : 12,
            background: isEditorial
              ? 'var(--ink)'
              : isNeumorphic
              ? 'var(--surface, var(--bg))'
              : 'conic-gradient(from 0deg, var(--violet), var(--rose), var(--amber), var(--violet))',
            display: 'grid',
            placeItems: 'center',
            fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 22,
            fontWeight: isEditorial ? 900 : 500,
            color: isEditorial ? 'var(--lime)' : isNeumorphic ? 'var(--accent, var(--color-primary))' : '#fff',
            boxShadow: isNeumorphic ? 'var(--out-sm)' : isEditorial ? 'none' : '0 0 30px rgba(139,92,246,.5)',
            flexShrink: 0,
          }}
        >
          V
        </div>
        <div>
          <h3
            style={{
              fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
              fontWeight: isEditorial ? 900 : isNeumorphic ? 500 : 400,
              fontStyle: isEditorial ? 'italic' : isNeumorphic ? 'normal' : 'normal',
              fontSize: isEditorial ? 24 : isNeumorphic ? 18 : 20,
              letterSpacing: '-.01em',
              color: isEditorial ? 'var(--ink)' : 'var(--ink, var(--fg))',
            }}
          >
            Virall{' '}
            <em style={{ fontStyle: 'italic', color: isEditorial ? 'var(--hot)' : isNeumorphic ? 'var(--accent, var(--color-primary))' : 'var(--lilac)' }}>AI</em>
            {isEditorial && '.'}
          </h3>
          <div
            style={{
              fontSize: isEditorial ? 10 : 11,
              fontFamily: isEditorial || isNeumorphic ? 'var(--font-mono)' : 'inherit',
              letterSpacing: isEditorial || isNeumorphic ? '.12em' : 'normal',
              color: isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--muted)' : 'var(--mint)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--color-good, #22c55e)' : 'var(--mint)',
                boxShadow: isEditorial || isNeumorphic ? 'none' : '0 0 8px var(--mint)',
                display: 'inline-block',
              }}
            />
            {loading ? 'thinking...' : 'online'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', marginBottom: 10, maxHeight: 260 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              maxWidth: '92%',
              fontSize: 13,
              lineHeight: 1.5,
              marginBottom: isEditorial ? 8 : 10,
              position: 'relative',
              whiteSpace: 'pre-wrap',
              ...(msg.role === 'ai'
                ? {
                    background: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(255,255,255,.05)',
                    border: isEditorial ? '1.5px solid var(--ink)' : isNeumorphic ? 'none' : '1px solid var(--line)',
                    borderTopLeftRadius: 4,
                    color: isEditorial ? 'var(--ink)' : 'var(--ink, var(--fg))',
                    ...(isNeumorphic ? { boxShadow: 'var(--in-sm)' } : {}),
                  }
                : {
                    background: isEditorial ? 'var(--ink)' : isNeumorphic ? 'linear-gradient(135deg, rgba(128,152,219,.2), rgba(168,148,220,.15))' : 'linear-gradient(135deg, rgba(139,92,246,.3), rgba(255,113,168,.2))',
                    border: isEditorial ? 'none' : isNeumorphic ? 'none' : '1px solid rgba(199,180,255,.2)',
                    borderTopRightRadius: 4,
                    marginLeft: 'auto',
                    color: isEditorial ? 'var(--paper)' : 'var(--ink, var(--fg))',
                    ...(isNeumorphic ? { boxShadow: 'var(--out-sm)' } : {}),
                  }),
            }}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 14,
              maxWidth: '92%',
              fontSize: 13,
              background: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(255,255,255,.05)',
              border: isEditorial ? '1.5px solid var(--ink)' : isNeumorphic ? 'none' : '1px solid var(--line)',
              borderTopLeftRadius: 4,
              color: isEditorial ? 'var(--ink)' : 'var(--muted)',
              ...(isNeumorphic ? { boxShadow: 'var(--in-sm)' } : {}),
            }}
          >
            Thinking...
          </div>
        )}
      </div>

      {/* Quick action chips */}
      {quickActions && quickActions.length > 0 && messages.length <= 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              disabled={loading}
              style={{
                fontSize: 11,
                padding: '5px 10px',
                background: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--surface, var(--bg))' : 'var(--glass, rgba(255,255,255,.06))',
                border: isEditorial ? '1.5px solid var(--ink)' : isNeumorphic ? 'none' : '1px solid var(--line)',
                borderRadius: 999,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: isEditorial ? 500 : 400,
                color: isEditorial ? 'var(--ink)' : 'var(--muted)',
                ...(isNeumorphic ? { boxShadow: 'var(--out-sm)' } : {}),
                transition: 'all .2s',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 14,
          display: 'flex',
          gap: isEditorial ? 6 : 8,
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <input
          placeholder="Ask your strategist..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            padding: isEditorial ? '12px 16px' : '10px 14px',
            background: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(255,255,255,.04)',
            border: isEditorial ? '1.5px solid var(--ink)' : isNeumorphic ? 'none' : '1px solid var(--line)',
            borderRadius: isNeumorphic ? 16 : isEditorial ? 999 : 14,
            font: 'inherit',
            fontSize: 13,
            outline: 'none',
            color: isEditorial ? 'var(--ink)' : 'var(--ink, var(--fg))',
            opacity: loading ? 0.5 : 1,
            ...(isNeumorphic ? { boxShadow: 'var(--in-sm)' } : {}),
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: isEditorial ? '10px 18px' : '8px 14px',
            background: isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--surface, var(--bg))' : 'linear-gradient(135deg, var(--violet), var(--rose))',
            color: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--accent, var(--color-primary))' : '#fff',
            border: 'none',
            borderRadius: isNeumorphic ? 16 : isEditorial ? 999 : 10,
            ...(isNeumorphic ? { boxShadow: 'var(--out-sm)' } : {}),
            fontWeight: 600,
            fontSize: 12,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
