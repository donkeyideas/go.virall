import React from 'react';
import { View, Text } from 'react-native';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { NeumorphicView } from '@/components/ui/NeumorphicView';

interface Props {
  smoScore: number | null;
  connectedPlatformCount: number;
  engagementRate: number;
}

function StatRow({ label, value, t, isLast }: { label: string; value: string; t: any; isLast?: boolean }) {
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.ink;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.pink : t.accent;

  if (isNeumorphic(t)) {
    return (
      <NeumorphicView inset borderRadius={16} padding={12}>
        <Text style={{
          fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5,
          textTransform: 'uppercase', color: t.muted, marginBottom: 6,
        }}>
          {label}
        </Text>
        <Text style={{
          fontFamily: t.fontDisplayItalic, fontSize: 28, color: t.accent,
          letterSpacing: -0.8, lineHeight: 30,
        }}>
          {value}
        </Text>
      </NeumorphicView>
    );
  }

  return (
    <View style={{
      paddingVertical: 12,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? 'rgba(0,0,0,0.08)' : 'transparent',
    }}>
      <Text style={{
        fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5,
        textTransform: 'uppercase', color: t.muted, marginBottom: 6,
      }}>
        {label}
      </Text>
      <Text style={{
        fontFamily: t.fontDisplayItalic, fontSize: 28, color: fg,
        letterSpacing: -0.8, lineHeight: 30,
      }}>
        {value}
      </Text>
    </View>
  );
}

export function QuickStatsCard({ smoScore, connectedPlatformCount, engagementRate }: Props) {
  const t = useTokens();

  const stats = [
    { label: 'SMO SCORE', value: smoScore != null ? `${smoScore}/100` : '--' },
    { label: 'PLATFORMS', value: `${connectedPlatformCount} connected` },
    { label: 'F/F RATIO', value: engagementRate > 0 ? `${engagementRate}x` : '--' },
  ];

  return (
    <ThemedCard padding={isEditorial(t) ? 18 : 20}>
      <Kicker>Quick Stats</Kicker>

      <View style={{ marginTop: 10, gap: isNeumorphic(t) ? 10 : 0 }}>
        {stats.map((s, i) => (
          <StatRow key={s.label} label={s.label} value={s.value} t={t} isLast={i === stats.length - 1} />
        ))}
      </View>
    </ThemedCard>
  );
}
