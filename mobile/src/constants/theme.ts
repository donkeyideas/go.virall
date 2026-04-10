import { Platform, type ViewStyle, type TextStyle } from 'react-native';

/* ─── Color Palette ─── */
export const Colors = {
  dark: {
    background: '#0c1829',
    surface: '#10203a',
    surfaceLight: '#1a2d47',
    primary: '#38bdf8',
    accent: '#7dd3fc',
    text: '#e2e8f0',
    textSecondary: '#8bacc8',
    textMuted: '#4a6a8a',
    border: '#162a42',
    cardBg: '#10203a',
    success: '#22c55e',
    error: '#f43f5e',
    warning: '#f59e0b',
    tabBar: '#0c1829',
    inputBg: '#0a1522',
    // Neumorphic shadow pair
    shadowDark: '#060e1a',
    shadowLight: '#1c3a5c',
    // Gradient stops for neumorphic cards
    gradientLight: '#142c4a',
    gradientDark: '#0b1825',
  },
  light: {
    background: '#dfe6ee',
    surface: '#dfe6ee',
    surfaceLight: '#cdd6e0',
    primary: '#2d8ad4',
    accent: '#4ba3e8',
    text: '#1a2535',
    textSecondary: '#4a5c72',
    textMuted: '#7b8ea5',
    border: '#c4d0dc',
    cardBg: '#dfe6ee',
    success: '#16a34a',
    error: '#e11d48',
    warning: '#d97706',
    tabBar: '#dfe6ee',
    inputBg: '#d2dbe6',
    shadowDark: '#b4c0cc',
    shadowLight: '#ffffff',
    gradientLight: '#eaf0f6',
    gradientDark: '#d2dae4',
  },
} as const;

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = { [K in keyof typeof Colors.dark]: string };

/* ─── Neumorphic Shadow Helpers ─── */

/** Raised neumorphic effect for cards / containers */
export function neuShadow(colors: ThemeColors): ViewStyle {
  return {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopColor: colors.shadowLight,
    borderLeftColor: colors.shadowLight,
    borderBottomColor: colors.shadowDark,
    borderRightColor: colors.shadowDark,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.shadowDark,
          shadowOffset: { width: 4, height: 4 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
        }
      : { elevation: 6 }),
  } as ViewStyle;
}

/** Subtle raised effect for buttons / pills / small elements */
export function neuShadowSm(colors: ThemeColors): ViewStyle {
  return {
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderTopColor: colors.shadowLight,
    borderLeftColor: colors.shadowLight,
    borderBottomColor: colors.shadowDark,
    borderRightColor: colors.shadowDark,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.shadowDark,
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 0.45,
          shadowRadius: 5,
        }
      : { elevation: 3 }),
  } as ViewStyle;
}

/** Inset / pressed effect for inputs (TextStyle-safe) */
export function neuInset(colors: ThemeColors): TextStyle {
  return {
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderBottomWidth: 0.5,
    borderRightWidth: 0.5,
    borderTopColor: colors.shadowDark,
    borderLeftColor: colors.shadowDark,
    borderBottomColor: colors.shadowLight,
    borderRightColor: colors.shadowLight,
  } as TextStyle;
}

/* ─── Design Tokens ─── */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 28,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;
