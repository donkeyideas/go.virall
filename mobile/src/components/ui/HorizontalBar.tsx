import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

interface HorizontalBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

export function HorizontalBar({ label, value, maxValue, color }: HorizontalBarProps) {
  const { colors } = useTheme();
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: colors.surfaceLight }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.value, { color: colors.text }]}>{value}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    width: 70,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  value: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
});
