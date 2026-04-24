import React from 'react';
import { View, Text } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { NeumorphicView, neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';

interface Props {
  status: string;          // "Scheduled · Reel · IG"
  time: string;            // "6:42 PM ET"
  hook: string;            // plain text
  emphasisWord?: string;   // word to emphasize
  score: number | null;
  hookStrength?: string;
  predicted?: string;
}

// ── Glass ──────────────────────────────────────────────────────────
function GlassNextPost({ status, time, hook, emphasisWord, score, hookStrength, predicted }: Props) {
  const t = useTokens() as ReturnType<typeof useTokens> & { name: 'glassmorphic' };

  const renderHook = () => {
    if (!emphasisWord || !hook.includes(emphasisWord)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 20, color: t.fg, lineHeight: 25, letterSpacing: -0.2 }}>{hook}</Text>;
    }
    const parts = hook.split(emphasisWord);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 20, color: t.fg, lineHeight: 25, letterSpacing: -0.2 }}>
        {parts[0]}<Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>{emphasisWord}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
      borderRadius: 22, overflow: 'hidden',
    }}>
      {/* 3px gradient top line */}
      <LinearGradient
        colors={['#c7b4ff', '#ff71a8', '#ffb648']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ height: 3 }}
      />

      <View style={{ padding: 18 }}>
        {/* Top: chip + time */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View style={{
            paddingVertical: 4, paddingHorizontal: 8,
            backgroundColor: 'rgba(138,255,193,0.1)',
            borderWidth: 1, borderColor: 'rgba(138,255,193,0.25)',
            borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6,
          }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.good }} />
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.good }}>{status}</Text>
          </View>
          <Text style={{ fontFamily: t.fontMono, fontSize: 11, color: t.muted, letterSpacing: 0.5 }}>{time}</Text>
        </View>

        {/* Hook text */}
        <View style={{ marginBottom: 12 }}>{renderHook()}</View>

        {/* Meta row */}
        <View style={{ flexDirection: 'row', gap: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>Score</Text>
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.fg, marginTop: 2 }}>{score ?? '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>Hook</Text>
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.violetSoft, marginTop: 2, fontStyle: 'italic' }}>{hookStrength ?? '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>Predicted</Text>
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.fg, marginTop: 2 }}>{predicted ?? '—'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Editorial ──────────────────────────────────────────────────────
function EditorialNextPost({ status, time, hook, emphasisWord, score, hookStrength, predicted }: Props) {
  const t = useTokens() as ReturnType<typeof useTokens> & { name: 'neon-editorial' };

  const renderHook = () => {
    if (!emphasisWord || !hook.includes(emphasisWord)) {
      return <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 22, color: t.ink, lineHeight: 26, letterSpacing: -0.3 }}>{hook}</Text>;
    }
    const parts = hook.split(emphasisWord);
    return (
      <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 22, color: t.ink, lineHeight: 26, letterSpacing: -0.3 }}>
        {parts[0]}<Text style={{ backgroundColor: t.lime, paddingHorizontal: 4 }}>{emphasisWord}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <View style={{
      backgroundColor: t.bg, borderWidth: 1.5, borderColor: t.ink,
      ...t.shadowCard, overflow: 'hidden',
    }}>
      {/* Ink band across top */}
      <View style={{
        backgroundColor: t.ink, paddingVertical: 6, paddingHorizontal: 14,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: t.bg }}>{status}</Text>
        <View style={{ backgroundColor: t.lime, paddingVertical: 2, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.ink }}>{time}</Text>
        </View>
      </View>

      {/* Body */}
      <View style={{ padding: 16 }}>
        <View style={{ marginBottom: 14 }}>{renderHook()}</View>

        {/* Meta row with dashed border */}
        <View style={{ flexDirection: 'row', gap: 12, paddingTop: 12, borderTopWidth: 1.5, borderTopColor: t.ink }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted }}>Score</Text>
            <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 16, color: t.ink, marginTop: 2, letterSpacing: -0.2 }}>{score ?? '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted }}>Hook</Text>
            <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 16, color: t.ink, marginTop: 2, letterSpacing: -0.2 }}>{hookStrength ?? '—'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted }}>Predicted</Text>
            <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 16, color: t.ink, marginTop: 2, letterSpacing: -0.2 }}>{predicted ?? '—'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Neumorphic ─────────────────────────────────────────────────────
function NeumorphicNextPost({ status, time, hook, emphasisWord, score, hookStrength, predicted }: Props) {
  const t = useTokens() as NeumorphicTheme;

  const renderHook = () => {
    if (!emphasisWord || !hook.includes(emphasisWord)) {
      return <Text style={{ fontFamily: t.fontDisplay, fontSize: 19, color: t.ink, lineHeight: 24, letterSpacing: -0.3 }}>{hook}</Text>;
    }
    const parts = hook.split(emphasisWord);
    return (
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 19, color: t.ink, lineHeight: 24, letterSpacing: -0.3 }}>
        {parts[0]}<Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>{emphasisWord}</Text>{parts[1]}
      </Text>
    );
  };

  return (
    <NeumorphicView elevation="md" borderRadius={24} padding={18}>
      {/* Top: chip + time */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View style={{
          paddingVertical: 6, paddingHorizontal: 12,
          borderRadius: 999,
          flexDirection: 'row', alignItems: 'center', gap: 6,
          ...neumorphicRaisedStyle(t, 'sm'),
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.good }} />
          <Text style={{ fontFamily: t.fontBodyBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: t.good }}>{status}</Text>
        </View>
        <Text style={{ fontFamily: t.fontBodyBold, fontSize: 11, color: t.muted, letterSpacing: 0.4 }}>{time}</Text>
      </View>

      {/* Hook text */}
      <View style={{ marginBottom: 14 }}>{renderHook()}</View>

      {/* Meta grid inside inset tray */}
      <NeumorphicView inset borderRadius={14} padding={12} style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: t.fontBodyExtraBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint, marginBottom: 2 }}>Score</Text>
          <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.ink }}>{score ?? '—'}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(167,173,184,0.3)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: t.fontBodyExtraBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint, marginBottom: 2 }}>Hook</Text>
          <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.accent, fontStyle: 'italic' }}>{hookStrength ?? '—'}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(167,173,184,0.3)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: t.fontBodyExtraBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint, marginBottom: 2 }}>Predicted</Text>
          <Text style={{ fontFamily: t.fontDisplay, fontSize: 15, color: t.ink }}>{predicted ?? '—'}</Text>
        </View>
      </NeumorphicView>
    </NeumorphicView>
  );
}

// ── Exported ───────────────────────────────────────────────────────
export function NextPostCard(props: Props) {
  const t = useTokens();
  if (isGlass(t)) return <GlassNextPost {...props} />;
  if (isEditorial(t)) return <EditorialNextPost {...props} />;
  return <NeumorphicNextPost {...props} />;
}
