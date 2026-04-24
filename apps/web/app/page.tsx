import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd, softwareAppSchema } from '../lib/seo/json-ld';
import { getPublicPlans } from '../lib/actions/admin/plans';

export const metadata: Metadata = {
  title: 'Go Virall - Social Intelligence Platform for Creators',
  description:
    'Stop guessing, start growing. Viral score predictions, AI content studio, and audience intelligence across 7 platforms. Free to start.',
  keywords: [
    'creator tools',
    'social media analytics',
    'viral score',
    'content creator platform',
    'AI content studio',
    'influencer analytics',
    'social media optimization',
    'Instagram analytics',
    'TikTok analytics',
    'YouTube analytics',
    'audience intelligence',
    'creator economy',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Go Virall - The Creator OS',
    description:
      'The social intelligence platform for creators. Viral score 0-100, AI content studio, audience analytics across 7 platforms.',
    type: 'website',
  },
};

export default async function LandingPage() {
  const plans = await getPublicPlans();
  return (
    <main data-theme="neon-editorial" style={{ background: 'var(--paper)', color: 'var(--ink)', fontFamily: '"Inter Tight", sans-serif', overflowX: 'hidden' }}>
      <JsonLd data={softwareAppSchema()} />
      {/* Sticky Nav */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px',
          borderBottom: '1px solid var(--rule)',
          background: 'rgba(243,239,230,.92)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 26,
            letterSpacing: '-.02em',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          Go Virall
          <span
            style={{
              width: 10,
              height: 10,
              background: 'var(--hot)',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }}
          />
        </div>
        <ul
          style={{
            display: 'flex',
            gap: 28,
            listStyle: 'none',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {['Product', 'Intelligence', 'Creators', 'Pricing', 'Stories'].map((item) => (
            <li key={item}>
              <Link href="#" style={{ color: 'inherit', textDecoration: 'none' }}>
                {item}
              </Link>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/signin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              border: '1.5px solid var(--ink)',
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 13,
              background: 'transparent',
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              border: '1.5px solid var(--ink)',
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 13,
              background: 'var(--ink)',
              color: 'var(--paper)',
              textDecoration: 'none',
            }}
          >
            Start free &rarr;
          </Link>
        </div>
      </nav>

      {/* Ticker */}
      <div
        style={{
          borderBottom: '1px solid var(--rule)',
          background: 'var(--ink)',
          color: 'var(--paper)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          padding: '10px 0',
          letterSpacing: '.08em',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            gap: 40,
            animation: 'ticker-scroll 40s linear infinite',
          }}
        >
          {[0, 1].map((i) => (
            <span key={i} style={{ display: 'inline-flex', gap: 40 }}>
              <span>THE CREATOR OS</span>
              <span>7 PLATFORMS <em style={{ color: 'var(--lime)', fontStyle: 'normal', fontWeight: 700 }}>SUPPORTED</em></span>
              <span>VIRAL SCORE <em style={{ color: 'var(--lime)', fontStyle: 'normal', fontWeight: 700 }}>0&ndash;100</em></span>
              <span>AI STRATEGIST <em style={{ color: 'var(--lime)', fontStyle: 'normal', fontWeight: 700 }}>BUILT IN</em></span>
              <span>FREE TO START <em style={{ color: 'var(--lime)', fontStyle: 'normal', fontWeight: 700 }}>NO CARD</em></span>
              <span>&mdash;</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section style={{ padding: '60px 28px 40px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 48, alignItems: 'end' }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: '.2em',
                display: 'flex',
                gap: 18,
                marginBottom: 28,
                flexWrap: 'wrap',
              }}
            >
              <b>VOL 04 &middot; ED 12</b>
              <span>COVER STORY</span>
              <span>THE CREATOR STACK</span>
            </div>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: 'clamp(64px, 11vw, 168px)',
                lineHeight: 0.88,
                letterSpacing: '-.035em',
              }}
            >
              Stop<br />
              <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Guessing.</span><br />
              Start{' '}
              <span
                style={{
                  background: 'var(--lime)',
                  padding: '0 .08em',
                  display: 'inline-block',
                  transform: 'rotate(-1deg)',
                  boxShadow: '4px 4px 0 var(--ink)',
                }}
              >
                Growing.
              </span>
            </h1>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <Link
                href="/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '16px 24px',
                  border: '1.5px solid var(--ink)',
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 14,
                  background: 'var(--ink)',
                  color: 'var(--paper)',
                  textDecoration: 'none',
                }}
              >
                Start free &mdash; no card &rarr;
              </Link>
              <Link
                href="#"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '16px 24px',
                  border: '1.5px solid var(--ink)',
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 14,
                  background: 'transparent',
                  color: 'var(--ink)',
                  textDecoration: 'none',
                }}
              >
                Watch the 90-sec tour
              </Link>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 28,
                marginTop: 28,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '.12em',
                color: '#333',
              }}
            >
              {[
                { label: 'PLATFORMS', value: '7' },
                { label: 'AI STUDIO', value: '4 tools' },
                { label: 'VIRAL SCORE', value: '0\u2013100' },
                { label: 'PRICE', value: '$0' },
              ].map((m) => (
                <div key={m.label}>
                  {m.label}
                  <b
                    style={{
                      display: 'block',
                      color: 'var(--ink)',
                      fontSize: 22,
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 900,
                      letterSpacing: '-.01em',
                      marginTop: 4,
                      fontStyle: 'italic',
                    }}
                  >
                    {m.value}
                  </b>
                </div>
              ))}
            </div>
          </div>
          <aside>
            <p
              style={{
                borderLeft: '3px solid var(--ink)',
                paddingLeft: 18,
                maxWidth: 420,
                fontSize: 17,
                lineHeight: 1.5,
                fontWeight: 400,
                color: '#1a1a1a',
              }}
            >
              Go Virall is the <b>social intelligence engine</b> built for creators who refuse to be average. Seven platforms, one dashboard, a private AI strategist &mdash; and a viral score that predicts the hit before you post.
            </p>
            <div style={{ position: 'relative', height: 640 }}>
              {/* Sticker */}
              <div
                style={{
                  position: 'absolute',
                  width: 130,
                  height: 130,
                  borderRadius: '50%',
                  background: 'var(--tangerine)',
                  color: 'var(--ink)',
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: 20,
                  lineHeight: 1,
                  textAlign: 'center',
                  transform: 'rotate(-12deg)',
                  border: '2px solid var(--ink)',
                  zIndex: 3,
                  top: 330,
                  left: -40,
                  animation: 'sticker-spin 16s linear infinite',
                }}
              >
                <span style={{ display: 'block', padding: 10 }}>NEW<br />Viral Score<br />v4</span>
              </div>

              {/* Card 1 - Viral Score */}
              <div
                style={{
                  position: 'absolute',
                  borderRadius: 14,
                  background: 'var(--hot)',
                  color: '#fff',
                  padding: 20,
                  boxShadow: '0 30px 60px -20px rgba(0,0,0,.4)',
                  border: '1px solid rgba(255,255,255,.08)',
                  top: 0,
                  right: 0,
                  width: 280,
                  transform: 'rotate(3deg)',
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.18em', opacity: 0.7, marginBottom: 14 }}>VIRAL SCORE &middot; PREDICTED</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 52, lineHeight: 0.9, letterSpacing: '-.03em' }}>94</div>
                <SparkBars heights={[20, 45, 30, 70, 55, 85, 65, 100]} color="#fff" />
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 20, lineHeight: 1, marginTop: 10, letterSpacing: '-.02em' }}>Post at 6:42 PM EST</h3>
              </div>

              {/* Card 2 - Followers */}
              <div
                style={{
                  position: 'absolute',
                  borderRadius: 14,
                  background: 'var(--lime)',
                  color: 'var(--ink)',
                  padding: 20,
                  boxShadow: '0 30px 60px -20px rgba(0,0,0,.4)',
                  border: '1px solid rgba(255,255,255,.08)',
                  top: 180,
                  left: 0,
                  width: 260,
                  transform: 'rotate(-4deg)',
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.18em', opacity: 0.7, marginBottom: 14 }}>FOLLOWERS &middot; 30D</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 52, lineHeight: 0.9, letterSpacing: '-.03em' }}>148.2K</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, marginTop: 6, opacity: 0.7 }}>+12.4% WoW &middot; #IG</div>
                <SparkBars heights={[40, 50, 65, 55, 80, 72, 90, 100]} color="var(--ink)" />
              </div>

              {/* Card 3 - Revenue */}
              <div
                style={{
                  position: 'absolute',
                  borderRadius: 14,
                  background: 'var(--cobalt)',
                  color: '#fff',
                  padding: 20,
                  boxShadow: '0 30px 60px -20px rgba(0,0,0,.4)',
                  border: '1px solid rgba(255,255,255,.08)',
                  bottom: 60,
                  right: 40,
                  width: 300,
                  transform: 'rotate(2deg)',
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.18em', opacity: 0.7, marginBottom: 14 }}>REVENUE &middot; THIS MONTH</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 52, lineHeight: 0.9, letterSpacing: '-.03em' }}>$12.8K</div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 16, marginTop: 8, lineHeight: 1, letterSpacing: '-.02em' }}>3 active deals &middot; 1 pending</h3>
              </div>

              {/* Card 4 - AI Strategist */}
              <div
                style={{
                  position: 'absolute',
                  borderRadius: 14,
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  padding: 20,
                  boxShadow: '0 30px 60px -20px rgba(0,0,0,.4)',
                  border: '1.5px solid var(--ink)',
                  bottom: 0,
                  left: 60,
                  width: 240,
                  transform: 'rotate(-2deg)',
                }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '.18em', opacity: 0.7, marginBottom: 14 }}>AI STRATEGIST</div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 22, lineHeight: 1, letterSpacing: '-.02em' }}>
                  &ldquo;Reels under 15s get <span style={{ background: 'var(--lime)', padding: '0 4px' }}>3.4&times;</span> more shares for you.&rdquo;
                </h3>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Big Rule Divider */}
      <div
        style={{
          borderTop: '1.5px solid var(--ink)',
          margin: '80px 28px 0',
          position: 'relative',
          height: 40,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '.3em',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
        }}
      >
        <span>01</span>
        <span>PLATFORMS SUPPORTED</span>
        <span>SECURE &middot; OAUTH</span>
      </div>

      {/* Platform Marquee */}
      <section
        style={{
          padding: '40px 0',
          overflow: 'hidden',
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--cream)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 60,
            animation: 'platform-marquee 30s linear infinite',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {[
            { name: 'Instagram', color: 'var(--hot)' },
            { name: 'TikTok', color: 'var(--ink)' },
            { name: 'YouTube', color: '#ff3b3b' },
            { name: 'X\u200b\u00b7\u200bTwitter', color: 'var(--cobalt)' },
            { name: 'LinkedIn', color: '#0a66c2' },
            { name: 'Facebook', color: '#1877f2' },
            { name: 'Twitch', color: '#9146ff' },
            { name: 'Instagram', color: 'var(--hot)' },
            { name: 'TikTok', color: 'var(--ink)' },
            { name: 'YouTube', color: '#ff3b3b' },
            { name: 'X\u200b\u00b7\u200bTwitter', color: 'var(--cobalt)' },
            { name: 'LinkedIn', color: '#0a66c2' },
            { name: 'Facebook', color: '#1877f2' },
            { name: 'Twitch', color: '#9146ff' },
          ].map((p, i) => (
            <span
              key={i}
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 900,
                fontSize: 46,
                letterSpacing: '-.02em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '90px 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 1fr',
            gap: 32,
            alignItems: 'end',
            marginBottom: 50,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '.2em', paddingTop: 4 }}>02 / FEATURES</div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 'clamp(48px, 7vw, 96px)',
              lineHeight: 0.92,
              letterSpacing: '-.03em',
            }}
          >
            Your <span style={{ fontStyle: 'normal', fontWeight: 900 }}>unfair</span><br />advantage.
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: '#333', maxWidth: 340, justifySelf: 'end' }}>
            Every lever you need to compound an audience &mdash; deep analytics, an always-on AI strategist, audience intelligence, and a viral score that calls the shot before you post.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 20 }}>
          {/* Feature 1 - Viral Score (wide, tall, dark) */}
          <article
            style={{
              gridColumn: 'span 8',
              padding: 28,
              border: '1.5px solid var(--ink)',
              borderRadius: 16,
              background: 'var(--ink)',
              color: 'var(--paper)',
              position: 'relative',
              minHeight: 420,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', opacity: 0.6 }}>01 &mdash; VIRAL SCORE</div>
              <h4 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 34, lineHeight: 1, letterSpacing: '-.02em', margin: '14px 0 10px' }}>
                Predict the hit<br />before you post.
              </h4>
              <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.85, maxWidth: 320 }}>
                Score every draft 0&ndash;100 against platform-specific signals &mdash; format, length, hook, posting window, and audience patterns. Post with conviction.
              </p>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 120, letterSpacing: '-.04em', lineHeight: 0.8, color: 'var(--lime)' }}>94</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '.15em', opacity: 0.7 }}>/ 100 &middot; PREDICTED &middot; &ldquo;Morning Routine Reel&rdquo;</span>
              </div>
              <BarViz heights={[30, 52, 44, 70, 62, 85, 74, 90, 100, 88, 95]} color="var(--lime)" />
            </div>
          </article>

          {/* Feature 2 - Strategist (lime) */}
          <article
            style={{
              gridColumn: 'span 4',
              padding: 28,
              border: '1.5px solid var(--ink)',
              borderRadius: 16,
              background: 'var(--lime)',
              position: 'relative',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', opacity: 0.6 }}>02 &mdash; STRATEGIST</div>
              <h4 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 34, lineHeight: 1, letterSpacing: '-.02em', margin: '14px 0 10px' }}>
                An AI in<br />your corner.
              </h4>
              <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.85, maxWidth: 320 }}>
                Analyzes your content history. Generates captions in your voice, flags high-potential ideas, and suggests optimal timing.
              </p>
            </div>
            <span
              style={{
                marginTop: 18,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '.1em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderBottom: '1.5px solid currentColor',
                alignSelf: 'flex-start',
                paddingBottom: 2,
              }}
            >
              Ask your strategist &rarr;
            </span>
          </article>

          {/* Feature 3 - Audience */}
          <article
            style={{
              gridColumn: 'span 4',
              padding: 28,
              border: '1.5px solid var(--ink)',
              borderRadius: 16,
              background: 'var(--paper)',
              position: 'relative',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', opacity: 0.6 }}>03 &mdash; AUDIENCE</div>
              <h4 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 34, lineHeight: 1, letterSpacing: '-.02em', margin: '14px 0 10px' }}>
                Know your<br />people.
              </h4>
              <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.85, maxWidth: 320 }}>
                Demographics, interest graphs, behavior clusters. Pitch brands with receipts.
              </p>
            </div>
            <span
              style={{
                marginTop: 18,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '.1em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderBottom: '1.5px solid currentColor',
                alignSelf: 'flex-start',
                paddingBottom: 2,
              }}
            >
              Open audience view &rarr;
            </span>
          </article>

          {/* Feature 4 - Deals (hot) */}
          <article
            style={{
              gridColumn: 'span 4',
              padding: 28,
              border: '1.5px solid var(--ink)',
              borderRadius: 16,
              background: 'var(--hot)',
              color: '#fff',
              position: 'relative',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', opacity: 0.6 }}>04 &mdash; DEALS</div>
              <h4 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 34, lineHeight: 1, letterSpacing: '-.02em', margin: '14px 0 10px' }}>
                $ on autopilot.
              </h4>
              <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.85, maxWidth: 320 }}>
                9-stage deal pipeline. Contracts, milestones, payouts &mdash; one view.
              </p>
            </div>
            <div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 56, letterSpacing: '-.03em' }}>$12.8K</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.8, letterSpacing: '.12em' }}>THIS MONTH &middot; +9.6%</div>
            </div>
          </article>

          {/* Feature 5 - Trends (wide, default) */}
          <article
            style={{
              gridColumn: 'span 4',
              padding: 28,
              border: '1.5px solid var(--ink)',
              borderRadius: 16,
              background: 'var(--paper)',
              position: 'relative',
              minHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', opacity: 0.6 }}>05 &mdash; TRENDS</div>
              <h4 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 34, lineHeight: 1, letterSpacing: '-.02em', margin: '14px 0 10px' }}>
                Catch the wave early.
              </h4>
              <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.85, maxWidth: 320 }}>
                Surface emerging topics in your niche across platforms &mdash; so you can ride the wave while it&apos;s still building.
              </p>
            </div>
            <BarViz heights={[20, 28, 22, 45, 38, 68, 52, 80, 70, 92, 85, 100, 70]} color="var(--ink)" height={80} />
          </article>
        </div>
      </section>

      {/* How It Works */}
      <section
        style={{
          padding: '120px 28px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 28,
          }}
        >
          HOW IT WORKS
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 5.6vw, 76px)',
            lineHeight: 1.05,
            letterSpacing: '-.02em',
            maxWidth: 1100,
          }}
        >
          Connect your platforms.{' '}
          <b style={{ fontWeight: 900, fontStyle: 'normal', background: 'var(--lime)', color: 'var(--ink)', padding: '0 .1em' }}>
            Score your content.
          </b>{' '}
          Ship what works.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 60 }}>
          {[
            { step: '01', title: 'Connect', desc: 'Link your Instagram, TikTok, YouTube, and other accounts in one click.' },
            { step: '02', title: 'Analyze', desc: 'Get your SMO Score, viral predictions, and AI-powered content suggestions instantly.' },
            { step: '03', title: 'Create & Ship', desc: 'Use the AI Studio to write scripts, captions, and bios. Post with confidence.' },
          ].map((s) => (
            <div key={s.step}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', color: 'var(--lime)', marginBottom: 12 }}>{s.step}</div>
              <h4 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 28, letterSpacing: '-.02em', marginBottom: 8 }}>{s.title}</h4>
              <p style={{ fontSize: 14, lineHeight: 1.55, opacity: 0.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '90px 28px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 1fr',
            gap: 32,
            alignItems: 'end',
            marginBottom: 50,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '.2em', paddingTop: 4 }}>03 / PRICING</div>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 'clamp(48px, 7vw, 96px)',
              lineHeight: 0.92,
              letterSpacing: '-.03em',
            }}
          >
            Invest<br />in your<span style={{ fontStyle: 'normal', fontWeight: 900 }}> growth.</span>
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: '#333', maxWidth: 340, justifySelf: 'end' }}>
            No contracts, no credit card for free. Scale when you&apos;re ready. Annual billing trims 20%.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 20, maxWidth: plans.length > 2 ? 1080 : 720, margin: '0 auto' }}>
          {plans.map((plan, i) => (
            <PricingTier
              key={plan.tier}
              name={plan.name}
              price={`$${(plan.priceMonthly / 100).toFixed(0)}`}
              tagline={plan.tagline}
              features={plan.features}
              cta={plan.priceMonthly === 0 ? 'Start free &rarr;' : 'Start trial &rarr;'}
              href="/signup"
              popular={i === 1}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: 'var(--ink)',
          color: 'var(--paper)',
          padding: '80px 28px 30px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(80px, 15vw, 230px)',
            lineHeight: 0.82,
            letterSpacing: '-.04em',
            marginBottom: 40,
          }}
        >
          Ready to<br />go <span style={{ fontWeight: 900, fontStyle: 'normal', color: 'var(--lime)' }}>virall.</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 40,
            borderTop: '1px solid rgba(255,255,255,.15)',
            paddingTop: 40,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: 32,
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                color: 'var(--paper)',
              }}
            >
              Go Virall
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: 'var(--hot)',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'pulse-dot 1.4s ease-in-out infinite',
                }}
              />
            </div>
            <p style={{ maxWidth: 380, fontSize: 14, marginTop: 14, opacity: 0.7, lineHeight: 1.5 }}>
              The social intelligence platform that transforms creators into cultural forces. Built on real data, tuned by real creators.
            </p>
          </div>
          <FooterCol title="Product" links={[
            { label: 'Viral Score', href: '/signup' },
            { label: 'AI Studio', href: '/signup' },
            { label: 'Audience Intel', href: '/signup' },
            { label: 'Revenue Tracker', href: '/signup' },
          ]} />
          <FooterCol title="Company" links={[
            { label: 'About', href: '/about' },
            { label: 'FAQ', href: '/faq' },
            { label: 'Contact', href: '/contact' },
          ]} />
          <FooterCol title="Legal" links={[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Child Safety', href: '/child-safety' },
            { label: 'Delete Account', href: '/delete-account' },
          ]} />
        </div>

        <div
          style={{
            marginTop: 60,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '.15em',
            display: 'flex',
            justifyContent: 'space-between',
            opacity: 0.5,
          }}
        >
          <span>&copy; 2026 GO VIRALL</span>
          <span>NEW YORK &middot; LOS ANGELES &middot; LISBON</span>
          <span>
            <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>PRIVACY</Link>
            {' '}&middot;{' '}
            <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>TERMS</Link>
            {' '}&middot;{' '}
            <Link href="/child-safety" style={{ color: 'inherit', textDecoration: 'none' }}>CHILD SAFETY</Link>
            {' '}&middot;{' '}
            <Link href="/delete-account" style={{ color: 'inherit', textDecoration: 'none' }}>DELETE ACCOUNT</Link>
          </span>
        </div>
      </footer>
    </main>
  );
}

