import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'For Creators',
  description:
    'Go Virall is built for creators who refuse to be average. Social intelligence across 7 platforms, AI content studio, and viral predictions.',
};

const CREATOR_TYPES = [
  {
    title: 'Content Creators',
    description:
      'Score every piece of content before you post. Generate scripts, captions, and bios with AI that writes in your voice. Never wonder if a post will land again.',
    stat: '0\u2013100',
    statLabel: 'Viral Score',
  },
  {
    title: 'Influencers',
    description:
      'Pitch brands with real audience intelligence \u2014 demographics, interest graphs, engagement quality. Close deals faster with a media kit that updates automatically.',
    stat: '7',
    statLabel: 'Platforms',
  },
  {
    title: 'Podcasters & YouTubers',
    description:
      'Optimize titles, thumbnails, and descriptions. Track performance across long-form and short-form. Know exactly when to publish for maximum reach.',
    stat: '4',
    statLabel: 'AI Tools',
  },
  {
    title: 'Micro-Creators',
    description:
      'Just starting out? The free plan gives you viral scoring, AI Studio, and audience insights. Grow your audience from 0 to 10K with data on your side.',
    stat: '$0',
    statLabel: 'To Start',
  },
];

export default function CreatorsPage() {
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
          FOR CREATORS
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(48px, 8vw, 96px)',
            lineHeight: 0.9,
            letterSpacing: '-.03em',
            maxWidth: 800,
            margin: '0 auto',
          }}
        >
          Built for creators who{' '}
          <span
            style={{
              fontWeight: 900,
              fontStyle: 'normal',
              background: 'var(--lime)',
              padding: '0 .1em',
            }}
          >
            refuse
          </span>{' '}
          to be average.
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 520,
            margin: '28px auto 0',
            color: '#555',
          }}
        >
          Whether you have 500 followers or 5 million \u2014 Go Virall gives you the
          same intelligence tools the top 1% use. Seven platforms, one dashboard,
          zero guesswork.
        </p>
      </section>

      {/* Creator types grid */}
      <section style={{ padding: '0 28px 80px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
            maxWidth: 960,
            margin: '0 auto',
          }}
        >
          {CREATOR_TYPES.map((c) => (
            <article
              key={c.title}
              style={{
                border: '1.5px solid var(--ink)',
                borderRadius: 16,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 280,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 900,
                    fontSize: 24,
                    letterSpacing: '-.02em',
                    marginBottom: 10,
                  }}
                >
                  {c.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>
                  {c.description}
                </p>
              </div>
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 900,
                    fontStyle: 'italic',
                    fontSize: 42,
                    letterSpacing: '-.03em',
                    lineHeight: 1,
                    color: 'var(--hot)',
                  }}
                >
                  {c.stat}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '.15em',
                    opacity: 0.5,
                  }}
                >
                  {c.statLabel.toUpperCase()}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section
        style={{
          padding: '60px 28px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 16,
          }}
        >
          PLATFORMS SUPPORTED
        </div>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 48px)',
            letterSpacing: '-.02em',
            marginBottom: 28,
          }}
        >
          Instagram &middot; TikTok &middot; YouTube &middot; X &middot; LinkedIn &middot; Facebook &middot; Twitch
        </div>
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
          Start free &mdash; no card &rarr;
        </Link>
      </section>
    </main>
  );
}
