export interface ThemeColors {
  primary: string;
  primarySoft: string;
  accent: string;
  good: string;
  warn: string;
  bad: string;
  info: string;
  ink: string;
  paper: string;
  muted: string;
  bg: string;
  fg: string;
}

export function getThemeColors(): ThemeColors {
  if (typeof window === 'undefined') {
    // SSR fallback -- glassmorphic defaults
    return {
      primary: '#8b5cf6',
      primarySoft: '#c7b4ff',
      accent: '#ff71a8',
      good: '#8affc1',
      warn: '#ffb648',
      bad: '#ff71a8',
      info: '#6be3ff',
      ink: '#f6f3ff',
      paper: 'rgba(255,255,255,0.05)',
      muted: 'rgba(246,243,255,0.6)',
      bg: '#0a0618',
      fg: '#f6f3ff',
    };
  }

  const styles = getComputedStyle(document.documentElement);
  const get = (prop: string) => styles.getPropertyValue(prop).trim();

  return {
    primary: get('--color-primary'),
    primarySoft: get('--color-primary-soft'),
    accent: get('--color-accent'),
    good: get('--color-good'),
    warn: get('--color-warn'),
    bad: get('--color-bad'),
    info: get('--color-info'),
    ink: get('--ink'),
    paper: get('--paper'),
    muted: get('--muted'),
    bg: get('--bg'),
    fg: get('--fg'),
  };
}

export function getCurrentTheme(): string {
  if (typeof window === 'undefined') return 'glassmorphic';
  return document.documentElement.getAttribute('data-theme') ?? 'glassmorphic';
}
