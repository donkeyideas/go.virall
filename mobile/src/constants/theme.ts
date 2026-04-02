export const Colors = {
  dark: {
    background: '#1A1035',
    surface: '#2A1B54',
    surfaceLight: '#33225E',
    primary: '#FFB84D',
    accent: '#8B5CF6',
    text: '#F0ECF8',
    textSecondary: '#8A7AAE',
    textMuted: '#6B5D8E',
    border: 'rgba(139,92,246,0.08)',
    cardBg: 'rgba(42,27,84,0.85)',
    success: '#4ADE80',
    error: '#EF4444',
    warning: '#F59E0B',
    tabBar: 'rgba(26,16,53,0.95)',
    inputBg: 'rgba(51,34,94,0.8)',
  },
  light: {
    background: '#F5F3FF',
    surface: '#FFFFFF',
    surfaceLight: '#EDE9FE',
    primary: '#E59420',
    accent: '#7C3AED',
    text: '#1E1245',
    textSecondary: '#5B4D8A',
    textMuted: '#9B8FBF',
    border: 'rgba(124,58,237,0.08)',
    cardBg: 'rgba(255,255,255,0.9)',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#D97706',
    tabBar: 'rgba(245,243,255,0.95)',
    inputBg: 'rgba(237,233,254,0.8)',
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
