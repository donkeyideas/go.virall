import { View, Text, Platform } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';

interface Props {
  label: string;       // "Profile"
  value: number;       // 0-100
  variant?: 'default' | 'good' | 'warn';
}

export function FactorBar({ label, value, variant = 'default' }: Props) {
  const t = useTokens();
  const abbrev = label.slice(0, 4);

  if (isGlass(t)) {
    // Glass: height 34, radius 3, color varies by variant
    const maxHeight = 34;
    const fillHeight = (value / 100) * maxHeight;
    const barColor = variant === 'good' ? t.good
      : variant === 'warn' ? t.amber
      : t.violet;

    return (
      <View style={{ alignItems: 'center', flex: 1 }}>
        <View style={{
          width: '100%', height: maxHeight,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end',
        }}>
          <View style={{
            width: '100%', height: fillHeight,
            backgroundColor: barColor,
            borderRadius: 3,
            shadowColor: barColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }} />
        </View>
        <Text style={{
          color: t.subtle, fontSize: 8, fontFamily: t.fontMono,
          textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4,
        }}>
          {abbrev}
        </Text>
        <Text style={{
          color: t.fg, fontSize: 10, fontFamily: t.fontBodySemibold, marginTop: 1,
        }}>
          {value}
        </Text>
      </View>
    );
  }

  if (isEditorial(t)) {
    // Editorial: height 36, ink border 1.5px, no radius, solid fills
    const maxHeight = 36;
    const fillHeight = (value / 100) * maxHeight;
    const barColor = variant === 'good' ? t.mint
      : variant === 'warn' ? t.mustard
      : t.lime;

    return (
      <View style={{ alignItems: 'center', flex: 1 }}>
        <View style={{
          width: '100%', height: maxHeight,
          borderWidth: 1.5, borderColor: t.ink,
          backgroundColor: t.bg,
          overflow: 'hidden', justifyContent: 'flex-end',
        }}>
          <View style={{ width: '100%', height: fillHeight, backgroundColor: barColor }} />
        </View>
        <Text style={{
          color: t.ink, fontSize: 13, fontFamily: t.fontDisplayItalic,
          lineHeight: 16, marginTop: 3,
        }}>
          {value}
        </Text>
        <Text style={{
          color: t.ink, fontSize: 8, fontFamily: t.fontMono,
          textTransform: 'uppercase', letterSpacing: 0.8,
        }}>
          {abbrev}
        </Text>
      </View>
    );
  }

  // Neumorphic: height 40, radius 4, in-sm shadow on bar, gradient fills
  const maxHeight = 40;
  const fillHeight = (value / 100) * maxHeight;

  // Gradient fill color approximation
  const barColor = variant === 'good' ? t.good
    : variant === 'warn' ? t.warn
    : t.accent;
  const barGlow = variant === 'good' ? 'rgba(106,166,132,0.35)'
    : variant === 'warn' ? 'rgba(195,149,96,0.35)'
    : 'rgba(90,120,208,0.35)';

  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{
        width: '100%', height: maxHeight,
        backgroundColor: t.surface,
        borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end',
        // in-sm shadow approximation
        ...(Platform.OS === 'ios'
          ? { shadowColor: t.shadowDark, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 6 }
          : { borderWidth: 1, borderTopColor: 'rgba(167,173,184,0.35)', borderLeftColor: 'rgba(167,173,184,0.35)', borderBottomColor: 'rgba(255,255,255,0.6)', borderRightColor: 'rgba(255,255,255,0.6)' }),
      }}>
        <View style={{
          width: '100%', height: fillHeight,
          backgroundColor: barColor,
          borderTopLeftRadius: 3, borderTopRightRadius: 3,
          borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
          ...(Platform.OS === 'ios'
            ? { shadowColor: barColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 6 }
            : {}),
        }} />
      </View>
      <Text style={{
        color: t.ink, fontSize: 13, fontFamily: t.fontDisplay,
        lineHeight: 16, marginTop: 4,
      }}>
        {value}
      </Text>
      <Text style={{
        color: t.muted, fontSize: 8, fontFamily: t.fontBodyExtraBold,
        textTransform: 'uppercase', letterSpacing: 1,
      }}>
        {abbrev}
      </Text>
    </View>
  );
}
