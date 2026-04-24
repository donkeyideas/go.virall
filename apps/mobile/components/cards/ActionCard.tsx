import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { NeumorphicView, neumorphicInsetCircleStyle, neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';

interface Props {
  kicker: string;
  eyebrow?: string;
  title: string;
  emphasisWord?: string;
  meta?: string;
  variant?: 'default' | 'urgent' | 'warm';
  primaryCta?: { label: string; onPress: () => void };
  skipCta?: { label: string; onPress: () => void };
}

// ── Glass ──────────────────────────────────────────────────────────
function GlassAction(props: Props) {
  const t = useTokens() as ReturnType<typeof useTokens> & { name: 'glassmorphic' };
  const { kicker, eyebrow, title, emphasisWord, meta, variant = 'default', primaryCta, skipCta } = props;

  const isUrgent = variant === 'urgent';
  const isWarm = variant === 'warm';

  const cardBg = isUrgent ? 'rgba(255,113,168,0.08)' : isWarm ? 'rgba(255,182,72,0.08)' : 'rgba(255,255,255,0.05)';
  const cardBorder = isUrgent ? 'rgba(255,113,168,0.35)' : isWarm ? 'rgba(255,182,72,0.35)' : 'rgba(255,255,255,0.12)';
  const glyphColor = isUrgent ? '#ff71a8' : isWarm ? '#ffb648' : '#c7b4ff';
  const glyphBg = isUrgent ? 'rgba(255,113,168,0.15)' : isWarm ? 'rgba(255,182,72,0.15)' : 'rgba(255,255,255,0.08)';
  const glyphBorder = isUrgent ? 'rgba(255,113,168,0.3)' : isWarm ? 'rgba(255,182,72,0.3)' : 'rgba(255,255,255,0.12)';
  const kickerColor = isUrgent ? '#ff71a8' : isWarm ? '#ffb648' : 'rgba(199,180,255,0.7)';

  const renderTitle = () => {
    if (!emphasisWord || !title.includes(emphasisWord)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 19, color: t.fg, lineHeight: 23, letterSpacing: -0.2 }}>{title}</Text>;
    }
    const parts = title.split(emphasisWord);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 19, color: t.fg, lineHeight: 23, letterSpacing: -0.2 }}>
        {parts[0]}<Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>{emphasisWord}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <View style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder, borderRadius: 20, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: glyphBg, borderWidth: 1, borderColor: glyphBorder, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 16, color: glyphColor }}>{isUrgent ? '!' : isWarm ? '→' : '✦'}</Text>
        </View>
        <View>
          <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: kickerColor }}>{kicker}</Text>
          {eyebrow && <Text style={{ fontFamily: t.fontMono, fontSize: 9, color: t.subtle, marginTop: 2 }}>{eyebrow}</Text>}
        </View>
      </View>
      <View style={{ marginBottom: 6 }}>{renderTitle()}</View>
      {meta && <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, lineHeight: 17, marginBottom: 12 }}>{meta}</Text>}
      {(primaryCta || skipCta) && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {primaryCta && (
            <Pressable onPress={primaryCta.onPress} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: t.violet, shadowColor: t.violet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 14 }}>
              <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 11, color: '#fff', letterSpacing: 0.3 }}>{primaryCta.label}</Text>
            </Pressable>
          )}
          {skipCta && (
            <Pressable onPress={skipCta.onPress} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: t.fontBodyMedium, fontSize: 11, color: t.faint }}>{skipCta.label}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ── Editorial ──────────────────────────────────────────────────────
