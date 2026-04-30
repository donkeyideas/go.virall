import React from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';

interface Props {
  value: number;        // 0-100
  size?: number;        // default varies by theme
  label?: string;       // default "/ 100"
}

export function ScoreRing({ value, size: sizeProp, label = '/ 100' }: Props) {
  const t = useTokens();

  if (isGlass(t)) {
    // Glass: 110px ring, stroke-width 8, gradient #c7b4ff → #ff71a8
    const size = sizeProp ?? 110;
    const center = size / 2;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (value / 100) * circumference;

    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="glassRingGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={t.violetSoft} />
              <Stop offset="1" stopColor={t.rose} />
            </LinearGradient>
          </Defs>
          {/* Track */}
          <Circle
            cx={center} cy={center} r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress arc */}
          <Circle
            cx={center} cy={center} r={radius}
            stroke="url(#glassRingGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
          />
        </Svg>
        {/* Center text */}
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{
            fontFamily: t.fontDisplayItalic,
            fontSize: size * 0.3,
            color: t.fg,
            letterSpacing: -0.5,
          }}>
            {value}
          </Text>
          <Text style={{
            fontFamily: t.fontMono,
            fontSize: 9,
            color: t.muted,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {label}
          </Text>
        </View>
      </View>
    );
  }

  if (isEditorial(t)) {
    // Editorial: 110px ring, stroke-width 10, solid lime, ink frame circles, pink end-dot
    const size = sizeProp ?? 110;
    const center = size / 2;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2 - 4;
    const circumference = 2 * Math.PI * radius;
    const progress = (value / 100) * circumference;
    const innerFrameR = radius - strokeWidth / 2 - 1.5;
    const outerFrameR = radius + strokeWidth / 2 + 1.5;

    // End dot position
    const angle = (value / 100) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const dotX = center + radius * Math.cos(rad);
    const dotY = center + radius * Math.sin(rad);

    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Outer ink frame */}
          <Circle cx={center} cy={center} r={outerFrameR} stroke={t.ink} strokeWidth={1.5} fill="transparent" />
          {/* Inner ink frame */}
          <Circle cx={center} cy={center} r={innerFrameR} stroke={t.ink} strokeWidth={1.5} fill="transparent" />
          {/* Track ring */}
          <Circle
            cx={center} cy={center} r={radius}
            stroke={t.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress arc — solid lime */}
          <Circle
            cx={center} cy={center} r={radius}
            stroke={t.lime}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
          />
          {/* Pink end dot */}
          <Circle cx={dotX} cy={dotY} r={4} fill={t.pink} />
        </Svg>
        {/* Center text */}
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{
            fontFamily: t.fontDisplayItalic,
            fontSize: size * 0.28,
            color: t.ink,
            letterSpacing: -1.5,
          }}>
            {value}
          </Text>
          <Text style={{
            fontFamily: t.fontMono,
            fontSize: 9,
            color: t.muted,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {label}
          </Text>
        </View>
      </View>
    );
  }

  // Neumorphic: 128px deeply inset well, stroke-width 6, gradient arc, raised center island, end-dot
  const nt = t as NeumorphicTheme;
  const size = sizeProp ?? 128;
  const center = size / 2;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2 - 8; // account for inset well padding
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  // End dot position
  const angle = (value / 100) * 360 - 90;
  const rad = (angle * Math.PI) / 180;
  const dotX = center + radius * Math.cos(rad);
  const dotY = center + radius * Math.sin(rad);

  // Center island: inset 16px from each side = diameter (size - 32)
  const islandSize = size - 32;

  const wellStyle = Platform.OS === 'ios'
    ? { ...nt.shadowOutMd.inner }
    : { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.4)', borderLeftColor: 'rgba(167,173,184,0.4)', borderBottomColor: 'rgba(255,255,255,0.7)', borderRightColor: 'rgba(255,255,255,0.7)' };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      {/* Inset well background */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: Platform.OS === 'ios' ? nt.surface : '#dde2ea',
        ...wellStyle,
      }} />
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="neuRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={nt.accentSoft} />
            <Stop offset="1" stopColor={nt.accent} />
          </LinearGradient>
        </Defs>
        {/* Progress arc */}
        <Circle
          cx={center} cy={center} r={radius}
          stroke="url(#neuRingGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
        {/* End dot — outer accent circle + inner surface circle */}
        <Circle cx={dotX} cy={dotY} r={5} fill={nt.accent} />
        <Circle cx={dotX} cy={dotY} r={2} fill={nt.surface} />
      </Svg>
      {/* Raised center island */}
      <View style={{
        position: 'absolute',
        width: islandSize,
        height: islandSize,
        borderRadius: islandSize / 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...neumorphicRaisedStyle(nt, 'sm'),
      }}>
        <Text style={{
          fontFamily: nt.fontDisplayItalic,
          fontSize: 36,
          color: nt.ink,
          letterSpacing: -1.2,
          lineHeight: 38,
        }}>
          {value}
        </Text>
        <Text style={{
          fontFamily: nt.fontBodyExtraBold,
          fontSize: 8,
          color: nt.muted,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 2,
        }}>
          {label}
        </Text>
      </View>
    </View>
  );
}
