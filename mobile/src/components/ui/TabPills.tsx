import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Pill } from './Pill';
import { Spacing } from '../../constants/theme';

interface TabPillsProps {
  tabs: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function TabPills({ tabs, activeIndex, onSelect }: TabPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab, i) => (
        <Pill key={tab} label={tab} active={i === activeIndex} onPress={() => onSelect(i)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
