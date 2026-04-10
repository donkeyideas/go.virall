import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MarketingNav } from "./Nav";
import { MarketingFooter } from "./Footer";

const C = {
  bg: "#0B1928",
  surface: "#0D1E35",
  card: "#112240",
  cardElevated: "#1A2F50",
  primary: "#FFB84D",
  secondary: "#FFD280",
  purple: "#4B9CD3",
  text: "#E8F0FA",
  textSecondary: "#8BACC8",
  border: "rgba(75,156,211,0.12)",
  success: "#4ADE80",
} as const;

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

interface Feature {
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface SeoLandingPageProps {
  badge: string;
  h1: string;
  h1Highlight: string;
  subtitle: string;
  introParagraphs: string[];
  features: Feature[];
  comparisonTitle?: string;
  comparisonRows?: { feature: string; gv: boolean | string; others: string }[];
  faq: FaqItem[];
  ctaHeading: string;
  ctaHighlight: string;
  ctaSub: string;
  breadcrumbName: string;
  breadcrumbUrl: string;
}

export function SeoLandingPage(props: SeoLandingPageProps) {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://govirall.com" },
      { "@type": "ListItem", position: 2, name: props.breadcrumbName, item: `https://govirall.com${props.breadcrumbUrl}` },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: props.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main style={{ fontFamily: font, background: C.bg, color: C.text, lineHeight: 1.6, overflowX: "hidden", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <MarketingNav />

      {/* Hero */}
      <section style={{ padding: "160px 40px 80px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-block", color: C.primary, fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 32 }}>
          {props.badge}
        </div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 800, lineHeight: 1, letterSpacing: -2, textTransform: "uppercase", marginBottom: 24 }}>
          {props.h1} <span style={{ color: C.primary }}>{props.h1Highlight}</span>
        </h1>
        <p style={{ fontSize: 18, color: C.textSecondary, maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.7 }}>
          {props.subtitle}
        </p>
        <Link
          href="/signup"
          style={{ background: C.primary, color: C.bg, padding: "16px 40px", borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          Start Free Trial <ArrowRight size={18} />
        </Link>
        <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 16 }}>No credit card required · Free plan available forever</p>
      </section>

      {/* Intro content */}
      <section style={{ padding: "60px 40px", maxWidth: 800, margin: "0 auto" }}>
        {props.introParagraphs.map((p, i) => (
          <p key={i} style={{ fontSize: 17, color: C.textSecondary, lineHeight: 1.8, marginBottom: 20 }} dangerouslySetInnerHTML={{ __html: p }} />
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: "80px 40px", maxWidth: 1080, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, textAlign: "center", letterSpacing: -1.5, textTransform: "uppercase", marginBottom: 48 }}>
          Key Features
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {props.features.map((f) => (
            <article key={f.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: C.text }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>{f.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      {props.comparisonRows && props.comparisonRows.length > 0 && (
        <section style={{ padding: "80px 40px", maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, textAlign: "center", letterSpacing: -1, textTransform: "uppercase", marginBottom: 40 }}>
            {props.comparisonTitle || "How We Compare"}
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ padding: "14px 16px", textAlign: "left", color: C.textSecondary, fontWeight: 600, borderBottom: `2px solid ${C.border}` }}>Feature</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", color: C.primary, fontWeight: 800, borderBottom: `2px solid ${C.primary}`, background: "rgba(255,184,77,0.06)" }}>Go Virall</th>
                  <th style={{ padding: "14px 16px", textAlign: "center", color: C.textSecondary, fontWeight: 600, borderBottom: `2px solid ${C.border}` }}>Others</th>
                </tr>
              </thead>
              <tbody>
                {props.comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <td style={{ padding: "12px 16px", color: C.text, borderBottom: `1px solid ${C.border}` }}>{row.feature}</td>
                    <td style={{ padding: "12px 16px", textAlign: "center", borderBottom: `1px solid ${C.border}`, background: "rgba(255,184,77,0.06)" }}>
                      {typeof row.gv === "boolean" ? (
                        row.gv ? <Check size={18} style={{ color: C.success, margin: "0 auto" }} /> : <span style={{ color: C.textSecondary }}>—</span>
                      ) : (
                        <span style={{ fontWeight: 700, color: C.primary }}>{row.gv}</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", color: C.textSecondary, borderBottom: `1px solid ${C.border}` }}>{row.others}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section style={{ padding: "80px 40px", maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, textAlign: "center", letterSpacing: -1, textTransform: "uppercase", marginBottom: 40 }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {props.faq.map((item) => (
            <details key={item.question} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <summary style={{ padding: "20px 24px", fontSize: 16, fontWeight: 700, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{item.question}</h3>
                <span style={{ color: C.primary, fontSize: 20, fontWeight: 300, flexShrink: 0, marginLeft: 16 }}>+</span>
              </summary>
              <p style={{ padding: "0 24px 20px", fontSize: 15, color: C.textSecondary, lineHeight: 1.8, margin: 0 }}>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", background: `linear-gradient(135deg, ${C.card}, ${C.cardElevated})`, border: "1px solid rgba(75,156,211,0.2)", borderRadius: 24, padding: "64px 48px", position: "relative", overflow: "hidden" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, textTransform: "uppercase", letterSpacing: -1, marginBottom: 16 }}>
            {props.ctaHeading} <span style={{ color: C.primary }}>{props.ctaHighlight}</span>
          </h2>
          <p style={{ fontSize: 17, color: C.textSecondary, marginBottom: 32 }}>{props.ctaSub}</p>
          <Link
            href="/signup"
            style={{ background: C.primary, color: C.bg, padding: "16px 40px", borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <MarketingFooter content={{ description: "The social intelligence platform that transforms creators into cultural forces. Data-driven strategies, powerful insights.", copyright: "© 2026 Go Virall. All rights reserved." }} />
    </main>
  );
}
