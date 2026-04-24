import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="neon-editorial"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper)',
        color: 'var(--ink)',
      }}
    >
      {/* Top bar */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 26,
            letterSpacing: '-.02em',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          Go Virall
          <span
            style={{
              width: 10,
              height: 10,
              background: 'var(--hot)',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }}
          />
        </Link>
      </nav>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>{children}</div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          padding: '16px 28px',
          borderTop: '1px solid var(--rule)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '.12em',
          color: '#999',
        }}
      >
        &copy; 2026 GO VIRALL
      </div>
    </div>
  );
}
