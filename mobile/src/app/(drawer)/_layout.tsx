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
    drawerStyle: { backgroundColor: colors.background, width: 280 },
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
      <Drawer.Screen name="deals" options={{ title: 'Deals' }} />
      <Drawer.Screen name="proposals" options={{ title: 'Proposals' }} />
      <Drawer.Screen name="opportunities" options={{ title: 'Opportunities' }} />
      <Drawer.Screen name="messages" options={{ title: 'Messages' }} />
      <Drawer.Screen name="publish" options={{ title: 'Publish' }} />
      <Drawer.Screen name="hashtags" options={{ title: 'Hashtags' }} />
      <Drawer.Screen name="revenue" options={{ title: 'Revenue' }} />
      <Drawer.Screen name="marketplace" options={{ title: 'Marketplace' }} />
      <Drawer.Screen name="smo-score" options={{ title: 'SMO Score' }} />
      <Drawer.Screen name="recommendations" options={{ title: 'Recommendations' }} />
      <Drawer.Screen name="goals" options={{ title: 'Goals' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
      <Drawer.Screen name="trust-score" options={{ title: 'Trust Score' }} />
      <Drawer.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Drawer.Screen name="content" options={{ title: 'Content' }} />
      <Drawer.Screen name="campaigns" options={{ title: 'Campaigns' }} />
      <Drawer.Screen name="growth" options={{ title: 'Growth' }} />
      <Drawer.Screen name="audience" options={{ title: 'Audience' }} />
      <Drawer.Screen name="competitors" options={{ title: 'Competitors' }} />
      <Drawer.Screen name="network" options={{ title: 'Network' }} />
      <Drawer.Screen name="business" options={{ title: 'Business' }} />
      <Drawer.Screen name="brand-overview" options={{ title: 'Overview' }} />
      <Drawer.Screen name="brand-discover" options={{ title: 'Discover' }} />
      <Drawer.Screen name="brand-matches" options={{ title: 'Matches' }} />
      <Drawer.Screen name="brand-deals" options={{ title: 'Deals' }} />
      <Drawer.Screen name="brand-campaigns" options={{ title: 'Campaigns' }} />
      <Drawer.Screen name="brand-calendar" options={{ title: 'Calendar' }} />
      <Drawer.Screen name="brand-proposals" options={{ title: 'Proposals' }} />
      <Drawer.Screen name="brand-payments" options={{ title: 'Payments' }} />
      <Drawer.Screen name="brand-messages" options={{ title: 'Messages' }} />
      <Drawer.Screen name="brand-analytics" options={{ title: 'Analytics' }} />
      <Drawer.Screen name="brand-trust" options={{ title: 'Trust Score' }} />
      <Drawer.Screen name="brand-settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}
