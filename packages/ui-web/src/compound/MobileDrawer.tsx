'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/today', label: 'Overview', icon: 'M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z' },
  { href: '/go-virall', label: 'Go Virall', icon: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' },
  { href: '/smo-score', label: 'SMO Score', icon: 'M12 2L15 8l7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z' },
  { href: '/compose', label: 'Compose', icon: 'M4 7h16M4 12h16M4 17h10' },
  { href: '/audience', label: 'Audience', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { href: '/revenue', label: 'Revenue', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { href: '/studio/ideas', label: 'Ideas', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { href: '/studio/captions', label: 'Captions', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' },
  { href: '/studio/scripts', label: 'Scripts', icon: 'M2 2h20v20H2zM7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5' },
  { href: '/studio/bio', label: 'Bio', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { href: '/settings', label: 'Settings', icon: 'M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
];

type Props = {
  theme: string;
};

export function MobileDrawer({ theme }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isEditorial = theme === 'neon-editorial';

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only on mobile via .mobile-only */}
      <button
        className="mobile-only"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 50,
          width: 44,
          height: 44,
          borderRadius: isEditorial ? 10 : 12,
          border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
          background: isEditorial ? 'var(--paper)' : 'rgba(10,6,24,.7)',
          backdropFilter: isEditorial ? 'none' : 'blur(16px)',
          color: 'var(--fg)',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 998,
            background: 'rgba(0,0,0,.5)',
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          zIndex: 999,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .25s ease',
          background: isEditorial ? 'var(--paper)' : 'rgba(10,6,24,.95)',
          backdropFilter: isEditorial ? 'none' : 'blur(24px)',
          borderRight: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 20px',
            borderBottom: isEditorial ? '1.5px solid var(--ink)' : '1px solid rgba(255,255,255,.08)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 400,
              fontStyle: isEditorial ? 'italic' : 'normal',
              fontSize: 22,
              color: 'var(--fg)',
            }}
          >
            Go Virall
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--fg)',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: isEditorial ? 8 : 10,
                  fontSize: 14,
                  fontWeight: isEditorial ? 500 : 400,
                  color: active
                    ? isEditorial ? 'var(--paper)' : 'var(--fg)'
                    : isEditorial ? '#333' : 'var(--muted)',
                  background: active
                    ? isEditorial ? 'var(--ink)' : 'rgba(255,255,255,.10)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'all .15s',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, flexShrink: 0 }}
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
