'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const NAV_ITEMS = [
  { href: '/today', label: 'Today' },
  { href: '/go-virall', label: 'Go Virall' },
  { href: '/smo-score', label: 'SMO' },
  { href: '/compose', label: 'Compose' },
  { href: '/studio/ideas', label: 'Ideas' },
  { href: '/studio/captions', label: 'Captions' },
  { href: '/studio/scripts', label: 'Scripts' },
  { href: '/studio/bio', label: 'Bio' },
  { href: '/audience', label: 'Audience' },
  { href: '/revenue', label: 'Revenue' },
  { href: '/settings', label: 'Settings' },
];

type Props = {
  displayName: string;
  avatarUrl?: string;
};

export function Masthead({ displayName, avatarUrl }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div
      style={{
        background: 'var(--surface, var(--bg))',
        borderRadius: 28,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: 'var(--out-md)',
        marginBottom: 32,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 8px' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'var(--surface, var(--bg))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Fraunces', serif",
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 22,
            color: 'var(--accent, var(--color-primary))',
            boxShadow: 'var(--in-sm)',
          }}
        >
          G
        </div>
        <div
          className="masthead-brand-text"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--ink, var(--fg))',
            letterSpacing: -0.5,
          }}
        >
          Go <em style={{ fontStyle: 'italic', color: 'var(--accent, var(--color-primary))', fontWeight: 500 }}>Virall</em>
        </div>
      </div>

      {/* Nav strip */}
      <nav
        className="nav-scroll"
        style={{
          display: 'flex',
          gap: 6,
          background: 'var(--surface, var(--bg))',
          borderRadius: 18,
          padding: 6,
          boxShadow: 'var(--in-sm)',
          flexWrap: 'nowrap',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '10px 14px',
                whiteSpace: 'nowrap',
                fontSize: 13,
                fontWeight: 600,
                color: active ? 'var(--accent, var(--color-primary))' : 'var(--muted)',
                textDecoration: 'none',
                borderRadius: 12,
                transition: 'all 200ms ease',
                background: active ? 'var(--surface, var(--bg))' : 'transparent',
                boxShadow: active ? 'var(--out-sm)' : 'none',
                letterSpacing: '0.01em',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User chip with dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px 6px 6px',
            background: 'var(--surface, var(--bg))',
            borderRadius: 999,
            boxShadow: 'var(--out-sm)',
            border: 'none',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--surface, var(--bg))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              color: 'var(--accent, var(--color-primary))',
              boxShadow: 'var(--in-sm)',
              fontSize: 14,
              overflow: 'hidden',
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text, var(--fg))' }}>
            {displayName}
          </div>
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 8,
              width: 180,
              borderRadius: 18,
              background: 'var(--surface, var(--bg))',
              boxShadow: 'var(--out-md)',
              padding: '6px 0',
              zIndex: 100,
            }}
          >
            <a
              href="/settings"
              style={{
                display: 'block',
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--fg)',
                textDecoration: 'none',
                borderRadius: 12,
                margin: '0 6px',
                transition: 'box-shadow .15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--in-sm)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
            >
              Settings
            </a>
            <div style={{ height: 1, background: 'rgba(0,0,0,.06)', margin: '4px 12px' }} />
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                style={{
                  display: 'block',
                  width: 'calc(100% - 12px)',
                  textAlign: 'left',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-bad, #c87878)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  font: 'inherit',
                  borderRadius: 12,
                  margin: '0 6px',
                  transition: 'box-shadow .15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--in-sm)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
