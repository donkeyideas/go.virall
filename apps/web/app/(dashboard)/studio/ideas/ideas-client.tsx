'use client';

import { useState, useCallback } from 'react';
import { PLATFORM_CHAR_LIMITS, PLATFORM_CONTENT_FORMATS } from '@govirall/core';
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
  { id: 'general', label: 'General' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
];

export function IdeasClient({ theme, platforms, previousResults, previousMeta }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const [selectedPlatform, setSelectedPlatform] = useState(previousMeta?.platform ?? 'general');
  const [topic, setTopic] = useState(previousMeta?.topic ?? '');
  const [tone, setTone] = useState(previousMeta?.tone || 'Casual');
  const [count, setCount] = useState(8);
  const [results, setResults] = useState<Array<Record<string, unknown>>>((previousResults ?? []) as Array<Record<string, unknown>>);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const connectedAccount = selectedAccountId
    ? platforms.find((p) => p.id === selectedAccountId)
    : platforms.find((p) => p.platform === selectedPlatform);
  const contentFormats = PLATFORM_CONTENT_FORMATS[selectedPlatform] ?? [];

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
      : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Enter a topic to brainstorm.'); return; }
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform === 'general' ? 'instagram' : selectedPlatform,
          contentType: 'post_ideas',
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
        setResults((data.ideas ?? []) as Array<Record<string, unknown>>);
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
        body: JSON.stringify({ platform: selectedPlatform === 'general' ? 'instagram' : selectedPlatform, contentType: 'ideas' }),
      });
      const json = await res.json();
      const suggested = json.data?.topic ?? json.topic ?? '';
      if (suggested) setTopic(suggested);
    } catch { /* ignore */ }
    setSuggesting(false);
  }, [selectedPlatform]);

  function copyIdea(idea: Record<string, unknown>, index: number) {
    const text = `${idea.title}\n\nHook: ${idea.hook}\nAngle: ${idea.angle}\nFormat: ${idea.format ?? ''}\n\n${Array.isArray(idea.hashtags) ? idea.hashtags.join(' ') : ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  const engagementColor = (level: unknown) => {
    const s = String(level);
    if (s === 'high') return 'var(--color-good, #22c55e)';
    if (s === 'medium') return 'var(--color-warn, #f59e0b)';
    return 'var(--muted)';
  };

  return (
    <>
      {/* Page heading — brainstorm vibe */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            STUDIO · BRAINSTORM
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
            <>Post <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Ideas.</span></>
          ) : (
            'Post Ideas'
          )}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
          Rapid-fire brainstorm — generate hooks, angles, and formats to fill your content pipeline.
        </p>
      </div>

      {/* Account picker */}
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

      {/* Platform strip */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
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

      {/* Formats bar */}
      {contentFormats.length > 0 && selectedPlatform !== 'general' && (
        <div style={{ ...innerItemStyle, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, fontSize: 12, color: 'var(--muted)' }}>
          <span style={{ fontWeight: 600 }}>Best formats:</span>
          {contentFormats.map((f: string) => (
            <span key={f} style={{
              padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
              ...(isEditorial
                ? { background: 'var(--paper-2, rgba(0,0,0,.05))', color: 'var(--ink)' }
                : isNeumorphic
                ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-sm)', color: 'var(--fg)' }
                : { background: 'rgba(139,92,246,.1)', color: 'var(--color-primary)' }),
            }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Input form — wide single row for brainstorm speed */}
      <div style={{ ...cardStyle, marginBottom: 24, overflow: 'visible' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 8 }}>
              What do you want to post about?
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Morning routines, AI tools, Travel hacks..."
                style={{ ...inputStyle, fontSize: 16, paddingRight: 48 }}
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
          <div style={{ flex: '0 0 150px' }}>
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
          <div style={{ flex: '0 0 80px' }}>
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
          <button onClick={handleGenerate} disabled={loading || !topic.trim()} style={{ ...btnPrimary, opacity: loading || !topic.trim() ? 0.5 : 1, flex: '0 0 auto' }}>
            {loading ? 'Brainstorming...' : 'Brainstorm'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...innerItemStyle, marginBottom: 20, color: 'var(--color-bad, #ef4444)', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 20, height: 20, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Brainstorming ideas...</p>
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

      {/* Results — masonry-like grid for quick scanning */}
      {!loading && results.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>
              {results.length} Ideas
            </h2>
            <button
              onClick={handleGenerate}
              style={{ fontSize: 12, color: 'var(--color-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Regenerate
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {results.map((idea, i) => (
              <div key={i} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>
                    {String(idea.title ?? '')}
                  </h3>
                  <button
                    onClick={() => copyIdea(idea, i)}
                    style={{
                      padding: '4px 10px', fontSize: 11, borderRadius: 8, border: '1px solid var(--line)',
                      background: 'transparent', cursor: 'pointer', flexShrink: 0, transition: 'all .15s',
                      color: copiedIndex === i ? 'var(--color-good, #22c55e)' : 'var(--muted)',
                    }}
                  >
                    {copiedIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Hook */}
                <div style={innerItemStyle}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 4 }}>Hook</p>
                  <p style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.5 }}>{String(idea.hook ?? '')}</p>
                </div>

                {/* Angle */}
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
                  <strong>Angle:</strong> {String(idea.angle ?? '')}
                </p>

                {/* Badges row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
                  {idea.format ? (
                    <span style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999,
                      ...(isEditorial
                        ? { background: 'var(--ink)', color: '#fff' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                        : { background: 'rgba(139,92,246,.15)', color: 'var(--color-primary)' }),
                    }}>
                      {String(idea.format)}
                    </span>
                  ) : null}
                  {idea.estimatedEngagement ? (
                    <span style={{
                      padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 999,
                      color: engagementColor(idea.estimatedEngagement),
                      background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(255,255,255,.04)',
                      ...(isNeumorphic ? { boxShadow: 'var(--out-sm)' } : {}),
                    }}>
                      {String(idea.estimatedEngagement)} engagement
                    </span>
                  ) : null}
                </div>

                {/* Hashtags */}
                {Array.isArray(idea.hashtags) && idea.hashtags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {idea.hashtags.map((tag: unknown, j: number) => (
                      <span key={j} style={{ fontSize: 11, color: 'var(--color-primary)', opacity: 0.8 }}>{String(tag)}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </p>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Enter a topic and hit Brainstorm to generate content ideas.
          </p>
        </div>
      )}
    </>
  );
}
