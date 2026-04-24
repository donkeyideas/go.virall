'use client';

type PulseStat = {
  label: string;
  value: string;
  delta?: string;
  deltaType?: 'up' | 'down' | 'flat';
};

type Props = {
  stats: PulseStat[];
};

export function PulseBar({ stats }: Props) {
  return (
    <div
      style={{
        background: 'var(--surface, var(--bg))',
        borderRadius: 28,
        padding: '28px 36px',
        display: 'grid',
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: 20,
        boxShadow: 'var(--out-md)',
        marginBottom: 32,
      }}
    >
      {stats.map((stat, i) => (
        <div key={stat.label} style={{ position: 'relative', padding: '0 8px' }}>
          {/* Inset divider between stats */}
          {i < stats.length - 1 && (
            <div
              style={{
                position: 'absolute',
                right: -10,
                top: '15%',
                bottom: '15%',
                width: 6,
                borderRadius: 3,
                background: 'var(--surface, var(--bg))',
                boxShadow: 'var(--in-sm)',
              }}
            />
          )}
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            {stat.label}
          </div>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 32,
              fontWeight: 500,
              color: 'var(--ink, var(--fg))',
              letterSpacing: -0.8,
              lineHeight: 1,
            }}
          >
            {stat.value}
          </div>
          {stat.delta && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color:
                  stat.deltaType === 'down'
                    ? 'var(--bad, var(--color-bad))'
                    : stat.deltaType === 'flat'
                      ? 'var(--muted)'
                      : 'var(--good, var(--color-good))',
                marginTop: 8,
              }}
            >
              {stat.deltaType === 'up' ? 'UP ' : stat.deltaType === 'down' ? 'DN ' : '-- '}
              {stat.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
