import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { api } from '@/lib/api';
import { useOnboarding } from './_layout';
import { PlatformConnectForm } from '@/components/forms/PlatformConnectForm';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default function ConnectScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { setConnectedProfile } = useOnboarding();
  const [skipping, setSkipping] = useState(false);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isGlass(t) ? t.bg : t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 24,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={{
          fontFamily: t.fontDisplay,
          fontSize: 28,
          color: fg,
          letterSpacing: -0.5,
          marginBottom: 4,
        }}>
          {'Connect your first '}
          <Text style={{
            fontFamily: t.fontDisplayItalic,
            color: isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent,
          }}>
            platform
          </Text>
        </Text>

        <Text style={{
          fontFamily: t.fontBody,
          fontSize: 14,
          color: muted,
          lineHeight: 20,
          marginBottom: 24,
        }}>
          Just enter your username and we'll pull in your profile data instantly.
        </Text>

        <SectionHeader number="01" title="Select and connect" emphasisWord="connect" />

        <PlatformConnectForm
          onSuccess={(data) => {
            setConnectedProfile({
              platform: data.account.platform,
              username: data.account.platform_username ?? '',
              displayName: data.profile.displayName ?? data.account.platform_display_name ?? null,
              avatarUrl: data.account.avatar_url ?? null,
              followerCount: data.profile.followersCount ?? data.account.follower_count ?? 0,
              engagementRate: data.profile.engagementRate ?? null,
            });
            router.push('/(onboarding)/success' as any);
          }}
          onSkip={handleSkip}
          showSkip={!skipping}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
