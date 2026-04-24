import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  useTokens,
  useTheme,
  isGlass,
  isEditorial,
  isNeumorphic,
  type ThemeName,
} from '@/lib/theme';
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/Button';
import { IconChevronRight } from '@/components/icons/Icons';

// ── Types ──────────────────────────────────────────────────────────────

type TabKey = 'account' | 'platforms' | 'theme' | 'billing';

interface UserProfile {
  id: string;
  display_name: string | null;
  handle: string | null;
  email: string | null;
  bio: string | null;
  timezone: string | null;
  theme: string | null;
  mission: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
  subscription_renews_at: string | null;
}

interface PlatformAccount {
  id: string;
  platform: string;
  platform_username: string | null;
  followers: number | null;
  sync_status: string | null;
}

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'platforms', label: 'Platforms' },
  { key: 'theme', label: 'Theme' },
  { key: 'billing', label: 'Billing' },
];

const THEME_OPTIONS: { key: ThemeName; label: string; desc: string; colors: string[] }[] = [
  {
    key: 'glassmorphic',
    label: 'Glassmorphic',
    desc: 'Dark violet with frosted glass surfaces',
    colors: ['#0a0618', '#8b5cf6', '#ff71a8', '#c7b4ff'],
  },
  {
    key: 'neon-editorial',
    label: 'Neon Editorial',
    desc: 'Cream paper with ink borders and bold accents',
    colors: ['#f4ecde', '#0b0b0b', '#c8ff3d', '#ff3e88'],
  },
];

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

