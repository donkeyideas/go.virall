import React from 'react';
import { View, Text, Platform } from 'react-native';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { ScoreRing } from '@/components/charts/ScoreRing';
import { FactorBar } from '@/components/charts/FactorBar';
import { Kicker } from '@/components/ui/Kicker';
import { Badge } from '@/components/ui/Badge';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { NeumorphicView } from '@/components/ui/NeumorphicView';

interface Factor {
  label: string;
  value: number;
}

interface Props {
  score: number;
  percentile?: number;
  deltaText?: string;
  strongest?: string;
  biggestLift?: string;
  factors: Factor[];
}

export function SmoCard({ score, percentile = 82, deltaText = '↑ 6 this mo', strongest, biggestLift, factors }: Props) {
  const t = useTokens();

  const getVariant = (val: number): 'default' | 'good' | 'warn' => {
    if (val >= 90) return 'good';
    if (val < 70) return 'warn';
    return 'default';
  };

  const factorBars = factors.map((f) => (
    <FactorBar key={f.label} label={f.label} value={f.value} variant={getVariant(f.value)} />
  ));

  if (isGlass(t)) {
    return (
      <ThemedCard padding={24}>
        {/* Top row: kicker + delta chip */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <Kicker>{`SMO Score · ${percentile}nd pct`}</Kicker>
          <Badge label={deltaText} variant="good" />
        </View>

        {/* Ring + text side by side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <ScoreRing value={score} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.fg, lineHeight: 26 }}>
              {'Your '}
              <Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>optimization</Text>
              {', at a glance.'}
            </Text>
            {strongest && (
              <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, marginTop: 6, lineHeight: 17 }}>
                <Text style={{ fontFamily: t.fontBodySemibold, color: t.fg }}>Strongest:</Text> {strongest}
              </Text>
            )}
            {biggestLift && (
              <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, lineHeight: 17 }}>
                <Text style={{ fontFamily: t.fontBodySemibold, color: t.fg }}>Biggest lift:</Text> {biggestLift}
              </Text>
            )}
          </View>
        </View>

        {/* Factor bars — glass: flex row with top divider */}
        <View style={{
          flexDirection: 'row', gap: 6,
          marginTop: 18, paddingTop: 16,
          borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
        }}>
          {factorBars}
        </View>
      </ThemedCard>
    );
  }

  if (isEditorial(t)) {
    return (
      <ThemedCard padding={18}>
        {/* Top row with dashed bottom border */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: 14, paddingBottom: 10,
          borderBottomWidth: 1.5, borderBottomColor: t.ink,
        }}>
          <Kicker>{`SMO Score · ${percentile}nd pct`}</Kicker>
          <Badge label={deltaText} variant="good" />
        </View>

        {/* Ring + text side by side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <ScoreRing value={score} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 22, color: t.ink, lineHeight: 25, letterSpacing: -0.3 }}>
              {'Your '}
              <Text style={{ backgroundColor: t.lime, paddingHorizontal: 4 }}>optimization</Text>
              {', at a glance.'}
            </Text>
            {strongest && (
              <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, marginTop: 8, lineHeight: 17 }}>
                <Text style={{ fontFamily: t.fontBodyBold, color: t.ink }}>Strongest:</Text> {strongest}
              </Text>
            )}
            {biggestLift && (
              <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, lineHeight: 17 }}>
                <Text style={{ fontFamily: t.fontBodyBold, color: t.ink }}>Biggest lift:</Text> {biggestLift}
              </Text>
            )}
          </View>
        </View>

        {/* Factor bars — editorial: flex row with dashed ink border-top */}
        <View style={{
          flexDirection: 'row', gap: 5,
          paddingTop: 14,
          borderTopWidth: 1.5, borderTopColor: t.ink,
        }}>
          {factorBars}
        </View>
      </ThemedCard>
    );
  }

  // Neumorphic
  return (
    <ThemedCard padding={24} elevation="md">
      {/* Top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <Kicker>{`SMO Score · ${percentile}nd pct`}</Kicker>
        <Badge label={deltaText} variant="good" />
      </View>

      {/* Ring + text side by side */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <ScoreRing value={score} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: t.fontDisplay, fontSize: 20, color: t.ink, lineHeight: 24, letterSpacing: -0.3 }}>
            {'Your '}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>optimization</Text>
            {', at a glance.'}
          </Text>
          {strongest && (
            <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, marginTop: 8, lineHeight: 18 }}>
              <Text style={{ fontFamily: t.fontBodyBold, color: t.fg }}>Strongest:</Text> {strongest}
            </Text>
          )}
          {biggestLift && (
            <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, lineHeight: 18 }}>
              <Text style={{ fontFamily: t.fontBodyBold, color: t.fg }}>Biggest lift:</Text> {biggestLift}
            </Text>
          )}
        </View>
      </View>

      {/* Factor bars — neumorphic: inside inset tray */}
      <NeumorphicView inset borderRadius={18} padding={16} style={{ paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {factorBars}
        </View>
      </NeumorphicView>
    </ThemedCard>
  );
}
