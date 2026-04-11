import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { BorderRadius, FontSize, Spacing, glassShadowSm } from '../../constants/theme';
import { PlatformIcon } from './PlatformIcon';

interface Profile {
  id: string;
  platform: string;
  username: string;
}

interface ProfileSelectorProps {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ProfileSelector({ profiles, selectedId, onSelect }: ProfileSelectorProps) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Pressable
        onPress={() => onSelect(null)}
        style={[
          styles.pill,
          {
            backgroundColor: selectedId === null ? colors.primary : colors.glassBg,
            borderWidth: 1,
            borderColor: selectedId === null ? colors.primary : colors.glassBorder,
          },
          glassShadowSm(colors),
        ]}
      >
        <Text style={[styles.label, { color: selectedId === null ? '#FFFFFF' : colors.textSecondary }]}>
          All Profiles
        </Text>
      </Pressable>
      {profiles.map((p) => {
        const active = selectedId === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p.id)}
            style={[
              styles.pill,
              {
                backgroundColor: active ? colors.primary : colors.glassBg,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.glassBorder,
              },
              glassShadowSm(colors),
            ]}
          >
            <View style={styles.pillContent}>
              <PlatformIcon platform={p.platform} size={14} color={active ? '#FFFFFF' : undefined} showBackground={false} />
              <Text style={[styles.label, { color: active ? '#FFFFFF' : colors.textSecondary }]}>
                @{p.username}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
