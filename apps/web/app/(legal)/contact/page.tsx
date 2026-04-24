import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - Get in Touch with Go Virall',
  description:
    'Contact the Go Virall team for support, partnerships, or feedback. We respond within 24 hours on business days.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
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
        Get in <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Touch.</span>
      </h1>

      <p style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>
        We&apos;d love to hear from you. Whether you have a question, feedback, or need support, reach out using the contacts below.
      </p>

      <div style={{ display: 'grid', gap: 16 }}>
        <div
          style={{
            border: '1.5px solid var(--ink)',
            borderRadius: 14,
            padding: 24,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', color: '#888', marginBottom: 8 }}>GENERAL SUPPORT</div>
          <a href="mailto:info@donkeyideas.com" style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 24, color: 'var(--ink)', textDecoration: 'none' }}>
            info@donkeyideas.com
          </a>
          <p style={{ fontSize: 14, color: '#555', marginTop: 8, lineHeight: 1.5 }}>
            Account issues, billing questions, feature requests, bug reports.
          </p>
        </div>

        <div
          style={{
            border: '1.5px solid var(--ink)',
            borderRadius: 14,
            padding: 24,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', color: '#888', marginBottom: 8 }}>SAFETY &amp; ABUSE</div>
          <a href="mailto:info@donkeyideas.com" style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 24, color: 'var(--ink)', textDecoration: 'none' }}>
            info@donkeyideas.com
          </a>
          <p style={{ fontSize: 14, color: '#555', marginTop: 8, lineHeight: 1.5 }}>
            Report content violations, child safety concerns, or abuse.
          </p>
        </div>

        <div
          style={{
            border: '1.5px solid var(--ink)',
            borderRadius: 14,
            padding: 24,
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.2em', color: '#888', marginBottom: 8 }}>PARTNERSHIPS</div>
          <a href="mailto:info@donkeyideas.com" style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 24, color: 'var(--ink)', textDecoration: 'none' }}>
            info@donkeyideas.com
          </a>
          <p style={{ fontSize: 14, color: '#555', marginTop: 8, lineHeight: 1.5 }}>
            Brand partnerships, press inquiries, collaborations.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 48, padding: 24, background: 'rgba(0,0,0,.03)', borderRadius: 14 }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '.15em', color: '#888', marginBottom: 8 }}>RESPONSE TIME</p>
        <p style={{ fontSize: 15, lineHeight: 1.6 }}>
          We typically respond within 24 hours on business days. Safety reports are handled with the highest priority.
        </p>
      </div>
    </>
  );
}
