'use client';

import Link from 'next/link';

const TOOLS = [
  {
    href: '/studio/ideas',
    title: 'Post Ideas',
    subtitle: 'Brainstorm mode',
    description: 'Generate dozens of content ideas with hooks, angles, and format recommendations.',
    accentVar: '--violet',
    accentFallback: '#8b5cf6',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    href: '/studio/captions',
    title: 'Captions',
    subtitle: 'Writer mode',
    description: 'Craft polished, ready-to-post captions with CTAs and character count tracking.',
    accentVar: '--rose',
    accentFallback: '#f43f5e',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    href: '/studio/scripts',
    title: 'Scripts',
    subtitle: 'Production mode',
    description: 'Structured video scripts with hooks, timing cues, and visual notes.',
    accentVar: '--amber',
    accentFallback: '#f59e0b',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" />
      </svg>
    ),
  },
  {
    href: '/studio/bio',
    title: 'Bio',
    subtitle: 'Branding mode',
    description: 'Optimized profile bios with keywords, style variants, and character limits.',
    accentVar: '--emerald',
    accentFallback: '#10b981',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function StudioHub({ theme }: { theme: string }) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const cardBase: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 32 }
    : isNeumorphic
    ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 32, boxShadow: 'var(--out-md)' }
    : {
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: 'none',
        borderRadius: 20,
        padding: 32,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      };

  return (
    <>
      {/* Page heading */}
      <div style={{ marginBottom: 40 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            WORKSPACE · CONTENT STUDIO
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
            <>Content <span style={{ fontWeight: 900, fontStyle: 'normal' }}>Studio.</span></>
          ) : (
            'Content Studio'
          )}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, maxWidth: 480 }}>
          AI-powered tools to generate content tailored to every platform. Pick a tool to get started.
        </p>
      </div>

      {/* Tool cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                ...cardBase,
                cursor: 'pointer',
                transition: 'transform .15s, box-shadow .15s',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                minHeight: 200,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                if (!isNeumorphic) e.currentTarget.style.boxShadow = `0 24px 70px -20px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = '';
                if (!isNeumorphic) e.currentTarget.style.boxShadow = cardBase.boxShadow as string ?? '';
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: isNeumorphic ? 16 : 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isEditorial ? 'var(--ink)' : `var(${tool.accentVar}, ${tool.accentFallback})`,
                  ...(isEditorial
                    ? { background: 'var(--paper-2, rgba(0,0,0,.05))' }
                    : isNeumorphic
                    ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
                    : { background: `color-mix(in srgb, ${tool.accentFallback} 12%, transparent)` }),
                }}
              >
                {tool.icon}
              </div>

              {/* Title + subtitle */}
              <div>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: isEditorial ? 900 : 600,
                    fontFamily: 'var(--font-display)',
                    color: isEditorial ? 'var(--ink)' : 'var(--fg)',
                    marginBottom: 2,
                  }}
                >
                  {tool.title}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase' as const,
                    color: isEditorial ? 'var(--muted)' : `var(${tool.accentVar}, ${tool.accentFallback})`,
                  }}
                >
                  {tool.subtitle}
                </span>
              </div>

              {/* Description */}
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 'auto' }}>
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
