import { useState } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/account-context';
import { useOnboarding } from './_layout';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/Button';
import { IconStar } from '@/components/icons/Icons';
import {
  IconInstagram, IconTikTok, IconYouTube, IconLinkedIn,
  IconTwitter, IconFacebook, IconTwitch,
} from '@/components/icons/Icons';

const PLATFORM_ICONS: Record<string, typeof IconInstagram> = {
  instagram: IconInstagram,
  tiktok: IconTikTok,
  youtube: IconYouTube,
  linkedin: IconLinkedIn,
  x: IconTwitter,
  facebook: IconFacebook,
  twitch: IconTwitch,
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function SuccessScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { connectedProfile } = useOnboarding();
  const { refreshAccounts } = useAccount();
  const [loading, setLoading] = useState(false);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;
  const good = isGlass(t) ? t.good : isEditorial(t) ? '#22c55e' : t.good;

  const PlatformIcon = connectedProfile ? (PLATFORM_ICONS[connectedProfile.platform] ?? IconStar) : IconStar;

  const handleGo = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/complete', {});
      await refreshAccounts();
    } catch {
      // still proceed
    }
    router.replace('/(drawer)');
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
            backgroundColor: isGlass(t) ? 'rgba(138,255,193,0.12)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
          }}>
            <IconStar size={36} color={good} />
          </View>

          <Text style={{
            fontFamily: t.fontDisplay,
            fontSize: 32,
            color: fg,
            textAlign: 'center',
            letterSpacing: -1,
            lineHeight: 36,
          }}>
            {"You're all "}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: accent }}>set.</Text>
          </Text>
        </View>

        {connectedProfile && (
          <ThemedCard padding={20} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {connectedProfile.avatarUrl ? (
                <Image
                  source={{ uri: connectedProfile.avatarUrl }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: isEditorial(t) ? 1.5 : 0,
                    borderColor: isEditorial(t) ? t.border.color : 'transparent',
                  }}
                />
              ) : (
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <PlatformIcon size={24} color={accent} />
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: t.fontBodySemibold,
                  fontSize: 12,
                  color: muted,
                }}>
                  {PLATFORM_LABELS[connectedProfile.platform] ?? connectedProfile.platform}
                </Text>
                <Text style={{
                  fontFamily: t.fontDisplay,
                  fontSize: 18,
                  color: fg,
                  letterSpacing: -0.3,
                  marginTop: 2,
                }}>
                  {connectedProfile.displayName ?? `@${connectedProfile.username}`}
                </Text>
                {connectedProfile.displayName && (
                  <Text style={{ fontFamily: t.fontBody, fontSize: 13, color: muted }}>
                    @{connectedProfile.username}
                  </Text>
                )}
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              gap: 16,
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker,
            }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{
                  fontFamily: t.fontDisplay,
                  fontSize: 22,
                  color: fg,
                  letterSpacing: -0.5,
                }}>
                  {fmtCount(connectedProfile.followerCount)}
                </Text>
                <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: muted, marginTop: 2 }}>
                  Followers
                </Text>
              </View>
              {connectedProfile.engagementRate != null && connectedProfile.engagementRate > 0 && (
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{
                    fontFamily: t.fontDisplay,
                    fontSize: 22,
                    color: fg,
                    letterSpacing: -0.5,
                  }}>
                    {(connectedProfile.engagementRate * 100).toFixed(1)}%
                  </Text>
                  <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: muted, marginTop: 2 }}>
                    Engagement
                  </Text>
                </View>
              )}
            </View>
          </ThemedCard>
        )}

        <Text style={{
          fontFamily: t.fontBody,
          fontSize: 14,
          color: muted,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: 24,
        }}>
          Your dashboard is ready with real data. Head in to start exploring.
        </Text>

        <Button
          label={loading ? 'Loading...' : 'Go to Dashboard'}
          onPress={handleGo}
          disabled={loading}
        />
      </ScrollView>
    </View>
  );
}
