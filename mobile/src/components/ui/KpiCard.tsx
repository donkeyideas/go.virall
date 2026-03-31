import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';
import { formatPercent } from '../../lib/format';

interface KpiCardProps {
  label: string;
  value: string;
  change: number;
}

export function KpiCard({ label, value, change }: KpiCardProps) {
  const { colors } = useTheme();
  const isPositive = change >= 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.change, { color: isPositive ? colors.success : colors.error }]}>
        {formatPercent(change)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  value: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  change: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});
