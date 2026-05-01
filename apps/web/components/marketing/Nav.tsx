import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Product', href: '/product' },
  { label: 'Intelligence', href: '/intelligence' },
  { label: 'Creators', href: '/creators' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Stories', href: '/stories' },
  { label: 'Blog', href: '/blog' },
];

export function MarketingNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px',
        borderBottom: '1px solid var(--rule)',
        background: 'rgba(243,239,230,.92)',
        backdropFilter: 'blur(10px)',
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
            animation: 'pulse-dot 1.4s ease-in-out infinite',
          }}
        />
      </Link>
      <ul
        style={{
          display: 'flex',
          gap: 28,
          listStyle: 'none',
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {NAV_LINKS.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Link
          href="/signin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
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
          Start free &rarr;
        </Link>
      </div>
    </nav>
  );
}
