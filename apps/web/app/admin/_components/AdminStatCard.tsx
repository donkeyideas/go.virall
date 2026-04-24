'use client';

import type { ReactNode } from 'react';

export function AdminStatCard({
  label,
  value,
  icon,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  sub?: string;
  accent?: 'red' | 'green' | 'amber' | 'default';
}) {
  const accentColor =
    accent === 'red'
      ? 'var(--admin-red, #c0392b)'
      : accent === 'green'
        ? 'var(--admin-green, #27ae60)'
        : accent === 'amber'
          ? 'var(--admin-amber, #e67e22)'
          : 'var(--admin-muted, #6b6e7b)';

  return (
    <div
      style={{
        background: 'var(--admin-surface, #1a1b20)',
        border: '1px solid var(--admin-border, #2a2b33)',
        borderRadius: 4,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Icon */}
      {icon && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 18,
            width: 36,
            height: 36,
            borderRadius: 4,
            background: 'var(--admin-surface-2, #1f2128)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          {icon}
        </div>
      )}

      {/* Label */}
      <div
        style={{
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          color: 'var(--admin-muted, #6b6e7b)',
        }}
      >
        {label}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: 38,
          fontFamily: 'Fraunces, serif',
          fontWeight: 700,
          color: 'var(--fg, #e2e4ea)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>

      {/* Sub text */}
      {sub && (
        <div
          style={{
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: accentColor,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
