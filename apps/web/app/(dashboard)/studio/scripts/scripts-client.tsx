'use client';

import { useState, useCallback } from 'react';
import { ThemedSelect } from '@govirall/ui-web';

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
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
];

export function ScriptsClient({ theme, platforms, previousResults, previousMeta }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const [selectedPlatform, setSelectedPlatform] = useState(previousMeta?.platform ?? 'tiktok');
  const [topic, setTopic] = useState(previousMeta?.topic ?? '');
  const [tone, setTone] = useState(previousMeta?.tone || 'Casual');
  const [count, setCount] = useState(3);
  const [results, setResults] = useState<Array<Record<string, unknown>>>((previousResults ?? []) as Array<Record<string, unknown>>);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const connectedAccount = platforms.find((p) => p.platform === selectedPlatform);

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
      : { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff' }),
  };

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Enter a topic for your scripts.'); return; }
    setError(null);
    setLoading(true);
    setResults([]);
    setExpandedIndex(null);
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform,
          contentType: 'scripts',
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
        const scripts = (data.scripts ?? []) as Array<Record<string, unknown>>;
        setResults(scripts);
        if (scripts.length > 0) setExpandedIndex(0);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform, topic, tone, count, connectedAccount]);

  function copyScript(script: Record<string, unknown>, index: number) {
    const text = `${script.title ?? ''}\n\nHOOK (first 3 sec):\n${script.hook ?? ''}\n\nBODY:\n${script.body ?? ''}\n\nCTA:\n${script.callToAction ?? ''}\n\nDuration: ${script.duration ?? ''}\nVisual notes: ${script.visualNotes ?? ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  const suggestTopic = useCallback(async () => {
    setSuggesting(true);
    try {
      const res = await fetch('/api/content/suggest-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: selectedPlatform, contentType: 'scripts' }),
      });
      const json = await res.json();
      const suggested = json.data?.topic ?? json.topic ?? '';
      if (suggested) setTopic(suggested);
    } catch { /* ignore */ }
    setSuggesting(false);
  }, [selectedPlatform]);

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.15em',
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  };

  return (
    <>
      {/* Page heading — production vibe */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            STUDIO · PRODUCTION
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
            <>Script <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Writer.</span></>
          ) : (
            'Script Writer'
          )}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>
          Structured video scripts with hooks, body, CTAs, and timing cues.
        </p>
      </div>

      {/* Platform strip — video-first order */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
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

      {/* Form */}
      <div style={{ ...cardStyle, marginBottom: 24, overflow: 'visible' }}>
        <div className="grid-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 160px 80px auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', ...sectionLabel, color: 'var(--muted)' }}>Video topic</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 5 productivity hacks, Day in my life, Unboxing..."
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
            <label style={{ display: 'block', ...sectionLabel, color: 'var(--muted)' }}>Tone</label>
            <ThemedSelect
              value={tone}
              onChange={setTone}
              theme={theme}
              options={TONES.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div>
            <label style={{ display: 'block', ...sectionLabel, color: 'var(--muted)' }}>Scripts</label>
            <input
              type="number"
              min={1}
              max={5}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
              style={inputStyle}
            />
          </div>
          <button onClick={handleGenerate} disabled={loading || !topic.trim()} style={{ ...btnPrimary, opacity: loading || !topic.trim() ? 0.5 : 1 }}>
            {loading ? 'Writing...' : 'Write Scripts'}
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
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Writing scripts...</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>This may take 15-30 seconds.</p>
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

      {/* Results — structured script layout (click to expand) */}
      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: 'var(--muted)' }}>
              {results.length} Scripts
            </h2>
            <button
              onClick={handleGenerate}
              style={{ fontSize: 12, color: 'var(--color-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}
            >
              Regenerate
            </button>
          </div>

          {results.map((script, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div key={i} style={cardStyle}>
                {/* Header — always visible */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', marginBottom: isExpanded ? 20 : 0 }}
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums',
                      ...(isEditorial
                        ? { background: 'var(--ink)', color: '#fff' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)', color: 'var(--fg)' }
                        : { background: 'rgba(245,158,11,.15)', color: '#f59e0b' }),
                    }}>
                      {i + 1}
                    </span>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{String(script.title ?? '')}</h3>
                      {!isExpanded && (
                        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {String(script.hook ?? '').slice(0, 80)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {script.duration ? (
                      <span style={{
                        padding: '4px 12px', fontSize: 11, fontWeight: 700, borderRadius: 999, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums',
                        ...(isEditorial
                          ? { background: 'var(--ink)', color: '#fff' }
                          : isNeumorphic
                          ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-sm)', color: 'var(--fg)' }
                          : { background: 'rgba(245,158,11,.15)', color: '#f59e0b' }),
                      }}>
                        {String(script.duration)}
                      </span>
                    ) : null}
                    <span style={{ fontSize: 18, color: 'var(--muted)', transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>
                      &#9662;
                    </span>
                  </div>
                </div>

                {/* Expanded content — structured sections */}
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Hook section — highlighted */}
                    <div style={{
                      ...innerItemStyle,
                      borderLeft: `3px solid ${isEditorial ? 'var(--ink)' : 'var(--color-primary)'}`,
                    }}>
                      <p style={{ ...sectionLabel, color: isEditorial ? 'var(--hot, var(--color-accent))' : 'var(--color-primary)' }}>
                        Hook — First 3 Seconds
                      </p>
                      <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)', lineHeight: 1.5 }}>{String(script.hook ?? '')}</p>
                    </div>

                    {/* Body */}
                    <div>
                      <p style={{ ...sectionLabel, color: 'var(--muted)' }}>Body</p>
                      <p style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{String(script.body ?? '')}</p>
                    </div>

                    {/* CTA */}
                    {script.callToAction ? (
                      <div style={innerItemStyle}>
                        <p style={{ ...sectionLabel, color: 'var(--muted)' }}>Call to Action</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: isEditorial ? 'var(--ink)' : 'var(--color-primary)' }}>{String(script.callToAction)}</p>
                      </div>
                    ) : null}

                    {/* Visual Notes */}
                    {script.visualNotes ? (
                      <div style={{ padding: '10px 14px', borderRadius: 12, border: `1px dashed ${isEditorial ? 'var(--rule)' : 'var(--line)'}` }}>
                        <p style={{ ...sectionLabel, color: 'var(--muted)' }}>Visual Notes</p>
                        <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5 }}>{String(script.visualNotes)}</p>
                      </div>
                    ) : null}

                    {/* Copy button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyScript(script, i); }}
                        style={{
                          padding: '8px 20px', fontSize: 12, borderRadius: 10,
                          border: copiedIndex === i ? '1px solid var(--color-good)' : '1px solid var(--line)',
                          background: copiedIndex === i ? 'rgba(34,197,94,.1)' : 'transparent',
                          color: copiedIndex === i ? 'var(--color-good, #22c55e)' : 'var(--muted)',
                          cursor: 'pointer', fontWeight: 500, transition: 'all .15s',
                        }}
                      >
                        {copiedIndex === i ? 'Copied!' : 'Copy Full Script'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && !error && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 48 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, margin: '0 auto 12px' }}>
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
          </svg>
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>
            Enter a video topic to generate structured scripts with hooks, body, and CTAs.
          </p>
        </div>
      )}
    </>
  );
}
