export const neonEditorialDarkTokens = {
  name: 'neon-editorial-dark' as const,

  // Backgrounds — deep dark
  bg: '#0d0d12',
  bgMid: '#141419',
  bgTop: '#1a1a22',

  // Foreground — warm off-white on dark
  fg: '#e2ddd5',
  ink: '#e2ddd5',
  muted: '#7a7570',
  subtle: '#5a5550',
  faint: '#3a3835',

  // Surfaces — dark with subtle warmth
  surface: '#141419',
  surfaceAlt: '#1a1a22',
  line: '#2e2c28',
  lineWidth: 1.5,
  lineWidthThick: 2,

  // Accent palette — dark green primary, muted complements
  lime: '#2d8a4e',
  limeDark: '#246e3e',
  pink: '#c4506a',
  pinkDark: '#9e3f55',
  mustard: '#b89430',
  blue: '#5580b8',
  mint: '#3a9e78',
  lilac: '#9478b8',

  // Semantic
  primary: '#2d8a4e',
  primarySoft: '#3a9e78',
  accent: '#c4506a',
  good: '#2d8a4e',
  warn: '#b89430',
  bad: '#c4506a',
  info: '#5580b8',

  // Typography — same fonts as editorial
  fontDisplay: 'Fraunces_500Medium',
  fontDisplayItalic: 'Fraunces_500Medium_Italic',
  fontDisplayBold: 'Fraunces_700Bold',
  fontBody: 'Manrope_400Regular',
  fontBodyMedium: 'Manrope_500Medium',
  fontBodySemibold: 'Manrope_600SemiBold',
  fontBodyBold: 'Manrope_700Bold',
  fontMono: 'JetBrainsMono_600SemiBold',
  fontMonoBold: 'JetBrainsMono_700Bold',

  // Radii — sharp, same as editorial
  radiusSm: 0,
  radiusMd: 2,
  radiusLg: 2,
  radiusXl: 2,
  radiusFull: 9999,

  // Shadows — subtle on dark
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
  },
  shadowCardSmall: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
  },
  shadowButton: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
  },

  // Border treatments — muted on dark
  border: {
    width: 1.5,
    color: '#2e2c28',
  },
  borderThick: {
    width: 2,
    color: '#3a3835',
  },
} as const;
