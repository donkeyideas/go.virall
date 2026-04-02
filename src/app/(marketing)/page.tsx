import Link from "next/link";
import { ArrowRight, BarChart3, Sun, Users, CreditCard, CheckCircle, Activity, Check, Shield, Lock, Eye, Clock } from "lucide-react";
import { JsonLd } from "../../components/marketing/JsonLd";
import { MarketingNav } from "../../components/marketing/Nav";
import { MarketingFooter } from "../../components/marketing/Footer";
import { getHomepageContent } from "@/lib/dal/public";
import { HOMEPAGE_DEFAULTS } from "@/lib/content/defaults";
import type {
  HeroContent,
  TrustSignalsContent,
  AboutContent,
  PlatformsContent,
  HowItWorksContent,
  FeaturesContent,
  TestimonialsContent,
  PricingContent,
  FaqContent,
  CtaContent,
  FooterContent,
} from "@/types/site-content";

/* ─── Color constants ─── */
const C = {
  bg: "#1A1035",
  surface: "#221548",
  card: "#2A1B54",
  cardElevated: "#33225E",
  primary: "#FFB84D",
  secondary: "#FFD280",
  purple: "#8B5CF6",
  text: "#F0ECF8",
  textSecondary: "#8A7AAE",
  border: "rgba(139,92,246,0.12)",
  borderGold: "rgba(255,184,77,0.15)",
  success: "#4ADE80",
} as const;

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/* ─── Icon map for dynamic feature icons ─── */
const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  BarChart3, Sun, Users, CreditCard, CheckCircle, Activity,
  Eye, Lock, Clock, Shield,
};

