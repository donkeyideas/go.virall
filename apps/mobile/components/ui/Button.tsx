import { Pressable, Text, Platform, type PressableProps } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'ghost' | 'skip';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ label, variant = 'primary', size = 'md', style, ...props }: Props) {
  const t = useTokens();

  const sizeMap = {
    sm: { paddingVertical: 6, paddingHorizontal: 12, fontSize: 11 },
    md: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 12 },
    lg: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 14 },
  };
  const s = sizeMap[size];

  // Theme-specific button styles
  if (isGlass(t)) {
    const isPrimary = variant === 'primary';
    const isGhost = variant === 'ghost';
    return (
      <Pressable
        style={({ pressed }) => [{
          backgroundColor: isPrimary ? t.violet : isGhost ? t.surfaceStronger : 'transparent',
          borderWidth: isGhost ? 1 : 0,
          borderColor: isGhost ? t.lineStronger : 'transparent',
          borderRadius: t.radiusMd,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          alignItems: 'center' as const,
          opacity: pressed ? 0.85 : props.disabled ? 0.4 : 1,
          ...(isPrimary ? t.shadowPrimary : {}),
        }, style as object]}
        {...props}
      >
        <Text style={{
          fontFamily: t.fontBodySemibold,
          fontSize: s.fontSize,
          color: isPrimary ? '#fff' : variant === 'skip' ? t.faint : t.fg,
          letterSpacing: 0.3,
        }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  if (isEditorial(t)) {
    const isPrimary = variant === 'primary';
    return (
      <Pressable
        style={({ pressed }) => [{
          backgroundColor: isPrimary ? t.surface : variant === 'skip' ? 'transparent' : t.surface,
          borderWidth: variant === 'skip' ? 0 : t.border.width,
          borderColor: variant === 'skip' ? 'transparent' : t.border.color,
          borderRadius: 0,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          alignItems: 'center' as const,
          opacity: props.disabled ? 0.4 : 1,
          transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
          ...(variant === 'skip' ? {} : (pressed ? t.shadowButton : t.shadowCardSmall)),
        }, style as object]}
        {...props}
      >
        <Text style={{
          fontFamily: t.fontMono,
          fontSize: s.fontSize > 12 ? 11 : 10,
          fontWeight: '700',
          color: variant === 'skip' ? t.muted : t.fg,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.8,
        }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  // Neumorphic
  const nt = t as NeumorphicTheme;
  const isPrimary = variant === 'primary';

  const getNeuStyle = (pressed: boolean) => {
    if (variant === 'skip') return {};
    if (Platform.OS === 'ios') {
      return pressed ? nt.shadowOutSm.inner : nt.shadowOutSm.outer;
    }
    // Android: raised by default, inset border on press
    if (pressed) {
      return {
        borderWidth: 1.5,
        borderTopColor: 'rgba(167,173,184,0.4)',
        borderLeftColor: 'rgba(167,173,184,0.4)',
        borderBottomColor: 'rgba(255,255,255,0.6)',
        borderRightColor: 'rgba(255,255,255,0.6)',
      };
    }
    return neumorphicRaisedStyle(nt, 'sm');
  };

  return (
    <Pressable
      style={({ pressed }) => [{
        backgroundColor: nt.surface,
        borderRadius: nt.radiusSm,
        paddingVertical: s.paddingVertical,
        paddingHorizontal: s.paddingHorizontal,
        alignItems: 'center' as const,
        opacity: props.disabled ? 0.4 : 1,
        ...getNeuStyle(pressed),
      }, style as object]}
      {...props}
    >
      <Text style={{
        fontFamily: nt.fontBodySemibold,
        fontSize: s.fontSize,
        color: isPrimary ? nt.accent : variant === 'skip' ? nt.faint : nt.text,
        letterSpacing: 0.3,
      }}>
        {label}
      </Text>
    </Pressable>
  );
}
