'use client';

import { useState, useTransition } from 'react';
import { Input, Badge, ThemedSelect } from '@govirall/ui-web';
import { useRouter } from 'next/navigation';

type Platform = {
  id: string;
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  sync_status: string;
};

type Competitor = {
  id: string;
  platform: string;
  handle: string;
  label: string | null;
  follower_count: number | null;
  engagement_rate: number | null;
  created_at: string;
};

type Collab = {
  id: string;
  handle: string;
  platform: string;
  match_score: number | null;
  follower_count: number | null;
  niche: string | null;
  status: string;
  created_at: string;
};

type AQS = {
  score: number;
  authenticity: number | null;
  engagement_quality: number | null;
  growth_quality: number | null;
  computed_at: string;
} | null;

type Snapshot = {
  platform_account_id: string;
  follower_count: number | null;
  captured_at: string;
};

type Props = {
  theme: string;
  connectedPlatforms: Platform[];
  totalFollowers: number;
  aqs: AQS;
  snapshots: Snapshot[];
  competitors: Competitor[];
  collabs: Collab[];
};

function getColor(v: number) {
  if (v >= 70) return 'var(--color-good, #22c55e)';
  if (v >= 40) return 'var(--color-warn, #f59e0b)';
  return 'var(--color-bad, #ef4444)';
}

