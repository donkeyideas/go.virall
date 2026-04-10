import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing, BorderRadius, neuShadow } from '../../constants/theme';

interface SimpleLineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  title?: string;
}

export function SimpleLineChart({ data, labels, height = 140, title }: SimpleLineChartProps) {
  const { colors } = useTheme();

  if (data.length < 2) return null;

  const width = 300;
  const padding = 8;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2 - 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => ({
    x: padding + (i / (data.length - 1)) * chartW,
    y: padding + chartH - ((val - min) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding + chartH} L${points[0].x},${padding + chartH} Z`;

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={colors.primary} />
            <Stop offset="100%" stopColor={colors.accent} />
          </LinearGradient>
          <LinearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaGrad)" />
        <Path d={linePath} stroke="url(#lineGrad)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {labels && labels.length > 0 && (
        <View style={styles.labels}>
          {labels.map((l, i) => (
            <Text key={i} style={[styles.label, { color: colors.textMuted }]}>{l}</Text>
          ))}
        </View>
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
  },
});
