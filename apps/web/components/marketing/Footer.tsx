import Link from 'next/link';

export function MarketingFooter({ showCTA = true }: { showCTA?: boolean }) {
  return (
    <footer
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        padding: showCTA ? '80px 28px 30px' : '0 28px 30px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {showCTA && (
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(80px, 15vw, 230px)',
            lineHeight: 0.82,
            letterSpacing: '-.04em',
            marginBottom: 40,
          }}
        >
          Ready to<br />go{' '}
          <span style={{ fontWeight: 900, fontStyle: 'normal', color: 'var(--lime)' }}>
            virall.
          </span>
        </div>
      )}

      <div
        className="grid-footer"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: 40,
          ...(showCTA ? { borderTop: '1px solid rgba(255,255,255,.15)', paddingTop: 40 } : { paddingTop: 28 }),
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 32,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              color: 'var(--paper)',
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
          </div>
          <p
            style={{
              maxWidth: 380,
              fontSize: 14,
              marginTop: 14,
              opacity: 0.7,
              lineHeight: 1.5,
            }}
          >
            The social intelligence platform that transforms creators into
            cultural forces. Built on real data, tuned by real creators.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: 'Viral Score', href: '/product#viral-score' },
            { label: 'AI Studio', href: '/product#ai-studio' },
            { label: 'Audience Intel', href: '/product#audience' },
            { label: 'Revenue Tracker', href: '/product#revenue' },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: 'About', href: '/about' },
            { label: 'Blog', href: '/blog' },
            { label: 'FAQ', href: '/faq' },
            { label: 'Contact', href: '/contact' },
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Child Safety', href: '/child-safety' },
            { label: 'Delete Account', href: '/delete-account' },
          ]}
        />
      </div>

      <div
        style={{
          marginTop: 60,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '.15em',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          opacity: 0.5,
        }}
      >
        <span>&copy; 2026 GO VIRALL</span>
        <span>NEW YORK &middot; LOS ANGELES &middot; LISBON</span>
        <span>
          <Link
            href="/privacy"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            PRIVACY
          </Link>
          {' '}&middot;{' '}
          <Link
            href="/terms"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            TERMS
          </Link>
          {' '}&middot;{' '}
          <Link
            href="/child-safety"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            CHILD SAFETY
          </Link>
          {' '}&middot;{' '}
          <Link
            href="/delete-account"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            DELETE ACCOUNT
          </Link>
        </span>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h6
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '.2em',
          marginBottom: 16,
          opacity: 0.6,
        }}
      >
        {title.toUpperCase()}
      </h6>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          style={{
            display: 'block',
            padding: '6px 0',
            fontSize: 14,
            opacity: 0.8,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
