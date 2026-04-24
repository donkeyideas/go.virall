import { Text, type TextStyle } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle;
}

// Mono uppercase label — 9-10px, wide letter-spacing
export function Kicker({ children, color, style }: Props) {
  const t = useTokens();

  return (
    <Text style={[{
      fontFamily: t.fontMono,
      fontSize: 10,
      fontWeight: isEditorial(t) ? '700' : '500',
      color: color ?? t.muted,
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
    }, style]}>
      {children}
    </Text>
  );
}
