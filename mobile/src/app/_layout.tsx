import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from '../contexts/theme-context';
import { AuthProvider } from '../contexts/auth-context';

function RootNav() {
  const { colors, mode } = useTheme();
  return (
    <>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(drawer)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
