import { useState, useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { View, ActivityIndicator } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const t = useTokens();
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    api.get<{ onboarded_at: string | null }>('/user')
      .then((profile) => {
        setOnboarded(!!profile.onboarded_at);
      })
      .catch((err) => {
        const status = err?.status ?? 0;
        if (status === 401 || status === 404 || status === 403) {
          signOut();
        } else {
          setOnboarded(true);
        }
      })
      .finally(() => setProfileLoading(false));
  }, [user, signOut]);

  if (authLoading || (user && profileLoading)) {
    const color = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  if (onboarded === false) return <Redirect href={'/(onboarding)/welcome' as any} />;

  return <Redirect href="/(drawer)" />;
}
