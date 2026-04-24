// Neumorphic theme tokens — extracted from 03-neumorphic.html
// DO NOT modify these values unless the reference HTML changes.

import { Platform, type ViewStyle } from 'react-native';

const isIOS = Platform.OS === 'ios';

// Shadow stacks — platform-aware:
// iOS: dual nested Views with paired light/dark CSS shadows
// Android: elevation + subtle border highlights (no native multi-shadow support)
function makeShadowStack(
  elevation: number,
  darkOffset: number,
  radius: number,
) {
  const outer: ViewStyle = isIOS
    ? { shadowColor: '#a7adb8', shadowOffset: { width: darkOffset, height: darkOffset }, shadowOpacity: 1, shadowRadius: radius }
    : { elevation, backgroundColor: '#e4e9f0', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' };

  const inner: ViewStyle = isIOS
    ? { shadowColor: '#ffffff', shadowOffset: { width: -darkOffset, height: -darkOffset }, shadowOpacity: 1, shadowRadius: radius }
    : { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.4)', borderLeftColor: 'rgba(167,173,184,0.4)', borderBottomColor: 'rgba(255,255,255,0.7)', borderRightColor: 'rgba(255,255,255,0.7)' };

  return { outer, inner };
}

export const neumorphicTokens = {
  name: 'neumorphic' as const,

  // Single surface color — everything lives on this
  bg: '#e4e9f0',
  surface: '#e4e9f0',
  surfaceLighter: '#eef2f7',
  surfaceDarker: '#c7ccd4',

  // Foreground
  fg: '#425268',
  ink: '#2a3444',
  text: '#425268',
  muted: '#7b8699',
  faint: '#a4adbd',

  // Shadow colors (paired light + dark)
  shadowLight: '#ffffff',
  shadowDark: '#a7adb8',

  // Accent palette (muted — neumorphic is tonal)
  accent: '#5a78d0',
  accentSoft: '#8098db',
  accentDark: '#3d5bb8',

  // Semantic
  primary: '#5a78d0',
  primarySoft: '#8098db',
  good: '#6aa684',
  warn: '#c39560',
  bad: '#c87878',

  // Typography — loaded font family names
  fontDisplay: 'Fraunces_400Regular',
  fontDisplayItalic: 'Fraunces_500Medium_Italic',
  fontDisplayBold: 'Fraunces_600SemiBold',
  fontBody: 'Manrope_400Regular',
  fontBodyMedium: 'Manrope_500Medium',
  fontBodySemibold: 'Manrope_600SemiBold',
  fontBodyBold: 'Manrope_700Bold',
  fontBodyExtraBold: 'Manrope_800ExtraBold',
  fontMono: 'Manrope_700Bold', // neumorphic doesn't use a separate mono

  // Radii — softer than neon, not as soft as glassmorphic
  radiusSm: 12,
  radiusMd: 16,
  radiusLg: 22,
  radiusXl: 28,
  radiusFull: 9999,

  // Shadow stacks — "Out" = raised, "In" = pressed
  // Platform-aware: iOS gets real shadows, Android gets elevation + border highlights
  shadowOutSm: makeShadowStack(4, 4, 10),
  shadowOutMd: makeShadowStack(8, 8, 20),
  shadowOutLg: makeShadowStack(12, 14, 30),
};
