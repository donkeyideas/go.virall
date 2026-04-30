'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountPicker, type AccountOption } from '@govirall/ui-web';

type Factor = { label: string; value: number; tip: string };

type Props = {
  theme: string;
  score: number | null;
  factors: Factor[] | null;
  computedAt: string | null;
  connectedCount: number;
  platforms: AccountOption[];
  selectedPlatformAccountId?: string | null;
};

export function SmoScoreClient({ theme, score, factors, computedAt, connectedCount, platforms, selectedPlatformAccountId }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';
  const router = useRouter();
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(selectedPlatformAccountId ?? null);

  const cardStyle: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 28 }
    : isNeumorphic
    ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 28, boxShadow: 'var(--out-md)' }
    : {
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: 28,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      };

  const btnStyle: React.CSSProperties = {
    height: 40,
    padding: '0 20px',
    borderRadius: isNeumorphic ? 14 : 12,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: computing ? 'wait' : 'pointer',
    transition: 'all .15s',
    opacity: computing ? 0.6 : 1,
    ...(isEditorial
      ? { background: 'var(--ink)', color: 'var(--bg)' }
      : isNeumorphic
      ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
      : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
  };

  const circumference = 2 * Math.PI * 70;
  const dashOffset = score !== null ? circumference - (circumference * score) / 100 : circumference;

  function getGrade(s: number) {
    if (s >= 80) return 'A';
    if (s >= 60) return 'B';
    if (s >= 40) return 'C';
    if (s >= 20) return 'D';
    return 'F';
  }

  function getColor(v: number) {
    if (v >= 70) return 'var(--color-good, #22c55e)';
    if (v >= 40) return 'var(--color-warn, #f59e0b)';
    return 'var(--color-bad, #ef4444)';
  }

  async function handleCompute() {
    setComputing(true);
    setError('');
    try {
      const res = await fetch('/api/smo/compute', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error?.message || `Error ${res.status}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    }
    setComputing(false);
  }

  return (
    <>
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            GROWTH · SMO SCORE
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: isEditorial ? 300 : 400,
                fontStyle: isEditorial ? 'italic' : 'normal',
                fontSize: isEditorial ? 'clamp(40px, 5vw, 60px)' : 'clamp(32px, 4vw, 48px)',
                lineHeight: 0.95,
                letterSpacing: '-.025em',
                color: 'var(--fg)',
              }}
            >
              {isEditorial ? (
                <>Social Media <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Optimization.</span></>
              ) : (
                'SMO Score'
              )}
            </h1>
            {computedAt && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
                Last computed {new Date(computedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          {connectedCount > 0 && (
            <button onClick={handleCompute} disabled={computing} style={btnStyle}>
              {computing ? 'Computing...' : score !== null ? 'Recompute' : 'Compute Score'}
            </button>
          )}
        </div>
      </div>

      <AccountPicker
        accounts={platforms}
        selectedAccountId={selectedAccountId}
        onSelect={(accountId) => {
          setSelectedAccountId(accountId);
          const params = new URLSearchParams(window.location.search);
          if (accountId) params.set('platformAccountId', accountId);
          else params.delete('platformAccountId');
          router.push(`/smo-score${params.toString() ? `?${params}` : ''}`);
        }}
        theme={theme}
        showAllOption
        label="Analyzing"
      />

      {error && (
        <div style={{
          padding: '10px 16px', borderRadius: 12, marginBottom: 16, fontSize: 13,
          background: 'rgba(239,68,68,.12)', color: 'var(--color-bad, #ef4444)',
        }}>
          {error}
        </div>
      )}

      {connectedCount === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '60px 28px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--paper, rgba(255,255,255,.05))', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: isEditorial ? 900 : 500, fontStyle: isEditorial ? 'italic' : 'normal', fontSize: 24, color: 'var(--fg)', marginBottom: 8 }}>
            Connect a platform to get scored
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 400, margin: '0 auto' }}>
            Your SMO score analyzes your social media presence across 6 factors. Connect your first platform in Settings to get started.
          </p>
        </div>
      ) : (
        <div className="grid-smo" style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20 }}>
          {/* Score gauge */}
          {isNeumorphic ? (
            <NeumorphicScoreGauge score={score} getGrade={getGrade} />
          ) : (
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: 180, height: 180, marginBottom: 16 }}>
              <svg viewBox="0 0 160 160" width="180" height="180">
                <circle cx="80" cy="80" r="70" fill="none" stroke="var(--line, rgba(255,255,255,.1))" strokeWidth="8" />
                {score !== null && (
                  <circle
                    cx="80" cy="80" r="70" fill="none"
                    stroke={isEditorial ? 'var(--ink)' : 'url(#smo-grad)'}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                )}
                <defs>
                  <linearGradient id="smo-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--violet, #8b5cf6)" />
                    <stop offset="100%" stopColor="var(--rose, #ff71a8)" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: isEditorial ? 300 : 400,
                    fontStyle: isEditorial ? 'italic' : 'normal',
                    fontSize: 56,
                    letterSpacing: '-.04em',
                    color: 'var(--fg)',
                    lineHeight: 1,
                  }}
                >
                  {score ?? '--'}
                </span>
                {score !== null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.15em', color: 'var(--muted)', marginTop: 4 }}>
                    GRADE {getGrade(score)}
                  </span>
                )}
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              {score !== null
                ? `Top ${100 - score}% of creators`
                : 'Click "Compute Score" to analyze your presence'}
            </p>
          </div>
          )}

          {/* Factor breakdown */}
          <div style={cardStyle}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: isEditorial ? 900 : 500,
                fontStyle: isEditorial ? 'italic' : 'normal',
                fontSize: isEditorial ? 28 : 22,
                color: 'var(--fg)',
                marginBottom: 24,
              }}
            >
              Factor breakdown
            </h2>
            {factors && factors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {factors.map((f) => (
                  <div key={f.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{f.label}</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: getColor(f.value) }}>
                        {f.value}/100
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: isNeumorphic ? 'var(--surface, var(--bg))' : 'var(--line, rgba(255,255,255,.1))', overflow: 'hidden', ...(isNeumorphic ? { boxShadow: 'var(--in-sm)' } : {}) }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          width: `${f.value}%`,
                          background: getColor(f.value),
                          transition: 'width .8s ease',
                        }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{f.tip}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Click &quot;Compute Score&quot; to see your factor breakdown
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function NeumorphicScoreGauge({ score, getGrade }: { score: number | null; getGrade: (s: number) => string }) {
  const s = score ?? 0;
  const r = 80;
  const sweepAngle = 270;
  const startAngle = 135;
  const scoreAngle = (s / 100) * sweepAngle;
  const endAngle = startAngle + scoreAngle;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const startX = r * Math.cos(toRad(startAngle));
  const startY = r * Math.sin(toRad(startAngle));
  const endX = r * Math.cos(toRad(endAngle));
  const endY = r * Math.sin(toRad(endAngle));
  const largeArc = scoreAngle > 180 ? 1 : 0;

  return (
    <div
      style={{
        borderRadius: 24,
        background: 'var(--surface, var(--bg))',
        padding: 28,
        boxShadow: 'var(--out-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Gauge well */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'var(--surface, var(--bg))',
          boxShadow: 'var(--in-md, var(--in-sm))',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <svg viewBox="-100 -100 200 200" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="smo-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8098db" />
              <stop offset="100%" stopColor="#5a78d0" />
            </linearGradient>
          </defs>
          {score !== null && (
            <>
              <path
                d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
                fill="none"
                stroke="url(#smo-arc-grad)"
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.95"
              />
              <circle cx={endX} cy={endY} r="7" fill="#5a78d0" />
              <circle cx={endX} cy={endY} r="3.5" fill="#eef2f7" />
            </>
          )}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 24,
            borderRadius: '50%',
            background: 'var(--surface, var(--bg))',
            boxShadow: 'var(--out-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 500, fontSize: 52, color: 'var(--ink, var(--fg))', letterSpacing: -2, lineHeight: 1 }}>
            {score ?? '--'}
          </div>
          {score !== null && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>
              GRADE {getGrade(score)}
            </div>
          )}
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        {score !== null
          ? `Top ${100 - score}% of creators`
          : 'Click "Compute Score" to analyze your presence'}
      </p>
    </div>
  );
}
