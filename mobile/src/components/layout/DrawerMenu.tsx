import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { Avatar } from '../ui/Avatar';
import { MenuIcon, type MenuIconName } from './MenuIcon';
import { FontSize, Spacing, BorderRadius, glassShadowSm } from '../../constants/theme';

function SunIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <SvgCircle cx={12} cy={12} r={5} />
      <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Svg>
  );
}

function MoonIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </Svg>
  );
}

interface MenuItem {
  label: string;
  icon: MenuIconName;
  route: string;
}

const CREATOR_MENU_ITEMS: MenuItem[] = [
  { label: 'Overview', icon: 'overview', route: '/(drawer)' },
  { label: 'Profiles', icon: 'profiles', route: '/(drawer)/profiles' },
  { label: 'Chat', icon: 'chat', route: '/(drawer)/chat' },
  { label: 'Inbox', icon: 'inbox', route: '/(drawer)/inbox' },
  { label: 'Content', icon: 'content', route: '/(drawer)/content' },
  { label: 'Analytics', icon: 'analytics', route: '/(drawer)/analytics' },
  { label: 'Studio', icon: 'ai-studio', route: '/(drawer)/ai-studio' },
  { label: 'Strategy', icon: 'strategy', route: '/(drawer)/strategy' },
  { label: 'Intelligence', icon: 'intelligence', route: '/(drawer)/intelligence' },
  { label: 'SMO Score', icon: 'smo-score', route: '/(drawer)/smo-score' },
  { label: 'Trust Score', icon: 'trust-score', route: '/(drawer)/trust-score' },
  { label: 'Recommendations', icon: 'recommendations', route: '/(drawer)/recommendations' },
  { label: 'Monetization', icon: 'monetization', route: '/(drawer)/monetization' },
  { label: 'Deals', icon: 'deals', route: '/(drawer)/deals' },
  { label: 'Proposals', icon: 'proposals', route: '/(drawer)/proposals' },
  { label: 'Opportunities', icon: 'opportunities', route: '/(drawer)/opportunities' },
  { label: 'Messages', icon: 'messages', route: '/(drawer)/messages' },
  { label: 'Publish', icon: 'publish', route: '/(drawer)/publish' },
  { label: 'Campaigns', icon: 'campaigns', route: '/(drawer)/campaigns' },
  { label: 'Hashtags', icon: 'hashtags', route: '/(drawer)/hashtags' },
  { label: 'Revenue', icon: 'revenue', route: '/(drawer)/revenue' },
  { label: 'Growth', icon: 'growth', route: '/(drawer)/growth' },
  { label: 'Audience', icon: 'audience', route: '/(drawer)/audience' },
  { label: 'Competitors', icon: 'competitors', route: '/(drawer)/competitors' },
  { label: 'Network', icon: 'network', route: '/(drawer)/network' },
  { label: 'Business', icon: 'business', route: '/(drawer)/business' },
  { label: 'Goals', icon: 'goals', route: '/(drawer)/goals' },
  { label: 'Marketplace', icon: 'marketplace', route: '/(drawer)/marketplace' },
  { label: 'Settings', icon: 'settings', route: '/(drawer)/settings' },
];

const BRAND_MENU_ITEMS: MenuItem[] = [
  { label: 'Overview', icon: 'overview', route: '/(drawer)/brand-overview' },
  { label: 'Discover', icon: 'discover', route: '/(drawer)/brand-discover' },
  { label: 'Matches', icon: 'matches', route: '/(drawer)/brand-matches' },
  { label: 'Messages', icon: 'messages', route: '/(drawer)/brand-messages' },
  { label: 'Campaigns', icon: 'campaigns', route: '/(drawer)/brand-campaigns' },
  { label: 'Calendar', icon: 'calendar', route: '/(drawer)/brand-calendar' },
  { label: 'Proposals', icon: 'proposals', route: '/(drawer)/brand-proposals' },
  { label: 'Deals', icon: 'deals', route: '/(drawer)/brand-deals' },
  { label: 'Payments', icon: 'payments', route: '/(drawer)/brand-payments' },
  { label: 'Analytics', icon: 'analytics', route: '/(drawer)/brand-analytics' },
  { label: 'Trust Score', icon: 'trust', route: '/(drawer)/brand-trust' },
  { label: 'Marketplace', icon: 'marketplace', route: '/(drawer)/marketplace' },
  { label: 'Settings', icon: 'settings', route: '/(drawer)/brand-settings' },
];

export function DrawerMenu(props: any) {
  const { colors, mode, toggleTheme } = useTheme();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: colors.glassBorder }]}>
        <Avatar name={profile?.full_name || 'User'} size={48} imageUrl={profile?.avatar_url} />
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {profile?.full_name || 'User'}
          </Text>
          <Text style={[styles.headerEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {user?.email || ''}
          </Text>
          {profile?.account_type === 'brand' && (
            <View style={[styles.accountBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.accountBadgeText, { color: colors.primary }]}>Brand</Text>
            </View>
          )}
        </View>
      </View>

      {/* Theme Toggle */}
      <View style={[styles.themeRow]}>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder }]}
        >
          <View style={[
            styles.themeOption,
            mode === 'light' && { backgroundColor: colors.primary },
          ]}>
            <SunIcon size={14} color={mode === 'light' ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.themeText, { color: mode === 'light' ? '#FFFFFF' : colors.textMuted }]}>Light</Text>
          </View>
          <View style={[
            styles.themeOption,
            mode === 'dark' && { backgroundColor: colors.primary },
          ]}>
            <MoonIcon size={14} color={mode === 'dark' ? '#FFFFFF' : colors.textMuted} />
            <Text style={[styles.themeText, { color: mode === 'dark' ? '#FFFFFF' : colors.textMuted }]}>Dark</Text>
          </View>
        </Pressable>
      </View>

      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {(profile?.account_type === 'brand' ? BRAND_MENU_ITEMS : CREATOR_MENU_ITEMS).map((item) => {
          const isActive = pathname === item.route ||
            (item.route === '/(drawer)' && pathname === '/') ||
            (item.route !== '/(drawer)' && pathname.startsWith(item.route));

          return (
            <Pressable
              key={item.route}
              onPress={() => handleNav(item.route)}
              style={[
                styles.menuItem,
                isActive && [{
                  backgroundColor: colors.glassBg,
                  borderWidth: 1,
                  borderColor: colors.glassBorder,
                }, glassShadowSm(colors)],
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
        style={[styles.signOutBtn, { borderTopWidth: 1, borderTopColor: colors.glassBorder }]}
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
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  accountBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  accountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  themeRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  themeToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: 3,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  themeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
