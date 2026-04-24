'use client';

type Props = {
  label: string;
  value: string;
  unit?: string;
  change?: string;
  changeDirection?: 'up' | 'down' | 'flat';
  glowColor?: string;
  variant?: 'default' | 'lime' | 'dark' | 'hot';
  theme: string;
};

export function KpiCard({
  label,
  value,
  unit,
  change,
  changeDirection = 'up',
  glowColor,
  variant = 'default',
  theme,
}: Props) {
  if (theme === 'neon-editorial') {
    return <EditorialKpi label={label} value={value} unit={unit} change={change} changeDirection={changeDirection} variant={variant} />;
  }
  if (theme === 'neumorphic') {
    return <NeumorphicKpi label={label} value={value} unit={unit} change={change} changeDirection={changeDirection} />;
  }
  return <GlassKpi label={label} value={value} unit={unit} change={change} changeDirection={changeDirection} glowColor={glowColor} />;
}

function GlassKpi({
  label,
  value,
  unit,
  change,
  changeDirection,
  glowColor,
}: Omit<Props, 'theme' | 'variant'>) {
  return (
    <div
      style={{
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      }}
    >
      {glowColor && (
        <div
          style={{
            position: 'absolute',
            inset: '-40% -40% auto auto',
            width: 240,
            height: 240,
            borderRadius: '50%',
            filter: 'blur(50px)',
            opacity: 0.7,
            pointerEvents: 'none',
            background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          }}
        />
      )}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '.18em',
          color: 'var(--muted)',
          marginBottom: 10,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 400,
          fontSize: 44,
          lineHeight: 1,
          letterSpacing: '-.02em',
          color: 'var(--fg)',
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 24, color: 'var(--muted)' }}>{unit}</span>}
      </div>
      {change && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 10,
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            background:
              changeDirection === 'up'
                ? 'rgba(138,255,193,.15)'
                : 'rgba(255,113,168,.15)',
            color:
              changeDirection === 'up' ? 'var(--mint)' : 'var(--rose)',
            border: `1px solid ${changeDirection === 'up' ? 'rgba(138,255,193,.3)' : 'rgba(255,113,168,.3)'}`,
          }}
        >
          {changeDirection === 'up' ? 'UP' : 'DN'} {change}
        </span>
      )}
    </div>
  );
}

function EditorialKpi({
  label,
  value,
  unit,
  change,
  changeDirection,
  variant,
}: Omit<Props, 'theme' | 'glowColor'>) {
  const bgMap: Record<string, string> = {
    default: 'var(--paper)',
    lime: 'var(--lime)',
    dark: 'var(--ink)',
    hot: 'var(--hot)',
  };
  const colorMap: Record<string, string> = {
    default: 'var(--ink)',
    lime: 'var(--ink)',
    dark: 'var(--paper)',
    hot: '#fff',
  };
  const chgBgMap: Record<string, string> = {
    default: 'var(--ink)',
    lime: 'var(--ink)',
    dark: 'var(--lime)',
    hot: '#fff',
  };
  const chgColorMap: Record<string, string> = {
    default: 'var(--lime)',
    lime: 'var(--lime)',
    dark: 'var(--ink)',
    hot: 'var(--hot)',
  };

  const v = variant ?? 'default';
  const sparkStroke = v === 'dark' ? 'var(--lime)' : v === 'hot' ? '#fff' : 'var(--ink)';

  return (
    <div
      style={{
        border: '1.5px solid var(--ink)',
        borderRadius: 18,
        padding: 22,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform .25s',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: bgMap[v],
        color: colorMap[v],
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '.2em',
            marginBottom: 14,
            opacity: 0.7,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 52,
            lineHeight: 0.9,
            letterSpacing: '-.035em',
          }}
        >
          <span style={{ fontWeight: 900, fontStyle: 'normal' }}>{value}</span>
          {unit && (
            <sup style={{ fontSize: 18, fontStyle: 'normal', fontWeight: 500, opacity: 0.6, marginLeft: 4 }}>
              {unit}
            </sup>
          )}
        </div>
      </div>
      {change && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '.04em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 9px',
            borderRadius: 999,
            marginTop: 12,
            alignSelf: 'flex-start',
            background: chgBgMap[v],
            color: chgColorMap[v],
          }}
        >
          {changeDirection === 'up' ? 'UP' : changeDirection === 'down' ? 'DN' : '--'} {change}
        </span>
      )}
      {/* Sparkline */}
      <svg
        viewBox="0 0 90 32"
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 14, right: 14, width: 90, height: 32, opacity: 0.9 }}
      >
        <path
          d="M0,26 C15,24 25,20 40,16 C55,12 70,8 90,4"
          fill="none"
          stroke={sparkStroke}
          strokeWidth="1.8"
        />
      </svg>
    </div>
  );
}

function NeumorphicKpi({
  label,
  value,
  unit,
  change,
  changeDirection,
}: Omit<Props, 'theme' | 'variant' | 'glowColor'>) {
  return (
    <div
      style={{
        padding: '20px 22px',
        borderRadius: 24,
        background: 'var(--surface, var(--bg))',
        boxShadow: 'var(--out-md)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 120,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          letterSpacing: '.18em',
          color: 'var(--faint, var(--muted))',
          marginBottom: 10,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 400,
          fontSize: 44,
          lineHeight: 1,
          letterSpacing: '-.02em',
          color: 'var(--ink, var(--fg))',
        }}
      >
        {value}
        {unit && <span style={{ fontSize: 24, color: 'var(--muted)' }}>{unit}</span>}
      </div>
      {change && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 10,
            padding: '3px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            background: 'var(--surface, var(--bg))',
            boxShadow: 'var(--in-sm)',
            color: changeDirection === 'up' ? 'var(--color-good, #22c55e)' : 'var(--color-bad, #ef4444)',
          }}
        >
          {changeDirection === 'up' ? 'UP' : 'DN'} {change}
        </span>
      )}
    </div>
  );
}
