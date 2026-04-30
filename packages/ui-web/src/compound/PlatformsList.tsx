'use client';

type Platform = {
  id: string;
  platform: string;
  handle: string | null;
  follower_count: number | null;
  share: number;
};

type Props = {
  platforms: Platform[];
  theme: string;
};

const PLATFORM_ICONS: Record<string, { svg: string; bg: string }> = {
  instagram: {
    bg: 'linear-gradient(135deg, #feda75, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5)',
    svg: '<path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="white"/>',
  },
  tiktok: {
    bg: '#000',
    svg: '<path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" fill="white"/>',
  },
  youtube: {
    bg: '#ff0000',
    svg: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58ZM9.75 15.02V8.98L15.5 12l-5.75 3.02Z" fill="white"/>',
  },
  linkedin: {
    bg: '#0a66c2',
    svg: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2ZM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="white"/>',
  },
  x: {
    bg: '#000',
    svg: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" fill="white"/>',
  },
  facebook: {
    bg: '#1877F2',
    svg: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3V2Z" fill="white"/>',
  },
  twitch: {
    bg: '#9146FF',
    svg: '<path d="M21 2H3v16h5v4l4-4h5l4-4V2Zm-10 9V7m5 4V7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  },
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X · Twitter',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

export function PlatformsList({ platforms, theme }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  return (
    <div
      style={{
        padding: 24,
        ...(isEditorial
          ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)' }
          : isNeumorphic
          ? { borderRadius: 24, background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-md)' }
          : {
              background: 'var(--glass, rgba(255,255,255,.06))',
              backdropFilter: 'blur(24px) saturate(1.2)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
            }),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <h3
          style={{
            fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
            fontWeight: isEditorial ? 900 : isNeumorphic ? 500 : 400,
            fontStyle: isEditorial ? 'italic' : isNeumorphic ? 'italic' : 'normal',
            fontSize: isEditorial ? 30 : isNeumorphic ? 22 : 20,
            color: isEditorial ? 'var(--ink)' : 'var(--ink, var(--fg))',
          }}
        >
          Follower Share{isEditorial ? '.' : ''}
        </h3>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '4px 10px',
            borderRadius: 999,
            letterSpacing: '.14em',
            ...(isEditorial
              ? { border: '1.5px solid var(--ink)' }
              : isNeumorphic
              ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)', color: 'var(--muted)' }
              : { background: 'var(--glass-2, rgba(255,255,255,.10))', color: 'var(--muted)' }),
          }}
        >
          {platforms.length} CONNECTED
        </span>
      </div>

      {platforms.map((p, i) => (
        <div
          key={p.id}
          style={{
            display: 'grid',
            gridTemplateColumns: isEditorial ? '32px 1fr 85px 44px' : '30px 1fr 80px 60px',
            gap: 12,
            alignItems: 'center',
            padding: isEditorial ? '11px 0' : isNeumorphic ? '11px 0' : '10px 0',
            borderBottom:
              i < platforms.length - 1
                ? `1px ${isNeumorphic ? 'solid' : 'dashed'} ${isEditorial ? 'var(--rule)' : isNeumorphic ? 'var(--faint, rgba(0,0,0,.06))' : 'var(--line)'}`
                : 'none',
            fontSize: isEditorial ? 13.5 : 13,
          }}
        >
          <div
            style={{
              width: isEditorial ? 30 : 28,
              height: isEditorial ? 30 : 28,
              borderRadius: isNeumorphic ? 10 : 8,
              display: 'grid',
              placeItems: 'center',
              background: PLATFORM_ICONS[p.platform]?.bg ?? 'var(--muted)',
              border: isEditorial ? '1.5px solid var(--ink)' : 'none',
              flexShrink: 0,
              ...(isNeumorphic ? { boxShadow: '0 2px 6px rgba(0,0,0,.12)' } : {}),
            }}
            dangerouslySetInnerHTML={{
              __html: `<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${PLATFORM_ICONS[p.platform]?.svg ?? ''}</svg>`,
            }}
          />
          <div>
            <div style={{ fontWeight: isEditorial ? 600 : 500, color: isNeumorphic ? 'var(--ink, var(--fg))' : undefined }}>
              {PLATFORM_LABELS[p.platform] ?? p.platform}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: isEditorial ? '#666' : 'var(--muted)',
              }}
            >
              {p.handle ? `@${p.handle}` : '—'}
              {p.follower_count ? (
                <span style={{ fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                  {` · ${formatCount(p.follower_count)}`}
                </span>
              ) : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                flex: 1,
                height: isEditorial ? 7 : isNeumorphic ? 6 : 6,
                border: isEditorial ? '1.5px solid var(--ink)' : 'none',
                borderRadius: isNeumorphic ? 999 : isEditorial ? 999 : 3,
                overflow: 'hidden',
                background: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--surface, var(--bg))' : 'var(--glass-2, rgba(255,255,255,.10))',
                ...(isNeumorphic ? { boxShadow: 'var(--in-sm)' } : {}),
              }}
            >
              <div
                style={{
                  width: `${p.share}%`,
                  height: '100%',
                  background: isEditorial
                    ? 'var(--ink)'
                    : isNeumorphic
                    ? 'linear-gradient(90deg, #8098db, #5a78d0)'
                    : 'linear-gradient(90deg, var(--violet), var(--rose))',
                  borderRadius: isNeumorphic ? 999 : isEditorial ? 999 : 3,
                  display: 'block',
                }}
              />
            </div>
          </div>
          <div
            style={{
              fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
              fontVariantNumeric: 'tabular-nums',
              fontSize: 12,
              textAlign: 'right',
              fontWeight: isEditorial ? 700 : isNeumorphic ? 500 : 400,
              color: isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--accent, var(--color-primary))' : 'var(--lilac)',
            }}
          >
            {p.share}%
          </div>
        </div>
      ))}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
