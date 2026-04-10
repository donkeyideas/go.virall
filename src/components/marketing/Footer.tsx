import type { FooterContent } from "@/types/site-content";

const C = {
  surface: "#0D1E35",
  primary: "#FFB84D",
  textSecondary: "#8BACC8",
} as const;

const DEFAULT_FOOTER: FooterContent = {
  description:
    "The social intelligence platform that transforms creators into cultural forces. Data-driven strategies, powerful insights.",
  copyright: "\u00a9 2026 Go Virall. All rights reserved.",
};

export function MarketingFooter({ content }: { content?: FooterContent }) {
  const f = content ?? DEFAULT_FOOTER;

  return (
    <footer
      style={{
        background: C.surface,
        borderTop: "1px solid rgba(75,156,211,0.1)",
        padding: "60px 40px 30px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{ gap: 40, marginBottom: 40 }}
        >
          <div>
            <span
              style={{
                fontWeight: 800,
                fontSize: 22,
                color: C.primary,
                display: "block",
                marginBottom: 12,
              }}
            >
              Go <span style={{ color: C.textSecondary }}>Virall</span>
            </span>
            <p
              style={{
                fontSize: 14,
                color: C.textSecondary,
                lineHeight: 1.7,
                maxWidth: 280,
              }}
            >
              {f.description}
            </p>
          </div>
          {[
            {
              title: "Product",
              links: [
                { label: "Analytics", href: "/#features" },
                { label: "Smart Strategist", href: "/#features" },
                { label: "How It Works", href: "/#how-it-works" },
                { label: "Platforms", href: "/#platforms" },
                { label: "Pricing", href: "/#pricing" },
              ],
            },
            {
              title: "Company",
              links: [
                { label: "About", href: "/#about" },
                { label: "Testimonials", href: "/#testimonials" },
                { label: "Blog", href: "/blog" },
                { label: "Careers", href: "#" },
              ],
            },
            {
              title: "Support",
              links: [
                { label: "FAQ", href: "/#faq" },
                { label: "Help Center", href: "#" },
                { label: "API Docs", href: "#" },
                { label: "Contact", href: "#" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: C.textSecondary,
                  marginBottom: 16,
                }}
              >
                {col.title}
              </h4>
              {col.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: C.textSecondary,
                    textDecoration: "none",
                    padding: "4px 0",
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(75,156,211,0.08)",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: C.textSecondary }}>{f.copyright}</p>
          <p>
            <a
              href="#"
              style={{
                color: C.textSecondary,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              Privacy
            </a>
            &nbsp;&nbsp;
            <a
              href="#"
              style={{
                color: C.textSecondary,
                textDecoration: "none",
                fontSize: 13,
              }}
            >
              Terms
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
