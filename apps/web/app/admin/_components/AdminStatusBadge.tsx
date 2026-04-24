'use client';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'rgba(39,174,96,0.15)', fg: '#27ae60' },
  published: { bg: 'rgba(39,174,96,0.15)', fg: '#27ae60' },
  trialing: { bg: 'rgba(39,174,96,0.15)', fg: '#27ae60' },
  resolved: { bg: 'rgba(39,174,96,0.15)', fg: '#27ae60' },
  open: { bg: 'rgba(230,126,34,0.15)', fg: '#e67e22' },
  pending: { bg: 'rgba(230,126,34,0.15)', fg: '#e67e22' },
  draft: { bg: 'rgba(230,126,34,0.15)', fg: '#e67e22' },
  scheduled: { bg: 'rgba(230,126,34,0.15)', fg: '#e67e22' },
  in_progress: { bg: 'rgba(52,152,219,0.15)', fg: '#3498db' },
  canceling: { bg: 'rgba(192,57,43,0.15)', fg: '#c0392b' },
  canceled: { bg: 'rgba(192,57,43,0.15)', fg: '#c0392b' },
  failed: { bg: 'rgba(192,57,43,0.15)', fg: '#c0392b' },
  closed: { bg: 'rgba(107,110,123,0.15)', fg: '#6b6e7b' },
  archived: { bg: 'rgba(107,110,123,0.15)', fg: '#6b6e7b' },
};

export function AdminStatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? {
    bg: 'rgba(107,110,123,0.15)',
    fg: '#6b6e7b',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 3,
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: colors.bg,
        color: colors.fg,
        textTransform: 'capitalize' as const,
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
