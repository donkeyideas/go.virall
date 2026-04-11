import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing, BorderRadius, glassCard } from '../../constants/theme';

interface BarData {
  label: string;
  value: number;
}

interface SimpleBarChartProps {
  data: BarData[];
  height?: number;
  title?: string;
}

export function SimpleBarChart({ data, height = 140, title }: SimpleBarChartProps) {
  const { colors } = useTheme();
  if (data.length === 0) return null;

  const width = 300;
  const padding = 12;
  const chartH = height - padding * 2;
  const max = Math.max(...data.map((d) => d.value));
  const barWidth = Math.min(28, (width - padding * 2) / data.length - 8);

  return (
    <View style={[styles.container, glassCard(colors)]}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.accent} />
            <Stop offset="100%" stopColor={colors.primary} />
          </LinearGradient>
        </Defs>
        {data.map((d, i) => {
          const barH = (d.value / max) * (chartH - 10);
          const x = padding + (i * (width - padding * 2)) / data.length + ((width - padding * 2) / data.length - barWidth) / 2;
          const y = padding + chartH - barH;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={barWidth / 4}
              fill="url(#barGrad)"
            />
          );
        })}
      </Svg>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, { color: colors.textMuted }]}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
  },
});
