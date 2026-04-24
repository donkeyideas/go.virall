import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - How Go Virall Protects Your Data',
  description:
    'Go Virall privacy policy. Learn how we collect, use, and protect your personal data. We never store your social media passwords.',
  alternates: { canonical: '/privacy' },
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Fraunces', serif",
  fontWeight: 900,
  fontSize: 22,
  letterSpacing: '-.02em',
  marginTop: 40,
  marginBottom: 12,
};

const pStyle: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, marginBottom: 12 };
const ulStyle: React.CSSProperties = { paddingLeft: 20, marginBottom: 12 };
const liStyle: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, marginBottom: 6 };

export default function PrivacyPage() {
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
          marginBottom: 8,
        }}
      >
        Privacy <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Policy.</span>
      </h1>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '.15em', color: '#888', marginBottom: 40 }}>
        EFFECTIVE DATE: APRIL 16, 2026
      </p>

      <h2 style={h2Style}>1. Introduction</h2>
      <p style={pStyle}>
        Go Virall (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates the Go Virall website and mobile application (the &ldquo;Service&rdquo;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
      </p>

      <h2 style={h2Style}>2. Information We Collect</h2>
      <h3 style={{ fontWeight: 700, fontSize: 16, marginTop: 16, marginBottom: 8 }}>Information you provide</h3>
      <ul style={ulStyle}>
        <li style={liStyle}><strong>Account information</strong> &mdash; name, email address, and password when you create an account</li>
        <li style={liStyle}><strong>Profile information</strong> &mdash; display name, bio, niche, location, and profile photo</li>
        <li style={liStyle}><strong>Social media handles</strong> &mdash; the usernames you provide so we can retrieve your public social media data</li>
        <li style={liStyle}><strong>User-generated content</strong> &mdash; scheduled posts, messages, proposals, deals, and AI chat conversations</li>
      </ul>

      <h3 style={{ fontWeight: 700, fontSize: 16, marginTop: 16, marginBottom: 8 }}>Information collected automatically</h3>
      <ul style={ulStyle}>
        <li style={liStyle}><strong>Usage data</strong> &mdash; screen views, feature interactions, and in-app events via our first-party analytics</li>
        <li style={liStyle}><strong>Device identifiers</strong> &mdash; push notification tokens (Expo/FCM) to deliver notifications</li>
      </ul>

      <h3 style={{ fontWeight: 700, fontSize: 16, marginTop: 16, marginBottom: 8 }}>Information we do NOT collect</h3>
      <ul style={ulStyle}>
        <li style={liStyle}>Precise or approximate GPS location</li>
        <li style={liStyle}>Contacts, calendar, or phone data</li>
        <li style={liStyle}>Advertising or tracking IDs</li>
        <li style={liStyle}>Biometric data</li>
        <li style={liStyle}>Payment card details (processed entirely by Stripe &mdash; we never see or store card numbers)</li>
      </ul>

      <h2 style={h2Style}>3. How We Use Your Information</h2>
      <ul style={ulStyle}>
        <li style={liStyle}>Provide, operate, and maintain the Service</li>
        <li style={liStyle}>Retrieve and display your public social media analytics and metrics</li>
        <li style={liStyle}>Power AI-assisted features (content suggestions, chat assistant)</li>
        <li style={liStyle}>Send push notifications for messages, deals, and alerts</li>
        <li style={liStyle}>Process subscriptions and payments via Stripe</li>
        <li style={liStyle}>Improve the Service through aggregated usage analytics</li>
        <li style={liStyle}>Respond to support requests</li>
      </ul>

      <h2 style={h2Style}>4. How We Share Your Information</h2>
      <p style={pStyle}>We do not sell your personal information. We share data only with the following service providers necessary to operate the Service:</p>
      <ul style={ulStyle}>
        <li style={liStyle}><strong>Supabase</strong> &mdash; database hosting and authentication</li>
        <li style={liStyle}><strong>Stripe</strong> &mdash; payment processing and subscription billing</li>
        <li style={liStyle}><strong>Expo / Firebase Cloud Messaging</strong> &mdash; push notification delivery</li>
        <li style={liStyle}><strong>AI providers</strong> (DeepSeek, OpenAI, Anthropic, Google) &mdash; processing AI features server-side</li>
        <li style={liStyle}><strong>Resend</strong> &mdash; transactional email delivery</li>
      </ul>

      <h2 style={h2Style}>5. Data Security</h2>
      <p style={pStyle}>
        All data transmitted between your device and our servers is encrypted using TLS/HTTPS. Authentication tokens are stored in your device&apos;s secure storage (iOS Keychain / Android Keystore). We use Row Level Security (RLS) policies on our database to ensure users can only access their own data.
      </p>

      <h2 style={h2Style}>6. Data Retention and Deletion</h2>
      <p style={pStyle}>
        We retain your data for as long as your account is active. You can delete your account at any time from <strong>Settings &rarr; Account &rarr; Delete Account</strong>. When you delete your account, all associated data is permanently removed from our systems. Active subscriptions are automatically cancelled.
      </p>

      <h2 style={h2Style}>7. Your Rights</h2>
      <ul style={ulStyle}>
        <li style={liStyle}>Access, correct, or delete your personal data</li>
        <li style={liStyle}>Export your data</li>
        <li style={liStyle}>Opt out of non-essential communications</li>
        <li style={liStyle}>Delete your account entirely</li>
      </ul>
      <p style={pStyle}>
        To exercise any of these rights, contact us at <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a> or use the in-app settings.
      </p>

      <h2 style={h2Style}>8. Children&apos;s Privacy</h2>
      <p style={pStyle}>
        Our Service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such data, we will delete it promptly.
      </p>

      <h2 style={h2Style}>9. Changes to This Policy</h2>
      <p style={pStyle}>
        We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the effective date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
      </p>

      <h2 style={h2Style}>10. Contact Us</h2>
      <p style={pStyle}>
        If you have questions about this Privacy Policy, contact us at <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a>.
      </p>
    </>
  );
}
