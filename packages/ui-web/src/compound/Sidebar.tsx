'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const WORKSPACE_ITEMS = [
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

export function Sidebar({ theme }: { theme: string }) {
  const pathname = usePathname();
  const isEditorial = theme === 'neon-editorial';

  return (
    <aside
      style={{
        borderRight: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
        background: isEditorial ? 'var(--paper)' : 'rgba(10,6,24,.4)',
        backdropFilter: isEditorial ? 'none' : 'blur(24px)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isEditorial ? 8 : 10,
          padding: isEditorial ? '22px 20px' : '22px 14px',
          borderBottom: isEditorial ? '1.5px solid var(--ink)' : 'none',
          marginBottom: isEditorial ? 0 : 22,
        }}
      >
        <h1
          style={{
            fontFamily: isEditorial ? 'var(--font-display)' : 'var(--font-display)',
            fontWeight: isEditorial ? 900 : 400,
            fontStyle: isEditorial ? 'italic' : 'normal',
            fontSize: isEditorial ? 28 : 30,
            letterSpacing: '-.02em',
            color: 'var(--fg)',
          }}
        >
          {isEditorial ? (
            'Go Virall'
          ) : (
            <>
              Go{' '}
              <em
                style={{
                  fontStyle: 'italic',
                  background: 'linear-gradient(135deg, var(--lilac), var(--rose))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Virall
              </em>
            </>
          )}
        </h1>
        {isEditorial && (
          <span
            style={{
              width: 10,
              height: 10,
              background: 'var(--hot)',
              borderRadius: '50%',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }}
          />
        )}
      </div>

      {/* Nav groups */}
      <NavGroup label={isEditorial ? 'STUDIO' : 'WORKSPACE'} isEditorial={isEditorial}>
        {WORKSPACE_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
            isEditorial={isEditorial}
          />
        ))}
      </NavGroup>


      {/* Upgrade card */}
      <div style={{ marginTop: 'auto', padding: isEditorial ? 20 : 14, borderTop: isEditorial ? '1.5px solid var(--ink)' : 'none' }}>
        <div
          style={{
            background: isEditorial ? 'var(--ink)' : 'linear-gradient(135deg, rgba(139,92,246,.3), rgba(255,113,168,.2))',
            color: isEditorial ? 'var(--paper)' : 'var(--fg)',
            padding: isEditorial ? 20 : 18,
            borderRadius: isEditorial ? 14 : 16,
            border: isEditorial ? 'none' : '1px solid rgba(255,255,255,.12)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isEditorial && (
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'var(--hot)',
                filter: 'blur(10px)',
                opacity: 0.6,
              }}
            />
          )}
          <h4
            style={{
              fontFamily: isEditorial ? 'var(--font-display)' : 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 400,
              fontStyle: isEditorial ? 'italic' : 'normal',
              fontSize: isEditorial ? 22 : 18,
              marginBottom: 4,
              position: 'relative',
            }}
          >
            {isEditorial ? (
              <>
                Go <em style={{ color: 'var(--lime)', fontStyle: 'italic' }}>Pro.</em>
              </>
            ) : (
              'Unlock Pro'
            )}
          </h4>
          <p
            style={{
              fontSize: 11.5,
              color: isEditorial ? 'rgba(243,239,230,.7)' : 'var(--muted)',
              lineHeight: 1.4,
              marginBottom: 10,
              position: 'relative',
            }}
          >
            Unlimited analyses, AI strategist, deals CRM.
          </p>
          <button
            onClick={() => {
              if (pathname === '/settings') {
                window.location.hash = 'billing';
                window.dispatchEvent(new HashChangeEvent('hashchange'));
              } else {
                window.location.href = '/settings#billing';
              }
            }}
            style={{
              font: 'inherit',
              fontSize: 12,
              fontWeight: isEditorial ? 700 : 600,
              padding: isEditorial ? '9px 12px' : '8px 12px',
              border: 'none',
              background: isEditorial ? 'var(--lime)' : 'var(--fg)',
              color: isEditorial ? 'var(--ink)' : 'var(--bg)',
              borderRadius: isEditorial ? 999 : 8,
              cursor: 'pointer',
              width: '100%',
              position: 'relative',
            }}
          >
            Upgrade — $29/mo
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  isEditorial,
  children,
}: {
  label: string;
  isEditorial: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: isEditorial ? '.22em' : '.2em',
          padding: isEditorial ? '22px 20px 8px' : '14px 12px 6px',
          color: isEditorial ? '#555' : 'var(--muted)',
        }}
      >
        {label}
      </div>
      <nav style={{ padding: isEditorial ? '0 12px' : '0 12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </nav>
    </>
  );
}

function NavItem({
  href,
  label,
  icon,
  active,
  isEditorial,
  badge,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  isEditorial: boolean;
  badge?: string | null;
}) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: isEditorial ? '10px 12px' : '9px 12px',
    borderRadius: isEditorial ? 8 : 10,
    fontSize: 13.5,
    fontWeight: isEditorial ? 500 : 400,
    color: active
      ? isEditorial
        ? 'var(--paper)'
        : 'var(--fg)'
      : isEditorial
        ? '#333'
        : 'var(--muted)',
    background: active
      ? isEditorial
        ? 'var(--ink)'
        : 'var(--glass-2, rgba(255,255,255,.10))'
      : 'transparent',
    boxShadow: active && !isEditorial ? 'inset 0 0 0 1px rgba(255,255,255,.12)' : 'none',
    transition: 'all .2s',
    position: 'relative',
    textDecoration: 'none',
  };

  return (
    <Link href={href} style={baseStyle}>
      {/* Active indicator for glassmorphic */}
      {active && !isEditorial && (
        <div
          style={{
            position: 'absolute',
            left: -14,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: 18,
            background: 'linear-gradient(var(--violet), var(--rose))',
            borderRadius: '0 3px 3px 0',
          }}
        />
      )}
      <svg
        viewBox="0 0 24 24"
        style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, flexShrink: 0 }}
      >
        <path d={icon} />
      </svg>
      {label}
      {active && isEditorial && (
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{'>'}</span>
      )}
      {badge && (
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '2px 7px',
            background: isEditorial
              ? active ? 'var(--hot)' : 'var(--lime)'
              : 'var(--glass-2, rgba(255,255,255,.10))',
            color: isEditorial
              ? active ? '#fff' : 'var(--ink)'
              : 'var(--lilac)',
            borderRadius: isEditorial ? 999 : 6,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
