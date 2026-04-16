import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { cockpit } from '../../lib/cockpit-theme';

interface Props {
  score: number;
  trend?: number;
  size?: number;
}

export function SmoRing({ score, trend, size = 160 }: Props) {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score || 0));
  const progress = (clamped / 100) * circumference;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="smoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={c.gold} />
            <Stop offset="100%" stopColor={mode === 'light' ? '#b87207' : '#d97706'} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={c.bgElevated}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#smoGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.number, { color: c.gold }]}>{Math.round(clamped)}</Text>
        <Text style={[styles.label, { color: c.textMuted }]}>SMO Score</Text>
        {typeof trend === 'number' && trend !== 0 && (
          <View style={[styles.trend, { backgroundColor: c.greenDim }]}>
            <Ionicons
              name={trend >= 0 ? 'arrow-up' : 'arrow-down'}
              size={9}
              color={trend >= 0 ? c.green : c.red}
            />
            <Text
              style={[
                styles.trendText,
                { color: trend >= 0 ? c.green : c.red },
              ]}
            >
              {trend >= 0 ? '+' : ''}
              {trend}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontSize: 44, fontWeight: '900', lineHeight: 46 },
  label: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  trendText: { fontSize: 11, fontWeight: '600' },
});
