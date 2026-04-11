import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { BorderRadius, Spacing, glassCard } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'sm';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        variant === 'sm' ? styles.cardSm : styles.card,
        glassCard(colors),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  cardSm: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
});
