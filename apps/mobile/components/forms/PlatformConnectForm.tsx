import { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, type TextStyle } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { api } from '@/lib/api';
import { PlatformSelector } from '@/components/ui/PlatformSelector';
import { Button } from '@/components/ui/Button';
import { Kicker } from '@/components/ui/Kicker';

interface ConnectResult {
  account: {
    id: string;
    platform: string;
    platform_username: string | null;
    platform_display_name: string | null;
    avatar_url: string | null;
    follower_count: number | null;
    post_count: number | null;
    sync_status: string;
  };
  profile: {
    displayName: string | null;
    bio: string | null;
    followersCount: number | null;
    followingCount: number | null;
    postsCount: number | null;
    verified: boolean;
    engagementRate: number | null;
    recentPostsCount: number;
  };
}

interface PlatformConnectFormProps {
  onSuccess: (data: ConnectResult) => void;
  onCancel?: () => void;
  onSkip?: () => void;
  onLimitReached?: () => void;
  showSkip?: boolean;
}

export function PlatformConnectForm({
  onSuccess,
  onCancel,
  onSkip,
  onLimitReached,
  showSkip,
}: PlatformConnectFormProps) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;

  const [platform, setPlatform] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!platform || !username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<ConnectResult>('/platforms/add', {
        platform,
        username: username.trim().replace(/^@/, ''),
      });
      onSuccess(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed.';
      if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')) {
        onLimitReached?.();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ gap: 20 }}>
      <View>
        <Kicker style={{ marginBottom: 12 }}>Choose a platform</Kicker>
        <PlatformSelector selectedPlatform={platform} onSelect={setPlatform} />
      </View>

      {platform && (
        <View>
          <Kicker style={{ marginBottom: 8 }}>Enter your username</Kicker>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              color: muted,
              fontFamily: t.fontBody,
              fontSize: 15,
              position: 'absolute',
              left: 14,
              zIndex: 1,
            }}>
              @
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              placeholderTextColor={isGlass(t) ? t.faint : isEditorial(t) ? t.muted : t.faint}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleConnect}
              style={{
                flex: 1,
                fontFamily: t.fontBody,
                fontSize: 15,
                color: fg,
                paddingLeft: 28,
                paddingRight: 14,
                paddingVertical: 12,
                backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surface : t.surfaceLighter,
                borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
                borderColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent',
                borderRadius: isEditorial(t) ? 2 : 14,
                ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
              } as TextStyle}
            />
          </View>
        </View>
      )}

      {error && (
        <View style={{
          padding: 12,
          backgroundColor: isGlass(t) ? 'rgba(255,113,168,0.1)' : 'rgba(200,60,60,0.1)',
          borderRadius: 12,
        }}>
          <Text style={{ color: isGlass(t) ? t.bad : '#c87878', fontSize: 13, fontFamily: t.fontBody }}>
            {error}
          </Text>
        </View>
      )}

      {loading && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
          <ActivityIndicator size="small" color={isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent} />
          <Text style={{ fontSize: 13, color: muted, fontFamily: t.fontBody }}>
            Looking up your profile...
          </Text>
        </View>
      )}

      <Button
        label={loading ? 'Connecting...' : 'Connect'}
        onPress={handleConnect}
        disabled={loading || !platform || !username.trim()}
      />

      {onCancel && (
        <Button label="Cancel" variant="ghost" onPress={onCancel} />
      )}

      {showSkip && onSkip && (
        <Button label="I'll do this later" variant="skip" onPress={onSkip} />
      )}
    </View>
  );
}
