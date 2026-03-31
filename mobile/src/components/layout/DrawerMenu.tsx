import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { Avatar } from '../ui/Avatar';
import { MenuIcon, type MenuIconName } from './MenuIcon';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';

interface MenuItem {
  label: string;
  icon: MenuIconName;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Overview', icon: 'overview', route: '/(drawer)' },
  { label: 'Profiles', icon: 'profiles', route: '/(drawer)/profiles' },
  { label: 'Analytics', icon: 'analytics', route: '/(drawer)/analytics' },
  { label: 'AI Studio', icon: 'ai-studio', route: '/(drawer)/ai-studio' },
  { label: 'Schedule', icon: 'schedule', route: '/(drawer)/schedule' },
  { label: 'Strategy', icon: 'strategy', route: '/(drawer)/strategy' },
  { label: 'Intelligence', icon: 'intelligence', route: '/(drawer)/intelligence' },
  { label: 'Monetization', icon: 'monetization', route: '/(drawer)/monetization' },
  { label: 'SMO Score', icon: 'smo-score', route: '/(drawer)/smo-score' },
  { label: 'Recommendations', icon: 'recommendations', route: '/(drawer)/recommendations' },
  { label: 'Goals', icon: 'goals', route: '/(drawer)/goals' },
  { label: 'Settings', icon: 'settings', route: '/(drawer)/settings' },
  { label: 'Profile', icon: 'profile', route: '/(drawer)/profile' },
];

export function DrawerMenu(props: any) {
  const { colors } = useTheme();
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleNav = (route: string) => {
    router.push(route as any);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Avatar name={profile?.full_name || 'User'} size={48} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {profile?.full_name || 'User'}
          </Text>
          <Text style={[styles.headerEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {user?.email || ''}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.route ||
            (item.route === '/(drawer)' && pathname === '/') ||
            (item.route !== '/(drawer)' && pathname.startsWith(item.route));

          return (
            <Pressable
              key={item.route}
              onPress={() => handleNav(item.route)}
              style={[
                styles.menuItem,
                isActive && { backgroundColor: colors.primary + '15' },
              ]}
            >
              <MenuIcon
                name={item.icon}
                color={isActive ? colors.primary : colors.textSecondary}
                size={22}
              />
              <Text
                style={[
                  styles.menuLabel,
                  { color: isActive ? colors.primary : colors.text },
                  isActive && styles.menuLabelActive,
                ]}
              >
                {item.label}
              </Text>
              {isActive && <View style={[styles.activeBar, { backgroundColor: colors.primary }]} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={handleSignOut}
        style={[styles.signOutBtn, { borderTopColor: colors.border }]}
      >
        <MenuIcon name="signout" color={colors.error} size={22} />
        <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  headerEmail: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
    position: 'relative',
  },
  menuLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  menuLabelActive: {
    fontWeight: '700',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
