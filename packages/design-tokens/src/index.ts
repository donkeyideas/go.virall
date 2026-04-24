// @govirall/design-tokens
// Shared tokens (theme-independent)

export const spacing = {
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
} as const;

export const fontSize = {
  micro: ['0.6875rem', { lineHeight: '0.9rem', letterSpacing: '0.02em' }],
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.5rem' }],
  xl: ['1.25rem', { lineHeight: '1.625rem' }],
  '2xl': ['1.75rem', { lineHeight: '2rem' }],
  '3xl': ['2.25rem', { lineHeight: '2.5rem' }],
  '4xl': ['3rem', { lineHeight: '3.25rem' }],
  '5xl': ['3.75rem', { lineHeight: '1' }],
  '6xl': ['4.75rem', { lineHeight: '1' }],
  '7xl': ['5.5rem', { lineHeight: '1' }],
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const screens = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const duration = {
  instant: '75ms',
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
  slowest: '800ms',
} as const;

export const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const z = {
  base: 0,
  raised: 10,
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  drawer: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  max: 9999,
} as const;

export type Theme = 'glassmorphic' | 'neon-editorial' | 'neumorphic';

export const THEMES: Theme[] = ['glassmorphic', 'neon-editorial', 'neumorphic'];

export const THEME_LABELS: Record<Theme, string> = {
  glassmorphic: 'Glassmorphic',
  'neon-editorial': 'Neon Editorial',
  neumorphic: 'Neumorphic',
};

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  glassmorphic: 'Dark, dimensional, gradient-accented. Frosted glass surfaces with violet and rose.',
  'neon-editorial': 'Cream paper, ink borders, hard shadows. Magazine typography with lime and pink.',
  neumorphic: 'Soft gray surface, gentle shadows. Calm and tactile with periwinkle accents.',
};

// Platform colors (for charts)
export const PLATFORM_COLORS = {
  glassmorphic: {
    instagram: '#c7b4ff',
    tiktok: '#ff71a8',
    youtube: '#ffb648',
    linkedin: '#8affc1',
    x: '#6be3ff',
  },
  'neon-editorial': {
    instagram: '#c8ff3d',
    tiktok: '#ff3e88',
    youtube: '#e8b92b',
    linkedin: '#1c4bff',
    x: '#43d9a6',
  },
  neumorphic: {
    instagram: '#5a78d0',
    tiktok: '#c87878',
    youtube: '#c39560',
    linkedin: '#6aa684',
    x: '#8098db',
  },
} as const;

export { glassmorphic } from './glassmorphic';
export { neonEditorial } from './neon-editorial';
export { neumorphic } from './neumorphic';
export { getThemeColors } from './runtime';
