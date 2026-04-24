'use client';

import { useState, useRef, useEffect } from 'react';
import { NotificationBell } from './NotificationPanel';

type Props = {
  theme: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin?: boolean;
};

export function TopBar({ theme, displayName, avatarUrl, isAdmin }: Props) {
  const isEditorial = theme === 'neon-editorial';
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: isEditorial ? '14px 32px' : '14px 32px',
        borderBottom: isEditorial ? '1.5px solid var(--ink)' : 'none',
        background: isEditorial ? 'var(--paper)' : 'transparent',
        position: isEditorial ? 'sticky' : 'relative',
        top: isEditorial ? 0 : 'auto',
        zIndex: isEditorial ? 20 : 'auto',
      }}
    >
      {/* Search */}
      <div
        style={{
          width: isEditorial ? 460 : 420,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: isEditorial ? '9px 14px' : '10px 14px',
          border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
          borderRadius: isEditorial ? 999 : 12,
          background: isEditorial ? 'transparent' : 'var(--glass, rgba(255,255,255,.06))',
          backdropFilter: isEditorial ? 'none' : 'blur(10px)',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          placeholder="Search content, profiles, deals…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--fg)',
            font: 'inherit',
            fontSize: 13,
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '2px 6px',
            border: isEditorial ? '1px solid var(--ink)' : '1px solid var(--line)',
            borderRadius: 4,
            color: 'var(--muted)',
            letterSpacing: '.04em',
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Status pill */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: isEditorial ? 8 : 6,
          padding: '8px 14px',
          border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
          borderRadius: isEditorial ? 999 : 10,
          fontFamily: isEditorial ? 'var(--font-mono)' : 'inherit',
          fontSize: isEditorial ? 11 : 12.5,
          letterSpacing: isEditorial ? '.08em' : 'normal',
          background: isEditorial ? 'transparent' : 'var(--glass, rgba(255,255,255,.06))',
          backdropFilter: isEditorial ? 'none' : 'blur(10px)',
        }}
      >
        <span
          style={{
            width: isEditorial ? 7 : 6,
            height: isEditorial ? 7 : 6,
            borderRadius: '50%',
            background: isEditorial ? 'var(--lime)' : 'var(--mint, var(--color-good))',
            boxShadow: isEditorial
              ? '0 0 6px var(--lime)'
              : '0 0 10px var(--mint, var(--color-good))',
          }}
        />
        {isEditorial ? 'SYNCED · 2 MIN AGO' : 'All systems synced'}
      </span>

      {/* Refresh button */}
      <button
        style={{
          width: isEditorial ? 38 : 36,
          height: isEditorial ? 38 : 36,
          display: 'grid',
          placeItems: 'center',
          border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
          borderRadius: isEditorial ? '50%' : 10,
          background: isEditorial ? 'transparent' : 'var(--glass, rgba(255,255,255,.06))',
          cursor: 'pointer',
          transition: 'all .15s',
          color: 'var(--fg)',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6 }}
        >
          <path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15" />
        </svg>
      </button>

      {/* Notification bell */}
      <NotificationBell theme={theme} />

      {/* Admin pill */}
      {isAdmin && (
        <a
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 12px',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            color: '#fff',
            background: isEditorial ? 'var(--hot)' : '#c0392b',
            borderRadius: isEditorial ? 999 : 8,
            border: isEditorial ? '1.5px solid var(--ink)' : 'none',
          }}
        >
          ADMIN
        </a>
      )}

      {/* Avatar + Dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            width: isEditorial ? 38 : 36,
            height: isEditorial ? 38 : 36,
            borderRadius: '50%',
            background: isEditorial ? 'var(--hot)' : 'linear-gradient(135deg, var(--rose), var(--amber))',
            display: 'grid',
            placeItems: 'center',
            fontWeight: isEditorial ? 900 : 700,
            fontFamily: isEditorial ? 'var(--font-display)' : 'inherit',
            fontStyle: isEditorial ? 'italic' : 'normal',
            fontSize: isEditorial ? 16 : 13,
            color: '#fff',
            border: isEditorial ? '1.5px solid var(--ink)' : '1px solid rgba(255,255,255,.2)',
            cursor: 'pointer',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 6,
              width: 180,
              borderRadius: isEditorial ? 12 : 14,
              border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--line)',
              background: isEditorial ? 'var(--paper)' : 'rgba(20,14,40,.95)',
              backdropFilter: isEditorial ? 'none' : 'blur(24px)',
              boxShadow: isEditorial
                ? '5px 5px 0 var(--ink)'
                : '0 16px 48px rgba(0,0,0,.5)',
              padding: '6px 0',
              zIndex: 100,
            }}
          >
            <div
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--fg)',
                borderBottom: `1px solid ${isEditorial ? 'var(--rule)' : 'rgba(255,255,255,.08)'}`,
                marginBottom: 4,
              }}
            >
              {displayName}
            </div>
            <a
              href="/settings"
              style={{
                display: 'block',
                padding: '8px 14px',
                fontSize: 13,
                color: 'var(--fg)',
                textDecoration: 'none',
                transition: 'background .1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = isEditorial ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Settings
            </a>
            <div style={{ height: 1, background: isEditorial ? 'var(--rule)' : 'rgba(255,255,255,.08)', margin: '4px 0' }} />
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 14px',
                  fontSize: 13,
                  color: 'var(--color-bad, #ef4444)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  font: 'inherit',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = isEditorial ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
