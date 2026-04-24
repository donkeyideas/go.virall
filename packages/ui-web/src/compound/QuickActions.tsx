'use client';

type Tile = {
  label: string;
  iconPath: string;
  href?: string;
};

type Props = {
  tiles: Tile[];
};

export function QuickActions({ tiles }: Props) {
  return (
    <div
      style={{
        background: 'var(--surface, var(--bg))',
        borderRadius: 28,
        padding: 28,
        boxShadow: 'var(--out-md)',
      }}
    >
      <h3
        style={{
          fontFamily: "'Fraunces', serif",
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 20,
          color: 'var(--ink, var(--fg))',
          marginBottom: 20,
          letterSpacing: '-0.3px',
        }}
      >
        Jump in.
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {tiles.map((tile) => (
          <div
            key={tile.label}
            style={{
              background: 'var(--surface, var(--bg))',
              borderRadius: 18,
              padding: '20px 16px',
              boxShadow: 'var(--out-sm)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'var(--surface, var(--bg))',
                boxShadow: 'var(--in-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent, var(--color-primary))',
                margin: '0 auto 10px',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
                <path d={tile.iconPath} />
              </svg>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text, var(--fg))', letterSpacing: '0.02em' }}>
              {tile.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
