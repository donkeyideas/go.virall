import React from 'react';
import { View, Platform, type ViewStyle, type ViewProps } from 'react-native';
import { useTokens } from '@/lib/theme';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';

type ElevationSize = 'sm' | 'md' | 'lg';

interface NeumorphicViewProps extends ViewProps {
  elevation?: ElevationSize;
  inset?: boolean;
  borderRadius?: number;
  padding?: number;
  children: React.ReactNode;
}

const ANDROID_ELEVATION: Record<ElevationSize, number> = {
  sm: 4,
  md: 8,
  lg: 12,
};

/**
 * Platform-aware neumorphic surface.
 * - iOS: dual nested Views with paired light/dark shadows
 * - Android: elevation + subtle border highlight (no native multi-shadow support)
 */
export function NeumorphicView({
  elevation = 'md',
  inset = false,
  borderRadius,
  padding,
  style,
  children,
  ...props
}: NeumorphicViewProps) {
  const t = useTokens() as NeumorphicTheme;
  const radius = borderRadius ?? t.radiusLg;

  if (inset) {
    return <InsetView t={t} borderRadius={radius} padding={padding} style={style} {...props}>{children}</InsetView>;
  }

  const shadowSet = elevation === 'sm' ? t.shadowOutSm
    : elevation === 'lg' ? t.shadowOutLg
    : t.shadowOutMd;

  if (Platform.OS === 'ios') {
    // iOS: dual nested Views — outer (dark shadow BR) + inner (light shadow TL)
    return (
      <View style={[{ ...shadowSet.outer }, style]} {...props}>
        <View style={{
          ...shadowSet.inner,
          backgroundColor: t.surface,
          borderRadius: radius,
          ...(padding != null ? { padding } : {}),
        }}>
          {children}
        </View>
      </View>
    );
  }

  // Android: elevation + highlight border
  return (
    <View
      style={[{
        backgroundColor: t.surface,
        borderRadius: radius,
        elevation: ANDROID_ELEVATION[elevation],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        ...(padding != null ? { padding } : {}),
      }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * Inset (pressed-in) neumorphic surface.
 */
function InsetView({
  t,
  borderRadius,
  padding,
  style,
  children,
  ...props
}: {
  t: NeumorphicTheme;
  borderRadius: number;
  padding?: number;
  children: React.ReactNode;
} & ViewProps) {
  if (Platform.OS === 'ios') {
    return (
      <View
        style={[{
          backgroundColor: t.surface,
          borderRadius,
          shadowColor: t.shadowDark,
          shadowOffset: { width: 3, height: 3 },
          shadowOpacity: 1,
          shadowRadius: 6,
          ...(padding != null ? { padding } : {}),
        }, style]}
        {...props}
      >
        {children}
      </View>
    );
  }

  // Android: simulate inset with darker bg + directional borders
  return (
    <View
      style={[{
        backgroundColor: '#dde2ea',
        borderRadius,
        borderWidth: 1.5,
        borderTopColor: 'rgba(167,173,184,0.4)',
        borderLeftColor: 'rgba(167,173,184,0.4)',
        borderBottomColor: 'rgba(255,255,255,0.7)',
        borderRightColor: 'rgba(255,255,255,0.7)',
        ...(padding != null ? { padding } : {}),
      }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * Helper: returns platform-aware style for small neumorphic inset
 * (useful for icon circles, avatar wells, etc.)
 */
export function neumorphicInsetCircleStyle(t: NeumorphicTheme, size: number): ViewStyle {
  if (Platform.OS === 'ios') {
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: t.surface,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: t.shadowDark,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 6,
    };
  }

  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: '#dde2ea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(167,173,184,0.35)',
    borderLeftColor: 'rgba(167,173,184,0.35)',
    borderBottomColor: 'rgba(255,255,255,0.6)',
    borderRightColor: 'rgba(255,255,255,0.6)',
  };
}

/**
 * Helper: returns platform-aware style for a raised neumorphic element
 * (useful for buttons, chips, small raised surfaces)
 */
export function neumorphicRaisedStyle(t: NeumorphicTheme, elevation: ElevationSize = 'sm'): ViewStyle {
  if (Platform.OS === 'ios') {
    const shadowSet = elevation === 'sm' ? t.shadowOutSm
      : elevation === 'lg' ? t.shadowOutLg
      : t.shadowOutMd;
    return { ...shadowSet.outer };
  }

  return {
    elevation: ANDROID_ELEVATION[elevation],
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  };
}
