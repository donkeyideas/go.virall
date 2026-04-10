import React, { useState } from 'react';
import { TextInput as RNTextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { BorderRadius, FontSize, Spacing, neuInset, neuInsetBg } from '../../constants/theme';

interface Props extends TextInputProps {
  label?: string;
}

export function TextInput({ label, style, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <RNTextInput
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: focused ? colors.inputBg : neuInsetBg(colors),
            color: colors.text,
          },
          focused
            ? { borderWidth: 1.5, borderColor: colors.accent }
            : neuInset(colors),
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    minHeight: 48,
  },
});
