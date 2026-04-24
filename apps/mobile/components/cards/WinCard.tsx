import React from 'react';
import { View, Text } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { IconTrendingUp, IconDollarSign, IconTrophy } from '@/components/icons/Icons';
import { NeumorphicView, neumorphicInsetCircleStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';

interface Props {
  kicker: string;
  text: string;
  emphasisText?: string;
  number: string;
  iconName: 'trending-up' | 'dollar-sign' | 'trophy';
}

const iconMap = {
  'trending-up': IconTrendingUp,
  'dollar-sign': IconDollarSign,
  'trophy': IconTrophy,
};

// ── Glass ──────────────────────────────────────────────────────────
function GlassWin({ kicker, text, emphasisText, number, iconName }: Props) {
  const t = useTokens() as ReturnType<typeof useTokens> & { name: 'glassmorphic' };
  const Icon = iconMap[iconName];

  const renderText = () => {
    if (!emphasisText || !text.includes(emphasisText)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 16, color: t.fg, lineHeight: 19, marginTop: 2 }}>{text}</Text>;
    }
    const parts = text.split(emphasisText);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 16, color: t.fg, lineHeight: 19, marginTop: 2 }}>
        {parts[0]}<Text style={{ fontFamily: t.fontDisplayItalic, color: t.good }}>{emphasisText}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <View style={{
      backgroundColor: 'rgba(138,255,193,0.08)',
      borderWidth: 1, borderColor: 'rgba(138,255,193,0.25)',
      borderRadius: 18, padding: 14, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12,
    }}>
      {/* Icon circle */}
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(138,255,193,0.15)',
        borderWidth: 1, borderColor: 'rgba(138,255,193,0.35)',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Icon size={18} color="#8affc1" />
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.good }}>{kicker}</Text>
        {renderText()}
      </View>

      {/* Number */}
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.fg, letterSpacing: -0.5 }}>{number}</Text>
    </View>
  );
}

// ── Editorial ──────────────────────────────────────────────────────
function EditorialWin({ kicker, text, emphasisText, number, iconName }: Props) {
  const t = useTokens() as ReturnType<typeof useTokens> & { name: 'neon-editorial' };
  const Icon = iconMap[iconName];

  const renderText = () => {
    if (!emphasisText || !text.includes(emphasisText)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 16, color: t.ink, lineHeight: 19, marginTop: 1, letterSpacing: -0.2 }}>{text}</Text>;
    }
    const parts = text.split(emphasisText);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 16, color: t.ink, lineHeight: 19, marginTop: 1, letterSpacing: -0.2 }}>
        {parts[0]}<Text style={{ backgroundColor: t.lime, paddingHorizontal: 3, fontStyle: 'italic' }}>{emphasisText}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <View style={{
      backgroundColor: t.bg,
      borderWidth: 1.5, borderColor: t.ink,
      padding: 12, paddingHorizontal: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      ...t.shadowCardSmall,
    }}>
      {/* Square icon */}
      <View style={{
        width: 40, height: 40,
        backgroundColor: t.lime,
        borderWidth: 1.5, borderColor: t.ink,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Icon size={20} color={t.ink} />
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted }}>{kicker}</Text>
        {renderText()}
      </View>

      {/* Number */}
      <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 22, color: t.ink, letterSpacing: -0.5 }}>{number}</Text>
    </View>
  );
}

// ── Neumorphic ─────────────────────────────────────────────────────
function NeumorphicWin({ kicker, text, emphasisText, number, iconName }: Props) {
  const t = useTokens() as NeumorphicTheme;
  const Icon = iconMap[iconName];

  const renderText = () => {
    if (!emphasisText || !text.includes(emphasisText)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.ink, lineHeight: 18, marginTop: 2 }}>{text}</Text>;
    }
    const parts = text.split(emphasisText);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.ink, lineHeight: 18, marginTop: 2 }}>
        {parts[0]}<Text style={{ fontFamily: t.fontDisplayItalic, color: t.good }}>{emphasisText}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <NeumorphicView elevation="sm" borderRadius={20} padding={14} style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      {/* Circle icon */}
      <View style={neumorphicInsetCircleStyle(t, 44)}>
        <Icon size={20} color={t.good} />
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: t.fontBodyExtraBold, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted }}>{kicker}</Text>
        {renderText()}
      </View>

      {/* Number */}
      <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 20, color: t.ink, letterSpacing: -0.5 }}>{number}</Text>
    </NeumorphicView>
  );
}

// ── Exported ───────────────────────────────────────────────────────
export function WinCard(props: Props) {
  const t = useTokens();
  if (isGlass(t)) return <GlassWin {...props} />;
  if (isEditorial(t)) return <EditorialWin {...props} />;
  return <NeumorphicWin {...props} />;
}
