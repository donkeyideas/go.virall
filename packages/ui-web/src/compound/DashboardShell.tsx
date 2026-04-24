'use client';

import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Masthead } from './Masthead';
import { TopBar } from './TopBar';

type Props = {
  theme: string;
  children: ReactNode;
  displayName: string;
  avatarUrl?: string;
  handle?: string;
  isAdmin?: boolean;
};

export function DashboardShell({ theme, children, displayName, avatarUrl, handle, isAdmin }: Props) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (theme === 'neumorphic') {
    return (
      <div className="min-h-screen" style={{ padding: 32 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Masthead displayName={displayName} avatarUrl={avatarUrl} />
          <main>{children}</main>
        </div>
      </div>
    );
  }

  // Glassmorphic or neon-editorial: sidebar layout
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'var(--sidebar-width) 1fr', minHeight: '100vh' }}>
      <Sidebar theme={theme} />
      <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar theme={theme} displayName={displayName} avatarUrl={avatarUrl} isAdmin={isAdmin} />
        {theme === 'neon-editorial' && <TickerSliver />}
        <div style={{ padding: '34px 32px 70px', flex: 1 }}>
          {children}
        </div>
      </main>
    </div>
  );
}

function TickerSliver() {
  const items = [
    { label: 'VIRAL SCORE TODAY', value: '—' },
    { label: 'POST WINDOW', value: '—' },
    { label: 'DEALS PENDING', value: '—' },
    { label: 'WEEK STREAK', value: '—' },
  ];

  return (
    <div
      style={{
        background: 'var(--ink)',
        color: 'var(--paper)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        padding: '7px 0',
        letterSpacing: '.12em',
        borderBottom: '1.5px solid var(--ink)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          gap: 34,
          animation: 'ticker-scroll 45s linear infinite',
        }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {item.label}{' '}
            <em style={{ color: 'var(--lime)', fontStyle: 'normal', fontWeight: 700 }}>
              {item.value}
            </em>
          </span>
        ))}
        <span>—</span>
      </div>
    </div>
  );
}
