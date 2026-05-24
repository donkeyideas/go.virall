import { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';
import { api } from '@/lib/api';
import { useAccount } from '@/lib/account-context';
import { IconStar } from '@/components/icons/Icons';

let cachedHasBio: boolean | null = null;

export function NoBioNotice() {
  const t = useTokens();
  const { selectedAccountId } = useAccount();
  const [hasBio, setHasBio] = useState(cachedHasBio);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    cachedHasBio = null;
    setHasBio(null);
    const accountParam = selectedAccountId ? `?platformAccountId=${selectedAccountId}` : '';
    Promise.all([
      api.get<{ bio: string | null }>('/user'),
      api.get<any[]>('/platforms'),
    ])
      .then(([user, platforms]) => {
        const selectedPlatform = platforms?.find((p: any) => p.id === selectedAccountId);
        const has = !!(selectedPlatform?.platform_bio || user?.bio);
        cachedHasBio = has;
        setHasBio(has);
      })
      .catch(() => {});
  }, [selectedAccountId]);

  if (hasBio !== false || dismissed) return null;

  const bg = isGlass(t) ? 'rgba(255,182,72,0.1)' : isEditorial(t) ? '#fef6e6' : '#fef6e6';
  const border = isGlass(t) ? 'rgba(255,182,72,0.3)' : isEditorial(t) ? '#e8c96b' : '#e0c570';
  const textColor = isGlass(t) ? '#ffb648' : isEditorial(t) ? '#8a6d20' : '#8a6d20';

  return (
    <View style={{
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: border,
      borderRadius: isEditorial(t) ? 2 : 12,
      padding: 14,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <IconStar size={16} color={textColor} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 12, color: textColor, marginBottom: 4 }}>
          Add a bio for better results
        </Text>
        <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: textColor, lineHeight: 17, opacity: 0.85 }}>
          Content is generated from your social media profile description. Update your bio on your platform for personalized results.
        </Text>
      </View>
      <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
        <Text style={{ color: textColor, fontSize: 16, fontWeight: '600', opacity: 0.6 }}>x</Text>
      </Pressable>
    </View>
  );
}
