import { createContext, useContext, useState } from 'react';
import { Stack } from 'expo-router';
import { useTokens, isGlass } from '@/lib/theme';

export interface ConnectedProfileData {
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number;
  engagementRate: number | null;
}

interface OnboardingContextValue {
  connectedProfile: ConnectedProfileData | null;
  setConnectedProfile: (data: ConnectedProfileData | null) => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  connectedProfile: null,
  setConnectedProfile: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export default function OnboardingLayout() {
  const t = useTokens();
  const [connectedProfile, setConnectedProfile] = useState<ConnectedProfileData | null>(null);

  return (
    <OnboardingContext.Provider value={{ connectedProfile, setConnectedProfile }}>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isGlass(t) ? t.bg : t.bg },
      }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="connect" />
        <Stack.Screen name="success" />
      </Stack>
    </OnboardingContext.Provider>
  );
}
