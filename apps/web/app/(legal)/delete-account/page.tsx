import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Delete Your Account - Remove Go Virall Data',
  description:
    'Learn how to permanently delete your Go Virall account and all associated data including profiles, analytics, and content.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/delete-account' },
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
const liStyle: React.CSSProperties = { fontSize: 15, lineHeight: 1.7, marginBottom: 8 };

export default function DeleteAccountPage() {
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
        Delete Your <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Account.</span>
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.7, marginTop: 16 }}>
        We&apos;re sorry to see you go. If you&apos;d like to delete your Go Virall account and all associated data, follow the steps below.
      </p>

      <h2 style={h2Style}>How to delete your account</h2>
      <ol style={{ paddingLeft: 20, marginBottom: 12 }}>
        <li style={liStyle}>Log in to your Go Virall account at <Link href="/signin" style={{ color: 'var(--ink)', fontWeight: 600 }}>govirall.com/signin</Link></li>
        <li style={liStyle}>Navigate to <strong>Settings &rarr; Account</strong></li>
        <li style={liStyle}>Scroll to the <strong>Danger Zone</strong> section at the bottom</li>
        <li style={liStyle}>Click <strong>&ldquo;Delete Account&rdquo;</strong> and confirm</li>
      </ol>

      <h2 style={h2Style}>What gets deleted</h2>
      <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
        <li style={liStyle}>Your profile and account information</li>
        <li style={liStyle}>Connected social media accounts and metrics</li>
        <li style={liStyle}>Chat and message history</li>
        <li style={liStyle}>Deals, proposals, and deliverables</li>
        <li style={liStyle}>Scheduled posts and content drafts</li>
        <li style={liStyle}>Billing and subscription data</li>
        <li style={liStyle}>Push notification tokens</li>
        <li style={liStyle}>All other data associated with your account</li>
      </ul>

      <div
        style={{
          marginTop: 24,
          borderRadius: 14,
          border: '1.5px solid var(--ink)',
          padding: 20,
          background: 'rgba(0,0,0,.03)',
        }}
      >
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          <strong>Important:</strong> Account deletion is permanent and cannot be undone. All data is removed immediately upon confirmation. If you have an active subscription, it will be cancelled automatically.
        </p>
      </div>

      <h2 style={h2Style}>Need help?</h2>
      <p style={pStyle}>
        If you&apos;re having trouble deleting your account or have questions, contact us at <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a>.
      </p>
    </>
  );
}
