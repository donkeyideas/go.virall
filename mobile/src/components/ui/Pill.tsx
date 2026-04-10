import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { BorderRadius, FontSize, Spacing, neuShadowSm } from '../../constants/theme';

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Pill({ label, active = false, onPress }: PillProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? colors.accent : colors.surfaceLight,
        },
        neuShadowSm(colors),
      ]}
    >
      <Text style={[styles.label, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
