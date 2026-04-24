// Neon Editorial theme tokens — extracted from 02-neon-editorial.html
// DO NOT modify these values unless the reference HTML changes.

export const neonEditorialTokens = {
  name: 'neon-editorial' as const,

  // Backgrounds
  bg: '#f4ecde',
  bgMid: '#ebe1cf',
  bgTop: '#e4d7c0',

  // Foreground
  fg: '#0b0b0b',
  ink: '#0b0b0b',
  muted: '#6b6559',
  subtle: '#8b8478',
  faint: '#a4a093',

  // Surfaces — solid cream, no opacity
  surface: '#f4ecde',
  surfaceAlt: '#ebe1cf',
  line: '#0b0b0b',
  lineWidth: 1.5,
  lineWidthThick: 2,

  // Accent palette
  lime: '#c8ff3d',
  limeDark: '#9ecc21',
  pink: '#ff3e88',
  pinkDark: '#d9256a',
  mustard: '#e8b92b',
  blue: '#1c4bff',
  mint: '#43d9a6',
  lilac: '#c7a9ff',

  // Semantic
  primary: '#c8ff3d',
  primarySoft: '#c8ff3d',
  accent: '#ff3e88',
  good: '#c8ff3d',
  warn: '#e8b92b',
  bad: '#ff3e88',
  info: '#1c4bff',

  // No gradients — editorial uses solid fills only

  // Typography — loaded font family names
  fontDisplay: 'Fraunces_500Medium',
  fontDisplayItalic: 'Fraunces_500Medium_Italic',
  fontDisplayBold: 'Fraunces_700Bold',
  fontBody: 'Manrope_400Regular', // Satoshi not on Google Fonts, Manrope as fallback
  fontBodyMedium: 'Manrope_500Medium',
  fontBodySemibold: 'Manrope_600SemiBold',
  fontBodyBold: 'Manrope_700Bold',
  fontMono: 'JetBrainsMono_600SemiBold',
  fontMonoBold: 'JetBrainsMono_700Bold',

  // Radii — everything is sharp
  radiusSm: 0,
  radiusMd: 2,
  radiusLg: 2,
  radiusXl: 2,
  radiusFull: 9999,

  // Shadows — hard offsets, zero blur, ink color
  shadowCard: {
    shadowColor: '#0b0b0b',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  shadowCardSmall: {
    shadowColor: '#0b0b0b',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  shadowButton: {
    shadowColor: '#0b0b0b',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },

  // Border treatments
  border: {
    width: 1.5,
    color: '#0b0b0b',
  },
  borderThick: {
    width: 2,
    color: '#0b0b0b',
  },
} as const;
