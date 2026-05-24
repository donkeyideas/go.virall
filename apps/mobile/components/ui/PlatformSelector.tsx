import { View, Text, Pressable } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import {
  IconInstagram, IconTikTok, IconYouTube, IconLinkedIn,
  IconTwitter, IconFacebook, IconTwitch,
} from '@/components/icons/Icons';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', Icon: IconInstagram },
  { id: 'tiktok', label: 'TikTok', Icon: IconTikTok },
  { id: 'youtube', label: 'YouTube', Icon: IconYouTube },
  { id: 'linkedin', label: 'LinkedIn', Icon: IconLinkedIn },
  { id: 'x', label: 'X', Icon: IconTwitter },
  { id: 'facebook', label: 'Facebook', Icon: IconFacebook },
  { id: 'twitch', label: 'Twitch', Icon: IconTwitch },
] as const;

interface PlatformSelectorProps {
  selectedPlatform: string | null;
  onSelect: (platform: string) => void;
}

export function PlatformSelector({ selectedPlatform, onSelect }: PlatformSelectorProps) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      {PLATFORMS.map(({ id, label, Icon }) => {
        const selected = selectedPlatform === id;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            style={{
              width: 80,
              paddingVertical: 12,
              alignItems: 'center',
              borderRadius: isEditorial(t) ? 2 : 14,
              borderWidth: selected ? (isEditorial(t) ? 1.5 : 1.5) : (isEditorial(t) ? 1.5 : 1),
              borderColor: selected
                ? (isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent)
                : (isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker),
              backgroundColor: selected
                ? (isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.surfaceAlt : t.surface)
                : (isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surface : t.surfaceLighter),
              ...(isNeumorphic(t) && !selected ? t.shadowOutSm.outer : {}),
              ...(isNeumorphic(t) && selected ? t.shadowOutSm.inner : {}),
            }}
          >
            <Icon
              size={24}
              color={selected
                ? (isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent)
                : muted}
            />
            <Text style={{
              fontSize: 10,
              fontFamily: t.fontBody,
              color: selected ? fg : muted,
              marginTop: 6,
              fontWeight: selected ? '600' : '400',
            }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
