import Link from "next/link";

const C = {
  bg: "#0B1928",
  primary: "#FFB84D",
  textSecondary: "#8BACC8",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
        fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        padding: "40px 16px",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 800,
          fontSize: 28,
          color: C.primary,
          textDecoration: "none",
          marginBottom: 40,
          letterSpacing: -0.5,
        }}
      >
        Go<span style={{ color: C.textSecondary }}>Virall</span>
      </Link>
      {children}
    </div>
  );
}
