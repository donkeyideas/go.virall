import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - Go Virall Platform Rules',
  description:
    'Go Virall terms of service. Rules, guidelines, and policies for using our social intelligence platform for content creators.',
  alternates: { canonical: '/terms' },
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

export default function TermsPage() {
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
        Terms of <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Service.</span>
      </h1>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '.15em', color: '#888', marginBottom: 40 }}>
        EFFECTIVE DATE: APRIL 16, 2026
      </p>

      <h2 style={h2Style}>1. Acceptance of Terms</h2>
      <p style={pStyle}>
        By accessing or using the Go Virall website and mobile application (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service. Go Virall (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) reserves the right to update these Terms at any time.
      </p>

      <h2 style={h2Style}>2. Eligibility</h2>
      <p style={pStyle}>
        You must be at least 13 years old to use the Service. By creating an account, you represent that you meet this age requirement and that the information you provide is accurate and complete.
      </p>

      <h2 style={h2Style}>3. Account Responsibilities</h2>
      <ul style={ulStyle}>
        <li style={liStyle}>You are responsible for maintaining the security of your account credentials</li>
        <li style={liStyle}>You are responsible for all activity that occurs under your account</li>
        <li style={liStyle}>You must notify us immediately of any unauthorized access at <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a></li>
        <li style={liStyle}>One person or entity per account &mdash; sharing accounts is not permitted</li>
      </ul>

      <h2 style={h2Style}>4. Acceptable Use</h2>
      <p style={pStyle}>You agree not to:</p>
      <ul style={ulStyle}>
        <li style={liStyle}>Use the Service for any unlawful purpose</li>
        <li style={liStyle}>Impersonate another person or entity</li>
        <li style={liStyle}>Submit false, misleading, or fraudulent information (including fabricated social media metrics)</li>
        <li style={liStyle}>Attempt to gain unauthorized access to any part of the Service</li>
        <li style={liStyle}>Scrape, crawl, or use automated tools to extract data from the Service beyond what is provided through your account</li>
        <li style={liStyle}>Interfere with or disrupt the integrity or performance of the Service</li>
        <li style={liStyle}>Use the Service to send spam or unsolicited communications</li>
      </ul>

      <h2 style={h2Style}>5. Social Media Data</h2>
      <p style={pStyle}>
        Go Virall retrieves publicly available data from social media platforms (Instagram, TikTok, YouTube, X, LinkedIn, Facebook, Twitch) based on the handles you provide. We do not access your private social media accounts or store your social media login credentials. You represent that you have the right to provide the social media handles you connect and that those accounts belong to you or your organization.
      </p>

      <h2 style={h2Style}>6. Subscriptions and Payments</h2>
      <ul style={ulStyle}>
        <li style={liStyle}>The Service offers free and paid subscription plans</li>
        <li style={liStyle}>Payments are processed securely by Stripe &mdash; we never store your payment card information</li>
        <li style={liStyle}>Paid subscriptions renew automatically unless cancelled before the renewal date</li>
        <li style={liStyle}>You can manage or cancel your subscription from Settings &rarr; Billing</li>
        <li style={liStyle}>Refunds are handled on a case-by-case basis &mdash; contact us at <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a></li>
      </ul>

      <h2 style={h2Style}>7. Intellectual Property</h2>
      <p style={pStyle}>
        The Service, including its design, features, code, and branding, is owned by Go Virall and protected by intellectual property laws. You retain ownership of any content you create or upload through the Service. By uploading content, you grant us a limited license to store, display, and process it as necessary to provide the Service.
      </p>

      <h2 style={h2Style}>8. AI-Generated Content</h2>
      <p style={pStyle}>
        The Service includes AI-powered features such as content suggestions, analytics insights, and a chat assistant. AI-generated content is provided &ldquo;as is&rdquo; for informational purposes. You are solely responsible for reviewing and approving any AI-generated content before publishing it. We make no guarantees about the accuracy or suitability of AI outputs.
      </p>

      <h2 style={h2Style}>9. Deals and Payments Between Users</h2>
      <p style={pStyle}>
        Go Virall facilitates connections and deal management between creators and brands. We are not a party to any agreement between users. We provide tools for tracking deliverables and processing payments via Stripe Connect, but we are not responsible for the performance or fulfillment of any deal between users.
      </p>

      <h2 style={h2Style}>10. Termination</h2>
      <p style={pStyle}>
        You may delete your account at any time from Settings &rarr; Account or by visiting our <Link href="/delete-account" style={{ color: 'var(--ink)', fontWeight: 600 }}>account deletion page</Link>. We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice. Upon termination, your data will be permanently deleted in accordance with our <Link href="/privacy" style={{ color: 'var(--ink)', fontWeight: 600 }}>Privacy Policy</Link>.
      </p>

      <h2 style={h2Style}>11. Disclaimers</h2>
      <p style={pStyle}>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that social media metrics will be 100% accurate. Social media data is sourced from public profiles and may be subject to delays or discrepancies.
      </p>

      <h2 style={h2Style}>12. Limitation of Liability</h2>
      <p style={pStyle}>
        To the maximum extent permitted by law, Go Virall shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to lost revenue, lost data, or business interruption.
      </p>

      <h2 style={h2Style}>13. Contact Us</h2>
      <p style={pStyle}>
        If you have questions about these Terms, contact us at <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a>.
      </p>
    </>
  );
}
