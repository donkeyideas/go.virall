import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { cockpit } from '../../lib/cockpit-theme';
import { supabase } from '../../lib/supabase';
import { ScreenHeader } from '../../components/cockpit/ScreenHeader';
import { useToast } from '../../components/cockpit/Toast';
import { useAppModal } from '../../components/cockpit/AppModal';

const WEB_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://govirall.com';

const PRIMARY_LINKS: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  web: boolean;
}> = [
  {
    label: 'Notification Preferences',
    icon: 'notifications-outline',
    path: '/dashboard/settings?tab=notifications',
    web: true,
  },
  {
    label: 'Full Analytics',
    icon: 'bar-chart-outline',
    path: '/dashboard/analytics',
    web: true,
  },
  {
    label: 'Billing & Plan',
    icon: 'card-outline',
    path: '/dashboard/billing',
    web: true,
  },
  {
    label: 'Settings',
    icon: 'settings-outline',
    path: '/dashboard/settings',
    web: true,
  },
  {
    label: 'Team',
    icon: 'people-outline',
    path: '/dashboard/team',
    web: true,
  },
];

function platformTag(p: string): string {
  const k = p.toLowerCase();
  if (k.startsWith('inst')) return 'IG';
  if (k.startsWith('tik')) return 'TT';
  if (k.startsWith('you')) return 'YT';
  if (k.startsWith('twit') || k === 'x') return 'X';
  if (k.startsWith('link')) return 'IN';
  if (k.startsWith('face')) return 'FB';
  return k.slice(0, 2).toUpperCase();
}

function platformBg(p: string): string {
  const k = p.toLowerCase();
  if (k.startsWith('inst')) return '#ec4899';
  if (k.startsWith('tik')) return '#06b6d4';
  if (k.startsWith('you')) return '#ef4444';
  if (k.startsWith('twit') || k === 'x') return '#1d9bf0';
  if (k.startsWith('link')) return '#0a66c2';
  if (k.startsWith('face')) return '#1877f2';
  return '#64748b';
}

