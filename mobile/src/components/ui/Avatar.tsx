import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/theme-context';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string | null;
}

export function Avatar({ name, size = 48, imageUrl }: AvatarProps) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.accent,
  };

  if (imageUrl && !imgError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.avatar, containerStyle]}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <View style={[styles.avatar, containerStyle]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
