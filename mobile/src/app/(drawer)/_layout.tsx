import { Drawer } from 'expo-router/drawer';
import { Pressable } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useTheme } from '../../contexts/theme-context';
import { DrawerMenu } from '../../components/layout/DrawerMenu';
import { MenuIcon } from '../../components/layout/MenuIcon';
import { FontSize } from '../../constants/theme';

function HamburgerButton() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={{ paddingHorizontal: 16 }}
      hitSlop={8}
    >
      <MenuIcon name="menu" color={colors.text} size={24} />
    </Pressable>
  );
}

export default function DrawerLayout() {
  const { colors } = useTheme();

  const screenOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: FontSize.lg },
    headerLeft: () => <HamburgerButton />,
    drawerStyle: { backgroundColor: colors.surface, width: 280 },
  };

  return (
    <Drawer
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={screenOptions}
    >
      <Drawer.Screen name="index" options={{ title: 'Overview' }} />
      <Drawer.Screen name="profiles" options={{ title: 'Profiles' }} />
      <Drawer.Screen name="chat" options={{ title: 'Chat' }} />
      <Drawer.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Drawer.Screen name="ai-studio" options={{ title: 'Studio' }} />
      <Drawer.Screen name="strategy" options={{ title: 'Strategy' }} />
      <Drawer.Screen name="intelligence" options={{ title: 'Intelligence' }} />
      <Drawer.Screen name="monetization" options={{ title: 'Monetization' }} />
      <Drawer.Screen name="smo-score" options={{ title: 'SMO Score' }} />
      <Drawer.Screen name="recommendations" options={{ title: 'Recommendations' }} />
      <Drawer.Screen name="goals" options={{ title: 'Goals' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}