function platformName(p: string): string {
  const k = p.toLowerCase();
  if (k.startsWith('inst')) return 'Instagram';
  if (k.startsWith('tik')) return 'TikTok';
  if (k.startsWith('you')) return 'YouTube';
  if (k.startsWith('twit')) return 'Twitter';
  if (k === 'x') return 'X';
  if (k.startsWith('link')) return 'LinkedIn';
  if (k.startsWith('face')) return 'Facebook';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export default function ProfileScreen() {
  const { mode, toggleTheme } = useTheme();
  const c = cockpit(mode);
  const { profile, organization, user, signOut } = useAuth();
  const { showToast } = useToast();
  const { showModal } = useAppModal();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [trust, setTrust] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const orgId = organization?.id;
    const [socialsRes, trustRes] = await Promise.all([
      orgId
        ? supabase
            .from('social_profiles')
            .select(
              'id, platform, handle, display_name, followers_count, avatar_url, ownership_verified',
            )
            .eq('organization_id', orgId)
            .order('created_at', { ascending: true })
        : Promise.resolve({ data: null } as any),
      supabase
        .from('trust_scores')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle(),
    ]);

    const rows = (socialsRes?.data as any[] | null) ?? [];
    setProfiles(rows);
    setTrust(trustRes?.data ?? null);
  }, [organization?.id, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openWeb = (path: string) => {
    WebBrowser.openBrowserAsync(`${WEB_BASE}${path}`);
  };

  const copyMediaKit = async () => {
    const link = `${WEB_BASE}/${user?.id}`;
    await Clipboard.setStringAsync(link);
    showToast('Media kit link copied!');
  };

  const confirmSignOut = () => {
    showModal({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your account.',
      kind: 'warning',
      buttons: [
        { label: 'Cancel', variant: 'secondary' },
        { label: 'Sign out', variant: 'danger', onPress: () => signOut() },
      ],
    });
  };

  const displayName =
    profile?.full_name || user?.email?.split('@')[0] || 'Creator';
  const handle = user?.email?.split('@')[0] || 'creator';
  const planLabel = organization?.plan || 'Free';

  // Match web: new users start with a perfect 100 (Uber-style: maintain it)
  const trustScore =
    typeof trust?.overall_score === 'number' ? trust.overall_score : 100;
  const trustDeals =
    typeof trust?.total_deals_closed === 'number' ? trust.total_deals_closed : 0;
  const trustLetter = (() => {
    if (trustScore >= 95) return 'A+';
    if (trustScore >= 90) return 'A';
    if (trustScore >= 80) return 'B';
    if (trustScore >= 70) return 'C';
    if (trustScore >= 60) return 'D';
    return 'F';
  })();

  return (
    <View style={{ flex: 1, backgroundColor: c.bgDeep }}>
      <ScreenHeader title="Profile" activeKey="profile" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: c.goldDim, borderColor: c.goldBorder },
              ]}
            >
              <Text style={[styles.avatarText, { color: c.gold }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.name, { color: c.textPrimary }]}>
            {displayName}
          </Text>
          <Text style={[styles.handle, { color: c.textSecondary }]}>
            @{handle}
          </Text>
          <View
            style={[
              styles.planBadge,
              { backgroundColor: c.goldDim, borderColor: c.goldBorder },
            ]}
          >
            <Text style={[styles.planText, { color: c.gold }]}>
              {String(planLabel).toUpperCase()} PLAN
            </Text>
          </View>
        </View>

        {/* Trust Score */}
        <View
          style={[
            styles.trustCard,
            { backgroundColor: c.bgCard, borderColor: c.goldBorder },
          ]}
        >
          <View style={styles.trustLeft}>
            <Text style={[styles.trustLabel, { color: c.textMuted }]}>
              TRUST SCORE
            </Text>
            <View style={styles.trustScoreRow}>
              <Text style={[styles.trustScore, { color: c.textPrimary }]}>
                {trustScore}
              </Text>
              <View
                style={[
                  styles.trustLetter,
                  { backgroundColor: c.goldDim, borderColor: c.goldBorder },
                ]}
              >
                <Text style={[styles.trustLetterText, { color: c.gold }]}>
                  {trustLetter}
                </Text>
              </View>
            </View>
            <Text style={[styles.trustSub, { color: c.textSecondary }]}>
              {trustDeals} deal{trustDeals === 1 ? '' : 's'} closed
            </Text>
          </View>
          <Pressable
            onPress={() => openWeb('/dashboard/trust-score')}
            style={[
              styles.trustBtn,
              { backgroundColor: c.bgElevated, borderColor: c.border },
            ]}
          >
            <Text style={[styles.trustBtnText, { color: c.textPrimary }]}>
              View
            </Text>
            <Ionicons name="chevron-forward" size={12} color={c.textMuted} />
          </Pressable>
        </View>

        <View
          style={[
            styles.mediaKit,
            { backgroundColor: c.bgCard, borderColor: c.tealBorder },
          ]}
        >
          <Text style={[styles.mediaKitTitle, { color: c.textPrimary }]}>
            Share Media Kit
          </Text>
          <Text style={[styles.mediaKitDesc, { color: c.textSecondary }]}>
            Send your media kit to brands in one tap
          </Text>
          <Pressable
            onPress={copyMediaKit}
            style={[styles.mediaKitBtn, { backgroundColor: c.teal }]}
          >
            <Text style={styles.mediaKitBtnText}>Copy Link</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
          Connected Platforms
        </Text>
        <View style={styles.platforms}>
          {profiles.length === 0 ? (
            <Pressable
              onPress={() => openWeb('/dashboard/profiles')}
              style={[
                styles.emptyCard,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <Ionicons name="add-circle-outline" size={20} color={c.gold} />
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                Connect your first platform
              </Text>
            </Pressable>
          ) : (
            profiles.map((p) => {
              const handleText = p.handle
                ? `@${String(p.handle).replace(/^@/, '')}`
                : p.display_name || platformName(p.platform);
              return (
                <View
                  key={p.id}
                  style={[
                    styles.platformCard,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  {p.avatar_url ? (
                    <Image
                      source={{ uri: p.avatar_url }}
                      style={styles.platformAvatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.platformIcon,
                        { backgroundColor: platformBg(p.platform) },
                      ]}
                    >
                      <Text style={styles.platformIconText}>
                        {platformTag(p.platform)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.platformLabel, { color: c.textPrimary }]}
                      numberOfLines={1}
                    >
                      {handleText}
                    </Text>
                    <Text
                      style={[styles.platformSub, { color: c.textSecondary }]}
                    >
                      {platformName(p.platform)} · {(p.followers_count || 0).toLocaleString()} followers
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: c.greenDim },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: c.green }]}>
                      Connected
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
          Quick Access
        </Text>
        <View style={styles.menu}>
          {PRIMARY_LINKS.map((link) => (
            <Pressable
              key={link.label}
              onPress={() => openWeb(link.path)}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: pressed ? c.bgElevated : c.bgCard,
                  borderColor: c.border,
                },
              ]}
            >
              <View
                style={[styles.menuIconWrap, { backgroundColor: c.bgElevated }]}
              >
                <Ionicons name={link.icon} size={14} color={c.textSecondary} />
              </View>
              <Text
                style={[styles.menuText, { color: c.textPrimary }]}
                numberOfLines={1}
              >
                {link.label}
              </Text>
              {link.web ? (
                <View
                  style={[
                    styles.webBadge,
                    { backgroundColor: c.goldDim, borderColor: c.goldBorder },
                  ]}
                >
                  <Text style={[styles.webBadgeText, { color: c.gold }]}>
                    WEB
                  </Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
            </Pressable>
          ))}

          <Pressable
            onPress={toggleTheme}
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: pressed ? c.bgElevated : c.bgCard,
                borderColor: c.border,
              },
            ]}
          >
            <View
              style={[styles.menuIconWrap, { backgroundColor: c.bgElevated }]}
            >
              <Ionicons
                name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={14}
                color={c.textSecondary}
              />
            </View>
            <Text style={[styles.menuText, { color: c.textPrimary }]}>
              {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
          </Pressable>
        </View>

        <Pressable
          onPress={confirmSignOut}
          style={[
            styles.signOutBtn,
            { backgroundColor: c.bgCard, borderColor: c.redDim },
          ]}
        >
          <Ionicons name="log-out-outline" size={16} color={c.red} />
          <Text style={[styles.signOutText, { color: c.red }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 14, paddingBottom: 80 },
  headerBlock: { alignItems: 'center', paddingVertical: 10 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 30, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '800' },
  handle: { fontSize: 12, marginTop: 2 },
  planBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  planText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  trustLeft: { flex: 1 },
  trustLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  trustScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustScore: { fontSize: 22, fontWeight: '800' },
  trustLetter: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  trustLetterText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  trustSub: { fontSize: 11, marginTop: 3 },
  trustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  trustBtnText: { fontSize: 11, fontWeight: '600' },

  mediaKit: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  mediaKitTitle: { fontSize: 14, fontWeight: '700' },
  mediaKitDesc: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  mediaKitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  mediaKitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  platforms: { gap: 8 },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  platformIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformAvatar: { width: 32, height: 32, borderRadius: 10 },
  platformIconText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  platformLabel: { fontSize: 13, fontWeight: '600' },
  platformSub: { fontSize: 11, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  emptyText: { fontSize: 12.5 },
  menu: { gap: 6 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, fontSize: 13, fontWeight: '500' },
  webBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  webBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  signOutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  signOutText: { fontSize: 13, fontWeight: '700' },
});
