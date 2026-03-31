export const Colors = {
  dark: {
    background: '#0C0A14',
    surface: '#16132A',
    surfaceLight: '#1E1A36',
    primary: '#E8B04A',
    accent: '#7C6BFF',
    text: '#F4F0FB',
    textSecondary: '#9B95B0',
    textMuted: '#6B6580',
    border: 'rgba(124,107,255,0.15)',
    cardBg: 'rgba(22,19,42,0.85)',
    success: '#34D399',
    error: '#EF4444',
    warning: '#F59E0B',
    tabBar: 'rgba(12,10,20,0.95)',
    inputBg: 'rgba(30,26,54,0.8)',
  },
  light: {
    background: '#F5F3F0',
    surface: '#FFFFFF',
    surfaceLight: '#F0EDE8',
    primary: '#C4922A',
    accent: '#6355D8',
    text: '#1A1625',
    textSecondary: '#6B6580',
    textMuted: '#9B95B0',
    border: 'rgba(99,85,216,0.15)',
    cardBg: 'rgba(255,255,255,0.9)',
    success: '#059669',
    error: '#DC2626',
    warning: '#D97706',
    tabBar: 'rgba(245,243,240,0.95)',
    inputBg: 'rgba(240,237,232,0.8)',
  },
} as const;

export type ThemeMode = 'dark' | 'light';
export type ThemeColors = { [K in keyof typeof Colors.dark]: string };

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
