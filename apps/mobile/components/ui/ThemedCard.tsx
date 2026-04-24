import { View, type ViewProps, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { NeumorphicView } from './NeumorphicView';

interface Props extends ViewProps {
  padding?: number;
  variant?: 'default' | 'urgent' | 'warm' | 'success';
  elevation?: 'sm' | 'md' | 'lg';
}

export function ThemedCard({ padding = 16, variant = 'default', elevation = 'md', style, children, ...props }: Props) {
  const t = useTokens();

  if (isGlass(t)) {
    const variantBorder =
      variant === 'urgent' ? 'rgba(255,113,168,0.35)'
      : variant === 'warm' ? 'rgba(255,182,72,0.35)'
      : t.line;

    const variantBg =
      variant === 'urgent' ? 'rgba(255,113,168,0.08)'
      : variant === 'warm' ? 'rgba(255,182,72,0.08)'
      : t.surface;

    const cardStyle = {
      borderRadius: t.radiusLg,
      borderWidth: 1,
      borderColor: variantBorder,
      overflow: 'hidden' as const,
      ...t.shadowCard,
    };

    if (Platform.OS === 'ios') {
      return (
        <BlurView intensity={t.blurSurface} tint="dark" style={[cardStyle, style]} {...props}>
          <View style={{ padding }}>{children}</View>
        </BlurView>
      );
    }

    return (
      <View style={[cardStyle, { backgroundColor: variantBg, padding }, style]} {...props}>
        {children}
      </View>
    );
  }

  if (isEditorial(t)) {
    const variantBg =
      variant === 'urgent' ? t.pink
      : variant === 'warm' ? t.lime
      : variant === 'success' ? t.lime
      : t.surface;

    const shadow = elevation === 'sm' ? t.shadowCardSmall : t.shadowCard;

    return (
      <View style={[{
        backgroundColor: variantBg,
        borderWidth: t.border.width,
        borderColor: t.border.color,
        borderRadius: 0,
        padding,
        ...shadow,
      }, style]} {...props}>
        {children}
      </View>
    );
  }

  // Neumorphic: platform-aware paired shadows
  const variantStyle = variant === 'urgent'
    ? { borderWidth: 2, borderColor: 'rgba(200,120,120,0.2)' }
    : {};

  return (
    <NeumorphicView
      elevation={elevation}
      borderRadius={t.radiusLg}
      padding={padding}
      style={[variantStyle, style]}
    >
      {children}
    </NeumorphicView>
  );
}