// ── Component ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const t = useTokens();
  const { theme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('account');

  // Account state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [mission, setMission] = useState('');

  // Platforms state
  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);

  // ── Data fetching ────────────────────────────────────────────────────

  const fetchUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const data = await api.get<UserProfile>('/user');
      setUser(data);
      setDisplayName(data.display_name ?? '');
      setHandle(data.handle ?? '');
      setBio(data.bio ?? '');
      setMission(data.mission ?? '');
    } catch {
      // silently fail — user might not be logged in
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const fetchPlatforms = useCallback(async () => {
    setLoadingPlatforms(true);
    try {
      const data = await api.get<PlatformAccount[]>('/platforms');
      setPlatforms(data);
    } catch {
      // silently fail
    } finally {
      setLoadingPlatforms(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchPlatforms();
  }, [fetchUser, fetchPlatforms]);

  // ── Actions ──────────────────────────────────────────────────────────

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<UserProfile>('/user', {
        display_name: displayName,
        handle,
        bio,
        mission,
      });
      setUser(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const disconnectPlatform = (platform: PlatformAccount) => {
    Alert.alert(
      'Disconnect Platform',
      `Are you sure you want to disconnect ${PLATFORM_LABELS[platform.platform] ?? platform.platform}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/platforms/${platform.id}`);
              setPlatforms((prev) => prev.filter((p) => p.id !== platform.id));
            } catch {
              Alert.alert('Error', 'Failed to disconnect platform.');
            }
          },
        },
      ],
    );
  };

  const connectPlatform = () => {
    Alert.alert(
      'Connect Platform',
      'Platform connections are managed via the web app at govirall.com. Please visit Settings on the web to connect a new platform.',
      [{ text: 'OK' }],
    );
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade Plan',
      'Subscription management is available on the web at govirall.com. Please visit Settings > Billing to upgrade your plan.',
      [{ text: 'OK' }],
    );
  };

  // ── Style helpers ────────────────────────────────────────────────────

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const fontBody = t.fontBody;
  const fontSemibold = t.fontBodySemibold;
  const fontDisplay = t.fontDisplay;

  const formatFollowers = (count: number | null) => {
    if (!count) return '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── Tab pill styles (per-theme) ──────────────────────────────────────

  function tabPillStyle(selected: boolean) {
    if (isGlass(t)) {
      return {
        backgroundColor: selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)',
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? t.violet : 'transparent',
        borderRadius: t.radiusFull,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
      };
    }
    if (isEditorial(t)) {
      return {
        backgroundColor: selected ? t.ink : t.surface,
        borderWidth: selected ? 0 : t.border.width,
        borderColor: selected ? 'transparent' : t.border.color,
        borderRadius: 0,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
      };
    }
    // Neumorphic
    const nt = t as NeumorphicTheme;
    const neuStyle = Platform.OS === 'ios'
      ? (selected ? nt.shadowOutSm.inner : nt.shadowOutSm.outer)
      : (selected
        ? { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.4)', borderLeftColor: 'rgba(167,173,184,0.4)', borderBottomColor: 'rgba(255,255,255,0.6)', borderRightColor: 'rgba(255,255,255,0.6)' }
        : neumorphicRaisedStyle(nt, 'sm'));
    return {
      backgroundColor: nt.surface,
      borderRadius: nt.radiusMd,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginRight: 8,
      ...neuStyle,
    };
  }

  function tabPillTextStyle(selected: boolean) {
    if (isGlass(t)) {
      return {
        color: selected ? t.violetSoft : t.muted,
        fontFamily: t.fontBodySemibold,
        fontSize: 12,
        letterSpacing: 0.3,
      };
    }
    if (isEditorial(t)) {
      return {
        color: selected ? t.surface : t.ink,
        fontFamily: t.fontMono,
        fontSize: 10,
        fontWeight: '700' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.8,
      };
    }
    // Neumorphic
    return {
      color: selected ? t.accent : t.muted,
      fontFamily: t.fontBodySemibold,
      fontSize: 12,
      letterSpacing: 0.3,
    };
  }

  // ── TextInput styles (per-theme) ─────────────────────────────────────

  function inputStyle(multiline = false) {
    const base = {
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: fontBody,
      minHeight: multiline ? 80 : undefined,
      textAlignVertical: multiline ? ('top' as const) : ('center' as const),
    };

    if (isGlass(t)) {
      return {
        ...base,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: t.line,
        borderRadius: t.radiusMd,
        color: t.fg,
      };
    }
    if (isEditorial(t)) {
      return {
        ...base,
        backgroundColor: t.surface,
        borderWidth: t.border.width,
        borderColor: t.border.color,
        borderRadius: 0,
        color: t.ink,
      };
    }
    // Neumorphic
    return {
      ...base,
      backgroundColor: t.surfaceLighter,
      borderRadius: t.radiusMd,
      color: t.fg,
      // Inner shadow approximation
      ...(Platform.OS === 'ios'
        ? { shadowColor: t.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, borderWidth: 0 }
        : { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.3)', borderLeftColor: 'rgba(167,173,184,0.3)', borderBottomColor: 'rgba(255,255,255,0.5)', borderRightColor: 'rgba(255,255,255,0.5)' }),
    };
  }

  // ── Label style ──────────────────────────────────────────────────────

  const labelStyle = {
    color: muted,
    fontFamily: fontSemibold,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 6,
    ...(isEditorial(t) ? { textTransform: 'uppercase' as const, letterSpacing: 0.8 } : {}),
  };

  // ── Render tabs ──────────────────────────────────────────────────────

  function renderAccountTab() {
    if (loadingUser) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator color={isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent} />
        </View>
      );
    }

    return (
      <View style={{ gap: 16 }}>
        {/* Display Name */}
        <View>
          <Text style={labelStyle}>Display Name</Text>
          <TextInput
            style={inputStyle()}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your display name"
            placeholderTextColor={t.faint}
          />
        </View>

        {/* Handle */}
        <View>
          <Text style={labelStyle}>Handle</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              color: muted,
              fontFamily: fontBody,
              fontSize: 14,
              marginRight: 2,
              position: 'absolute',
              left: 14,
              zIndex: 1,
            }}>
              @
            </Text>
            <TextInput
              style={{ ...inputStyle(), flex: 1, paddingLeft: 26 }}
              value={handle}
              onChangeText={setHandle}
              placeholder="username"
              placeholderTextColor={t.faint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Email (read-only) */}
        <View>
          <Text style={labelStyle}>Email</Text>
          <ThemedCard padding={14}>
            <Text style={{ color: fg, fontFamily: fontBody, fontSize: 14 }}>
              {user?.email ?? 'Not set'}
            </Text>
          </ThemedCard>
        </View>

        {/* Bio */}
        <View>
          <Text style={labelStyle}>Bio</Text>
          <TextInput
            style={inputStyle(true)}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell brands about yourself..."
            placeholderTextColor={t.faint}
            multiline
          />
        </View>

        {/* Mission */}
        <View>
          <Text style={labelStyle}>Mission</Text>
          <TextInput
            style={inputStyle(true)}
            value={mission}
            onChangeText={setMission}
            placeholder="Your creator mission statement..."
            placeholderTextColor={t.faint}
            multiline
          />
        </View>

        {/* Save Button */}
        <Button
          label={saving ? 'Saving...' : 'Save'}
          onPress={saveProfile}
          disabled={saving}
        />
      </View>
    );
  }

  function renderPlatformsTab() {
    if (loadingPlatforms) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <ActivityIndicator color={isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent} />
        </View>
      );
    }

    return (
      <View style={{ gap: 12 }}>
        {platforms.length === 0 ? (
          <ThemedCard padding={20}>
            <Text style={{ color: muted, fontFamily: fontBody, fontSize: 14, textAlign: 'center' }}>
              No platforms connected yet. Connect your first platform to get started.
            </Text>
          </ThemedCard>
        ) : (
          platforms.map((platform) => {
            const isHealthy = platform.sync_status === 'healthy' || platform.sync_status === 'active';
            const statusColor = isHealthy
              ? (isGlass(t) ? t.good : isEditorial(t) ? t.mint : t.good)
              : (isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad);
            const statusLabel = isHealthy ? 'Healthy' : 'Error';

            return (
              <ThemedCard key={platform.id} padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{
                        color: fg,
                        fontFamily: fontSemibold,
                        fontSize: 15,
                      }}>
                        {PLATFORM_LABELS[platform.platform] ?? platform.platform}
                      </Text>
                      {/* Status badge */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}>
                        <View style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: statusColor,
                        }} />
                        <Text style={{
                          color: statusColor,
                          fontFamily: isEditorial(t) ? t.fontMono : fontBody,
                          fontSize: 10,
                          ...(isEditorial(t) ? { textTransform: 'uppercase' as const, letterSpacing: 0.5 } : {}),
                        }}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    <Text style={{
                      color: muted,
                      fontFamily: fontBody,
                      fontSize: 13,
                      marginTop: 2,
                    }}>
                      @{platform.platform_username ?? 'unknown'}
                    </Text>

                    <Text style={{
                      color: muted,
                      fontFamily: fontBody,
                      fontSize: 12,
                      marginTop: 2,
                    }}>
                      {formatFollowers(platform.followers)} followers
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => disconnectPlatform(platform)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: isEditorial(t) ? 0 : t.radiusSm,
                      backgroundColor: isGlass(t)
                        ? 'rgba(255,113,168,0.12)'
                        : isEditorial(t)
                          ? t.surface
                          : t.surface,
                      borderWidth: isEditorial(t) ? t.border.width : isGlass(t) ? 1 : 0,
                      borderColor: isEditorial(t)
                        ? t.border.color
                        : isGlass(t)
                          ? 'rgba(255,113,168,0.3)'
                          : 'transparent',
                      opacity: pressed ? 0.7 : 1,
                      ...(isNeumorphic(t) ? neumorphicRaisedStyle(t as NeumorphicTheme, 'sm') : {}),
                    })}
                  >
                    <Text style={{
                      color: isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad,
                      fontFamily: isEditorial(t) ? t.fontMono : fontSemibold,
                      fontSize: 11,
                      ...(isEditorial(t) ? { textTransform: 'uppercase' as const, letterSpacing: 0.5 } : {}),
                    }}>
                      Disconnect
                    </Text>
                  </Pressable>
                </View>
              </ThemedCard>
            );
          })
        )}

        {/* Connect Platform button */}
        <View style={{ marginTop: 4 }}>
          <Button label="Connect Platform" variant="ghost" onPress={connectPlatform} />
        </View>
      </View>
    );
  }

  function renderThemeTab() {
    return (
      <View style={{ gap: 12 }}>
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setTheme(opt.key)}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <ThemedCard padding={16}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{
                        color: fg,
                        fontFamily: fontSemibold,
                        fontSize: 15,
                      }}>
                        {opt.label}
                      </Text>
                      {isActive && (
                        <View style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Text style={{
                            color: isGlass(t) ? '#fff' : isEditorial(t) ? t.surface : '#fff',
                            fontSize: 11,
                            fontWeight: '700',
                          }}>
                            ✓
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={{
                      color: muted,
                      fontFamily: fontBody,
                      fontSize: 12,
                      marginTop: 4,
                    }}>
                      {opt.desc}
                    </Text>
                  </View>

                  {/* Preview color swatches */}
                  <View style={{ flexDirection: 'row', gap: 4, marginLeft: 12 }}>
                    {opt.colors.map((color, i) => (
                      <View
                        key={i}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: isEditorial(t) ? 0 : 10,
                          backgroundColor: color,
                          borderWidth: 1,
                          borderColor: isGlass(t)
                            ? 'rgba(255,255,255,0.15)'
                            : isEditorial(t)
                              ? t.border.color
                              : 'rgba(0,0,0,0.08)',
                        }}
                      />
                    ))}
                  </View>
                </View>
              </ThemedCard>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderBillingTab() {
    const tier = user?.subscription_tier ?? 'free';
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    const renewsAt = user?.subscription_renews_at;

    return (
      <View style={{ gap: 16 }}>
        <ThemedCard padding={20}>
          <Text style={{ ...labelStyle }}>
            Current Plan
          </Text>
          <Text style={{
            color: fg,
            fontFamily: fontDisplay,
            fontSize: 28,
            marginTop: 4,
          }}>
            {tierLabel}
          </Text>

          {renewsAt && (
            <Text style={{
              color: muted,
              fontFamily: fontBody,
              fontSize: 13,
              marginTop: 8,
            }}>
              Renews {formatDate(renewsAt)}
            </Text>
          )}

          {tier === 'free' && (
            <Text style={{
              color: muted,
              fontFamily: fontBody,
              fontSize: 13,
              marginTop: 8,
            }}>
              Upgrade to unlock advanced analytics, AI features, and more.
            </Text>
          )}
        </ThemedCard>

        <Button
          label={tier === 'free' ? 'Upgrade to Pro' : 'Manage Subscription'}
          onPress={handleUpgrade}
        />
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 40 }}>
        {/* Page title */}
        <View style={{ paddingLeft: 56, paddingTop: 14, paddingBottom: 16 }}>
          <Text
            style={{
              color: isGlass(t) ? t.fg : t.ink,
              fontSize: isGlass(t) ? 34 : isEditorial(t) ? 36 : 32,
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
              lineHeight: isGlass(t) ? 38 : isEditorial(t) ? 40 : 36,
              letterSpacing: -0.5,
            }}
          >
            <Text style={{
              fontFamily: t.fontDisplayItalic,
              color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
            }}>
              Settings
            </Text>
          </Text>
          <Text
            style={{
              color: isGlass(t) ? t.muted : isEditorial(t) ? t.muted : t.muted,
              fontSize: isGlass(t) ? 10 : isEditorial(t) ? 10 : 11,
              fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            Account & preferences
          </Text>
        </View>

        {/* Tab pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 4 }}
          style={{ marginBottom: 20 }}
        >
          {TAB_ITEMS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={tabPillStyle(selected)}
              >
                <Text style={tabPillTextStyle(selected)}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active tab content */}
        {activeTab === 'account' && renderAccountTab()}
        {activeTab === 'platforms' && renderPlatformsTab()}
        {activeTab === 'theme' && renderThemeTab()}
        {activeTab === 'billing' && renderBillingTab()}
      </ScrollView>
    </View>
  );
}
