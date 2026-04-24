import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Go Virall',
  description:
    'Go Virall is the social intelligence platform for creators. Viral scoring, AI studio, and analytics across 7 platforms.',
  alternates: { canonical: '/about' },
};

const pStyle: React.CSSProperties = { fontSize: 16, lineHeight: 1.7, marginBottom: 16 };

export default function AboutPage() {
  return (
    <>
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 'clamp(36px, 5vw, 52px)',
          lineHeight: 0.95,
          letterSpacing: '-.03em',
          marginBottom: 32,
        }}
      >
        About <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Go Virall.</span>
      </h1>

      <p style={pStyle}>
        Go Virall is the social intelligence platform built for creators who take their craft seriously. We give you the analytics, AI tools, and content studio you need to grow faster &mdash; across every platform, from one dashboard.
      </p>

      <p style={pStyle}>
        We believe creators deserve better tools. Not recycled analytics dashboards with vanity metrics, but real intelligence: a viral score that predicts performance before you post, an AI strategist that knows your niche, and a content studio that writes in your voice.
      </p>

      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: '-.02em',
          marginTop: 48,
          marginBottom: 16,
        }}
      >
        What we build
      </h2>

      <div style={{ display: 'grid', gap: 16 }}>
        {[
          { title: 'Viral Score', desc: 'Score every piece of content 0\u2013100 before you post, based on platform-specific signals.' },
          { title: 'AI Studio', desc: 'Generate scripts, captions, content ideas, and bio optimizations powered by AI that understands your brand.' },
          { title: 'SMO Score', desc: 'Your Social Media Optimization score \u2014 a comprehensive health check across all connected platforms.' },
          { title: 'Audience Intelligence', desc: 'Understand who follows you, where they come from, and what content resonates with them.' },
          { title: 'Revenue Tracking', desc: 'Track deals, brand partnerships, and income across all your creator revenue streams.' },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              border: '1.5px solid var(--ink)',
              borderRadius: 14,
              padding: 20,
            }}
          >
            <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 18, marginBottom: 6 }}>{item.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: '#555' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: '-.02em',
          marginTop: 48,
          marginBottom: 16,
        }}
      >
        Platforms supported
      </h2>
      <p style={pStyle}>
        Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook, and Twitch. Connect your accounts and get insights in minutes.
      </p>

      <h2
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 900,
          fontSize: 24,
          letterSpacing: '-.02em',
          marginTop: 48,
          marginBottom: 16,
        }}
      >
        Contact
      </h2>
      <p style={pStyle}>
        General inquiries: <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a>
      </p>
    </>
  );
}
