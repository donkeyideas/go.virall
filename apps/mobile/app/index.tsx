import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { View, ActivityIndicator } from 'react-native';
import { useTokens, isGlass, isEditorial } from '@/lib/theme';

export default function Index() {
  const { user, loading } = useAuth();
  const t = useTokens();

  if (loading) {
    const color = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  return <Redirect href="/(drawer)" />;
}
