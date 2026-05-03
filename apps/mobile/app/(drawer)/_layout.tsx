import { useState, useEffect } from 'react';
import { View, Pressable, Modal, Text, ScrollView } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTokens, useTheme, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Kicker } from '@/components/ui/Kicker';
import {
  IconMenu,
  IconGrid,
  IconRocket,
  IconStar,
  IconEdit,
  IconUsers,
  IconLightbulb,
  IconFilm,
  IconUser,
  IconSettings,
  IconX,
  IconLogOut,
} from '@/components/icons/Icons';

const NAV_ITEMS = [
  { label: 'Overview', route: '/(drawer)', Icon: IconGrid },
  { label: 'Go Virall', route: '/(drawer)/go-virall', Icon: IconRocket },
  { label: 'SMO Score', route: '/(drawer)/smo-score', Icon: IconStar },
  { label: 'Compose', route: '/(drawer)/compose', Icon: IconEdit },
  { label: 'Audience', route: '/(drawer)/audience', Icon: IconUsers },
  { label: 'Ideas', route: '/(drawer)/ideas', Icon: IconLightbulb },
  { label: 'Captions', route: '/(drawer)/captions', Icon: IconEdit },
  { label: 'Scripts', route: '/(drawer)/scripts', Icon: IconFilm },
  { label: 'Bio', route: '/(drawer)/bio', Icon: IconUser },
];

