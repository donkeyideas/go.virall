import Link from "next/link";

const C = {
  bg: "#0B1928",
  primary: "#FFB84D",
  textSecondary: "#8BACC8",
  border: "rgba(75,156,211,0.12)",
} as const;

export function MarketingNav() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(11,25,40,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 40px",
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 800,
            fontSize: 24,
            color: C.primary,
            letterSpacing: -0.5,
            textDecoration: "none",
          }}
        >
          Go <span style={{ color: C.textSecondary }}>Virall</span>
        </Link>
        <div className="hidden md:flex" style={{ gap: 36, alignItems: "center" }}>
          {[
            { label: "Home", href: "/" },
            { label: "Features", href: "/#features" },
            { label: "Pricing", href: "/#pricing" },
            { label: "Blog", href: "/blog" },
            { label: "Dashboard", href: "/dashboard" },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                color: C.textSecondary,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: 0.3,
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            style={{
              color: C.textSecondary,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 0.3,
            }}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            style={{
              background: C.primary,
              color: C.bg,
              padding: "10px 24px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
