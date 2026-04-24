'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { completeOnboarding } from '@/lib/actions/onboarding';

type Theme = 'glassmorphic' | 'neon-editorial' | 'neumorphic';
type Mission = 'grow-audience' | 'monetize' | 'launch-product' | 'community' | 'land-deals';

const THEMES: { id: Theme; label: string; sub: string }[] = [
  { id: 'glassmorphic', label: 'Glassmorphic', sub: 'Dark aurora, frosted glass, gradient accents' },
  { id: 'neon-editorial', label: 'Neon Editorial', sub: 'Cream paper, ink borders, bold magazine type' },
  { id: 'neumorphic', label: 'Neumorphic', sub: 'Soft gray, inset/outset shadows, tactile' },
];

const MISSIONS: { id: Mission; label: string; sub: string; icon: string }[] = [
  { id: 'grow-audience', label: 'Grow my audience', sub: 'More followers & reach across platforms', icon: 'M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6' },
  { id: 'monetize', label: 'Monetize my content', sub: 'Turn following into revenue streams', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { id: 'launch-product', label: 'Launch a product', sub: 'Build & sell digital products or courses', icon: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' },
  { id: 'community', label: 'Build community', sub: 'Deepen engagement, create a loyal fanbase', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { id: 'land-deals', label: 'Land brand deals', sub: 'Sponsorships & partnership opportunities', icon: 'M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z' },
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zM16 3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z' },
  { id: 'tiktok', label: 'TikTok', color: '#000000', icon: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5' },
  { id: 'youtube', label: 'YouTube', color: '#FF0000', icon: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z' },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', icon: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z' },
  { id: 'x', label: 'X (Twitter)', color: '#000000', icon: 'M4 4l11.733 16H20L8.267 4zM4 20l6.768-6.768M13.232 10.768 20 4' },
  { id: 'facebook', label: 'Facebook', color: '#1877F2', icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
  { id: 'twitch', label: 'Twitch', color: '#9146FF', icon: 'M21 2H3v16h5v4l4-4h5l4-4V2zM11 11V7M16 11V7' },
];

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingWizard />
    </Suspense>
  );
}

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const [step, setStep] = useState(stepParam ? parseInt(stepParam) : 1);
  const [selectedTheme, setSelectedTheme] = useState<Theme>('glassmorphic');
  const [selectedMission, setSelectedMission] = useState<Mission>('grow-audience');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', selectedTheme);
  }, [selectedTheme]);

  function goToStep(s: number) {
    setStep(s);
    const url = new URL(window.location.href);
    url.searchParams.set('step', String(s));
    window.history.replaceState(null, '', url.toString());
  }

  async function handleComplete() {
    setSaving(true);
    setSaveError('');
    try {
      const result = await completeOnboarding({
        theme: selectedTheme,
        mission: selectedMission,
      });

      if (result.error) {
        setSaveError(result.error);
        setSaving(false);
        return;
      }

      // Hard navigation so the server layout re-reads onboarded_at
      window.location.href = '/today';
    } catch (e) {
      setSaveError(`Unexpected error: ${e instanceof Error ? e.message : 'unknown'}`);
      setSaving(false);
    }
  }

  const STEPS = ['Aesthetic', 'Mission', 'Platforms', 'Ready'];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 780 }}>
        {/* Progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: i + 1 === step ? 32 : 8,
                  height: 4,
                  borderRadius: 2,
                  background: i + 1 <= step ? 'var(--color-primary, var(--ink))' : 'var(--line, #ccc)',
                  transition: 'all .3s ease',
                }}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '.2em',
            color: 'var(--muted, #999)',
            marginBottom: 40,
          }}
        >
          STEP {step} OF {STEPS.length} &middot; {STEPS[step - 1].toUpperCase()}
        </div>

        {/* Step 1: Theme picker */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: 'clamp(36px, 5vw, 52px)',
                  lineHeight: 0.95,
                  letterSpacing: '-.025em',
                  color: 'var(--fg, var(--ink))',
                  marginBottom: 12,
                }}
              >
                Pick your{' '}
                <span style={{ fontWeight: 900, fontStyle: 'normal' }}>aesthetic.</span>
              </h1>
              <p style={{ fontSize: 15, color: 'var(--muted, #777)', maxWidth: 400, margin: '0 auto' }}>
                Choose the vibe that matches your brand. You can always change this later in Settings.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 40 }}>
              {THEMES.map((theme) => {
                const active = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    style={{
                      textAlign: 'left',
                      padding: 0,
                      border: 'none',
                      borderRadius: 20,
                      cursor: 'pointer',
                      background: 'transparent',
                      outline: active ? '2.5px solid var(--color-primary, var(--ink))' : '2.5px solid transparent',
                      outlineOffset: 4,
                      transition: 'outline .2s ease',
                    }}
                  >
                    {/* Mini mockup preview */}
                    <ThemePreview themeId={theme.id} />
                    <div style={{ padding: '14px 6px 8px' }}>
                      <div
                        style={{
                          fontFamily: "'Fraunces', serif",
                          fontWeight: 700,
                          fontSize: 16,
                          color: 'var(--fg, var(--ink))',
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        {theme.label}
                        {active && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary, var(--ink))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted, #999)', lineHeight: 1.4 }}>
                        {theme.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <NavButton label="Continue" onClick={() => goToStep(2)} filled />
            </div>
          </div>
        )}

        {/* Step 2: Mission */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: 'clamp(36px, 5vw, 52px)',
                  lineHeight: 0.95,
                  letterSpacing: '-.025em',
                  color: 'var(--fg, var(--ink))',
                  marginBottom: 12,
                }}
              >
                What&apos;s your{' '}
                <span style={{ fontWeight: 900, fontStyle: 'normal' }}>mission?</span>
              </h1>
              <p style={{ fontSize: 15, color: 'var(--muted, #777)', maxWidth: 420, margin: '0 auto' }}>
                This helps us personalize your dashboard. You can change it any time.
              </p>
            </div>

            <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
              {MISSIONS.map((m) => {
                const active = selectedMission === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMission(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      textAlign: 'left',
                      padding: '18px 20px',
                      border: active ? '2px solid var(--color-primary, var(--ink))' : '1.5px solid var(--line, #ddd)',
                      borderRadius: 16,
                      cursor: 'pointer',
                      background: active ? 'var(--paper, rgba(255,255,255,.04))' : 'transparent',
                      transition: 'all .2s ease',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: active ? 'var(--color-primary, var(--ink))' : 'var(--paper, rgba(0,0,0,.04))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all .2s ease',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={active ? 'var(--paper, #fff)' : 'var(--fg, var(--ink))'}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: 20, height: 20 }}
                      >
                        <path d={m.icon} />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--fg, var(--ink))', marginBottom: 2 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted, #999)' }}>
                        {m.sub}
                      </div>
                    </div>
                    {/* Radio */}
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: active ? '6px solid var(--color-primary, var(--ink))' : '2px solid var(--line, #ccc)',
                        flexShrink: 0,
                        transition: 'all .2s ease',
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <NavButton label={'\u2190 Back'} onClick={() => goToStep(1)} />
              <NavButton label="Continue" onClick={() => goToStep(3)} filled />
            </div>
          </div>
        )}

        {/* Step 3: Platforms */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: 'clamp(36px, 5vw, 52px)',
                  lineHeight: 0.95,
                  letterSpacing: '-.025em',
                  color: 'var(--fg, var(--ink))',
                  marginBottom: 12,
                }}
              >
                Your{' '}
                <span style={{ fontWeight: 900, fontStyle: 'normal' }}>platforms.</span>
              </h1>
              <p style={{ fontSize: 15, color: 'var(--muted, #777)', maxWidth: 420, margin: '0 auto' }}>
                We support all major social platforms. You&apos;ll link your accounts in Settings once you&apos;re inside.
              </p>
            </div>

            <div style={{ maxWidth: 440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 40 }}>
              {PLATFORMS.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                    padding: '16px 20px',
                    border: '1.5px solid var(--line, #ddd)',
                    borderRadius: 14,
                    background: 'transparent',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 18, height: 18 }}
                    >
                      <path d={p.icon} />
                    </svg>
                  </div>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 15, color: 'var(--fg, var(--ink))' }}>
                    {p.label}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-good, #22c55e)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted, #999)', marginBottom: 24 }}>
              You&apos;ll connect each account from <strong style={{ color: 'var(--fg, var(--ink))' }}>Settings &rarr; Connected Accounts</strong> after setup.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <NavButton label={'\u2190 Back'} onClick={() => goToStep(2)} />
              <NavButton
                label="Continue"
                onClick={() => goToStep(4)}
                filled
              />
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'var(--color-good, #22c55e)',
                margin: '0 auto 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 50px -12px rgba(34,197,94,.4)',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: 'clamp(40px, 6vw, 60px)',
                lineHeight: 0.95,
                letterSpacing: '-.025em',
                color: 'var(--fg, var(--ink))',
                marginBottom: 14,
              }}
            >
              You&apos;re{' '}
              <span style={{ fontWeight: 900, fontStyle: 'normal' }}>in.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'var(--muted, #777)', maxWidth: 380, margin: '0 auto 36px', lineHeight: 1.5 }}>
              Your Go Virall account is ready. We&apos;re syncing your data now &mdash; head to your dashboard.
            </p>
            {saveError && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(255,46,108,.08)',
                  border: '1px solid rgba(255,46,108,.2)',
                  color: '#ff2e6c',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                  maxWidth: 380,
                  margin: '0 auto 16px',
                }}
              >
                {saveError}
              </div>
            )}
            <NavButton
              label={saving ? 'Loading...' : `Go to my dashboard \u2192`}
              onClick={handleComplete}
              filled
              disabled={saving}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mini theme previews ── */