function EditorialAction(props: Props) {
  const t = useTokens() as ReturnType<typeof useTokens> & { name: 'neon-editorial' };
  const { kicker, eyebrow, title, emphasisWord, meta, variant = 'default', primaryCta, skipCta } = props;

  const isUrgent = variant === 'urgent';
  const isWarm = variant === 'warm';
  const cardBg = isUrgent ? t.pink : isWarm ? t.lime : t.bg;
  const textColor = isUrgent ? t.bg : t.ink;
  const metaColor = isUrgent ? 'rgba(244,236,222,0.85)' : t.muted;
  const tagBg = isUrgent ? t.bg : t.ink;
  const tagColor = isUrgent ? t.ink : t.bg;

  const renderTitle = () => {
    if (!emphasisWord || !title.includes(emphasisWord)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 20, color: textColor, lineHeight: 24, letterSpacing: -0.3 }}>{title}</Text>;
    }
    const parts = title.split(emphasisWord);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 20, color: textColor, lineHeight: 24, letterSpacing: -0.3 }}>
        {parts[0]}<Text style={{ fontStyle: 'italic' }}>{emphasisWord}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <View style={{ backgroundColor: cardBg, borderWidth: 1.5, borderColor: t.ink, padding: 14, paddingHorizontal: 16, ...t.shadowCardSmall }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View style={{ backgroundColor: tagBg, paddingVertical: 2, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: tagColor }}>{kicker}</Text>
        </View>
        {eyebrow && <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 0.8, color: isUrgent ? 'rgba(244,236,222,0.8)' : t.muted }}>{eyebrow}</Text>}
      </View>
      <View style={{ marginBottom: 6 }}>{renderTitle()}</View>
      {meta && <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: metaColor, lineHeight: 17, marginBottom: 12 }}>{meta}</Text>}
      {(primaryCta || skipCta) && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {primaryCta && (
            <Pressable onPress={primaryCta.onPress} style={{ paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: t.ink, backgroundColor: isUrgent ? t.bg : t.lime, ...t.shadowButton }}>
              <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: t.ink }}>{primaryCta.label}</Text>
            </Pressable>
          )}
          {skipCta && (
            <Pressable onPress={skipCta.onPress} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
              <Text style={{ fontFamily: t.fontMono, fontSize: 10, color: isUrgent ? 'rgba(244,236,222,0.7)' : t.muted }}>{skipCta.label}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ── Neumorphic ─────────────────────────────────────────────────────
function NeumorphicAction(props: Props) {
  const t = useTokens() as NeumorphicTheme;
  const { kicker, eyebrow, title, emphasisWord, meta, variant = 'default', primaryCta, skipCta } = props;

  const isUrgent = variant === 'urgent';
  const isWarm = variant === 'warm';
  const iconColor = isUrgent ? t.bad : isWarm ? t.warn : t.accent;
  const kickerColor = isUrgent ? t.bad : isWarm ? t.warn : t.muted;

  const renderTitle = () => {
    if (!emphasisWord || !title.includes(emphasisWord)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 18, color: t.ink, lineHeight: 22, letterSpacing: -0.3 }}>{title}</Text>;
    }
    const parts = title.split(emphasisWord);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 18, color: t.ink, lineHeight: 22, letterSpacing: -0.3 }}>
        {parts[0]}<Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>{emphasisWord}</Text>{parts[1]}
      </Text>
    );
  };

  const urgentStyle = isUrgent ? { borderWidth: 2, borderColor: 'rgba(200,120,120,0.2)' } : {};

  return (
    <NeumorphicView elevation="sm" borderRadius={22} padding={18} style={urgentStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <View style={neumorphicInsetCircleStyle(t, 42)}>
          <Text style={{ fontSize: 18, color: iconColor }}>{isUrgent ? '!' : isWarm ? '→' : '✦'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: t.fontBodyExtraBold, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: kickerColor }}>{kicker}</Text>
          {eyebrow && <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: t.faint, marginTop: 1 }}>{eyebrow}</Text>}
        </View>
      </View>
      <View style={{ marginBottom: 6 }}>{renderTitle()}</View>
      {meta && <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: t.muted, lineHeight: 17, marginBottom: 14 }}>{meta}</Text>}
      {(primaryCta || skipCta) && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {primaryCta && (
            <Pressable onPress={primaryCta.onPress} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, ...neumorphicRaisedStyle(t, 'sm') }}>
              <Text style={{ fontFamily: t.fontBodyBold, fontSize: 11, letterSpacing: 0.4, color: t.accent }}>{primaryCta.label}</Text>
            </Pressable>
          )}
          {skipCta && (
            <Pressable onPress={skipCta.onPress} style={{ paddingVertical: 10, paddingHorizontal: 8 }}>
              <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: t.faint }}>{skipCta.label}</Text>
            </Pressable>
          )}
        </View>
      )}
    </NeumorphicView>
  );
}

// ── Exported ───────────────────────────────────────────────────────
export function ActionCard(props: Props) {
  const t = useTokens();
  if (isGlass(t)) return <GlassAction {...props} />;
  if (isEditorial(t)) return <EditorialAction {...props} />;
  return <NeumorphicAction {...props} />;
}
