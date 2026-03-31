import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { Spacing } from '../../constants/theme';

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
});
