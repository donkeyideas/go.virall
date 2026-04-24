import { View, Text } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';

interface Props {
  label: string;
  variant?: 'default' | 'good' | 'bad' | 'warn' | 'primary' | 'accent';
}

export function Badge({ label, variant = 'default' }: Props) {
  const t = useTokens();

  if (isGlass(t)) {
    const colorMap = {
      default: { bg: t.surfaceStronger, text: t.fg },
      good: { bg: 'rgba(138,255,193,0.1)', text: t.good },
      bad: { bg: 'rgba(255,113,168,0.15)', text: t.bad },
      warn: { bg: 'rgba(255,182,72,0.15)', text: t.warn },
      primary: { bg: 'rgba(139,92,246,0.2)', text: t.violetSoft },
      accent: { bg: 'rgba(255,113,168,0.15)', text: t.accent },
    };
    const c = colorMap[variant];
    return (
      <View style={{
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: variant === 'good' ? 'rgba(138,255,193,0.3)' : variant === 'bad' ? 'rgba(255,113,168,0.3)' : 'transparent',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
      }}>
        <Text style={{ fontFamily: t.fontMono, fontSize: 10, color: c.text }}>{label}</Text>
      </View>
    );
  }

  if (isEditorial(t)) {
    return (
      <View style={{
        backgroundColor: t.ink,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1.5,
        borderColor: t.ink,
      }}>
        <Text style={{ fontFamily: t.fontMono, fontSize: 9, fontWeight: '700', color: t.surface, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {label}
        </Text>
      </View>
    );
  }

  // Neumorphic
  const nt = t as NeumorphicTheme;
  return (
    <View style={{
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      ...neumorphicRaisedStyle(nt, 'sm'),
    }}>
      <Text style={{ fontFamily: t.fontBodyBold, fontSize: 10, color: variant === 'good' ? t.good : variant === 'bad' ? t.bad : t.muted, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}
