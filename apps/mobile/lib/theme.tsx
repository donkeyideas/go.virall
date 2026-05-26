import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { glassmorphicTokens } from './tokens/glassmorphic';
import { glassmorphicLightTokens } from './tokens/glassmorphic-light';
import { neonEditorialTokens } from './tokens/neon-editorial';
import { neonEditorialDarkTokens } from './tokens/neon-editorial-dark';
import type { NeumorphicTheme } from './tokens/neumorphic';

// ── Types ──────────────────────────────────────────────────────────────
export type ThemeName = 'glassmorphic' | 'glassmorphic-light' | 'neon-editorial' | 'neon-editorial-dark';
export type ThemeStyle = 'glassmorphic' | 'neon-editorial';
export type ColorMode = 'dark' | 'light';

export type GlassmorphicTheme = typeof glassmorphicTokens;
export type GlassmorphicLightTheme = typeof glassmorphicLightTokens;
export type NeonEditorialTheme = typeof neonEditorialTokens;
export type NeonEditorialDarkTheme = typeof neonEditorialDarkTokens;
export type { NeumorphicTheme };

export type ThemeTokens = GlassmorphicTheme | GlassmorphicLightTheme | NeonEditorialTheme | NeonEditorialDarkTheme | NeumorphicTheme;

// Helper type guards — match BOTH dark and light variants of each style
export function isGlass(t: ThemeTokens): t is GlassmorphicTheme | GlassmorphicLightTheme {
  return t.name === 'glassmorphic' || t.name === 'glassmorphic-light';
}
export function isEditorial(t: ThemeTokens): t is NeonEditorialTheme | NeonEditorialDarkTheme {
  return t.name === 'neon-editorial' || t.name === 'neon-editorial-dark';
}
export function isNeumorphic(t: ThemeTokens): t is NeumorphicTheme {
  return false;
}
export function isDark(t: ThemeTokens): boolean {
  return t.name === 'glassmorphic' || t.name === 'neon-editorial-dark';
}

// ── Helpers ───────────────────────────────────────────────────────────
export function getStyle(theme: ThemeName): ThemeStyle {
  return theme.startsWith('glassmorphic') ? 'glassmorphic' : 'neon-editorial';
}
export function getMode(theme: ThemeName): ColorMode {
  if (theme === 'glassmorphic' || theme === 'neon-editorial-dark') return 'dark';
  return 'light';
}
export function buildThemeName(style: ThemeStyle, mode: ColorMode): ThemeName {
  if (style === 'glassmorphic') return mode === 'dark' ? 'glassmorphic' : 'glassmorphic-light';
  return mode === 'dark' ? 'neon-editorial-dark' : 'neon-editorial';
}

// ── Theme map ──────────────────────────────────────────────────────────
const THEME_MAP: Record<ThemeName, ThemeTokens> = {
  'glassmorphic': glassmorphicTokens,
  'glassmorphic-light': glassmorphicLightTokens,
  'neon-editorial': neonEditorialTokens,
  'neon-editorial-dark': neonEditorialDarkTokens,
};

// ── Context ────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme: ThemeName;
  tokens: ThemeTokens;
  setTheme: (t: ThemeName) => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = '@govirall/theme';
const VALID_THEMES: ThemeName[] = ['glassmorphic', 'glassmorphic-light', 'neon-editorial', 'neon-editorial-dark'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('glassmorphic');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && VALID_THEMES.includes(stored as ThemeName)) {
        setThemeState(stored as ThemeName);
      }
      setReady(true);
    });
  }, []);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    AsyncStorage.setItem(STORAGE_KEY, t);
  }, []);

  const tokens = useMemo(() => THEME_MAP[theme], [theme]);

  return (
    <ThemeContext.Provider value={{ theme, tokens, setTheme, ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function useTokens(): ThemeTokens {
  return useTheme().tokens;
}
