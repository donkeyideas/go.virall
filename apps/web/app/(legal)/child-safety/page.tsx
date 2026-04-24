import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Child Safety Standards - Go Virall Policies',
  description:
    'Go Virall child safety standards. Our commitment to preventing abuse, protecting minors, and maintaining a safe platform.',
  alternates: { canonical: '/child-safety' },
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

export default function ChildSafetyPage() {
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
        Child Safety <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Standards.</span>
      </h1>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: '.15em', color: '#888', marginBottom: 40 }}>
        EFFECTIVE DATE: APRIL 17, 2026
      </p>

      <h2 style={h2Style}>1. Our Commitment</h2>
      <p style={pStyle}>
        Go Virall (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to providing a safe platform free from child sexual abuse and exploitation (CSAE). We have zero tolerance for any content, behavior, or activity that exploits or endangers minors.
      </p>

      <h2 style={h2Style}>2. Platform Age Requirements</h2>
      <p style={pStyle}>
        Go Virall is designed for professional creators, influencers, and businesses. Our platform is intended for users aged 18 and older. We do not knowingly collect personal information from anyone under the age of 18.
      </p>
      <ul style={ulStyle}>
        <li style={liStyle}>Users must be at least 18 years old to create an account</li>
        <li style={liStyle}>Users must certify they meet the minimum age requirement during registration</li>
        <li style={liStyle}>Accounts found to belong to users under 18 will be immediately suspended and removed</li>
      </ul>

      <h2 style={h2Style}>3. Prohibited Content and Conduct</h2>
      <p style={pStyle}>The following are strictly prohibited and will result in immediate account termination and reporting to authorities:</p>
      <ul style={ulStyle}>
        <li style={liStyle}>Any content that depicts, promotes, or glorifies the sexual exploitation or abuse of minors</li>
        <li style={liStyle}>Sharing, distributing, or soliciting child sexual abuse material (CSAM) in any form</li>
        <li style={liStyle}>Grooming or any attempt to build a relationship with a minor for the purpose of sexual exploitation</li>
        <li style={liStyle}>Sextortion or any attempt to coerce minors through threats of releasing intimate content</li>
        <li style={liStyle}>Trafficking or any facilitation of the trafficking of minors</li>
        <li style={liStyle}>Any content that sexualizes minors, including fictional or AI-generated content</li>
      </ul>

      <h2 style={h2Style}>4. Detection and Prevention</h2>
      <ul style={ulStyle}>
        <li style={liStyle}><strong>Content moderation</strong> &mdash; We use automated systems and manual review processes to identify and remove prohibited content</li>
        <li style={liStyle}><strong>User reporting</strong> &mdash; We provide in-app and web-based reporting tools for flagging content or behavior that may violate our child safety policies</li>
        <li style={liStyle}><strong>Account verification</strong> &mdash; We verify user age during registration to prevent minors from accessing the platform</li>
        <li style={liStyle}><strong>AI content filtering</strong> &mdash; Our AI-powered content generation tools include safety filters that prevent generation of any content involving minors in inappropriate contexts</li>
      </ul>

      <h2 style={h2Style}>5. Reporting Concerns</h2>
      <p style={pStyle}>If you encounter any content or behavior that violates our child safety standards, report it immediately:</p>
      <ul style={ulStyle}>
        <li style={liStyle}><strong>In-app reporting</strong> &mdash; Use the report button available on messages, profiles, and content</li>
        <li style={liStyle}><strong>Email</strong> &mdash; Send a detailed report to <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a></li>
        <li style={liStyle}><strong>General support</strong> &mdash; <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a></li>
      </ul>
      <p style={pStyle}>All reports are treated with the highest priority and confidentiality.</p>

      <h2 style={h2Style}>6. Law Enforcement Cooperation</h2>
      <p style={pStyle}>Go Virall cooperates fully with law enforcement in the investigation and prosecution of CSAE:</p>
      <ul style={ulStyle}>
        <li style={liStyle}>Reporting confirmed CSAM to the <strong>National Center for Missing &amp; Exploited Children (NCMEC)</strong> via the CyberTipline, as required by U.S. federal law</li>
        <li style={liStyle}>Preserving and providing evidence to law enforcement upon valid legal request</li>
        <li style={liStyle}>Cooperating with international law enforcement agencies through appropriate legal channels</li>
        <li style={liStyle}>Maintaining records of reported incidents and actions taken</li>
      </ul>

      <h2 style={h2Style}>7. Enforcement Actions</h2>
      <p style={pStyle}>When a violation is identified or reported, we take the following actions:</p>
      <ul style={ulStyle}>
        <li style={liStyle}>Immediate removal of violating content</li>
        <li style={liStyle}>Permanent account ban</li>
        <li style={liStyle}>IP and device-level blocking where possible</li>
        <li style={liStyle}>Referral to law enforcement and NCMEC as applicable</li>
      </ul>

      <h2 style={h2Style}>8. Contact</h2>
      <p style={pStyle}>
        For child safety concerns: <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a><br />
        For general inquiries: <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a>
      </p>
    </>
  );
}
