'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type AccountOption = {
  id: string;
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  sync_status?: string;
};

type Props = {
  accounts: AccountOption[];
  selectedAccountId: string | null;
  onSelect: (accountId: string | null, platform: string | null) => void;
  theme: string;
  showAllOption?: boolean;
  label?: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

function formatCount(n: number | null | undefined): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function AccountPicker({ accounts, selectedAccountId, onSelect, theme, showAllOption = false, label = 'Account' }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const healthyAccounts = accounts.filter((a) => !a.sync_status || a.sync_status === 'healthy');
  const selected = healthyAccounts.find((a) => a.id === selectedAccountId) ?? null;
  const totalFollowers = healthyAccounts.reduce((s, a) => s + (a.follower_count ?? 0), 0);

  const displayText = selected
    ? `@${selected.platform_username ?? selected.platform}`
    : showAllOption
    ? 'All accounts'
    : 'Select account';
  const displayMeta = selected
    ? `${PLATFORM_LABELS[selected.platform] ?? selected.platform} -- ${formatCount(selected.follower_count)}`
    : showAllOption
    ? `${healthyAccounts.length} connected -- ${formatCount(totalFollowers)}`
    : '';

  const updatePos = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  function handleToggle() {
    if (!open) updatePos();
    setOpen(!open);
  }

  if (healthyAccounts.length === 0) {
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
          {label}
        </div>
        <div style={{
          height: 44, padding: '0 14px', borderRadius: 14, fontSize: 14, color: 'var(--muted)',
          background: 'var(--input-bg)', border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--input-border, rgba(255,255,255,.12))',
          display: 'flex', alignItems: 'center',
        }}>
          No accounts connected
        </div>
      </div>
    );
  }

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '0 38px 0 14px',
    borderRadius: 14,
    fontSize: 14,
    color: 'var(--fg)',
    background: 'var(--input-bg)',
    border: isEditorial ? '1.5px solid var(--ink)' : '1px solid var(--input-border, rgba(255,255,255,.12))',
    boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
    outline: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textAlign: 'left',
    font: 'inherit',
    position: 'relative',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    width: pos.width,
    maxHeight: 320,
    overflowY: 'auto',
    zIndex: 99999,
    borderRadius: isEditorial ? 8 : 14,
    padding: '6px 0',
    ...(isEditorial
      ? { background: 'var(--paper)', border: '1.5px solid var(--ink)', boxShadow: '5px 5px 0 var(--ink)' }
      : isNeumorphic
      ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-lg)' }
      : { background: 'var(--bg-mid, #120a27)', border: '1px solid var(--line)', boxShadow: '0 20px 60px -10px rgba(0,0,0,.7)', backdropFilter: 'blur(24px)' }),
  };

  const itemBase: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'background 0.1s',
    color: 'var(--fg)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };

  function renderItem(id: string | null, label: string, meta: string, isActive: boolean, platform?: string) {
    return (
      <div
        key={id ?? '__all'}
        onClick={() => { onSelect(id, platform ?? null); setOpen(false); }}
        style={{
          ...itemBase,
          fontWeight: isActive ? 600 : 400,
          background: isActive
            ? isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--surface-darker, #c7ccd4)' : 'rgba(139,92,246,.2)'
            : 'transparent',
          color: isActive
            ? isEditorial ? 'var(--paper)' : 'var(--fg)'
            : 'var(--fg)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background =
            isEditorial ? 'var(--paper-2)' : isNeumorphic ? 'var(--surface-darker, #dde2ea)' : 'rgba(255,255,255,.06)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 11, color: isActive && isEditorial ? 'var(--paper)' : 'var(--muted)', flexShrink: 0 }}>{meta}</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
        {label}
      </div>
      <button ref={triggerRef} type="button" onClick={handleToggle} style={triggerStyle}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayText}
        </span>
        {displayMeta && (
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{displayMeta}</span>
        )}
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none"
          style={{ position: 'absolute', right: 14, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.2s' }}
        >
          <path d="M1 1l4 4 4-4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && createPortal(
        <div ref={listRef} style={dropdownStyle}>
          {showAllOption && renderItem(null, 'All accounts', `${healthyAccounts.length} -- ${formatCount(totalFollowers)}`, !selectedAccountId)}
          {healthyAccounts.map((a) => renderItem(
            a.id,
            `@${a.platform_username ?? a.platform}`,
            `${PLATFORM_LABELS[a.platform] ?? a.platform} -- ${formatCount(a.follower_count)}`,
            a.id === selectedAccountId,
            a.platform,
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
