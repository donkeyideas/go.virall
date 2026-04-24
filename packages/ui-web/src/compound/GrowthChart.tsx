'use client';

type DataPoint = {
  date: string; // ISO date
  followers: number;
  engagement: number; // 0-100 scaled
  revenue: number;    // cents
};

type Props = {
  theme: string;
  data?: DataPoint[];
  currentFollowers?: number;
};

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function GrowthChart({ theme, data, currentFollowers = 0 }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const gridStroke = isEditorial ? 'rgba(11,11,11,.1)' : isNeumorphic ? 'rgba(42,52,68,.1)' : 'rgba(255,255,255,.06)';
  const line1Color = isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--color-primary)' : '#c7b4ff';
  const line2Color = isEditorial ? 'var(--hot)' : isNeumorphic ? '#c87878' : '#ff71a8';
  const line3Color = isEditorial ? 'var(--tangerine)' : isNeumorphic ? '#c39560' : '#ffb648';
  const labelColor = isEditorial ? '#666' : isNeumorphic ? 'var(--muted)' : 'rgba(255,255,255,.4)';
  const areaFill = isEditorial ? 'url(#area-ed)' : isNeumorphic ? 'url(#area-neu)' : 'url(#area-glass)';
  const markerColor = isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--color-primary)' : '#c7b4ff';

  const cardStyle: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 28 }
    : isNeumorphic
    ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 28, boxShadow: 'var(--out-md)' }
    : {
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: 'none',
        borderRadius: 20,
        padding: 26,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      };

  const hasEnoughData = data && data.length >= 2;

  // Compute chart dimensions & scale
  const W = 900;
  const H = 220;
  const PAD_L = 55; // left padding for Y-axis labels
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Build lines from data
  let followerPath = '';
  let engagementPath = '';
  let revenuePath = '';
  let areaPath = '';
  let xLabels: { x: number; label: string }[] = [];
  let yLabels: { y: number; label: string }[] = [];
  let markerX = 0;
  let markerY = 0;

  if (hasEnoughData) {
    const maxF = Math.max(...data.map((d) => d.followers), 1);
    const maxE = Math.max(...data.map((d) => d.engagement), 1);
    const maxR = Math.max(...data.map((d) => d.revenue), 1);

    const pts = data.map((d, i) => {
      const x = PAD_L + (i / (data.length - 1)) * chartW;
      return {
        x,
        yF: PAD_T + chartH - (d.followers / maxF) * chartH,
        yE: PAD_T + chartH - (d.engagement / maxE) * chartH,
        yR: PAD_T + chartH - (d.revenue / maxR) * chartH,
        date: d.date,
      };
    });

    followerPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.yF.toFixed(1)}`).join(' ');
    engagementPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.yE.toFixed(1)}`).join(' ');
    revenuePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.yR.toFixed(1)}`).join(' ');
    areaPath = followerPath + ` L${pts[pts.length - 1].x.toFixed(1)},${PAD_T + chartH} L${PAD_L},${PAD_T + chartH} Z`;

    // X labels (first, middle, last)
    const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
    xLabels = labelIndices.map((idx) => ({ x: pts[idx].x, label: shortDate(data[idx].date) }));

    // Y labels for followers
    const niceMax = Math.ceil(maxF / (maxF > 1000 ? 100 : 10)) * (maxF > 1000 ? 100 : 10);
    for (let i = 0; i <= 4; i++) {
      const val = (niceMax / 4) * i;
      const y = PAD_T + chartH - (val / maxF) * chartH;
      yLabels.push({ y, label: fmtK(Math.round(val)) });
    }

    // Marker on last point
    const last = pts[pts.length - 1];
    markerX = last.x;
    markerY = last.yF;
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 400,
              fontStyle: isEditorial ? 'italic' : 'normal',
              fontSize: isEditorial ? 32 : 22,
              letterSpacing: '-.02em',
              color: isEditorial ? 'var(--ink)' : 'var(--fg)',
            }}
          >
            Growth{' '}
            <em style={{ fontStyle: 'italic', color: isEditorial ? 'var(--hot)' : isNeumorphic ? 'var(--color-primary)' : 'var(--lilac)' }}>
              — {isEditorial ? 'last thirty days.' : '30 days'}
            </em>
          </h3>
          {isEditorial && <div style={{ fontSize: 13, color: '#444', marginTop: 4 }}>Three signals, one story.</div>}
        </div>
        <div
          style={{
            display: 'flex',
            gap: isEditorial ? 18 : 16,
            fontSize: 12,
            fontFamily: isEditorial ? 'var(--font-mono)' : 'inherit',
            letterSpacing: isEditorial ? '.08em' : 'normal',
            color: 'var(--muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: isEditorial ? 14 : 10, height: isEditorial ? 3 : 10, borderRadius: isEditorial ? 2 : 3, background: line1Color, display: 'inline-block' }} />
            {isEditorial ? 'FOLLOWERS' : 'Followers'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: isEditorial ? 14 : 10, height: isEditorial ? 3 : 10, borderRadius: isEditorial ? 2 : 3, background: line2Color, display: 'inline-block' }} />
            {isEditorial ? 'ENGAGEMENT' : 'Engagement'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: isEditorial ? 14 : 10, height: isEditorial ? 3 : 10, borderRadius: isEditorial ? 2 : 3, background: line3Color, display: 'inline-block' }} />
            {isEditorial ? 'REVENUE' : 'Revenue'}
          </span>
        </div>
      </div>

      {!hasEnoughData ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          height: 180,
          color: 'var(--muted)',
          fontSize: 14,
          textAlign: 'center',
          ...(isNeumorphic ? { borderRadius: 16, boxShadow: 'var(--in-sm)' } : {}),
        }}>
          {currentFollowers > 0 ? (
            <>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                fontWeight: isEditorial ? 900 : 400,
                color: isEditorial ? 'var(--ink)' : 'var(--fg)',
                letterSpacing: '-.02em',
              }}>
                {fmtK(currentFollowers)} followers
              </div>
              <div style={{ fontSize: 13 }}>
                Growth tracking started today. Check back tomorrow for trends.
              </div>
            </>
          ) : (
            <div>Connect a platform to see growth trends here.</div>
          )}
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 260, display: 'block' }}>
          <defs>
            <linearGradient id="area-glass" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c7b4ff" stopOpacity=".5" />
              <stop offset="100%" stopColor="#c7b4ff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="area-ed" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0b0b0b" stopOpacity=".18" />
              <stop offset="100%" stopColor="#0b0b0b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="area-neu" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5a78d0" stopOpacity=".2" />
              <stop offset="100%" stopColor="#5a78d0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <g stroke={gridStroke} strokeDasharray="2 4">
            {yLabels.map((yl, i) => (
              <line key={i} x1={PAD_L} y1={yl.y} x2={W - PAD_R} y2={yl.y} />
            ))}
          </g>

          {/* Y-axis labels */}
          <g fill={labelColor} fontFamily="var(--font-mono)" fontSize="10" letterSpacing="0.5">
            {yLabels.map((yl, i) => (
              <text key={i} x={PAD_L - 8} y={yl.y + 3} textAnchor="end">{yl.label}</text>
            ))}
          </g>

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill={areaFill} />}

          {/* Line 1 - Followers */}
          {followerPath && (
            <path d={followerPath} fill="none" stroke={line1Color} strokeWidth={isEditorial ? 2.4 : 2} />
          )}

          {/* Line 2 - Engagement */}
          {engagementPath && (
            <path d={engagementPath} fill="none" stroke={line2Color} strokeWidth="2" opacity=".9" />
          )}

          {/* Line 3 - Revenue */}
          {revenuePath && (
            <path d={revenuePath} fill="none" stroke={line3Color} strokeWidth="2" opacity=".85" />
          )}

          {/* Marker on last follower point */}
          <circle cx={markerX} cy={markerY} r="6" fill={markerColor} />
          <circle cx={markerX} cy={markerY} r="12" fill={markerColor} fillOpacity=".15" />

          {/* X labels */}
          <g fill={labelColor} fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1">
            {xLabels.map((xl, i) => (
              <text key={i} x={xl.x} y={H - 2} textAnchor={i === xLabels.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}>
                {i === xLabels.length - 1 ? (isEditorial ? 'TODAY' : 'NOW') : xl.label.toUpperCase()}
              </text>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
}