const PLATFORM_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  instagram: { label: 'Instagram', color: '#E4405F', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
  tiktok: { label: 'TikTok', color: '#000000', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.41a8.16 8.16 0 004.77 1.52V7.48a4.85 4.85 0 01-1-.79z"/></svg> },
  youtube: { label: 'YouTube', color: '#FF0000', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  x: { label: 'X', color: '#000000', icon: <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  facebook: { label: 'Facebook', color: '#1877F2', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
  twitch: { label: 'Twitch', color: '#9146FF', icon: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> },
};

export function AudienceClient({
  theme,
  connectedPlatforms,
  totalFollowers,
  aqs,
  snapshots,
  competitors: initialCompetitors,
  collabs,
}: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [addError, setAddError] = useState('');
  const [competitorPlatform, setCompetitorPlatform] = useState('instagram');

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

  const innerItemStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: isNeumorphic ? 16 : 12,
    ...(isEditorial
      ? { background: 'var(--paper-2, rgba(0,0,0,.03))' }
      : isNeumorphic
      ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
      : { background: 'rgba(255,255,255,.04)' }),
  };

  const sectionHeading = (text: string) => ({
    fontFamily: 'var(--font-display)',
    fontWeight: isEditorial ? 900 : 500,
    fontStyle: isEditorial ? 'italic' : 'normal',
    fontSize: isEditorial ? 26 : 20,
    color: isEditorial ? 'var(--ink)' : 'var(--fg)',
    marginBottom: 16,
  });

  async function handleAddCompetitor(formData: FormData) {
    setAddError('');
    try {
      const res = await fetch('/api/audience/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: formData.get('platform') as string,
          handle: formData.get('handle') as string,
          label: (formData.get('label') as string) || undefined,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setAddError(json.error.message ?? 'Failed to add competitor');
      } else {
        setShowAddCompetitor(false);
        startTransition(() => router.refresh());
      }
    } catch {
      setAddError('Failed to add competitor');
    }
  }

  async function handleRemoveCompetitor(id: string) {
    if (!confirm('Remove this competitor?')) return;
    try {
      await fetch(`/api/audience/competitors/${id}`, { method: 'DELETE' });
      startTransition(() => router.refresh());
    } catch {
      // silently fail
    }
  }

  async function handleDismissCollab(id: string) {
    try {
      await fetch(`/api/audience/collab-matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      startTransition(() => router.refresh());
    } catch {
      // silently fail
    }
  }

  const circumference = 2 * Math.PI * 50;
  const aqsDashOffset = aqs ? circumference - (circumference * aqs.score) / 100 : circumference;

  return (
    <>
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            GROWTH · AUDIENCE
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
            <>Audience <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Intelligence.</span></>
          ) : (
            'Audience Intelligence'
          )}
        </h1>
      </div>

      {/* Chapter 1: Who's watching */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading('Who\'s watching')}>
          Who&apos;s watching{isEditorial ? '.' : ''}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isEditorial ? 18 : 20 }}>
          {/* Your reach */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 16 }}>
              Your reach
            </h3>
            {connectedPlatforms.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ ...innerItemStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total followers</span>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 22,
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--fg)',
                  }}>
                    {totalFollowers.toLocaleString()}
                  </span>
                </div>
                {connectedPlatforms.map((p) => {
                  const meta = PLATFORM_META[p.platform];
                  return (
                    <div key={p.id} style={{ ...innerItemStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', color: meta?.color ?? 'var(--fg)' }}>
                        {meta?.icon}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg)' }}>
                        {(p.follower_count ?? 0).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Connect a platform to see your audience data.
              </div>
            )}
          </div>

          {/* AQS */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 16 }}>
              Audience Quality Score
            </h3>
            {aqs ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: 110, height: 110 }}>
                    <svg viewBox="0 0 120 120" width="110" height="110">
                      <circle cx="60" cy="60" r="50" fill="none" stroke={isEditorial ? 'var(--rule, rgba(0,0,0,.1))' : 'var(--line, rgba(255,255,255,.1))'} strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke={isEditorial ? 'var(--ink)' : 'url(#aqs-grad)'}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={aqsDashOffset}
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                        style={{ transition: 'stroke-dashoffset .8s ease' }}
                      />
                      <defs>
                        <linearGradient id="aqs-grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="var(--violet, #8b5cf6)" />
                          <stop offset="100%" stopColor="var(--rose, #ff71a8)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: isEditorial ? 300 : 400,
                        fontStyle: isEditorial ? 'italic' : 'normal',
                        fontSize: 36,
                        letterSpacing: '-.04em',
                        color: 'var(--fg)',
                      }}>
                        {aqs.score}
                      </span>
                    </div>
                  </div>
                </div>
                {[
                  { label: 'Authenticity', value: aqs.authenticity },
                  { label: 'Engagement Quality', value: aqs.engagement_quality },
                  { label: 'Growth Quality', value: aqs.growth_quality },
                ].map((factor) => (
                  <div key={factor.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{factor.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: getColor(factor.value ?? 0) }}>
                        {factor.value ?? 0}
                      </span>
                    </div>
                    <div style={{
                      height: 5,
                      borderRadius: 3,
                      overflow: 'hidden',
                      ...(isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
                        : { background: isEditorial ? 'var(--rule, rgba(0,0,0,.1))' : 'var(--line, rgba(255,255,255,.1))' }),
                    }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          width: `${factor.value ?? 0}%`,
                          background: getColor(factor.value ?? 0),
                          transition: 'width .8s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                AQS data will appear after your first platform sync.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Chapter 2: How you're growing */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading('How you\'re growing')}>
          How you&apos;re growing{isEditorial ? '.' : ''}
        </h2>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 16 }}>
            90-day growth
          </h3>
          {snapshots.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={innerItemStyle}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Start</p>
                  <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg)' }}>
                    {(snapshots[0]?.follower_count ?? 0).toLocaleString()}
                  </p>
                </div>
                <div style={innerItemStyle}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Current</p>
                  <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg)' }}>
                    {(snapshots[snapshots.length - 1]?.follower_count ?? 0).toLocaleString()}
                  </p>
                </div>
                <div style={innerItemStyle}>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Growth</p>
                  <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--color-good, #22c55e)' }}>
                    +{((snapshots[snapshots.length - 1]?.follower_count ?? 0) - (snapshots[0]?.follower_count ?? 0)).toLocaleString()}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>{snapshots.length} data points</p>
            </>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Growth chart will appear after your first data sync.
            </div>
          )}
        </div>
      </section>

      {/* Chapter 3: Who to collab with */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading('Who to collab with')}>
          Who to collab with{isEditorial ? '.' : ''}
        </h2>
        {collabs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isEditorial ? 18 : 20 }}>
            {collabs.map((collab) => (
              <div key={collab.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>@{collab.handle}</p>
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>{collab.platform}</p>
                  </div>
                  {collab.match_score && (
                    <Badge variant="good">{collab.match_score}% match</Badge>
                  )}
                </div>
                {collab.niche && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{collab.niche}</p>
                )}
                {collab.follower_count && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                    {collab.follower_count.toLocaleString()} followers
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{
                      height: 28,
                      padding: '0 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: isNeumorphic ? 10 : isEditorial ? 0 : 8,
                      border: isEditorial ? '1px solid var(--ink)' : 'none',
                      cursor: 'pointer',
                      ...(isEditorial
                        ? { background: 'var(--paper-2)', color: 'var(--ink)' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                        : { background: 'rgba(255,255,255,.1)', color: 'var(--fg)' }),
                    }}
                  >
                    Draft DM
                  </button>
                  <button
                    onClick={() => handleDismissCollab(collab.id)}
                    style={{
                      height: 28,
                      padding: '0 12px',
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: isNeumorphic ? 10 : isEditorial ? 0 : 8,
                      border: isEditorial ? '1px solid var(--ink)' : 'none',
                      cursor: 'pointer',
                      ...(isEditorial
                        ? { background: 'var(--paper-2)', color: 'var(--ink)' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                        : { background: 'rgba(255,255,255,.1)', color: 'var(--fg)' }),
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Collab matches will appear here as we analyze your audience overlap.
            </p>
          </div>
        )}
      </section>

      {/* Chapter 4: Who's ahead */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ ...sectionHeading('Who\'s ahead'), marginBottom: 0 }}>
            Who&apos;s ahead{isEditorial ? '.' : ''}
          </h2>
          <button
            onClick={() => setShowAddCompetitor(true)}
            style={{
              height: 32,
              padding: '0 14px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: isNeumorphic ? 14 : isEditorial ? 0 : 10,
              border: isEditorial ? '1.5px solid var(--ink)' : 'none',
              cursor: 'pointer',
              transition: 'all .15s',
              ...(isEditorial
                ? { background: 'var(--ink)', color: 'var(--bg)' }
                : isNeumorphic
                ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                : { background: 'rgba(255,255,255,.1)', color: 'var(--fg)' }),
            }}
          >
            Add competitor
          </button>
        </div>

        {showAddCompetitor && (
          <div style={{ ...cardStyle, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>Add Competitor</h3>
            {addError && (
              <p style={{ fontSize: 13, color: 'var(--color-bad)', marginBottom: 10 }}>{addError}</p>
            )}
            <form action={handleAddCompetitor} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <ThemedSelect
                name="platform"
                value={competitorPlatform}
                onChange={setCompetitorPlatform}
                theme={theme}
                options={[
                  { value: 'instagram', label: 'Instagram' },
                  { value: 'tiktok', label: 'TikTok' },
                  { value: 'youtube', label: 'YouTube' },
                  { value: 'linkedin', label: 'LinkedIn' },
                  { value: 'x', label: 'X' },
                  { value: 'facebook', label: 'Facebook' },
                  { value: 'twitch', label: 'Twitch' },
                ]}
              />
              <Input name="handle" placeholder="@handle" required />
              <Input name="label" placeholder="Label (optional)" />
              <div style={{ gridColumn: 'span 3', display: 'flex', gap: 8 }}>
                <button
                  type="submit"
                  style={{
                    height: 32,
                    padding: '0 18px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: isNeumorphic ? 14 : isEditorial ? 0 : 10,
                    border: isEditorial ? '1.5px solid var(--ink)' : 'none',
                    cursor: 'pointer',
                    ...(isEditorial
                      ? { background: 'var(--ink)', color: 'var(--bg)' }
                      : isNeumorphic
                      ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                      : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCompetitor(false)}
                  style={{
                    height: 32,
                    padding: '0 14px',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: isNeumorphic ? 14 : isEditorial ? 0 : 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'var(--muted)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {initialCompetitors.length > 0 ? (
          <div style={cardStyle}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${isEditorial ? 'var(--ink)' : 'var(--line)'}` }}>
                    {['Handle', 'Platform', 'Followers', 'Engagement', 'Label', ''].map((h, i) => (
                      <th
                        key={h || i}
                        style={{
                          textAlign: i === 5 ? 'right' : 'left',
                          padding: '8px 12px',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '.15em',
                          textTransform: 'uppercase' as const,
                          color: 'var(--muted)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {initialCompetitors.map((comp) => (
                    <tr key={comp.id} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--fg)', fontWeight: 500 }}>@{comp.handle}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--fg)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: PLATFORM_META[comp.platform]?.color ?? 'var(--fg)' }}>
                          {PLATFORM_META[comp.platform]?.icon}
                          <span style={{ color: 'var(--fg)' }}>{PLATFORM_META[comp.platform]?.label ?? comp.platform}</span>
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--fg)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                        {comp.follower_count?.toLocaleString() ?? '--'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--fg)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                        {comp.engagement_rate ? `${(comp.engagement_rate * 100).toFixed(1)}%` : '--'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                        {comp.label ?? '--'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleRemoveCompetitor(comp.id)}
                          style={{
                            height: 28,
                            padding: '0 12px',
                            fontSize: 12,
                            fontWeight: 500,
                            borderRadius: isNeumorphic ? 10 : isEditorial ? 0 : 8,
                            border: 'none',
                            cursor: 'pointer',
                            background: 'transparent',
                            color: 'var(--color-bad, #ef4444)',
                            transition: 'all .15s',
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Add competitors to start tracking how you compare.
            </p>
          </div>
        )}
      </section>

      {/* Chapter 5: Where to grow next */}
      <section>
        <h2 style={sectionHeading('Where to grow next')}>
          Where to grow next{isEditorial ? '.' : ''}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isEditorial ? 18 : 20 }}>
          {connectedPlatforms.length > 0 ? (
            <>
              {['instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'facebook', 'twitch']
                .filter((p) => !connectedPlatforms.some((connected) => connected.platform === p))
                .slice(0, 3)
                .map((platformId) => {
                  const label = platformId === 'x' ? 'X' : platformId.charAt(0).toUpperCase() + platformId.slice(1);
                  return (
                    <div key={platformId} style={cardStyle}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 6 }}>
                        Expand to {label}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                        Connect your {label} account to cross-pollinate your audience and unlock new growth.
                      </p>
                      <button
                        style={{
                          height: 32,
                          padding: '0 14px',
                          fontSize: 13,
                          fontWeight: 500,
                          borderRadius: isNeumorphic ? 14 : isEditorial ? 0 : 10,
                          border: isEditorial ? '1.5px solid var(--ink)' : 'none',
                          cursor: 'pointer',
                          transition: 'all .15s',
                          ...(isEditorial
                            ? { background: 'var(--ink)', color: 'var(--bg)' }
                            : isNeumorphic
                            ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                            : { background: 'rgba(255,255,255,.1)', color: 'var(--fg)' }),
                        }}
                      >
                        Connect {label}
                      </button>
                    </div>
                  );
                })}
              {connectedPlatforms.length >= 5 && (
                <div style={{ ...cardStyle, gridColumn: 'span 3', textAlign: 'center', padding: '40px 24px' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                    All platforms connected
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Focus on cross-posting and audience overlap analysis to maximize growth.
                  </p>
                </div>
              )}
            </>
          ) : (
            [1, 2, 3].map((i) => (
              <div key={i} style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Connect a platform to get growth recommendations.
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
