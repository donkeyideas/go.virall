import type { Metadata } from 'next';
import { JsonLd, faqPageSchema, breadcrumbSchema } from '../../../lib/seo/json-ld';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.govirall.com';

export const metadata: Metadata = {
  title: 'FAQ - Frequently Asked Questions',
  description:
    'Frequently asked questions about Go Virall. Learn about viral scoring, AI content studio, supported platforms, pricing, and account management.',
  alternates: { canonical: '/faq' },
};

const FAQS = [
  {
    q: 'What is Go Virall?',
    a: 'Go Virall is a social intelligence platform for creators. It combines analytics, an AI content studio, viral scoring, and audience insights into one dashboard \u2014 across Instagram, TikTok, YouTube, X, LinkedIn, Facebook, and Twitch.',
  },
  {
    q: 'Is Go Virall free?',
    a: 'Yes. The free plan includes 1 connected platform, 10 analyses per month, 5 content generations, and 5 AI strategist messages per day. You can upgrade to the Creator plan ($29/mo) for unlimited access.',
  },
  {
    q: 'What platforms do you support?',
    a: 'We support Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook, and Twitch. You can connect all of them from Settings \u2192 Connected Platforms.',
  },
  {
    q: 'How does the Viral Score work?',
    a: 'The Viral Score analyzes your content draft against platform-specific signals like format, length, hook strength, posting time, and audience patterns, then gives it a score from 0\u2013100. Higher scores indicate a greater likelihood of strong performance.',
  },
  {
    q: 'What is the SMO Score?',
    a: 'SMO (Social Media Optimization) Score is a comprehensive health metric that evaluates your overall social media presence across all connected platforms. It looks at profile completeness, posting consistency, engagement rates, audience growth, and content quality.',
  },
  {
    q: 'How does the AI Studio work?',
    a: 'The AI Studio generates content tailored to your brand and niche. It reads your connected profiles, recent posts, and bio to understand your voice, then creates platform-specific scripts, captions, content ideas, and bios.',
  },
  {
    q: 'Do you store my social media passwords?',
    a: 'No. We never ask for or store your social media passwords. We retrieve publicly available data based on the usernames you provide.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Go to Settings \u2192 Billing and click "Manage Subscription" to cancel. Your plan remains active until the end of the current billing period.',
  },
  {
    q: 'Can I delete my account?',
    a: 'Yes. Go to Settings \u2192 Account \u2192 Danger Zone \u2192 Delete Account. This permanently removes all your data. You can also visit govirall.com/delete-account for instructions.',
  },
  {
    q: 'Who provides the AI?',
    a: 'We use multiple AI providers including DeepSeek, OpenAI, Anthropic, and Google. Our system automatically selects the best available provider for each request.',
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(FAQS)} />
      <JsonLd data={breadcrumbSchema([{ name: 'Home', url: BASE }, { name: 'FAQ', url: `${BASE}/faq` }])} />
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: 'clamp(36px, 5vw, 52px)',
          lineHeight: 0.95,
          letterSpacing: '-.03em',
          marginBottom: 40,
        }}
      >
        Frequently Asked <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Questions.</span>
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {FAQS.map((faq, i) => (
          <details
            key={i}
            style={{
              borderTop: i === 0 ? '1.5px solid var(--ink)' : '1px solid var(--rule)',
              padding: '20px 0',
            }}
          >
            <summary
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: '-.01em',
                cursor: 'pointer',
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {faq.q}
              <span style={{ fontSize: 20, fontWeight: 400, flexShrink: 0, marginLeft: 16 }}>+</span>
            </summary>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: '#555', marginTop: 12, paddingRight: 40 }}>
              {faq.a}
            </p>
          </details>
        ))}
        <div style={{ borderTop: '1px solid var(--rule)' }} />
      </div>

      <div style={{ marginTop: 48, padding: 24, border: '1.5px solid var(--ink)', borderRadius: 14, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Still have questions?</p>
        <p style={{ fontSize: 14, color: '#555' }}>
          Reach out at <a href="mailto:info@donkeyideas.com" style={{ color: 'var(--ink)', fontWeight: 600 }}>info@donkeyideas.com</a>
        </p>
      </div>
    </>
  );
}
