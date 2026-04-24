'use client';

type Receipt = {
  label: string;
  value: string;
};

type Props = {
  kicker: string;
  kickerType?: 'default' | 'good' | 'warn' | 'bad';
  title: string;
  titleHighlight?: string;
  meta?: string;
  buttonLabel?: string;
  buttonVariant?: 'default' | 'primary';
  iconPath: string;
  receipts?: Receipt[];
  href?: string;
};

export function ActionCard({
  kicker,
  kickerType = 'default',
  title,
  titleHighlight,
  meta,
  buttonLabel,
  iconPath,
  receipts,
}: Props) {
  const colorMap: Record<string, string> = {
    default: 'var(--accent, var(--color-primary))',
    good: 'var(--good, var(--color-good))',
    warn: 'var(--warn, var(--color-warn))',
    bad: 'var(--bad, var(--color-bad))',
  };
  const iconColor = colorMap[kickerType];

  return (
    <div
      style={{
        background: 'var(--surface, var(--bg))',
        borderRadius: 22,
        padding: '22px 24px',
        marginBottom: 14,
        boxShadow: 'var(--out-sm)',
        transition: 'box-shadow 200ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: 'var(--surface, var(--bg))',
            boxShadow: 'var(--in-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            flexShrink: 0,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
            <path d={iconPath} />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: iconColor,
              marginBottom: 4,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 20,
              fontWeight: 400,
              color: 'var(--ink, var(--fg))',
              lineHeight: 1.25,
              letterSpacing: '-0.3px',
            }}
          >
            {titleHighlight ? (
              <>
                {title.split(titleHighlight)[0]}
                <em style={{ fontStyle: 'italic', color: 'var(--accent, var(--color-primary))', fontWeight: 500 }}>
                  {titleHighlight}
                </em>
                {title.split(titleHighlight)[1]}
              </>
            ) : (
              title
            )}
          </div>
          {meta && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>{meta}</div>}
        </div>
        {buttonLabel && (
          <button
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.04em',
              color: 'var(--text, var(--fg))',
              background: 'var(--surface, var(--bg))',
              border: 'none',
              borderRadius: 14,
              cursor: 'pointer',
              boxShadow: 'var(--out-sm)',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {buttonLabel}
          </button>
        )}
      </div>

      {receipts && receipts.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${receipts.length}, 1fr)`,
            gap: 12,
            marginTop: 16,
            padding: 16,
            background: 'var(--surface, var(--bg))',
            borderRadius: 16,
            boxShadow: 'var(--in-sm)',
          }}
        >
          {receipts.map((r) => (
            <div key={r.label}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--faint, var(--muted))' }}>
                {r.label}
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 16, color: 'var(--ink, var(--fg))', marginTop: 2 }}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
