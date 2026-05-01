import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Fintech Social Media Analytics Tool | Go Virall Product Features',
  description:
    'The fintech viral content analyzer and cross-platform creator metrics tool. Predict viral posts, track fintech social media analytics, AI content strategy, and audience intelligence across 7 platforms.',
  keywords: [
    'fintech social media analytics tool',
    'fintech viral content analyzer',
    'fintech cross-platform creator metrics',
    'predict fintech viral posts',
    'fintech creator platform',
    'social media analytics',
    'viral score predictions',
  ],
};

const FEATURES = [
  {
    id: 'viral-score',
    number: '01',
    title: 'Viral Score',
    headline: 'Predict the hit before you post.',
    description:
      'Predict fintech viral posts before you publish. Score every piece of content 0\u2013100 with our fintech viral content analyzer. It analyzes format, hook quality, posting window, and cross-platform creator metrics across Instagram, TikTok, YouTube, X, LinkedIn, Facebook, and Twitch.',
    color: 'var(--ink)',
    bg: 'var(--paper)',
    stats: ['0\u2013100 score', '7 platforms', 'Real-time analysis'],
  },
  {
    id: 'ai-studio',
    number: '02',
    title: 'AI Studio',
    headline: 'Four tools. Your voice.',
    description:
      'Generate scripts, captions, content ideas, and bios powered by AI that understands your brand. The studio learns from your best-performing content and writes in your tone \u2014 not generic filler.',
    color: 'var(--paper)',
    bg: 'var(--ink)',
    stats: ['Post Ideas', 'Captions', 'Scripts', 'Bio Generator'],
  },
  {
    id: 'audience',
    number: '03',
    title: 'Audience Intelligence',
    headline: 'Know your people.',
    description:
      'Understand who follows you, where they come from, and what content resonates with them. Demographics, interest graphs, behavior clusters \u2014 pitch brands with receipts, not guesses.',
    color: 'var(--ink)',
    bg: 'var(--lime)',
    stats: ['Demographics', 'Interest graphs', 'Behavior clusters'],
  },
  {
    id: 'smo-score',
    number: '04',
    title: 'SMO Score',
    headline: 'Your social health check.',
    description:
      'Your Social Media Optimization score \u2014 a comprehensive health check across all connected platforms. Track consistency, engagement quality, growth velocity, and content diversity in one number.',
    color: 'var(--ink)',
    bg: 'var(--paper)',
    stats: ['Consistency', 'Engagement', 'Growth', 'Diversity'],
  },
  {
    id: 'revenue',
    number: '05',
    title: 'Revenue Tracking',
    headline: 'Every dollar, one view.',
    description:
      'Track deals, brand partnerships, and income across all your creator revenue streams. 9-stage deal pipeline, contract management, milestone tracking, and payout visibility.',
    color: 'var(--paper)',
    bg: 'var(--cobalt)',
    stats: ['Deal pipeline', 'Contract mgmt', 'Payout tracking'],
  },
];

export default function ProductPage() {
  return (
    <main>
      {/* Hero */}
      <section style={{ padding: '100px 28px 60px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 20,
          }}
        >
          PRODUCT
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(48px, 8vw, 110px)',
            lineHeight: 0.9,
            letterSpacing: '-.03em',
            maxWidth: 900,
            margin: '0 auto',
          }}
        >
          Your <span style={{ fontWeight: 900, fontStyle: 'normal' }}>unfair</span>{' '}
          advantage.
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 560,
            margin: '28px auto 0',
            color: '#555',
          }}
        >
          The fintech social media analytics tool built for creators. Cross-platform creator metrics, an AI content strategist, audience intelligence, and a fintech viral content analyzer that predicts the hit before you post.
        </p>
      </section>

      {/* Feature Sections */}
      {FEATURES.map((f) => (
        <section
          key={f.id}
          id={f.id}
          style={{
            padding: '80px 28px',
            background: f.bg,
            color: f.color,
            borderTop: '1.5px solid var(--ink)',
          }}
        >
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: '.2em',
                opacity: 0.5,
                marginBottom: 14,
              }}
            >
              {f.number} &mdash; {f.title.toUpperCase()}
            </div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 900,
                fontSize: 'clamp(36px, 5vw, 64px)',
                lineHeight: 0.95,
                letterSpacing: '-.02em',
                marginBottom: 18,
              }}
            >
              {f.headline}
            </h2>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                maxWidth: 600,
                opacity: 0.85,
              }}
            >
              {f.description}
            </p>
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginTop: 28,
                flexWrap: 'wrap',
              }}
            >
              {f.stats.map((s) => (
                <span
                  key={s}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '.1em',
                    padding: '8px 14px',
                    border: `1.5px solid currentColor`,
                    borderRadius: 999,
                    opacity: 0.7,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section
        style={{
          padding: '80px 28px',
          textAlign: 'center',
          borderTop: '1.5px solid var(--ink)',
        }}
      >
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 'clamp(36px, 5vw, 64px)',
            letterSpacing: '-.02em',
            marginBottom: 24,
          }}
        >
          Start for free.
        </h3>
        <Link
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 28px',
            border: '1.5px solid var(--ink)',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 15,
            background: 'var(--ink)',
            color: 'var(--paper)',
            textDecoration: 'none',
          }}
        >
          Start free &mdash; no card &rarr;
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
          <Link href="/intelligence" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>
            Fintech Social Intelligence
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