/* ─── Platform SVG Icons ─── */
function InstagramIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}
function TikTokIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48 6.3 6.3 0 001.86-4.49V8.73a8.19 8.19 0 004.72 1.49v-3.4a4.85 4.85 0 01-1-.13z" />
    </svg>
  );
}
function YouTubeIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function XIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function LinkedInIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/* ─── Static data (not editable from CMS) ─── */
const PLATFORMS = [
  { name: "Instagram", icon: InstagramIcon, bg: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" },
  { name: "TikTok", icon: TikTokIcon, bg: "#000" },
  { name: "YouTube", icon: YouTubeIcon, bg: "#FF0000" },
  { name: "X / Twitter", icon: XIcon, bg: "#000" },
  { name: "LinkedIn", icon: LinkedInIcon, bg: "#0A66C2" },
];

/* ─── Content helper ─── */
function getSection<T>(contentMap: Map<string, Record<string, unknown>>, section: string): T {
  const dbContent = contentMap.get(section);
  if (dbContent) return dbContent as T;
  const fallback = HOMEPAGE_DEFAULTS[section as keyof typeof HOMEPAGE_DEFAULTS];
  return (fallback?.content ?? {}) as T;
}

/* ─── Page ─── */
export default async function HomePage() {
  const dbContent = await getHomepageContent();
  const contentMap = new Map<string, Record<string, unknown>>();
  for (const row of dbContent) {
    contentMap.set(row.section, row.content);
  }

  const hero = getSection<HeroContent>(contentMap, "hero");
  const trustSignals = getSection<TrustSignalsContent>(contentMap, "trust_signals");
  const aboutContent = getSection<AboutContent>(contentMap, "about");
  const platformsContent = getSection<PlatformsContent>(contentMap, "platforms");
  const howItWorks = getSection<HowItWorksContent>(contentMap, "how_it_works");
  const featuresContent = getSection<FeaturesContent>(contentMap, "features");
  const testimonialsContent = getSection<TestimonialsContent>(contentMap, "testimonials");
  const pricingContent = getSection<PricingContent>(contentMap, "pricing");
  const faqContent = getSection<FaqContent>(contentMap, "faq");
  const ctaContent = getSection<CtaContent>(contentMap, "cta");
  const footerContent = getSection<FooterContent>(contentMap, "footer");

  return (
    <main
      style={{
        fontFamily: font,
        background: C.bg,
        color: C.text,
        lineHeight: 1.6,
        overflowX: "hidden",
        minHeight: "100vh",
      }}
    >
      <JsonLd faqItems={faqContent.items} />
      <MarketingNav />

      {/* ═══ HERO ═══ */}
      <section
        id="hero"
        aria-label="Go Virall hero"
        style={{
          padding: "160px 40px 80px",
          maxWidth: 1280,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: C.purple,
            padding: "8px 20px",
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          {hero.badge}
        </div>
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: -3,
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          {hero.heading_line1}
          <br />
          <span style={{ color: C.primary }}>{hero.heading_line2}</span>
        </h1>
        <p
          style={{
            fontSize: 20,
            color: C.textSecondary,
            maxWidth: 560,
            margin: "0 auto 48px",
            lineHeight: 1.7,
            fontWeight: 400,
          }}
        >
          {hero.subheading}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signup"
            style={{
              background: C.primary,
              color: C.bg,
              padding: "16px 40px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {hero.cta_text} <ArrowRight size={18} />
          </Link>
        </div>
        <p style={{ fontSize: 14, color: C.textSecondary, marginTop: 16 }}>
          {hero.cta_subtitle}
        </p>
      </section>

      {/* ═══ TRUST BAR ═══ */}
      <section aria-label="Trust signals" style={{ maxWidth: 900, margin: "0 auto", padding: "0 40px 60px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
          {trustSignals.items.map((item) => {
            const IconComp = ICON_MAP[item.icon];
            return (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 8, color: C.textSecondary, fontSize: 13, fontWeight: 500 }}>
                {IconComp && <IconComp size={16} />}
                {item.text}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ PHONE SHOWCASE ═══ */}
      <PhoneShowcase />

      {/* ═══ WHAT IS GO VIRALL? — GEO definition block ═══ */}
      <section id="about" aria-label="About Go Virall" style={{ padding: "80px 40px", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: -1, marginBottom: 24, textTransform: "uppercase" }}>
          {aboutContent.title_prefix} <span style={{ color: C.primary }}>{aboutContent.title_highlight}</span>?
        </h2>
        <p style={{ fontSize: 18, color: C.textSecondary, lineHeight: 1.8 }}>
          {aboutContent.body}
        </p>
      </section>

      {/* ═══ CONNECT PLATFORMS ═══ */}
      <section id="platforms" aria-label="Supported platforms" style={{ padding: "100px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader
          label={platformsContent.label}
          title={<>{platformsContent.title_line1}<br />{platformsContent.title_line2}</>}
          sub={platformsContent.subtitle}
        />
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 32 }}>
          {PLATFORMS.map((p) => (
            <div
              key={p.name}
              className="lp-card-hover"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "36px 32px",
                width: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                transition: "all 0.3s",
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: p.bg,
                }}
              >
                <p.icon size={40} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>
                {p.name}
              </div>
              <Link
                href="/signup"
                className="lp-connect-hover"
                style={{
                  background: "transparent",
                  color: C.primary,
                  padding: "10px 28px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  border: `2px solid ${C.primary}`,
                  transition: "all 0.3s",
                }}
              >
                Connect
              </Link>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 14, color: C.textSecondary, textAlign: "center", letterSpacing: 0.2 }}>
          {platformsContent.footnote}
        </p>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" aria-label="How Go Virall works" style={{ padding: "100px 40px", maxWidth: 1080, margin: "0 auto" }}>
        <SectionHeader
          label={howItWorks.label}
          title={<>{howItWorks.title_line1}<br />{howItWorks.title_line2}</>}
          sub={howItWorks.subtitle}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32 }}>
          {howItWorks.steps.map((s, i) => (
            <article key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24, fontWeight: 800, color: C.bg }}>{i + 1}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, letterSpacing: -0.5 }}>{s.title}</h3>
              <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7 }}>{s.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" aria-label="Platform features" style={{ padding: "100px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader
          label={featuresContent.label}
          title={<>{featuresContent.title_line1}<br />{featuresContent.title_line2}</>}
          sub={featuresContent.subtitle}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}
        >
          {featuresContent.items.map((f) => {
            const IconComp = ICON_MAP[f.icon] || BarChart3;
            return (
              <div
                key={f.title}
                className="lp-card-hover"
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: 36,
                  transition: "all 0.3s",
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: "rgba(255,184,77,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    color: C.primary,
                  }}
                >
                  <IconComp size={24} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, letterSpacing: -0.5 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7 }}>
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" aria-label="Creator testimonials" style={{ padding: "100px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader
          label={testimonialsContent.label}
          title={<>{testimonialsContent.title_line1}<br />{testimonialsContent.title_line2}</>}
          sub={testimonialsContent.subtitle}
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {testimonialsContent.items.map((t) => (
            <article key={t.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 36 }}>
              <div style={{ fontSize: 32, color: C.primary, marginBottom: 16, lineHeight: 1 }}>&ldquo;</div>
              <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.7, marginBottom: 24 }}>{t.quote}</p>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: C.textSecondary }}>{t.handle} &middot; {t.platform}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" aria-label="Pricing plans" style={{ padding: "100px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <SectionHeader
          label={pricingContent.label}
          title={<>{pricingContent.title_line1}<br />{pricingContent.title_line2}</>}
          sub={pricingContent.subtitle}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
            maxWidth: 1080,
            margin: "0 auto",
          }}
        >
          {pricingContent.tiers.map((plan) => (
            <div
              key={plan.tier}
              className="lp-card-hover"
              style={{
                background: plan.is_recommended ? C.cardElevated : C.card,
                border: plan.is_recommended
                  ? `2px solid ${C.primary}`
                  : `1px solid ${C.border}`,
                borderRadius: 20,
                padding: 40,
                position: "relative",
                transition: "all 0.3s",
              }}
            >
              {plan.is_recommended && (
                <div
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: C.primary,
                    color: C.bg,
                    padding: "4px 20px",
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 1,
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.textSecondary,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                {plan.tier}
              </div>
              <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, marginBottom: 4 }}>
                {plan.price}
                <span style={{ fontSize: 16, color: C.textSecondary, fontWeight: 500 }}>/mo</span>
              </div>
              <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 28, lineHeight: 1.6 }}>
                {plan.description}
              </p>
              <ul style={{ listStyle: "none", marginBottom: 32, padding: 0 }}>
                {plan.features.map((feat) => (
                  <li
                    key={feat}
                    style={{
                      padding: "10px 0",
                      fontSize: 14,
                      color: C.textSecondary,
                      borderBottom: "1px solid rgba(139,92,246,0.08)",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Check size={18} style={{ flexShrink: 0, color: C.primary }} />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                style={{
                  display: "block",
                  width: "100%",
                  padding: 16,
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  textAlign: "center",
                  textDecoration: "none",
                  border: "none",
                  boxSizing: "border-box",
                  ...(plan.is_primary
                    ? { background: C.primary, color: C.bg }
                    : {
                        background: "transparent",
                        color: C.text,
                        border: "2px solid rgba(139,92,246,0.2)",
                      }),
                }}
              >
                {plan.cta_text}
              </Link>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: C.textSecondary }}>
          {pricingContent.footnote}
        </p>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" aria-label="Frequently asked questions" style={{ padding: "100px 40px", maxWidth: 800, margin: "0 auto" }}>
        <SectionHeader
          label={faqContent.label}
          title={<>{faqContent.title_line1}<br />{faqContent.title_line2}</>}
          sub={faqContent.subtitle}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqContent.items.map((item) => (
            <details
              key={item.question}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <summary
                style={{
                  padding: "20px 24px",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: "pointer",
                  listStyle: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{item.question}</h3>
                <span style={{ color: C.primary, fontSize: 20, fontWeight: 300, flexShrink: 0, marginLeft: 16 }}>+</span>
              </summary>
              <p style={{ padding: "0 24px 20px", fontSize: 15, color: C.textSecondary, lineHeight: 1.8, margin: 0 }}>
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section id="cta" aria-label="Call to action" style={{ padding: "100px 40px", textAlign: "center" }}>
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            background: `linear-gradient(135deg, ${C.card}, ${C.cardElevated})`,
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: 24,
            padding: "80px 60px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              background: "radial-gradient(circle,rgba(255,184,77,0.08),transparent)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
          <h2
            style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: -1.5,
              marginBottom: 16,
              position: "relative",
            }}
          >
            {ctaContent.heading_prefix} <span style={{ color: C.primary }}>{ctaContent.heading_highlight}</span>?
          </h2>
          <p style={{ fontSize: 18, color: C.textSecondary, marginBottom: 40, position: "relative" }}>
            {ctaContent.subheading}
          </p>
          <Link
            href="/signup"
            style={{
              background: C.primary,
              color: C.bg,
              padding: "16px 40px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              position: "relative",
            }}
          >
            {ctaContent.button_text}
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <MarketingFooter content={footerContent} />
    </main>
  );
}

/* ─── Section Header ─── */
function SectionHeader({
  label,
  title,
  sub,
}: {
  label: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.primary,
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        {label}
      </div>
      <h2
        style={{
          fontSize: "clamp(36px, 5vw, 56px)",
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: -2,
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: 18,
          color: C.textSecondary,
          textAlign: "center",
          maxWidth: 560,
          margin: "0 auto 64px",
        }}
      >
        {sub}
      </p>
    </>
  );
}

/* ─── Phone Showcase ─── */
function PhoneShowcase() {
  return (
    <section style={{ padding: "20px 40px 100px", maxWidth: 1280, margin: "0 auto", position: "relative" }}>
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600,
          height: 600,
          background: "radial-gradient(circle,rgba(255,184,77,0.06),rgba(139,92,246,0.04),transparent)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div className="lp-phones-container">
        {/* Phone 1: Dashboard */}
        <div className="lp-phone lp-phone-1">
          <PhoneFrame>
            <div style={screenHeaderStyle}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.primary }}>Go Virall</div>
              <Avatar />
            </div>
            <div style={{ padding: "14px 18px", fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }}>
              Good morning, <span style={{ color: C.primary }}>Taylor</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 14px 10px" }}>
              {[
                { label: "Followers", val: "148.2K", change: "+12.4% this week" },
                { label: "Engagement", val: "8.7%", change: "+3.2% this week" },
                { label: "Impressions", val: "2.4M", change: "+18.1% this month" },
                { label: "Revenue", val: "$12.8K", change: "+9.6% this month" },
              ].map((m) => (
                <div key={m.label} style={{ background: C.card, borderRadius: 14, padding: 14 }}>
                  <div style={{ fontSize: 9, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>{m.val}</div>
                  <div style={{ fontSize: 9, color: C.success, marginTop: 2, fontWeight: 600 }}>{m.change}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Growth Trend</div>
                <div style={{ fontSize: 10, color: C.primary, fontWeight: 600 }}>30 Days</div>
              </div>
              <div style={{ height: 100, background: C.card, borderRadius: 12, overflow: "hidden", padding: 12 }}>
                <svg width="100%" height="100%" viewBox="0 0 260 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lgd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFB84D" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#FFB84D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d="M0,65 Q20,60 40,55 T80,45 T120,35 T160,30 T200,20 T240,12 L260,8 L260,80 L0,80 Z" fill="url(#lgd)" />
                  <path d="M0,65 Q20,60 40,55 T80,45 T120,35 T160,30 T200,20 T240,12 L260,8" fill="none" stroke="#FFB84D" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="260" cy="8" r="4" fill="#FFB84D" />
                </svg>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", padding: "12px 0 4px", borderTop: "1px solid rgba(139,92,246,0.1)", marginTop: 8 }}>
              {["Home", "Analytics", "Create", "Chat"].map((n, i) => (
                <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 8, color: i === 0 ? C.primary : C.textSecondary, fontWeight: 600 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {i === 0 && <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />}
                    {i === 1 && <path d="M12 20V10M18 20V4M6 20v-4" />}
                    {i === 2 && <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>}
                    {i === 3 && <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />}
                  </svg>
                  {n}
                </div>
              ))}
            </div>
          </PhoneFrame>
        </div>

        {/* Phone 2: Analytics */}
        <div className="lp-phone lp-phone-2">
          <PhoneFrame>
            <div style={screenHeaderStyle}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.primary }}>Analytics</div>
              <Avatar />
            </div>
            <div style={{ display: "flex", gap: 0, padding: "0 14px", marginTop: 4 }}>
              {["Overview", "Content", "Audience"].map((tab, i) => (
                <div
                  key={tab}
                  style={{
                    padding: "10px 14px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: i === 0 ? C.primary : C.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    position: "relative",
                    borderBottom: i === 0 ? `2px solid ${C.primary}` : "none",
                  }}
                >
                  {tab}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "12px 14px" }}>
              {[
                { num: "94", label: "Viral Score" },
                { num: "2.1M", label: "Total Reach" },
                { num: "847", label: "Shares" },
              ].map((s) => (
                <div key={s.label} style={{ background: C.card, borderRadius: 12, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.primary }}>{s.num}</div>
                  <div style={{ fontSize: 8, color: C.textSecondary, textTransform: "uppercase", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, padding: "14px 18px 10px", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Top Performing
            </div>
            <div style={{ padding: "0 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(139,92,246,0.1)", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: C.textSecondary, textTransform: "uppercase", fontWeight: 700 }}>Content</span>
                <span style={{ fontSize: 9, color: C.textSecondary, textTransform: "uppercase", fontWeight: 700 }}>Views</span>
              </div>
              {[
                { rank: 1, name: "Morning Routine Reel", val: "142K" },
                { rank: 2, name: "Product Review #47", val: "98K" },
                { rank: 3, name: "Day in My Life Vlog", val: "87K" },
                { rank: 4, name: "Editing Tutorial", val: "64K" },
              ].map((r) => (
                <div key={r.rank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(139,92,246,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 6, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: C.primary }}>{r.rank}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.primary }}>{r.val}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 800, padding: "8px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>Platform Split</div>
              {[
                { name: "Instagram", pct: 56, color: "#E1306C", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z" fill="#E1306C"/><path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8z" fill="#E1306C"/><circle cx="18.406" cy="5.594" r="1.44" fill="#E1306C"/></svg> },
                { name: "TikTok", pct: 28, color: "#fff", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.84a4.84 4.84 0 01-1-.15z" fill="#fff"/></svg> },
                { name: "YouTube", pct: 16, color: "#FF0000", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/></svg> },
              ].map((p) => (
                <div key={p.name} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                      {p.icon}
                      {p.name}
                    </span>
                    <span style={{ color: p.color, fontWeight: 700 }}>{p.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "rgba(139,92,246,0.12)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, background: p.color, width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </PhoneFrame>
        </div>

        {/* Phone 3: Smart Chat */}
        <div className="lp-phone lp-phone-3">
          <PhoneFrame screenStyle={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg,${C.primary},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sun size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Smart Strategist</div>
                <div style={{ fontSize: 10, color: C.success, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success, display: "inline-block" }} />
                  Online
                </div>
              </div>
            </div>
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              <ChatBubble ai>
                Hi Taylor! I have analyzed your last 30 days of content. Here are my top recommendations:
              </ChatBubble>
              <ChatBubble ai>
                <strong>1.</strong> Post between 5-7PM EST for max reach<br />
                <strong>2.</strong> Reels under 15s get 3.4x more shares<br />
                <strong>3.</strong> Your audience loves tutorial content
              </ChatBubble>
              <ChatBubble>
                Generate 3 content ideas for this week
              </ChatBubble>
              <ChatBubble ai>
                Here are 3 ideas optimized for your audience:<br /><br />
                <strong>Idea 1:</strong> &ldquo;5 Tools I Cannot Live Without&rdquo; &mdash; predicted viral score: 87<br /><br />
                <strong>Idea 2:</strong> Behind-the-scenes of your editing process &mdash; score: 82<br /><br />
                <strong>Idea 3:</strong> Quick tip carousel on lighting &mdash; score: 79
              </ChatBubble>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "4px 0" }}>
                {["Write captions", "Best hashtags", "Schedule posts"].map((s) => (
                  <div key={s} style={{ padding: "6px 12px", borderRadius: 100, fontSize: 10, background: "rgba(255,184,77,0.1)", color: C.primary, border: `1px solid ${C.borderGold}`, fontWeight: 600 }}>{s}</div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", background: C.card, borderRadius: 16, borderBottomLeftRadius: 4, width: "fit-content" }}>
                <span className="lp-dot" style={{ animationDelay: "0s" }} />
                <span className="lp-dot" style={{ animationDelay: "0.2s" }} />
                <span className="lp-dot" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 14px", borderTop: "1px solid rgba(139,92,246,0.1)" }}>
              <div style={{ flex: 1, background: C.card, border: "1px solid rgba(139,92,246,0.15)", borderRadius: 22, padding: "10px 16px", fontSize: 11, color: C.textSecondary }}>
                Ask your strategist...
              </div>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill={C.bg} stroke="none" width="16" height="16">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                </svg>
              </div>
            </div>
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

/* ─── Phone Frame ─── */
const screenHeaderStyle: React.CSSProperties = {
  padding: "16px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottom: "1px solid rgba(139,92,246,0.1)",
};

function PhoneFrame({
  children,
  screenStyle,
}: {
  children: React.ReactNode;
  screenStyle?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#0A0618",
        borderRadius: 40,
        border: "3px solid rgba(139,92,246,0.3)",
        padding: 14,
        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div
        style={{
          width: 110,
          height: 30,
          background: "#0A0618",
          borderRadius: "0 0 18px 18px",
          margin: "0 auto 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(139,92,246,0.2)" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(139,92,246,0.35)", border: "1px solid rgba(139,92,246,0.2)" }} />
      </div>
      <div
        style={{
          background: C.bg,
          borderRadius: 28,
          overflow: "hidden",
          minHeight: 540,
          ...screenStyle,
        }}
      >
        {children}
      </div>
      <div
        style={{
          width: 120,
          height: 4,
          background: "rgba(240,236,248,0.15)",
          borderRadius: 4,
          margin: "10px auto 4px",
        }}
      />
    </div>
  );
}

function Avatar() {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        background: `linear-gradient(135deg,${C.primary},${C.purple})`,
        border: `2px solid ${C.primary}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 800,
        color: C.bg,
      }}
    >
      TK
    </div>
  );
}

function ChatBubble({ children, ai }: { children: React.ReactNode; ai?: boolean }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 16,
        fontSize: 12,
        lineHeight: 1.6,
        maxWidth: "88%",
        ...(ai
          ? { background: C.card, color: C.text, borderBottomLeftRadius: 4 }
          : { background: C.primary, color: C.bg, fontWeight: 600, alignSelf: "flex-end", borderBottomRightRadius: 4 }),
      }}
    >
      {children}
    </div>
  );
}
