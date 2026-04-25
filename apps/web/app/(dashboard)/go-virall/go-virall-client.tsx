'use client';

type SignalData = {
  name: string;
  score: number;
  weight: string;
  explanation: string;
  icon: string;
};

type TrendPoint = { date: string; score: number };
type ActionItem = { signal: string; title: string; body: string; priority: 'high' | 'medium' | 'low' };

type Props = {
  theme: string;
  overall: number;
  status: { label: string; description: string };
  signals: SignalData[];
  trendData: TrendPoint[];
  actions: ActionItem[];
  stats: {
    totalFollowers: number;
    connectedPlatforms: number;
    postsAnalyzed: number;
    postsPerWeek: number;
  };
};

function scoreColor(score: number): string {
  if (score >= 60) return 'var(--color-good, #22c55e)';
  if (score >= 30) return 'var(--color-warn, #f59e0b)';
  return 'var(--color-bad, #ef4444)';
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function GoVirallClient({ theme, overall, status, signals, trendData, actions, stats }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const cardStyle: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 24 }
    : isNeumorphic
      ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 24, boxShadow: 'var(--out-md)' }
      : {
          background: 'var(--glass, rgba(255,255,255,.06))',
          backdropFilter: 'blur(24px) saturate(1.2)',
          border: 'none',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
        };

  const monoLabel: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '.15em',
    color: 'var(--muted)',
    textTransform: 'uppercase',
  };

  const priorityColors: Record<string, string> = {
    high: 'var(--color-bad, #ef4444)',
    medium: 'var(--color-warn, #f59e0b)',
    low: 'var(--color-good, #22c55e)',
  };

  return (
    <>
      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ ...monoLabel, fontSize: 11, letterSpacing: '.18em', marginBottom: 10 }}>
            &sect; VIRAL MOMENTUM TRACKER
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: isEditorial ? 300 : 400,
            fontStyle: isEditorial ? 'italic' : 'normal',
            fontSize: isEditorial ? 'clamp(40px, 5vw, 60px)' : 'clamp(32px, 4vw, 48px)',
            lineHeight: 0.95,
            letterSpacing: '-.025em',
            color: isEditorial ? 'var(--ink)' : 'var(--fg)',
          }}
        >
          {isEditorial ? (
            <>
              Go <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Virall.</span>
            </>
          ) : (
            'Go Virall'
          )}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, maxWidth: 520 }}>
          Your viral prediction engine. Most creators score 10&ndash;30. When this number climbs, something real is happening.
        </p>
      </div>

      {/* ── Thermometer Gauge ── */}
      <div style={{ ...cardStyle, marginBottom: 24, padding: isEditorial ? 32 : 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Score number */}
          <div style={{ textAlign: 'center', minWidth: 100 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontStyle: isEditorial ? 'italic' : 'normal',
                fontSize: 72,
                lineHeight: 1,
                letterSpacing: '-.04em',
                color: scoreColor(overall),
              }}
            >
              {overall}
            </div>
            <div style={{ ...monoLabel, marginTop: 4 }}>/ 100</div>
          </div>

          {/* Heat bar */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                height: 32,
                borderRadius: isEditorial ? 4 : 16,
                background: isNeumorphic
                  ? 'var(--surface, var(--bg))'
                  : isEditorial
                    ? 'var(--rule)'
                    : 'rgba(255,255,255,.06)',
                boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(overall, 2)}%`,
                  borderRadius: 'inherit',
                  background: isEditorial
                    ? `linear-gradient(90deg, var(--ink) 0%, var(--ink) 70%, var(--lime, #c8ff3d) 100%)`
                    : isNeumorphic
                      ? `linear-gradient(90deg, #7ba0d4 0%, var(--color-primary, #5a78d0) 50%, #c87878 100%)`
                      : `linear-gradient(90deg, #6be3ff 0%, #8b5cf6 30%, #ff71a8 65%, #ffb648 100%)`,
                  transition: 'width 1s ease',
                  position: 'relative',
                }}
              >
                {/* Glow at tip (glassmorphic only) */}
                {!isEditorial && !isNeumorphic && overall > 5 && (
                  <div
                    style={{
                      position: 'absolute',
                      right: -6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: overall >= 60 ? '#ffb648' : overall >= 30 ? '#ff71a8' : '#8b5cf6',
                      filter: 'blur(8px)',
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Scale markers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {['Cold', '20', 'Warming Up', '40', 'Getting Hot', '60', 'On Fire', '80', 'Viral'].map((label, i) =>
                i % 2 === 0 ? null : (
                  <div key={label} style={{ ...monoLabel, fontSize: 9, textAlign: 'center' }}>{label}</div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontStyle: isEditorial ? 'italic' : 'normal',
              fontSize: 20,
              color: scoreColor(overall),
            }}
          >
            {status.label}
          </span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>{status.description}</span>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Followers', value: fmtK(stats.totalFollowers) },
          { label: 'Platforms', value: `${stats.connectedPlatforms}` },
          { label: 'Posts Analyzed', value: `${stats.postsAnalyzed}` },
          { label: 'Posts / Week', value: stats.postsPerWeek > 0 ? `${stats.postsPerWeek}` : '\u2014' },
        ].map((s) => (
          <div key={s.label} style={{ ...cardStyle, padding: 16, textAlign: 'center' }}>
            <div style={{ ...monoLabel, marginBottom: 6 }}>{s.label}</div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontStyle: isEditorial ? 'italic' : 'normal',
                fontSize: 24,
                letterSpacing: '-.02em',
                color: 'var(--fg)',
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 5 Signal Cards ── */}
      <div style={{ ...monoLabel, marginBottom: 12, fontSize: 11, letterSpacing: '.18em' }}>MOMENTUM SIGNALS</div>
      <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {signals.map((signal, i) => {
          const isLast = i === signals.length - 1;
          return (
            <div
              key={signal.name}
              style={{
                ...cardStyle,
                ...(isLast ? { gridColumn: '1 / -1' } : {}),
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: 'grid',
                      placeItems: 'center',
                      ...(isEditorial
                        ? { background: 'var(--ink)', color: '#fff' }
                        : isNeumorphic
                          ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)', color: 'var(--color-primary)' }
                          : { background: 'rgba(139,92,246,.12)', color: 'var(--color-primary, #8b5cf6)' }),
                    }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 1.8 }}>
                      <path d={signal.icon} />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: 'var(--fg)', letterSpacing: '-.01em' }}>
                      {signal.name}
                    </div>
                    <div style={{ ...monoLabel, fontSize: 9 }}>{signal.weight} weight</div>
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontStyle: isEditorial ? 'italic' : 'normal',
                    fontSize: 28,
                    letterSpacing: '-.03em',
                    color: scoreColor(signal.score),
                  }}
                >
                  {signal.score}
                  <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.4 }}>/100</span>
                </div>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: isNeumorphic ? 'var(--surface, var(--bg))' : isEditorial ? 'var(--rule)' : 'rgba(255,255,255,.06)',
                  boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
                  overflow: 'hidden',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(signal.score, 1)}%`,
                    borderRadius: 3,
                    background: scoreColor(signal.score),
                    transition: 'width .8s ease',
                  }}
                />
              </div>

              {/* Explanation */}
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>{signal.explanation}</p>
            </div>
          );
        })}
      </div>

      {/* ── Momentum Trend Chart ── */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ ...monoLabel, fontSize: 11, letterSpacing: '.18em', marginBottom: 16 }}>MOMENTUM OVER TIME</div>
        {trendData.length < 2 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 160,
              color: 'var(--muted)',
              fontSize: 14,
              textAlign: 'center',
              ...(isNeumorphic ? { borderRadius: 16, boxShadow: 'var(--in-sm)' } : {}),
            }}
          >
            Score posts and connect platforms to build your momentum history.
          </div>
        ) : (
          <TrendChart data={trendData} theme={theme} />
        )}
      </div>

      {/* ── Action Items ── */}
      {actions.length > 0 && (
        <>
          <div style={{ ...monoLabel, fontSize: 11, letterSpacing: '.18em', marginBottom: 12 }}>
            NEXT ACTIONS
          </div>
          <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
            {actions.map((action, i) => (
              <div key={i} style={{ ...cardStyle, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '.1em',
                      padding: '3px 8px',
                      borderRadius: 4,
                      color: '#fff',
                      background: priorityColors[action.priority],
                      textTransform: 'uppercase',
                    }}
                  >
                    {action.priority}
                  </span>
                  <span style={{ ...monoLabel, fontSize: 9 }}>{action.signal}</span>
                </div>
                <h4
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: 16,
                    letterSpacing: '-.01em',
                    color: 'var(--fg)',
                    marginBottom: 4,
                  }}
                >
                  {action.title}
                </h4>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>{action.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ── Trend Chart (SVG) ── */

function TrendChart({ data, theme }: { data: TrendPoint[]; theme: string }) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const W = 900;
  const H = 200;
  const PAD_L = 40;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxScore = Math.max(...data.map((d) => d.score), 100);
  const pts = data.map((d, i) => ({
    x: PAD_L + (i / (data.length - 1)) * chartW,
    y: PAD_T + chartH - (d.score / maxScore) * chartH,
    date: d.date,
    score: d.score,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${PAD_T + chartH} L${PAD_L},${PAD_T + chartH} Z`;

  const gridStroke = isEditorial ? 'rgba(11,11,11,.1)' : isNeumorphic ? 'rgba(42,52,68,.1)' : 'rgba(255,255,255,.06)';
  const lineColor = isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--color-primary)' : '#c7b4ff';
  const labelColor = isEditorial ? '#666' : isNeumorphic ? 'var(--muted)' : 'rgba(255,255,255,.4)';

  // Y labels
  const yLabels = [0, 25, 50, 75, 100].map((val) => ({
    y: PAD_T + chartH - (val / maxScore) * chartH,
    label: String(val),
  }));

  // X labels
  const xIndices = [0, Math.floor(data.length / 2), data.length - 1];
  const xLabels = xIndices.map((idx) => ({ x: pts[idx].x, label: shortDate(data[idx].date) }));

  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 220, display: 'block' }}>
      <defs>
        <linearGradient id="vm-area-glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c7b4ff" stopOpacity=".4" />
          <stop offset="100%" stopColor="#c7b4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vm-area-ed" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0b0b0b" stopOpacity=".15" />
          <stop offset="100%" stopColor="#0b0b0b" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vm-area-neu" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5a78d0" stopOpacity=".2" />
          <stop offset="100%" stopColor="#5a78d0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid */}
      <g stroke={gridStroke} strokeDasharray="2 4">
        {yLabels.map((yl, i) => (
          <line key={i} x1={PAD_L} y1={yl.y} x2={W - PAD_R} y2={yl.y} />
        ))}
      </g>

      {/* Y labels */}
      <g fill={labelColor} fontFamily="var(--font-mono)" fontSize="10" letterSpacing="0.5">
        {yLabels.map((yl, i) => (
          <text key={i} x={PAD_L - 8} y={yl.y + 3} textAnchor="end">
            {yl.label}
          </text>
        ))}
      </g>

      {/* Area fill */}
      <path d={areaPath} fill={isEditorial ? 'url(#vm-area-ed)' : isNeumorphic ? 'url(#vm-area-neu)' : 'url(#vm-area-glass)'} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth={isEditorial ? 2.4 : 2} />

      {/* Marker on last point */}
      <circle cx={last.x} cy={last.y} r="6" fill={lineColor} />
      <circle cx={last.x} cy={last.y} r="12" fill={lineColor} fillOpacity=".15" />

      {/* X labels */}
      <g fill={labelColor} fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1">
        {xLabels.map((xl, i) => (
          <text
            key={i}
            x={xl.x}
            y={H - 2}
            textAnchor={i === xLabels.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}
          >
            {i === xLabels.length - 1 ? (isEditorial ? 'TODAY' : 'NOW') : xl.label.toUpperCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
