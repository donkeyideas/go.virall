'use client';

type Props = {
  kicker: string;
  text: string;
  highlight?: string;
  value: string;
  iconPath: string;
};

export function WinCard({ kicker, text, highlight, value, iconPath }: Props) {
  return (
    <div
      style={{
        background: 'var(--surface, var(--bg))',
        borderRadius: 22,
        padding: '22px 24px',
        marginBottom: 14,
        boxShadow: 'var(--out-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--surface, var(--bg))',
          boxShadow: 'var(--in-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--good, var(--color-good))',
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
          <path d={iconPath} />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 2 }}>
          {kicker}
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 400, color: 'var(--ink, var(--fg))', lineHeight: 1.25 }}>
          {highlight ? (
            <>
              {text.split(highlight)[0]}
              <em style={{ fontStyle: 'italic', color: 'var(--good, var(--color-good))', fontWeight: 500 }}>
                {highlight}
              </em>
              {text.split(highlight)[1]}
            </>
          ) : (
            text
          )}
        </div>
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, color: 'var(--ink, var(--fg))', letterSpacing: '-0.5px' }}>
        {value}
      </div>
    </div>
  );
}
