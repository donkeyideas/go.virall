import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { FontSize, Spacing } from '../../constants/theme';

interface SectionTitleProps {
  children: string;
}

export function SectionTitle({ children }: SectionTitleProps) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.title, { color: colors.text }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
});
