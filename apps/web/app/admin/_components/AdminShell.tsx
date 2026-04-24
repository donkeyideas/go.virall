'use client';

import { useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopBar } from './AdminTopBar';

export function AdminShell({
  displayName,
  avatarUrl,
  children,
}: {
  displayName: string;
  avatarUrl?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'admin-dark');
    return () => {
      if (prev) document.documentElement.setAttribute('data-theme', prev);
    };
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}
    >
      <AdminSidebar />
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopBar displayName={displayName} avatarUrl={avatarUrl} />
        <main
          style={{
            flex: 1,
            padding: '28px 32px 60px',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
