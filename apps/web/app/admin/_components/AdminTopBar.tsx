'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABEL_MAP: Record<string, string> = {
  admin: 'Dashboard',
  users: 'User Management',
  billing: 'Billing & Revenue',
  subscriptions: 'Subscription Plans',
  blog: 'Blog & Guides',
  social: 'Social Posts',
  'email-templates': 'Email Templates',
  notifications: 'Notifications',
  contacts: 'Support Tickets',
  content: 'Content Manager',
  analytics: 'Platform Analytics',
  ai: 'AI Intelligence',
  data: 'Data Intelligence',
  search: 'Search & AI',
  api: 'API Management',
  flags: 'Feature Flags',
  health: 'System Health',
  changelog: 'Changelog',
  audit: 'Audit Log',
};

export function AdminTopBar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string;
}) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const currentSlug = segments[1] || 'admin';
  const pageLabel = LABEL_MAP[currentSlug] || currentSlug;
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
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: 52,
        borderBottom: '1px solid var(--admin-border, #2a2b33)',
        background: 'var(--admin-surface, #1a1b20)',
        flexShrink: 0,
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--admin-muted, #6b6e7b)',
        }}
      >
        <Link
          href="/admin"
          style={{
            color: 'var(--admin-muted, #6b6e7b)',
            textDecoration: 'none',
          }}
        >
          Admin
        </Link>
        {currentSlug !== 'admin' && (
          <>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--fg, #e2e4ea)', fontWeight: 500 }}>
              {pageLabel}
            </span>
          </>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link
          href="/dashboard"
          style={{
            fontSize: 12,
            color: 'var(--admin-muted, #6b6e7b)',
            textDecoration: 'none',
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid var(--admin-border, #2a2b33)',
          }}
        >
          Dashboard
        </Link>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 6,
              font: 'inherit',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--admin-border, #2a2b33)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--admin-surface-3, #242630)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--fg, #e2e4ea)',
                  border: '2px solid var(--admin-border, #2a2b33)',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              style={{
                fontSize: 13,
                color: 'var(--fg, #e2e4ea)',
                fontWeight: 500,
              }}
            >
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: 6,
                width: 180,
                borderRadius: 10,
                border: '1px solid var(--admin-border, #2a2b33)',
                background: 'var(--admin-surface, #1a1b20)',
                boxShadow: '0 12px 40px rgba(0,0,0,.5)',
                padding: '6px 0',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '8px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--fg, #e2e4ea)',
                  borderBottom: '1px solid var(--admin-border, #2a2b33)',
                  marginBottom: 4,
                }}
              >
                {displayName}
              </div>
              <a
                href="/today"
                style={{
                  display: 'block',
                  padding: '8px 14px',
                  fontSize: 13,
                  color: 'var(--fg, #e2e4ea)',
                  textDecoration: 'none',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Dashboard
              </a>
              <a
                href="/settings"
                style={{
                  display: 'block',
                  padding: '8px 14px',
                  fontSize: 13,
                  color: 'var(--fg, #e2e4ea)',
                  textDecoration: 'none',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Settings
              </a>
              <div style={{ height: 1, background: 'var(--admin-border, #2a2b33)', margin: '4px 0' }} />
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 14px',
                    fontSize: 13,
                    color: '#ef4444',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    font: 'inherit',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.06)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
