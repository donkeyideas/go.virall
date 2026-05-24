import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/Button';
import { IconRocket, IconZap, IconStar, IconBarChart } from '@/components/icons/Icons';

const FEATURES = [
  { Icon: IconZap, title: 'Connect any platform instantly', desc: 'Add your socials with just a username -- no OAuth needed.' },
  { Icon: IconStar, title: 'Get your SMO Score', desc: 'See how optimized your social presence is across 6 factors.' },
  { Icon: IconBarChart, title: 'AI content and strategy tools', desc: 'Generate ideas, captions, scripts, and bios powered by AI.' },
] as const;

export default function WelcomeScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const [skipping, setSkipping] = useState(false);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;

  const handleSkip = async () => {
    setSkipping(true);
    try {
      await api.post('/onboarding/complete', {});
      router.replace('/(drawer)');
    } catch {
      router.replace('/(drawer)');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isGlass(t) ? t.bg : t.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: 24,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <IconRocket size={36} color={accent} />
          </View>

          <Text style={{
            fontFamily: t.fontDisplay,
            fontSize: 32,
            color: fg,
            textAlign: 'center',
            letterSpacing: -1,
            lineHeight: 36,
          }}>
            {'Your creator OS\nis '}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: accent }}>ready.</Text>
          </Text>

          <Text style={{
            fontFamily: t.fontBody,
            fontSize: 15,
            color: muted,
            textAlign: 'center',
            lineHeight: 22,
            marginTop: 12,
            maxWidth: 320,
          }}>
            Track your growth, score your social presence, and get AI-powered content tools -- all from one dashboard.
          </Text>
        </View>

        <View style={{ gap: 12, marginBottom: 32 }}>
          {FEATURES.map(({ Icon, title, desc }) => (
            <ThemedCard key={title} padding={16}>
              <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: isEditorial(t) ? 2 : 12,
                  backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.12)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Icon size={20} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: t.fontBodySemibold,
                    fontSize: 14,
                    color: fg,
                    marginBottom: 2,
                  }}>
                    {title}
                  </Text>
                  <Text style={{
                    fontFamily: t.fontBody,
                    fontSize: 12,
                    color: muted,
                    lineHeight: 18,
                  }}>
                    {desc}
                  </Text>
                </View>
              </View>
            </ThemedCard>
          ))}
        </View>

        <View style={{ gap: 10 }}>
          <Button label="Get Started" onPress={() => router.push('/(onboarding)/connect' as any)} />
          <Button
            label={skipping ? 'Skipping...' : 'Skip for now'}
            variant="skip"
            onPress={handleSkip}
            disabled={skipping}
          />
        </View>
      </ScrollView>
    </View>
  );
}
