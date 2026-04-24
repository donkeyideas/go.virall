import { Text, type TextProps } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';

interface Props extends TextProps {
  variant?: 'display' | 'heading' | 'body' | 'caption' | 'mono' | 'label';
  color?: 'default' | 'muted' | 'accent' | 'primary' | 'good' | 'bad' | 'warn';
}

export function ThemedText({ variant = 'body', color = 'default', style, ...props }: Props) {
  const t = useTokens();

  // Resolve color
  let textColor: string;
  if (color === 'default') {
    textColor = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  } else if (color === 'muted') {
    textColor = t.muted;
  } else if (color === 'accent') {
    textColor = isGlass(t) ? t.rose : isEditorial(t) ? t.pink : t.accent;
  } else if (color === 'primary') {
    textColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
  } else if (color === 'good') {
    textColor = isGlass(t) ? t.good : isEditorial(t) ? t.good : t.good;
  } else if (color === 'bad') {
    textColor = isGlass(t) ? t.bad : isEditorial(t) ? t.bad : t.bad;
  } else {
    textColor = isGlass(t) ? t.warn : isEditorial(t) ? t.warn : t.warn;
  }

  // Resolve font
  const fontBody = isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody;
  const fontDisplay = isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplay : t.fontDisplay;
  const fontMono = isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontMono;

  const variantStyles = {
    display: { fontFamily: fontDisplay, fontSize: 28, lineHeight: 34 },
    heading: { fontFamily: fontDisplay, fontSize: 20, lineHeight: 26 },
    body: { fontFamily: fontBody, fontSize: 15, lineHeight: 22 },
    caption: { fontFamily: fontBody, fontSize: 12, lineHeight: 16 },
    mono: { fontFamily: fontMono, fontSize: 13, lineHeight: 18 },
    label: { fontFamily: fontBody, fontSize: 11, lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  };

  return (
    <Text
      style={[variantStyles[variant], { color: textColor }, style]}
      {...props}
    />
  );
}
