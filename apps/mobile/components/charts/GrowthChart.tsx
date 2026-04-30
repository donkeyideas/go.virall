import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import type { GrowthPoint } from '@/hooks/useTodayData';

interface Props {
  data: GrowthPoint[];
  currentFollowers: number;
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function MiniChart({ data, width, height, t }: { data: GrowthPoint[]; width: number; height: number; t: any }) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.followers);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padY = 4;
  const chartH = height - padY * 2;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = padY + chartH - ((d.followers - min) / range) * chartH;
      return `${x},${y}`;
    })
    .join(' ');

  const lineColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
  const gridColor = isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <Svg width={width} height={height}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((frac) => (
        <Line
          key={frac}
          x1={0} y1={padY + chartH * (1 - frac)}
          x2={width} y2={padY + chartH * (1 - frac)}
          stroke={gridColor} strokeWidth={0.5}
        />
      ))}
      <Defs>
        <LinearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={lineColor} stopOpacity="0.4" />
          <Stop offset="1" stopColor={lineColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Polyline
        points={points}
        fill="none"
        stroke="url(#chartLine)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GrowthChart({ data, currentFollowers }: Props) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.ink;
  const muted = t.muted;

  const chartWidth = 280;
  const chartHeight = 100;

  // Labels for x-axis
  const startLabel = data.length >= 2 ? new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const endLabel = data.length >= 2 ? 'Now' : '';

  return (
    <ThemedCard padding={isEditorial(t) ? 18 : 20}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Kicker>Growth · 90 days</Kicker>
        <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 18, color: fg, letterSpacing: -0.3 }}>
          {fmtK(currentFollowers)}
        </Text>
      </View>

      {data.length >= 2 ? (
        <View>
          <MiniChart data={data} width={chartWidth} height={chartHeight} t={t} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, color: muted, letterSpacing: 0.5 }}>{startLabel}</Text>
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, color: muted, letterSpacing: 0.5 }}>{endLabel}</Text>
          </View>
        </View>
      ) : (
        <View style={{ height: chartHeight, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontFamily: t.fontBody, fontSize: 13, color: muted, textAlign: 'center' }}>
            Growth data will appear as your audience is tracked over time.
          </Text>
        </View>
      )}
    </ThemedCard>
  );
}