export default function AppLayout() {
  const t = useTokens();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Fetch real user profile for display name
  const [profile, setProfile] = useState<{ displayName: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    api.get<any>('/user').then((res) => {
      setProfile({
        displayName: res.display_name || user?.user_metadata?.display_name || 'Creator',
      });
    }).catch(() => {});
  }, [user]);

  const displayName = profile?.displayName ?? user?.user_metadata?.display_name ?? 'Creator';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Gradient mesh background — glassmorphic depth */}
      {isGlass(t) && (
        <>
          <LinearGradient
            colors={['rgba(139,92,246,0.45)', 'transparent']}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.7, y: 0.5 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%', zIndex: 0 }}
          />
          <LinearGradient
            colors={['rgba(255,113,168,0.3)', 'transparent']}
            start={{ x: 0.85, y: 0 }}
            end={{ x: 0.3, y: 0.45 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', zIndex: 0 }}
          />
        </>
      )}
      {/* Stack navigation */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="go-virall" />
        <Stack.Screen name="smo-score" />
        <Stack.Screen name="compose" />
        <Stack.Screen name="audience" />
        <Stack.Screen name="studio" />
        <Stack.Screen name="ideas" />
        <Stack.Screen name="captions" />
        <Stack.Screen name="scripts" />
        <Stack.Screen name="bio" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="settings" />
      </Stack>

      {/* ── Persistent FAB Menu Button ────────────────────────── */}
      <Pressable
        onPress={() => setDrawerOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          zIndex: 100,
          width: 46,
          height: 46,
          justifyContent: 'center',
          alignItems: 'center',
          // Theme-specific styling
          ...(isGlass(t) ? {
            backgroundColor: t.bgTop,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            borderRadius: 16,
            opacity: pressed ? 0.85 : 1,
            transform: pressed ? [{ scale: 0.95 }] : [],
          } : isEditorial(t) ? {
            backgroundColor: t.lime,
            borderWidth: 1.5,
            borderColor: t.ink,
            borderRadius: 2,
            ...t.shadowCardSmall,
            ...(pressed ? { transform: [{ translateX: 1 }, { translateY: 1 }] } : {}),
          } : {
            backgroundColor: t.surface,
            borderRadius: 14,
            ...t.shadowOutSm.outer,
            ...(pressed ? t.shadowOutSm.inner : {}),
          }),
        })}
      >
        <IconMenu
          size={20}
          color={isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.accent}
        />
      </Pressable>

      {/* ── Drawer Modal ──────────────────────────────────────── */}
      <Modal visible={drawerOpen} transparent animationType="slide" onRequestClose={() => setDrawerOpen(false)}>
        <Pressable
          style={{ flex: 1, flexDirection: 'row' }}
          onPress={() => setDrawerOpen(false)}
        >
          {/* Drawer panel */}
          <View
            style={{
              width: 285,
              flex: 1,
              backgroundColor: isGlass(t) ? t.bgMid : isEditorial(t) ? t.bg : t.bg,
              paddingTop: insets.top + 16,
              ...(isEditorial(t) ? { borderRightWidth: 1.5, borderRightColor: t.ink } : {}),
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Close button top-right */}
            <Pressable
              onPress={() => setDrawerOpen(false)}
              style={{
                position: 'absolute',
                top: insets.top + 12,
                right: 12,
                width: 32, height: 32,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <IconX size={18} color={isGlass(t) ? t.muted : isEditorial(t) ? t.ink : t.muted} />
            </Pressable>

            {/* Brand row */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{
                  width: 28, height: 28,
                  backgroundColor: isGlass(t) ? t.violet : isEditorial(t) ? t.pink : t.accent,
                  borderRadius: isEditorial(t) ? 2 : 8,
                  justifyContent: 'center', alignItems: 'center',
                  marginRight: 8,
                  ...(isEditorial(t) ? { borderWidth: 1.5, borderColor: t.ink } : {}),
                }}>
                  <Text style={{
                    color: isGlass(t) ? '#fff' : isEditorial(t) ? t.bg : '#fff',
                    fontSize: 14, fontWeight: '700',
                  }}>G</Text>
                </View>
                <Text style={{
                  fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplay : t.fontDisplay,
                  fontSize: 16,
                  color: isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg,
                }}>
                  Go Virall
                </Text>
              </View>

              {/* Status/tag row */}
              {isEditorial(t) ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <View style={{ backgroundColor: t.ink, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: t.bg, fontSize: 8, fontFamily: t.fontMono, textTransform: 'uppercase', letterSpacing: 1 }}>Menu</Text>
                  </View>
                  <View style={{ backgroundColor: t.ink, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: t.bg, fontSize: 8, fontFamily: t.fontMono, textTransform: 'uppercase', letterSpacing: 1 }}>Creator OS</Text>
                  </View>
                </View>
              ) : (
                <View style={{
                  backgroundColor: isGlass(t) ? t.surfaceStronger : t.surfaceDarker,
                  paddingHorizontal: 8, paddingVertical: 4,
                  borderRadius: isGlass(t) ? 8 : t.radiusSm,
                  alignSelf: 'flex-start',
                }}>
                  <Kicker>{isGlass(t) ? 'Creator OS' : 'Creator OS'}</Kicker>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={{
              height: isEditorial(t) ? 1.5 : 1,
              backgroundColor: isGlass(t) ? t.line : isEditorial(t) ? t.ink : t.surfaceDarker,
              marginHorizontal: 20,
              marginBottom: 8,
            }} />

            {/* Nav items */}
            <ScrollView style={{ flex: 1 }}>
              {/* Section header */}
              <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
                <Kicker>{isEditorial(t) ? 'Studio' : 'Workspace'}</Kicker>
              </View>

              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.route || (item.route === '/(drawer)' && pathname === '/');
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => { setDrawerOpen(false); router.push(item.route as any); }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 13,
                      marginHorizontal: 8,
                      marginVertical: 1,
                      borderRadius: isGlass(t) ? 10 : isEditorial(t) ? 0 : t.radiusSm,
                      opacity: pressed ? 0.7 : 1,
                      // Active state per theme
                      ...(isActive ? (
                        isGlass(t) ? {
                          backgroundColor: 'rgba(139,92,246,0.15)',
                          borderWidth: 1,
                          borderColor: 'rgba(139,92,246,0.3)',
                          borderLeftWidth: 3,
                          borderLeftColor: t.violet,
                        } : isEditorial(t) ? {
                          backgroundColor: t.lime,
                          borderWidth: 1.5,
                          borderColor: t.ink,
                          ...t.shadowCardSmall,
                        } : {
                          backgroundColor: t.surface,
                          ...t.shadowOutSm.inner,
                        }
                      ) : {}),
                    })}
                  >
                    <View style={{ width: 24, marginRight: 12 }}>
                      <item.Icon
                        size={18}
                        color={
                          isActive
                            ? (isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent)
                            : (isGlass(t) ? t.muted : isEditorial(t) ? t.ink : t.muted)
                        }
                      />
                    </View>
                    <Text style={{
                      fontFamily: isGlass(t) ? t.fontBodyMedium : isEditorial(t) ? t.fontBodyMedium : t.fontBodyMedium,
                      fontSize: 14,
                      color: isActive
                        ? (isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.accent)
                        : (isGlass(t) ? t.muted : isEditorial(t) ? t.ink : t.muted),
                      flex: 1,
                    }}>
                      {item.label}
                    </Text>
                    {/* Badges removed — was hardcoded fake data */}
                  </Pressable>
                );
              })}

              {/* Divider */}
              <View style={{
                height: isEditorial(t) ? 1.5 : 1,
                backgroundColor: isGlass(t) ? t.line : isEditorial(t) ? t.ink : t.surfaceDarker,
                marginHorizontal: 20,
                marginVertical: 8,
              }} />

              {/* Settings */}
              <Pressable
                onPress={() => { setDrawerOpen(false); router.push('/(drawer)/settings' as any); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 13,
                  marginHorizontal: 8,
                }}
              >
                <View style={{ width: 24, marginRight: 12 }}>
                  <IconSettings size={18} color={isGlass(t) ? t.muted : isEditorial(t) ? t.ink : t.muted} />
                </View>
                <Text style={{
                  fontFamily: isGlass(t) ? t.fontBodyMedium : isEditorial(t) ? t.fontBodyMedium : t.fontBodyMedium,
                  fontSize: 14,
                  color: isGlass(t) ? t.muted : isEditorial(t) ? t.ink : t.muted,
                }}>
                  Settings
                </Text>
              </Pressable>
            </ScrollView>

            {/* Footer: avatar + name + plan */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopWidth: isEditorial(t) ? 1.5 : 1,
              borderTopColor: isGlass(t) ? t.line : isEditorial(t) ? t.ink : t.surfaceDarker,
            }}>
              {/* Avatar */}
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: isGlass(t) ? t.violet : isEditorial(t) ? t.pink : t.accent,
                justifyContent: 'center', alignItems: 'center',
                marginRight: 10,
                ...(isEditorial(t) ? { borderWidth: 1.5, borderColor: t.ink } : {}),
              }}>
                <Text style={{
                  color: '#fff', fontSize: 13, fontWeight: '700',
                }}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontFamily: isGlass(t) ? t.fontBodySemibold : isEditorial(t) ? t.fontBodySemibold : t.fontBodySemibold,
                  fontSize: 13,
                  color: isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg,
                }}>
                  {displayName}
                </Text>
                <Text style={{
                  fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontMono,
                  fontSize: 10,
                  color: isGlass(t) ? t.muted : isEditorial(t) ? t.muted : t.muted,
                }}>
                  @{displayName.toLowerCase().replace(/\s+/g, '')}
                </Text>
              </View>
              {/* Sign out */}
              <Pressable
                onPress={async () => {
                  setDrawerOpen(false);
                  await signOut();
                  router.replace('/');
                }}
                hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
                style={{ padding: 8 }}
              >
                <IconLogOut size={20} color={isGlass(t) ? t.bad : isEditorial(t) ? t.bad : t.bad} />
              </Pressable>
            </View>
          </View>

          {/* Backdrop */}
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        </Pressable>
      </Modal>
    </View>
  );
}
