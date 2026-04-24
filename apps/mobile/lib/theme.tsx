import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { glassmorphicTokens } from './tokens/glassmorphic';
import { neonEditorialTokens } from './tokens/neon-editorial';
import { neumorphicTokens } from './tokens/neumorphic';

// ── Types ──────────────────────────────────────────────────────────────
export type ThemeName = 'glassmorphic' | 'neon-editorial' | 'neumorphic';

// The full token set for each theme — components consume this via useTheme()
export type GlassmorphicTheme = typeof glassmorphicTokens;
export type NeonEditorialTheme = typeof neonEditorialTokens;
export type NeumorphicTheme = typeof neumorphicTokens;

// Union token type — components check theme.name to narrow
export type ThemeTokens = GlassmorphicTheme | NeonEditorialTheme | NeumorphicTheme;

// Helper type guards
export function isGlass(t: ThemeTokens): t is GlassmorphicTheme {
  return t.name === 'glassmorphic';
}
export function isEditorial(t: ThemeTokens): t is NeonEditorialTheme {
  return t.name === 'neon-editorial';
}
export function isNeumorphic(t: ThemeTokens): t is NeumorphicTheme {
  return t.name === 'neumorphic';
}

// ── Theme map ──────────────────────────────────────────────────────────
const THEME_MAP = {
  glassmorphic: glassmorphicTokens,
  'neon-editorial': neonEditorialTokens,
  neumorphic: neumorphicTokens,
} as const;

// ── Context ────────────────────────────────────────────────────────────
interface ThemeContextValue {
  theme: ThemeName;
  tokens: ThemeTokens;
  setTheme: (t: ThemeName) => void;
  ready: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = '@govirall/theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('glassmorphic');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'glassmorphic' || stored === 'neon-editorial') {
        setThemeState(stored);
      }
      // If stored theme was neumorphic (removed from mobile), fall back to default
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

// Shorthand — returns tokens directly
export function useTokens(): ThemeTokens {
  return useTheme().tokens;
}
