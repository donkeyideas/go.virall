import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme, useTokens, isGlass, isEditorial, type ThemeName } from '@/lib/theme';
import { glassmorphicTokens } from '@/lib/tokens/glassmorphic';
import { neonEditorialTokens } from '@/lib/tokens/neon-editorial';

const THEMES: { key: ThemeName; label: string; desc: string; bg: string; fg: string; primary: string; accent: string; good: string; muted: string }[] = [
  {
    key: 'glassmorphic',
    label: 'Glassmorphic',
    desc: 'Dark violet, frosted glass, gradient glows',
    bg: glassmorphicTokens.bg,
    fg: glassmorphicTokens.fg,
    primary: glassmorphicTokens.violet,
    accent: glassmorphicTokens.rose,
    good: glassmorphicTokens.good,
    muted: glassmorphicTokens.muted,
  },
  {
    key: 'neon-editorial',
    label: 'Neon Editorial',
    desc: 'Cream paper, ink borders, lime accents',
    bg: neonEditorialTokens.bg,
    fg: neonEditorialTokens.fg,
    primary: neonEditorialTokens.lime,
    accent: neonEditorialTokens.pink,
    good: neonEditorialTokens.lime,
    muted: neonEditorialTokens.muted,
  },
];

function ThemePreviewCard({ th, selected, onSelect }: {
  th: typeof THEMES[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const isG = th.key === 'glassmorphic';
  const isE = th.key === 'neon-editorial';
  const borderRadius = isG ? 24 : 2;

  return (
    <Pressable onPress={onSelect} style={{ marginBottom: 20 }}>
      <View style={{
        backgroundColor: th.bg,
        borderRadius,
        borderWidth: selected ? 3 : isG ? 1 : 1.5,
        borderColor: selected ? th.primary : isG ? 'rgba(255,255,255,0.12)' : '#0b0b0b',
        padding: 20,
        overflow: 'hidden',
        ...(Platform.OS === 'ios'
          ? (isG ? {
              shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.45, shadowRadius: 30,
            } : {
              shadowColor: '#0b0b0b', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
            })
          : (isG ? { elevation: 12 } : { elevation: 6 })
        ),
      }}>
        <Text style={{ color: th.fg, fontSize: 20, fontWeight: '700', marginBottom: 4 }}>
          {th.label}
        </Text>
        <Text style={{ color: th.muted, fontSize: 12, marginBottom: 16 }}>
          {th.desc}
        </Text>

        {/* Mini preview */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <View style={{
            backgroundColor: isG ? 'rgba(255,255,255,0.05)' : '#f4ecde',
            borderWidth: isG ? 1 : 1.5,
            borderColor: isG ? 'rgba(255,255,255,0.12)' : '#0b0b0b',
            borderRadius: isG ? 12 : 2,
            padding: 10, flex: 1,
          }}>
            <Text style={{ color: th.muted, fontSize: 9, textTransform: 'uppercase' }}>Followers</Text>
            <Text style={{ color: th.fg, fontSize: 16, fontWeight: '700' }}>12.4K</Text>
            <Text style={{ color: th.good, fontSize: 9 }}>+2.1%</Text>
          </View>
          <View style={{
            backgroundColor: isG ? 'rgba(255,255,255,0.05)' : '#f4ecde',
            borderWidth: isG ? 1 : 1.5,
            borderColor: isG ? 'rgba(255,255,255,0.12)' : '#0b0b0b',
            borderRadius: isG ? 12 : 2,
            padding: 10, flex: 1, alignItems: 'center',
          }}>
            <Text style={{ color: th.fg, fontSize: 24, fontWeight: '700' }}>82</Text>
            <Text style={{ color: th.muted, fontSize: 9, textTransform: 'uppercase' }}>SMO Score</Text>
          </View>
        </View>

        {/* Color swatches */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[th.primary, th.accent, th.good].map((c, i) => (
            <View key={i} style={{
              width: 24, height: 24,
              borderRadius: isG ? 12 : 2,
              backgroundColor: c,
              borderWidth: isE ? 1.5 : 0,
              borderColor: '#0b0b0b',
            }} />
          ))}
        </View>

        {selected && (
          <View style={{
            position: 'absolute', top: 12, right: 12,
            backgroundColor: th.primary,
            borderRadius: isG ? 12 : 2,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ color: isG ? '#0a0618' : '#0b0b0b', fontSize: 11, fontWeight: '700' }}>Active</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function ThemeSelectScreen() {
  const { theme, setTheme } = useTheme();
  const t = useTokens();

  const fg = isGlass(t) ? t.fg : t.ink;
  const muted = t.muted;
  const primary = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <View>
            <Text style={{ color: fg, fontSize: 24, fontFamily: t.fontDisplay }}>
              Choose Your Vibe
            </Text>
            <Text style={{ color: muted, fontSize: 13, fontFamily: t.fontBody, marginTop: 2 }}>
              Pick a theme that matches your brand
            </Text>
          </View>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: primary, fontSize: 14, fontFamily: t.fontBody, fontWeight: '600' }}>Done</Text>
          </Pressable>
        </View>

        {THEMES.map((th) => (
          <ThemePreviewCard
            key={th.key}
            th={th}
            selected={theme === th.key}
            onSelect={() => setTheme(th.key)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
