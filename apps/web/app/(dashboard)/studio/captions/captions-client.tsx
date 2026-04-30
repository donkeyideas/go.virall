'use client';

import { useState, useCallback } from 'react';
import { PLATFORM_CHAR_LIMITS } from '@govirall/core';
import { ThemedSelect, AccountPicker } from '@govirall/ui-web';

type PlatformAccount = {
  id: string;
  platform: string;
  platform_username: string;
  follower_count: number | null;
  sync_status: string;
};

type Props = {
  theme: string;
  mission: string | null;
  platforms: PlatformAccount[];
  previousResults?: unknown[] | null;
  previousMeta?: { platform: string; topic: string; tone: string } | null;
};

const TONES = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Educational', 'Storytelling'];

const ALL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
];

export function CaptionsClient({ theme, platforms, previousResults, previousMeta }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const [selectedPlatform, setSelectedPlatform] = useState(previousMeta?.platform ?? 'instagram');
  const [topic, setTopic] = useState(previousMeta?.topic ?? '');
  const [tone, setTone] = useState(previousMeta?.tone || 'Professional');
  const [count, setCount] = useState(5);
  const [results, setResults] = useState<Array<Record<string, unknown>>>((previousResults ?? []) as Array<Record<string, unknown>>);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const connectedAccount = selectedAccountId
    ? platforms.find((p) => p.id === selectedAccountId)
    : platforms.find((p) => p.platform === selectedPlatform);
  const charLimit = PLATFORM_CHAR_LIMITS[selectedPlatform]?.caption ?? 2200;

  const cardStyle: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 24 }
    : isNeumorphic
    ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 24, boxShadow: 'var(--out-md)' }
    : {
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: 'none',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      };

  const innerItemStyle: React.CSSProperties = isEditorial
    ? { background: 'var(--paper-2, rgba(0,0,0,.03))', borderRadius: 14, padding: '14px 16px' }
    : isNeumorphic
    ? { background: 'var(--surface, var(--bg))', borderRadius: 16, padding: '14px 16px', boxShadow: 'var(--in-sm)' }
    : { background: 'rgba(255,255,255,.04)', borderRadius: 14, padding: '14px 16px' };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    borderRadius: 14,
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    boxShadow: 'var(--input-shadow, none)',
    padding: '12px 16px',
    font: 'inherit',
    fontSize: 14,
    color: 'var(--fg)',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    paddingRight: 40,
  };

  const btnPrimary: React.CSSProperties = {
    height: 48,
    padding: '0 28px',
    borderRadius: isNeumorphic ? 16 : 14,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s',
    ...(isEditorial
      ? { background: 'var(--ink)', color: 'var(--bg)' }
      : isNeumorphic
      ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
      : { background: 'linear-gradient(135deg, #f43f5e, #fb923c)', color: '#fff' }),
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Enter a topic for your captions.'); return; }
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          contentType: 'captions',
          topic: topic.trim(),
          tone,
          count,
          platformAccountId: connectedAccount?.id,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error.message || 'Generation failed.');
      } else {
        const data = json.data?.data ?? json.data ?? {};
        setResults((data.captions ?? []) as Array<Record<string, unknown>>);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform, topic, tone, count, connectedAccount]);

  const suggestTopic = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await fetch('/api/content/suggest-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, contentType: 'captions' }),
      });
      const json = await res.json();
      const suggested = json.data?.topic ?? json.topic ?? '';
      if (suggested) setTopic(suggested);
    } catch { /* ignore */ }
    setSuggesting(false);
  }, [selectedPlatform]);

  function copyCaption(cap: Record<string, unknown>, index: number) {
    const text = `${cap.text ?? ''}\n\n${cap.callToAction ?? ''}\n\n${Array.isArray(cap.hashtags) ? cap.hashtags.join(' ') : ''}`.trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  return (
    <>
      {/* Page heading — writer vibe */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            STUDIO · WRITER
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: isEditorial ? 300 : 400,
            fontStyle: isEditorial ? 'italic' : 'normal',
            fontSize: isEditorial ? 'clamp(40px, 5vw, 60px)' : 'clamp(32px, 4vw, 48px)',
            lineHeight: 0.95,
            letterSpacing: '-.025em',
            color: isEditorial ? 'var(--ink)' : 'var(--fg)',
          }}
        >
          {isEditorial ? (
            <>Caption <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Writer.</span></>
          ) : (
            'Caption Writer'
          )}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
          Polished, ready-to-post captions crafted for your platform's character limits.
        </p>
      </div>

      <AccountPicker
        accounts={platforms}
        selectedAccountId={selectedAccountId}
        onSelect={(accountId, platform) => {
          setSelectedAccountId(accountId);
          if (platform) setSelectedPlatform(platform);
        }}
        theme={theme}
        label="Generating for"
      />

      {/* Platform selector — required here since captions are platform-specific */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {ALL_PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlatform(p.id)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: selectedPlatform === p.id ? 600 : 400,
              borderRadius: isNeumorphic ? 16 : 12,
              border: 'none',
              cursor: 'pointer',
              transition: 'all .2s',
              ...(selectedPlatform === p.id
                ? isEditorial
                  ? { background: 'var(--ink)', color: '#fff' }
                  : isNeumorphic
                  ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--in-sm)' }
                  : { background: 'var(--color-primary)', color: '#fff' }
                : isEditorial
                ? { background: 'transparent', color: 'var(--muted)' }
                : isNeumorphic
                ? { background: 'var(--surface, var(--bg))', color: 'var(--muted)', boxShadow: 'var(--out-sm)' }
                : { background: 'rgba(255,255,255,.04)', color: 'var(--muted)' }),
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Char limit indicator */}
      <div style={{ ...innerItemStyle, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
        <span>
          Platform character limit: <strong style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{charLimit.toLocaleString()}</strong> chars
        </span>
        <span style={{ fontSize: 11 }}>
          {charLimit <= 300 ? 'Short-form — every word counts' : charLimit <= 2200 ? 'Standard length — room for storytelling' : 'Long-form — go deep'}
        </span>
      </div>

      {/* Form */}
      <div style={{ ...cardStyle, marginBottom: 24, overflow: 'visible' }}>
        <div className="grid-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 160px 80px auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 8 }}>
              Topic
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What's the caption about?"
                style={{ ...inputStyle, paddingRight: 48 }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
              />
              <button
                type="button"
                onClick={suggestTopic}
                disabled={suggesting}
                title="Suggest a topic"
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: 'none',
                  cursor: suggesting ? 'wait' : 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'all .15s',
                  background: isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(139,92,246,.15)',
                  color: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--color-primary)' : 'var(--color-primary)',
                  boxShadow: isNeumorphic ? 'var(--out-sm)' : 'none',
                }}
              >
                {suggesting ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 8 }}>
              Tone
            </label>
            <ThemedSelect
              value={tone}
              onChange={setTone}
              theme={theme}
              options={TONES.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 8 }}>
              Count
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              style={inputStyle}
            />
          </div>
          <button onClick={handleGenerate} disabled={loading || !topic.trim()} style={{ ...btnPrimary, opacity: loading || !topic.trim() ? 0.5 : 1 }}>
            {loading ? 'Writing...' : 'Write Captions'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...innerItemStyle, marginBottom: 20, color: 'var(--color-bad, #ef4444)', fontSize: 14 }}>{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Crafting captions...</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>This may take 10-30 seconds.</p>
            </div>
          </div>
          <div style={{ marginTop: 16, height: 4, borderRadius: 2, background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '60%', background: 'var(--color-primary)', borderRadius: 2, animation: 'pulse 2s ease-in-out infinite' }} />
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: .4; width: 30%; } 50% { opacity: 1; width: 80%; } }
          `}</style>
        </div>
      )}

      {/* Results — stacked writer-style cards with prominent text */}
      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>
              {results.length} Captions
            </h2>
            <button
              onClick={handleGenerate}
              style={{ fontSize: 12, color: 'var(--color-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Regenerate
            </button>
          </div>

          {results.map((cap, i) => {
            const text = String(cap.text ?? '');
            const pct = Math.min((text.length / charLimit) * 100, 100);
            const barColor = pct > 90 ? 'var(--color-bad, #ef4444)' : pct > 70 ? 'var(--color-warn, #f59e0b)' : 'var(--color-good, #22c55e)';

            return (
              <div key={i} style={cardStyle}>
                {/* Top bar: number + copy */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>Caption {i + 1}</span>
                  <button
                    onClick={() => copyCaption(cap, i)}
                    style={{
                      padding: '6px 16px', fontSize: 12, borderRadius: 10,
                      border: copiedIndex === i ? '1px solid var(--color-good)' : '1px solid var(--line)',
                      background: copiedIndex === i ? 'rgba(34,197,94,.1)' : 'transparent',
                      color: copiedIndex === i ? 'var(--color-good, #22c55e)' : 'var(--muted)',
                      cursor: 'pointer', fontWeight: 500, transition: 'all .15s',
                    }}
                  >
                    {copiedIndex === i ? 'Copied!' : 'Copy All'}
                  </button>
                </div>

                {/* Main text — large and prominent for writer mode */}
                <p style={{
                  fontSize: 16,
                  color: 'var(--fg)',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  marginBottom: 16,
                  fontFamily: isEditorial ? 'var(--font-serif, Georgia, serif)' : 'inherit',
                }}>
                  {text}
                </p>

                {/* CTA */}
                {cap.callToAction ? (
                  <div style={{ ...innerItemStyle, marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 4 }}>Call to Action</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: isEditorial ? 'var(--ink)' : 'var(--color-primary)' }}>{String(cap.callToAction)}</p>
                  </div>
                ) : null}

                {/* Hashtags */}
                {Array.isArray(cap.hashtags) && cap.hashtags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {cap.hashtags.map((tag: unknown, j: number) => (
                      <span key={j} style={{ fontSize: 11, color: 'var(--color-primary)', opacity: 0.8 }}>{String(tag)}</span>
                    ))}
                  </div>
                )}

                {/* Character count bar — prominent for writer mode */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: pct > 90 ? barColor : 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {text.length} / {charLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 48 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, margin: '0 auto 12px' }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Select a platform, enter a topic, and let AI write your captions.
          </p>
        </div>
      )}
    </>
  );
}
