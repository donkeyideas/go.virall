import { View, type ViewProps } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';

interface Props extends ViewProps {
  variant?: 'screen' | 'card' | 'surface';
}

export function ThemedView({ variant = 'screen', style, ...props }: Props) {
  const t = useTokens();

  const base =
    variant === 'screen'
      ? { backgroundColor: t.bg, flex: 1 }
      : variant === 'surface'
        ? { backgroundColor: isGlass(t) ? t.surface : isEditorial(t) ? t.surface : t.surface }
        : { backgroundColor: t.bg };

  return <View style={[base, style]} {...props} />;
}