function SparkBars({ heights, color }: { heights: number[]; color: string }) {
  return (
    <div style={{ height: 32, marginTop: 8, display: 'flex', alignItems: 'flex-end', gap: 3 }}>
      {heights.map((h, i) => (
        <i key={i} style={{ flex: 1, height: `${h}%`, background: color, opacity: 0.8, borderRadius: 2, display: 'block' }} />
      ))}
    </div>
  );
}

function BarViz({ heights, color, height = 110 }: { heights: number[]; color: string; height?: number }) {
  return (
    <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {heights.map((h, i) => (
        <i key={i} style={{ flex: 1, height: `${h}%`, background: color, borderRadius: '4px 4px 0 0', opacity: 0.9, display: 'block' }} />
      ))}
    </div>
  );
}

function PricingTier({
  name,
  price,
  tagline,
  features,
  cta,
  href,
  popular,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  cta: string;
  href: string;
  popular?: boolean;
}) {
  return (
    <div
      style={{
        border: '1.5px solid var(--ink)',
        borderRadius: 20,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        background: popular ? 'var(--ink)' : 'var(--paper)',
        color: popular ? 'var(--paper)' : 'var(--ink)',
        position: 'relative',
        minHeight: 440,
        ...(popular ? { transform: 'translateY(-14px)' } : {}),
      }}
    >
      {popular && (
        <span
          style={{
            position: 'absolute',
            top: -11,
            left: 24,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '.15em',
            padding: '4px 10px',
            background: 'var(--lime)',
            color: 'var(--ink)',
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          MOST LOVED
        </span>
      )}
      <div>
        <h5 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 32, letterSpacing: '-.02em' }}>{name}</h5>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontStyle: 'italic', fontSize: 72, letterSpacing: '-.04em', lineHeight: 0.9 }}>
          {price}<sub style={{ fontSize: 14, fontStyle: 'normal', fontWeight: 500, opacity: 0.7, verticalAlign: 'top' }}>/mo</sub>
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.8 }} dangerouslySetInnerHTML={{ __html: tagline }} />
      <ul
        style={{
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          fontSize: 13,
          paddingTop: 16,
          borderTop: '1px solid currentColor',
        }}
      >
        {features.map((f) => (
          <li key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.4 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>&rarr;</span>
            {f}
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto' }}>
        <Link
          href={href}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            border: popular ? '1.5px solid var(--lime)' : '1.5px solid var(--ink)',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 13,
            background: popular ? 'var(--lime)' : 'transparent',
            color: popular ? 'var(--ink)' : 'var(--ink)',
            textDecoration: 'none',
          }}
          dangerouslySetInnerHTML={{ __html: cta }}
        />
      </div>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h6
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '.2em',
          marginBottom: 16,
          opacity: 0.6,
        }}
      >
        {title.toUpperCase()}
      </h6>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          style={{
            display: 'block',
            padding: '6px 0',
            fontSize: 14,
            opacity: 0.8,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
