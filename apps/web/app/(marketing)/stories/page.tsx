import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Creator Stories | Financial Influencer Growth Insights & Results',
  description:
    'See how creators use Go Virall\u2019s fintech social intelligence platform to grow their audience, land brand deals, and get financial influencer growth insights that drive real results.',
  keywords: [
    'financial influencer growth insights',
    'fintech creator platform results',
    'creator success stories',
    'social media growth case studies',
    'influencer analytics results',
  ],
};

const STORIES = [
  {
    name: 'Maya Chen',
    handle: '@mayacreates',
    platform: 'Instagram',
    stat: '+340%',
    statLabel: 'Engagement in 90 days',
    quote:
      'The viral score changed how I think about content. I stopped guessing and started knowing which posts would perform before I hit publish.',
    category: 'Lifestyle',
  },
  {
    name: 'Jordan Walker',
    handle: '@jordantalks',
    platform: 'TikTok',
    stat: '0\u219250K',
    statLabel: 'Followers in 6 months',
    quote:
      'AI Studio writes captions that sound like me \u2014 not some generic bot. My audience can\u2019t tell the difference because there isn\u2019t one.',
    category: 'Education',
  },
  {
    name: 'Priya Sharma',
    handle: '@priyacooks',
    platform: 'YouTube',
    stat: '$18K',
    statLabel: 'Monthly brand revenue',
    quote:
      'The audience intelligence report helped me pitch brands with real data. My close rate on deals went from 20% to 65% in two months.',
    category: 'Food & Recipe',
  },
  {
    name: 'Marcus Rivera',
    handle: '@marcusfits',
    platform: 'Multiple',
    stat: '94',
    statLabel: 'Average Viral Score',
    quote:
      'I manage content across 5 platforms. Go Virall\u2019s SMO Score keeps me honest about consistency \u2014 and the AI flags when I\u2019m slipping.',
    category: 'Fitness',
  },
];

export default function StoriesPage() {
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
          STORIES
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
          Creators who went{' '}
          <span
            style={{
              fontWeight: 900,
              fontStyle: 'normal',
              color: 'var(--hot)',
            }}
          >
            virall.
          </span>
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 480,
            margin: '28px auto 0',
            color: '#555',
          }}
        >
          Real creators. Real financial influencer growth insights. See how they use Go Virall\u2019s fintech creator platform to grow smarter.
        </p>
      </section>

      {/* Stories Grid */}
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
          {STORIES.map((s) => (
            <article
              key={s.name}
              style={{
                border: '1.5px solid var(--ink)',
                borderRadius: 16,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 320,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontWeight: 900,
                        fontSize: 22,
                        letterSpacing: '-.02em',
                      }}
                    >
                      {s.name}
                    </h3>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        opacity: 0.5,
                        letterSpacing: '.1em',
                      }}
                    >
                      {s.handle} &middot; {s.platform}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      letterSpacing: '.12em',
                      padding: '4px 10px',
                      border: '1px solid var(--ink)',
                      borderRadius: 999,
                      opacity: 0.6,
                    }}
                  >
                    {s.category.toUpperCase()}
                  </span>
                </div>
                <blockquote
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 500,
                    fontStyle: 'italic',
                    fontSize: 17,
                    lineHeight: 1.5,
                    letterSpacing: '-.01em',
                    margin: 0,
                    borderLeft: '3px solid var(--hot)',
                    paddingLeft: 16,
                  }}
                >
                  &ldquo;{s.quote}&rdquo;
                </blockquote>
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
                  {s.stat}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '.12em',
                    opacity: 0.5,
                  }}
                >
                  {s.statLabel.toUpperCase()}
                </span>
              </div>
            </article>
          ))}
        </div>
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
          Your story starts here.
        </h3>
        <p style={{ fontSize: 15, opacity: 0.7, maxWidth: 420, margin: '0 auto 28px' }}>
          Join thousands of creators using fintech social intelligence to grow.
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
          <Link href="/intelligence" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>
            Fintech Social Intelligence
          </Link>
          <Link href="/pricing" style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.6 }}>
            Pricing &amp; Free Trial
          </Link>
        </nav>
      </section>
    </main>
  );
}
