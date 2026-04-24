// Glassmorphic theme tokens — extracted from 01-glassmorphic.html
// DO NOT modify these values unless the reference HTML changes.

export const glassmorphicTokens = {
  name: 'glassmorphic' as const,

  // Backgrounds
  bg: '#0a0618',
  bgMid: '#120a27',
  bgTop: '#1b1236',

  // Foreground
  fg: '#f6f3ff',
  muted: 'rgba(246,243,255,0.6)',
  subtle: 'rgba(246,243,255,0.5)',
  faint: 'rgba(246,243,255,0.4)',

  // Surfaces (glass)
  surface: 'rgba(255,255,255,0.05)',
  surfaceStronger: 'rgba(255,255,255,0.08)',
  surfaceHover: 'rgba(255,255,255,0.12)',
  line: 'rgba(255,255,255,0.12)',
  lineStronger: 'rgba(255,255,255,0.2)',
  lineGlow: 'rgba(199,180,255,0.3)',

  // Accent palette
  violet: '#8b5cf6',
  violetSoft: '#c7b4ff',
  rose: '#ff71a8',
  mint: '#8affc1',
  amber: '#ffb648',
  cyan: '#6be3ff',

  // Semantic
  primary: '#8b5cf6',
  primarySoft: '#c7b4ff',
  accent: '#ff71a8',
  good: '#8affc1',
  warn: '#ffb648',
  bad: '#ff71a8',
  info: '#6be3ff',

  // Gradients
  gradientPrimary: ['#8b5cf6', '#ff71a8'] as [string, string],
  gradientHi: ['#c7b4ff', '#ff71a8'] as [string, string],
  gradientRing: ['#c7b4ff', '#ff71a8'] as [string, string],
  gradientTop: ['#c7b4ff', '#ff71a8', '#ffb648'] as [string, string, string],

  // Typography — loaded font family names
  fontDisplay: 'InstrumentSerif_400Regular',
  fontDisplayItalic: 'InstrumentSerif_400Regular_Italic',
  fontBody: 'Inter_400Regular',
  fontBodyMedium: 'Inter_500Medium',
  fontBodySemibold: 'Inter_600SemiBold',
  fontBodyBold: 'Inter_700Bold',
  fontMono: 'GeistMono_500Medium',

  // Radii
  radiusSm: 10,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 24,
  radiusFull: 9999,

  // Shadows (iOS)
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },
  shadowPrimary: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
  },
  shadowGlow: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },

  // Blur intensities (expo-blur)
  blurSurface: 24,
  blurDrawer: 40,

  // Hairlines
  hairline: 'rgba(255,255,255,0.08)',
  innerHighlight: 'rgba(255,255,255,0.06)',
} as const;
