import { Platform, type ViewStyle, type TextStyle } from 'react-native';

/* ─── Color Palette (matches homepage Modern theme) ─── */
export const Colors = {
  dark: {
    background: '#0B1928',
    surface: '#112240',
    surfaceLight: '#1A2F50',
    primary: '#56A8D8',
    accent: '#FFB84D',
    text: '#E8F0FA',
    textSecondary: '#8BACC8',
    textMuted: '#5A7D9A',
    textFaint: '#2D4A63',
    border: 'rgba(75, 156, 211, 0.12)',
    cardBg: '#112240',
    success: '#4ADE80',
    error: '#ef4444',
    warning: '#f59e0b',
    tabBar: '#0B1928',
    inputBg: '#0D1E35',
    // Glassmorphism tokens
    glassBg: 'rgba(17, 34, 64, 0.55)',
    glassBorder: 'rgba(75, 156, 211, 0.18)',
    glassHighlight: 'rgba(75, 156, 211, 0.08)',
    // Shadows
    shadowDark: '#050e1a',
    shadowLight: '#1A2F50',
  },
  light: {
    background: '#F0F6FB',
    surface: '#ffffff',
    surfaceLight: '#E1EDF6',
    primary: '#3A8AC2',
    accent: '#e59420',
    text: '#0D2137',
    textSecondary: '#3D6A8A',
    textMuted: '#7A9CB8',
    textFaint: '#C2D6E5',
    border: 'rgba(58, 138, 194, 0.10)',
    cardBg: '#ffffff',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#d97706',
    tabBar: '#F0F6FB',
    inputBg: '#E8F0F8',
    // Glassmorphism tokens
    glassBg: 'rgba(255, 255, 255, 0.65)',
    glassBorder: 'rgba(58, 138, 194, 0.15)',
    glassHighlight: 'rgba(255, 255, 255, 0.8)',
    // Shadows
    shadowDark: '#b4c0cc',
    shadowLight: '#ffffff',
  },
} as const;

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = { [K in keyof typeof Colors.dark]: string };

/* ─── Glass Card Shadow ─── */
export function glassShadow(colors: ThemeColors): ViewStyle {
  return Platform.OS === 'ios'
    ? {
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      }
    : { elevation: 4 };
}

/* ─── Subtle shadow for small elements ─── */
export function glassShadowSm(colors: ThemeColors): ViewStyle {
  return Platform.OS === 'ios'
    ? {
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      }
    : { elevation: 2 };
}

/* ─── Glass card style (border + bg) ─── */
export function glassCard(colors: ThemeColors): ViewStyle {
  return {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...glassShadow(colors),
  } as ViewStyle;
}

/* ─── Inset / pressed style for inputs ─── */
export function glassInset(colors: ThemeColors): TextStyle & ViewStyle {
  return {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  } as any;
}

// Keep old names as aliases for compatibility during migration
export const neuShadow = glassShadow;
export const neuShadowSm = glassShadowSm;
export const neuInset = glassInset;

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
