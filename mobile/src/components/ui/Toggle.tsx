import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';

interface ToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? colors.primary : colors.inputBg,
          borderWidth: 1,
          borderColor: value ? colors.primary : colors.glassBorder,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: value ? '#FFFFFF' : colors.textMuted,
            transform: [{ translateX: value ? 20 : 2 }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
