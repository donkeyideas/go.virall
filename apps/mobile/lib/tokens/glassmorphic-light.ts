export const glassmorphicLightTokens = {
  name: 'glassmorphic-light' as const,

  // Backgrounds — soft lavender-white
  bg: '#f4eeff',
  bgMid: '#e8e0f8',
  bgTop: '#ddd3f0',

  // Foreground — deep purple, high contrast
  fg: '#1a0e30',
  muted: 'rgba(26,14,48,0.6)',
  subtle: 'rgba(26,14,48,0.4)',
  faint: 'rgba(26,14,48,0.2)',

  // Surfaces (frosted on light — strong contrast so cards pop)
  surface: 'rgba(100,70,160,0.2)',
  surfaceStronger: 'rgba(100,70,160,0.3)',
  surfaceHover: 'rgba(100,70,160,0.4)',
  surfaceDarker: 'rgba(80,50,140,0.35)',
  line: 'rgba(80,40,160,0.3)',
  lineStronger: 'rgba(80,40,160,0.45)',
  lineGlow: 'rgba(139,92,246,0.35)',

  // Accent palette — deeper for light bg visibility
  violet: '#6d28d9',
  violetSoft: '#8b5cf6',
  rose: '#db2777',
  mint: '#059669',
  amber: '#d97706',
  cyan: '#0891b2',

  // Semantic
  primary: '#6d28d9',
  primarySoft: '#8b5cf6',
  accent: '#db2777',
  good: '#059669',
  warn: '#d97706',
  bad: '#dc2626',
  info: '#0891b2',

  // Gradients
  gradientPrimary: ['#6d28d9', '#db2777'] as [string, string],
  gradientHi: ['#8b5cf6', '#db2777'] as [string, string],
  gradientRing: ['#8b5cf6', '#db2777'] as [string, string],
  gradientTop: ['#8b5cf6', '#db2777', '#d97706'] as [string, string, string],

  // Typography — same fonts as glassmorphic
  fontDisplay: 'InstrumentSerif_400Regular',
  fontDisplayItalic: 'InstrumentSerif_400Regular_Italic',
  fontBody: 'Inter_400Regular',
  fontBodyMedium: 'Inter_500Medium',
  fontBodySemibold: 'Inter_600SemiBold',
  fontBodyBold: 'Inter_700Bold',
  fontMono: 'GeistMono_500Medium',

  // Radii — same as glassmorphic
  radiusSm: 10,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 24,
  radiusFull: 9999,

  // Shadows — visible on light bg
  shadowCard: {
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  shadowPrimary: {
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  shadowGlow: {
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },

  // Blur intensities
  blurSurface: 24,
  blurDrawer: 40,

  // Hairlines
  hairline: 'rgba(139,92,246,0.08)',
  innerHighlight: 'rgba(255,255,255,0.6)',
} as const;