function ThemePreview({ themeId }: { themeId: Theme }) {
  if (themeId === 'glassmorphic') return <GlassPreview />;
  if (themeId === 'neon-editorial') return <EditorialPreview />;
  return <NeumorphicPreview />;
}

function GlassPreview() {
  return (
    <div
      style={{
        height: 200,
        borderRadius: 16,
        background: 'linear-gradient(145deg, #0a0618 0%, #1b1236 40%, #0f1a2e 100%)',
        padding: 16,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Glow spots */}
      <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,.5)', filter: 'blur(30px)', top: 10, left: 10 }} />
      <div style={{ position: 'absolute', width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,113,168,.4)', filter: 'blur(25px)', bottom: 20, right: 20 }} />
      {/* Sidebar stub */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 52, background: 'rgba(10,6,24,.6)', borderRight: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(10px)' }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, background: 'conic-gradient(from 210deg, #ff71a8, #8b5cf6, #6be3ff, #ff71a8)', margin: '14px auto 0' }} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 18, height: 3, borderRadius: 2, background: i === 0 ? 'rgba(139,92,246,.7)' : 'rgba(255,255,255,.15)', margin: '10px auto 0' }} />
        ))}
      </div>
      {/* Content */}
      <div style={{ marginLeft: 60, position: 'relative', zIndex: 1 }}>
        {/* KPI cards */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {['#8b5cf6', '#ff71a8', '#6be3ff'].map((c, i) => (
            <div key={i} style={{ flex: 1, height: 36, borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(8px)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60%', height: 2, borderRadius: 1, background: c, opacity: 0.7 }} />
            </div>
          ))}
        </div>
        {/* Score ring */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 40 40" width="36" height="36">
              <circle cx="20" cy="20" r="15" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
              <circle cx="20" cy="20" r="15" fill="none" stroke="url(#gp)" strokeWidth="3" strokeDasharray="70 94" strokeLinecap="round" transform="rotate(-90 20 20)" />
              <defs><linearGradient id="gp" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#ff71a8" /></linearGradient></defs>
            </svg>
          </div>
          <div style={{ flex: 1, borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', padding: '8px 10px' }}>
            <div style={{ width: '40%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,.2)', marginBottom: 6 }} />
            <div style={{ width: '70%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,.08)', marginBottom: 4 }} />
            <div style={{ width: '55%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,.08)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorialPreview() {
  return (
    <div
      style={{
        height: 200,
        borderRadius: 16,
        background: '#f3efe6',
        border: '1.5px solid #0b0b0b',
        padding: 16,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar stub */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 52, background: '#f3efe6', borderRight: '1.5px solid #0b0b0b' }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 12, textAlign: 'center', padding: '12px 0 0', color: '#0b0b0b' }}>
          GV
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 18, height: 3, borderRadius: 1, background: i === 0 ? '#0b0b0b' : 'rgba(0,0,0,.15)', margin: '10px auto 0' }} />
        ))}
      </div>
      {/* Top ticker */}
      <div style={{ position: 'absolute', top: 0, left: 52, right: 0, height: 18, background: '#0b0b0b' }}>
        <div style={{ display: 'flex', gap: 12, padding: '3px 8px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ width: 14, height: 3, borderRadius: 1, background: 'rgba(243,239,230,.4)' }} />
              <div style={{ width: 10, height: 3, borderRadius: 1, background: '#c6fd4f' }} />
            </div>
          ))}
        </div>
      </div>
      {/* Content */}
      <div style={{ marginLeft: 60, marginTop: 22, position: 'relative' }}>
        {/* KPIs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {['#f3efe6', '#c6fd4f', '#0b0b0b', '#ff2e6c'].map((bg, i) => (
            <div key={i} style={{ flex: 1, height: 34, borderRadius: 8, background: bg, border: '1.5px solid #0b0b0b', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', bottom: 4, left: 6, width: '50%', height: 2, borderRadius: 1, background: i === 2 ? '#c6fd4f' : '#0b0b0b', opacity: 0.5 }} />
            </div>
          ))}
        </div>
        {/* Two panels */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1.4, height: 60, borderRadius: 10, background: '#0b0b0b', border: '1.5px solid #0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 40 40" width="30" height="30">
              <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(243,239,230,.15)" strokeWidth="3" />
              <circle cx="20" cy="20" r="14" fill="none" stroke="#c6fd4f" strokeWidth="3" strokeDasharray="66 88" strokeLinecap="round" transform="rotate(-90 20 20)" />
            </svg>
          </div>
          <div style={{ flex: 1, height: 60, borderRadius: 10, background: '#c6fd4f', border: '1.5px solid #0b0b0b', padding: '8px 10px' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#0b0b0b', marginBottom: 4 }} />
            <div style={{ width: '60%', height: 3, borderRadius: 1, background: '#0b0b0b', opacity: 0.3 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function NeumorphicPreview() {
  const bg = '#e4e9f0';
  const outSm = '4px 4px 10px #a7adb8, -4px -4px 10px #ffffff';
  const inSm = 'inset 2px 2px 5px #a7adb8, inset -2px -2px 5px #ffffff';
  return (
    <div
      style={{
        height: 200,
        borderRadius: 16,
        background: bg,
        padding: 16,
        overflow: 'hidden',
      }}
    >
      {/* Masthead */}
      <div style={{ borderRadius: 12, padding: '8px 10px', boxShadow: outSm, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 18, height: 18, borderRadius: 6, boxShadow: inSm, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontStyle: 'italic', fontSize: 8, color: '#666' }}>G</span>
          </div>
          <div style={{ width: 30, height: 3, borderRadius: 1, background: '#aab' }} />
        </div>
        <div style={{ display: 'flex', gap: 3, padding: '3px 4px', borderRadius: 8, boxShadow: inSm, background: bg }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 20, height: 10, borderRadius: 5, boxShadow: i === 0 ? outSm : 'none', background: bg }}>
              <div style={{ width: 12, height: 2, borderRadius: 1, background: i === 0 ? '#6366f1' : '#bbb', margin: '4px auto' }} />
            </div>
          ))}
        </div>
      </div>
      {/* Pulse bar */}
      <div style={{ borderRadius: 12, padding: '8px 12px', boxShadow: outSm, background: bg, display: 'flex', gap: 8, marginBottom: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: '60%', height: 2, borderRadius: 1, background: '#bbb', margin: '0 auto 3px' }} />
            <div style={{ width: '40%', height: 4, borderRadius: 1, background: '#555', margin: '0 auto' }} />
          </div>
        ))}
      </div>
      {/* Two col */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, borderRadius: 12, padding: 10, boxShadow: outSm, background: bg }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ borderRadius: 8, padding: 6, boxShadow: outSm, background: bg, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 18, height: 18, borderRadius: 6, boxShadow: inSm, background: bg }} />
                <div>
                  <div style={{ width: 36, height: 2, borderRadius: 1, background: '#bbb', marginBottom: 3 }} />
                  <div style={{ width: 50, height: 3, borderRadius: 1, background: '#777' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: 80, borderRadius: 12, padding: 10, boxShadow: outSm, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', boxShadow: `${inSm}, 0 0 0 3px ${bg}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 12, fontWeight: 700, color: '#555' }}>78</span>
          </div>
          <div style={{ width: 30, height: 2, borderRadius: 1, background: '#bbb' }} />
        </div>
      </div>
    </div>
  );
}

/* ── Shared nav button ── */

function NavButton({
  label,
  onClick,
  filled,
  disabled,
}: {
  label: string;
  onClick: () => void;
  filled?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 28px',
        border: '1.5px solid var(--fg, var(--ink))',
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 14,
        fontFamily: 'inherit',
        background: filled ? 'var(--fg, var(--ink))' : 'transparent',
        color: filled ? 'var(--bg, var(--paper))' : 'var(--fg, var(--ink))',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        letterSpacing: '.01em',
        transition: 'all .2s ease',
      }}
    >
      {label}
    </button>
  );
}
