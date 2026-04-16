/**
 * Exact color palette from `app-vision-mockup.html`. Use these alongside
 * the generic theme-context colors when a screen needs to match the mockup.
 */
import type { ThemeMode } from '../constants/theme';

export interface CockpitPalette {
  bgDeep: string;
  bgCard: string;
  bgElevated: string;
  border: string;
  borderActive: string;
  gold: string;
  goldDim: string;
  goldBorder: string;
  teal: string;
  tealDim: string;
  tealBorder: string;
  blue: string;
  blueDim: string;
  green: string;
  greenDim: string;
  red: string;
  redDim: string;
  purple: string;
  purpleDim: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  shadow: string;
  /** Color used for text sitting on a gold-filled button. */
  goldContrast: string;
}

const dark: CockpitPalette = {
  bgDeep: '#0b1120',
  bgCard: '#111d2e',
  bgElevated: '#1a2940',
  border: 'rgba(100,160,220,0.08)',
  borderActive: 'rgba(100,160,220,0.2)',
  gold: '#d4a843',
  goldDim: 'rgba(212,168,67,0.15)',
  goldBorder: 'rgba(212,168,67,0.2)',
  teal: '#3ecfcf',
  tealDim: 'rgba(62,207,207,0.12)',
  tealBorder: 'rgba(62,207,207,0.2)',
  blue: '#4a8eff',
  blueDim: 'rgba(74,142,255,0.12)',
  green: '#34d399',
  greenDim: 'rgba(52,211,153,0.1)',
  red: '#f87171',
  redDim: 'rgba(248,113,113,0.12)',
  purple: '#a78bfa',
  purpleDim: 'rgba(167,139,250,0.12)',
  textPrimary: '#e2e8f0',
  textSecondary: '#7a8ba3',
  textMuted: '#4a5a6f',
  shadow: 'rgba(0,0,0,0.3)',
  goldContrast: '#0b1120',
};

const light: CockpitPalette = {
  bgDeep: '#f0f2f5',
  bgCard: '#ffffff',
  bgElevated: '#e4e8ed',
  border: 'rgba(0,0,0,0.1)',
  borderActive: 'rgba(0,0,0,0.18)',
  gold: '#a07608',
  goldDim: 'rgba(160,118,8,0.1)',
  goldBorder: 'rgba(160,118,8,0.25)',
  teal: '#0d7d74',
  tealDim: 'rgba(13,125,116,0.08)',
  tealBorder: 'rgba(13,125,116,0.2)',
  blue: '#1d4ed8',
  blueDim: 'rgba(29,78,216,0.08)',
  green: '#15803d',
  greenDim: 'rgba(21,128,61,0.08)',
  red: '#b91c1c',
  redDim: 'rgba(185,28,28,0.08)',
  purple: '#6d28d9',
  purpleDim: 'rgba(109,40,217,0.08)',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#4b5563',
  shadow: 'rgba(0,0,0,0.1)',
  goldContrast: '#ffffff',
};

export function cockpit(mode: ThemeMode): CockpitPalette {
  return mode === 'light' ? light : dark;
}
