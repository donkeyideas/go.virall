import React from 'react';
import { View, Text } from 'react-native';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { NeumorphicView } from '@/components/ui/NeumorphicView';
import {
  IconInstagram, IconTikTok, IconYouTube, IconLinkedIn,
  IconTwitter, IconFacebook, IconTwitch,
} from '@/components/icons/Icons';
import type { PlatformItem } from '@/hooks/useTodayData';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#00F2EA',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  x: '#1DA1F2',
  facebook: '#1877F2',
  twitch: '#9146FF',
};

function PlatformIcon({ platform, size = 16, color }: { platform: string; size?: number; color?: string }) {
  const c = color ?? PLATFORM_COLORS[platform] ?? '#888';
  switch (platform) {
    case 'instagram': return <IconInstagram size={size} color={c} />;
    case 'tiktok': return <IconTikTok size={size} color={c} />;
    case 'youtube': return <IconYouTube size={size} color={c} />;
    case 'linkedin': return <IconLinkedIn size={size} color={c} />;
    case 'x': return <IconTwitter size={size} color={c} />;
    case 'facebook': return <IconFacebook size={size} color={c} />;
    case 'twitch': return <IconTwitch size={size} color={c} />;
    default: return null;
  }
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  platforms: PlatformItem[];
}

export function PlatformsCard({ platforms }: Props) {
  const t = useTokens();

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : (t as any).ink;
  const muted = (t as any).muted as string;
  const fontBody = (t as any).fontBody as string;
  const fontBold = (t as any).fontBodySemibold ?? (t as any).fontBodyBold ?? fontBody;

  return (
    <ThemedCard padding={isEditorial(t) ? 18 : 20}>
      <Kicker>Platforms</Kicker>

      {platforms.length === 0 ? (
        <Text style={{ fontFamily: fontBody, fontSize: 13, color: muted, marginTop: 12 }}>
          No platforms connected yet.
        </Text>
      ) : (
        <View style={{ marginTop: 14, gap: 10 }}>
          {platforms.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 8,
                backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? (t as any).surfaceAlt : (t as any).surfaceLighter,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <PlatformIcon platform={p.platform} size={16} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontBold, fontSize: 13, color: fg }}>
                  {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                </Text>
                {p.handle && (
                  <Text style={{ fontFamily: fontBody, fontSize: 11, color: muted }}>
                    @{p.handle.replace(/^@/, '')}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: (t as any).fontDisplayItalic, fontSize: 16, color: fg, letterSpacing: -0.3 }}>
                  {fmtK(p.follower_count)}
                </Text>
                <Text style={{ fontFamily: (t as any).fontMono, fontSize: 9, color: muted, letterSpacing: 0.5 }}>
                  {p.share}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ThemedCard>
  );
}
