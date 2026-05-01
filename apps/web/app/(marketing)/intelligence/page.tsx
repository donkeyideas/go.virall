import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Fintech Social Intelligence | AI Content Strategy for Creators',
  description:
    'Fintech social intelligence and AI-powered content strategy for creators. Predict fintech viral posts, optimize content with fintech content strategy AI, and get financial influencer growth insights across 7 platforms.',
  keywords: [
    'fintech social intelligence',
    'fintech content strategy AI',
    'predict fintech viral posts',
    'financial influencer growth insights',
    'social intelligence platform',
    'AI content strategy',
    'viral predictions',
    'audience insights',
  ],
};

const PILLARS = [
  {
    number: '01',
    title: 'Viral Prediction Engine',
    description:
      'Predict fintech viral posts before you hit publish. Our scoring model analyzes your content against platform-specific signals \u2014 format, length, hook quality, hashtag relevance, posting time, and historical engagement \u2014 to assign a 0\u2013100 viral score across all connected platforms.',
  },
  {
    number: '02',
    title: 'AI Content Strategist',
    description:
      'Fintech content strategy AI trained on your content history. Generates captions in your voice, flags high-potential ideas, and suggests optimal posting windows. It learns what works for your specific audience and delivers actionable growth insights.',
  },
  {
    number: '03',
    title: 'Audience Intelligence',
    description:
      'Go beyond vanity metrics. Understand demographics, interest graphs, and behavioral clusters. Know exactly what your audience wants \u2014 and pitch brands with data-backed proof.',
  },
  {
    number: '04',
    title: 'Trend Detection',
    description:
      'Surface emerging topics in your niche across platforms before they peak. Catch the wave while it\u2019s still building, and create content that rides momentum instead of chasing it.',
  },
  {
    number: '05',
    title: 'SMO Optimization',
    description:
      'Social Media Optimization scoring across every connected platform. Track consistency, engagement quality, growth velocity, and content diversity \u2014 all in one number, updated in real time.',
  },
];

export default function IntelligencePage() {
  return (
    <main>
      {/* Hero */}
      <section style={{ padding: '100px 28px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 20,
          }}
        >
          INTELLIGENCE
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(48px, 8vw, 96px)',
            lineHeight: 0.9,
            letterSpacing: '-.03em',
          }}
        >
          Data that{' '}
          <span style={{ fontWeight: 900, fontStyle: 'normal', background: 'var(--lime)', padding: '0 .1em' }}>
            thinks.
          </span>
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 560,
            marginTop: 28,
            color: '#555',
          }}
        >
          Go Virall\u2019s fintech social intelligence layer turns raw social data into actionable
          insights. Five pillars of fintech content strategy AI work together to predict viral posts, deliver financial influencer growth insights, and help you earn more.
        </p>
      </section>

      {/* Pillars */}
      <section style={{ borderTop: '1.5px solid var(--ink)' }}>
        {PILLARS.map((p, i) => (
          <div
            key={p.number}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr',
              gap: 40,
              padding: '60px 28px',
              maxWidth: 900,
              margin: '0 auto',
              borderBottom: i < PILLARS.length - 1 ? '1px solid var(--rule)' : 'none',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '.2em',
                opacity: 0.5,
                paddingTop: 6,
              }}
            >
              {p.number}
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 900,
                  fontSize: 28,
                  letterSpacing: '-.02em',
                  marginBottom: 12,
                }}
              >
                {p.title}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, opacity: 0.8, maxWidth: 540 }}>
                {p.description}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '80px 28px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          textAlign: 'center',
        }}
      >
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 'clamp(36px, 5vw, 64px)',
            letterSpacing: '-.02em',
            marginBottom: 16,
          }}
        >
          Intelligence, on tap.
        </h3>
        <p style={{ fontSize: 15, opacity: 0.7, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
          Free plan includes fintech social media analytics, viral scoring, and AI Studio. No credit card required.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 28px',
            border: '1.5px solid var(--lime)',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 15,
            background: 'var(--lime)',
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          Start free &rarr;
        </Link>
        <nav
          style={{
            marginTop: 40,
            display: 'flex',
            justifyContent: 'center',
            gap: 28,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '.1em',
          }}
        >
          <Link href="/product" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>
            Product Features
          </Link>
          <Link href="/creators" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>
            For Creators
          </Link>
          <Link href="/pricing" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>
            Pricing &amp; Free Trial
          </Link>
          <Link href="/stories" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>
            Creator Stories
          </Link>
        </nav>
      </section>
    </main>
  );
}
