import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="neon-editorial" style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', fontFamily: '"Inter Tight", sans-serif' }}>
      {/* Nav */}
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
            color: 'inherit',
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
            }}
          />
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href="/signin"
            style={{
              padding: '10px 16px',
              border: '1.5px solid var(--ink)',
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 13,
              background: 'transparent',
              color: 'var(--ink)',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              padding: '10px 16px',
              border: '1.5px solid var(--ink)',
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 13,
              background: 'var(--ink)',
              color: 'var(--paper)',
              textDecoration: 'none',
            }}
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '60px 28px 80px' }}>
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--rule)',
          padding: '24px 28px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '.12em',
          display: 'flex',
          justifyContent: 'space-between',
          color: '#666',
        }}
      >
        <span>&copy; 2026 GO VIRALL</span>
        <span>
          <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>PRIVACY</Link>
          {' '}&middot;{' '}
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>TERMS</Link>
          {' '}&middot;{' '}
          <Link href="/child-safety" style={{ color: 'inherit', textDecoration: 'none' }}>CHILD SAFETY</Link>
          {' '}&middot;{' '}
          <Link href="/delete-account" style={{ color: 'inherit', textDecoration: 'none' }}>DELETE ACCOUNT</Link>
        </span>
      </footer>
    </div>
  );
}
