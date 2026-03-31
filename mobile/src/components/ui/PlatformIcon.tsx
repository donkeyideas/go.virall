import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlatformColors, type PlatformName } from '../../constants/platforms';

interface PlatformIconProps {
  platform: PlatformName;
  size?: number;
}

const PlatformAbbrevs: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  youtube: 'YT',
  twitter: 'TW',
  facebook: 'FB',
  threads: 'TH',
  linkedin: 'LI',
  pinterest: 'PI',
  twitch: 'TV',
};

export function PlatformIcon({ platform, size = 28 }: PlatformIconProps) {
  const color = PlatformColors[platform];
  return (
    <View style={[styles.icon, { width: size, height: size, borderRadius: size / 4, backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color, fontSize: size * 0.38 }]}>{PlatformAbbrevs[platform]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
  },
});
