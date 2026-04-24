import { Text, type TextStyle } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  size?: number;
  italic?: boolean;
  emphasis?: boolean;
  color?: string;
  style?: TextStyle;
}

// Serif display text — uses the correct display font per theme
export function Display({ children, size = 34, italic = false, emphasis = false, color, style }: Props) {
  const t = useTokens();

  let fontFamily: string;
  let textColor = color ?? (isGlass(t) ? t.fg : t.ink);

  if (isGlass(t)) {
    fontFamily = italic || emphasis ? t.fontDisplayItalic : t.fontDisplay;
    if (emphasis) textColor = t.violetSoft; // Gradient text approximation
  } else if (isEditorial(t)) {
    fontFamily = italic || emphasis ? t.fontDisplayItalic : t.fontDisplay;
    if (emphasis) textColor = t.fg; // Highlighter bg applied separately
  } else {
    fontFamily = italic || emphasis ? t.fontDisplayItalic : t.fontDisplay;
    if (emphasis) textColor = t.accent;
  }

  return (
    <Text style={[{
      fontFamily,
      fontSize: size,
      color: textColor,
      letterSpacing: size >= 34 ? -1.2 : size >= 22 ? -0.3 : 0,
      lineHeight: size * 1.1,
    }, style]}>
      {children}
    </Text>
  );
}
