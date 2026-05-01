import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicPlans } from '../../../lib/actions/admin/plans';
import { CustomPlanCard } from '../../../components/marketing/CustomPlanCard';

export const metadata: Metadata = {
  title: 'Fintech Creator Analytics Free Trial | Go Virall Pricing',
  description:
    'Start your fintech creator analytics free trial today. Buy the social intelligence platform trusted by creators. Viral scoring, AI Studio, cross-platform metrics, and audience intel. No credit card required.',
  keywords: [
    'fintech creator analytics free trial',
    'buy social intelligence platform',
    'best fintech social media platform',
    'fintech creator platform pricing',
    'social media analytics pricing',
    'creator tools pricing',
  ],
};

export default async function PricingPage() {
  const allPlans = await getPublicPlans();
  const plans = allPlans.filter((p) => p.tier === 'free' || p.tier === 'creator');

  return (
    <main>
      {/* Hero */}
      <section style={{ padding: '100px 28px 40px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 20,
          }}
        >
          PRICING
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(48px, 8vw, 96px)',
            lineHeight: 0.9,
            letterSpacing: '-.03em',
            maxWidth: 700,
            margin: '0 auto',
          }}
        >
          Invest in your{' '}
          <span style={{ fontWeight: 900, fontStyle: 'normal' }}>growth.</span>
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
          Start your fintech creator analytics free trial. No contracts, no credit card. Scale when you&apos;re ready.
        </p>
      </section>

      {/* Plans */}
      <section style={{ padding: '40px 28px 80px' }}>
        <div
          className="grid-pricing"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            maxWidth: 1080,
            margin: '0 auto',
          }}
        >
          {plans.map((plan, i) => (
            <div
              key={plan.tier}
              style={{
                border: '1.5px solid var(--ink)',
                borderRadius: 20,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                background: i === 1 ? 'var(--ink)' : 'var(--paper)',
                color: i === 1 ? 'var(--paper)' : 'var(--ink)',
                position: 'relative',
                minHeight: 440,
                ...(i === 1 ? { transform: 'translateY(-14px)' } : {}),
              }}
            >
              {i === 1 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -11,
                    left: 24,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: '.15em',
                    padding: '4px 10px',
                    background: 'var(--lime)',
                    color: 'var(--ink)',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  MOST LOVED
                </span>
              )}
              <div>
                <h5
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 900,
                    fontSize: 32,
                    letterSpacing: '-.02em',
                  }}
                >
                  {plan.name}
                </h5>
                <div
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 900,
                    fontStyle: 'italic',
                    fontSize: 72,
                    letterSpacing: '-.04em',
                    lineHeight: 0.9,
                  }}
                >
                  ${(plan.priceMonthly / 100).toFixed(0)}
                  <sub
                    style={{
                      fontSize: 14,
                      fontStyle: 'normal',
                      fontWeight: 500,
                      opacity: 0.7,
                      verticalAlign: 'top',
                    }}
                  >
                    /mo
                  </sub>
                </div>
              </div>
              <p
                style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.8 }}
                dangerouslySetInnerHTML={{ __html: plan.tagline }}
              />
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  fontSize: 13,
                  paddingTop: 16,
                  borderTop: '1px solid currentColor',
                }}
              >
                {plan.features.map((f: string) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      lineHeight: 1.4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                      }}
                    >
                      &rarr;
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 'auto' }}>
                <Link
                  href="/signup"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    border: i === 1 ? '1.5px solid var(--lime)' : '1.5px solid var(--ink)',
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: 13,
                    background: i === 1 ? 'var(--lime)' : 'transparent',
                    color: i === 1 ? 'var(--ink)' : 'var(--ink)',
                    textDecoration: 'none',
                  }}
                >
                  {plan.priceMonthly === 0 ? 'Start free \u2192' : 'Start trial \u2192'}
                </Link>
              </div>
            </div>
          ))}
          <CustomPlanCard />
        </div>
      </section>

      {/* FAQ-style section */}
      <section
        style={{
          padding: '60px 28px',
          borderTop: '1.5px solid var(--ink)',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: '-.02em',
            marginBottom: 28,
          }}
        >
          Common questions
        </h3>
        {[
          {
            q: 'Can I start for free?',
            a: 'Yes. The fintech creator analytics free trial includes viral scoring, AI Studio, cross-platform creator metrics, and basic audience insights. No credit card required.',
          },
          {
            q: 'Can I cancel anytime?',
            a: 'Absolutely. No contracts, no lock-in. Cancel from your settings and keep access until the end of your billing period.',
          },
          {
            q: 'What platforms are supported?',
            a: 'Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook, and Twitch.',
          },
        ].map((item) => (
          <div
            key={item.q}
            style={{
              padding: '20px 0',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <h4
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: 16,
                marginBottom: 6,
              }}
            >
              {item.q}
            </h4>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>
              {item.a}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
