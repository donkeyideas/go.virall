import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../contexts/theme-context';
import { BorderRadius, FontSize, Spacing, neuShadowSm } from '../../constants/theme';
import { formatPercent } from '../../lib/format';

interface KpiCardProps {
  label: string;
  value: string;
  change: number;
  accentColor?: string;
  icon?: 'followers' | 'engagement' | 'posts' | 'score' | 'earnings';
}

function KpiIcon({ icon, color, size = 18 }: { icon: string; color: string; size?: number }) {
  switch (icon) {
    case 'followers':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <Path d="M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </Svg>
      );
    case 'engagement':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </Svg>
      );
    case 'posts':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <Path d="M22 6l-10 7L2 6" />
        </Svg>
      );
    case 'score':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </Svg>
      );
    case 'earnings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </Svg>
      );
    default:
      return null;
  }
}

export function KpiCard({ label, value, change, accentColor, icon }: KpiCardProps) {
  const { colors } = useTheme();
  const isPositive = change >= 0;
  const accent = accentColor || colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg }, neuShadowSm(colors)]}>
      <View style={styles.topRow}>
        {icon && (
          <KpiIcon icon={icon} color={accent} size={16} />
        )}
        {change !== 0 && (
          <Text style={[styles.change, { color: isPositive ? colors.success : colors.error }]}>
            {formatPercent(change)}
          </Text>
        )}
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  change: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
