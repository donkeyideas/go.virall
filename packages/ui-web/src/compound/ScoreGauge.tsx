'use client';

type Factor = {
  label: string;
  value: number;
};

type Props = {
  score: number | null;
  factors?: Factor[];
  theme: string;
  title?: string;
  subtitle?: string;
};

export function ScoreGauge({ score, factors, theme, title = 'SMO Score', subtitle }: Props) {
  const s = score ?? 0;

  if (theme === 'neumorphic') {
    return <NeumorphicGauge score={s} factors={factors} title={title} subtitle={subtitle} />;
  }

  if (theme === 'neon-editorial') {
    return <EditorialGauge score={s} factors={factors} title={title} subtitle={subtitle} />;
  }

  return <GlassGauge score={s} factors={factors} title={title} subtitle={subtitle} />;
}

function GlassGauge({
  score,
  factors,
  title,
  subtitle,
}: {
  score: number;
  factors?: Factor[];
  title: string;
  subtitle?: string;
}) {
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div
      style={{
        padding: 26,
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 22,
          marginBottom: 4,
          color: 'var(--fg)',
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>{subtitle}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginBottom: 26 }}>
        <svg viewBox="0 0 120 120" style={{ width: 180, height: 180, flexShrink: 0 }}>
          <defs>
            <linearGradient id="gauge-grad-glass" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#c7b4ff" />
              <stop offset="50%" stopColor="#ff71a8" />
              <stop offset="100%" stopColor="#ffb648" />
            </linearGradient>
            <filter id="gauge-glow">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,.08)" strokeWidth="8" fill="none" />
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#gauge-grad-glass)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            filter="url(#gauge-glow)"
          />
        </svg>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 400, letterSpacing: '.04em', color: 'var(--muted)' }}>
            SCORE · 0–100
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 88,
              fontWeight: 400,
              lineHeight: 0.85,
              letterSpacing: '-.04em',
              background: 'linear-gradient(135deg, #fff, var(--lilac))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '4px 0',
            }}
          >
            {score}
          </div>
        </div>
      </div>

      {factors && factors.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
            paddingTop: 20,
            borderTop: '1px dashed var(--line)',
          }}
        >
          {factors.slice(0, 3).map((f) => (
            <div key={f.label}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.15em', color: 'var(--muted)' }}>
                {f.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginTop: 4, color: 'var(--fg)' }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditorialGauge({
  score,
  factors,
  title,
  subtitle,
}: {
  score: number;
  factors?: Factor[];
  title: string;
  subtitle?: string;
}) {
  const circumference = 2 * Math.PI * 92;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div
      style={{
        border: '1.5px solid var(--ink)',
        borderRadius: 20,
        padding: 26,
        background: 'var(--ink)',
        color: 'var(--paper)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 30, letterSpacing: '-.02em', lineHeight: 1 }}>
            {title}
          </h3>
          {subtitle && <div style={{ fontSize: 13, color: '#bbb', marginTop: 6 }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 30, alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          <svg viewBox="0 0 220 220" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="ring-ed" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#c6fd4f" />
                <stop offset="50%" stopColor="#ff2e6c" />
                <stop offset="100%" stopColor="#ff6a1f" />
              </linearGradient>
            </defs>
            <circle cx="110" cy="110" r="92" stroke="rgba(255,255,255,.08)" strokeWidth="10" fill="none" />
            <circle
              cx="110"
              cy="110"
              r="92"
              stroke="url(#ring-ed)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 110,
              letterSpacing: '-.05em',
              lineHeight: 0.85,
              color: 'var(--lime)',
            }}
          >
            {score}
            <small style={{ fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontWeight: 500, fontSize: 10, letterSpacing: '.16em', color: '#aaa', marginTop: 4 }}>
              OUT OF 100
            </small>
          </div>
        </div>

        <div>
          {factors && factors.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, paddingTop: 16, borderTop: '1px dashed rgba(255,255,255,.25)' }}>
              {factors.slice(0, 3).map((f) => (
                <div key={f.label}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', color: '#aaa' }}>
                    {f.label.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontStyle: 'italic', fontSize: 24, marginTop: 4, letterSpacing: '-.02em' }}>
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NeumorphicGauge({
  score,
  factors,
  title,
  subtitle,
}: {
  score: number;
  factors?: Factor[];
  title: string;
  subtitle?: string;
}) {
  // Arc: 270° sweep, score/100
  const r = 110;
  const sweepAngle = 270;
  const startAngle = 135; // start from bottom-left
  const scoreAngle = (score / 100) * sweepAngle;
  const endAngle = startAngle + scoreAngle;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const endX = r * Math.cos(toRad(endAngle));
  const endY = r * Math.sin(toRad(endAngle));
  const largeArc = scoreAngle > 180 ? 1 : 0;
  const startX = r * Math.cos(toRad(startAngle));
  const startY = r * Math.sin(toRad(startAngle));

  return (
    <div
      style={{
        background: 'var(--surface, var(--bg))',
        borderRadius: 28,
        padding: '36px 32px',
        boxShadow: 'var(--out-md)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--faint, var(--muted))', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 22, fontWeight: 400, color: 'var(--ink, var(--fg))', marginBottom: 8, letterSpacing: '-0.3px' }}>
        Social Media <em style={{ color: 'var(--accent, var(--color-primary))', fontWeight: 500 }}>Optimization</em>
      </div>
      {subtitle && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>{subtitle}</div>}

      {/* Gauge well */}
      <div
        style={{
          width: 260,
          height: 260,
          margin: '0 auto 24px',
          borderRadius: '50%',
          background: 'var(--surface, var(--bg))',
          boxShadow: 'var(--in-md)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="-130 -130 260 260" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8098db" />
              <stop offset="100%" stopColor="#5a78d0" />
            </linearGradient>
          </defs>
          <path
            d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
            fill="none"
            stroke="url(#arc-grad)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.95"
          />
          <circle cx={endX} cy={endY} r="8" fill="#5a78d0" />
          <circle cx={endX} cy={endY} r="4" fill="#eef2f7" />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 30,
            borderRadius: '50%',
            background: 'var(--surface, var(--bg))',
            boxShadow: 'var(--out-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 500, fontSize: 72, color: 'var(--ink, var(--fg))', letterSpacing: -2, lineHeight: 1 }}>
            {score}
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>
            / 100
          </div>
        </div>
      </div>

      {/* Factors */}
      {factors && factors.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginTop: 20,
            padding: 20,
            background: 'var(--surface, var(--bg))',
            borderRadius: 20,
            boxShadow: 'var(--in-sm)',
          }}
        >
          {factors.map((f) => (
            <div key={f.label} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 36px', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text, var(--fg))', textAlign: 'left', letterSpacing: '0.01em' }}>
                {f.label}
              </div>
              <div
                style={{
                  height: 10,
                  background: 'var(--surface, var(--bg))',
                  borderRadius: 5,
                  boxShadow: 'var(--in-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${f.value}%`,
                    background: 'linear-gradient(90deg, var(--accent-soft, var(--color-primary-soft)), var(--accent, var(--color-primary)))',
                    borderRadius: 5,
                    boxShadow: '0 0 6px rgba(90,120,208,0.4)',
                  }}
                />
              </div>
              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 14, color: 'var(--ink, var(--fg))', textAlign: 'right' }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
