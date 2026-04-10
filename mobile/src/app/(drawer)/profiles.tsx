import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Modal,
  ActivityIndicator, RefreshControl, Alert, Linking,
} from 'react-native';
import { TextInput as RNTextInput } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { PlatformColors, PlatformLabels, type PlatformName } from '../../constants/platforms';
import { FontSize, Spacing, BorderRadius, neuShadowSm, neuInset } from '../../constants/theme';
import { formatNumber } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { mobileApi } from '../../lib/api';
import { trackEvent } from '../../lib/track';

const PLATFORMS: { key: string; label: string; color: string }[] = [
  { key: 'instagram', label: 'Instagram', color: PlatformColors.instagram },
  { key: 'tiktok', label: 'TikTok', color: PlatformColors.tiktok },
  { key: 'youtube', label: 'YouTube', color: PlatformColors.youtube },
  { key: 'twitter', label: 'Twitter/X', color: PlatformColors.twitter },
  { key: 'linkedin', label: 'LinkedIn', color: PlatformColors.linkedin },
  { key: 'threads', label: 'Threads', color: PlatformColors.threads },
  { key: 'pinterest', label: 'Pinterest', color: PlatformColors.pinterest },
  { key: 'twitch', label: 'Twitch', color: PlatformColors.twitch },
];

export default function ProfilesScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { trackEvent('page_view', 'profiles'); }, []);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [handle, setHandle] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    if (!organization?.id) return;
    const { data } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });
    setProfiles(data ?? []);
  }, [organization?.id]);

  useEffect(() => {
    loadProfiles().finally(() => setLoading(false));
  }, [loadProfiles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfiles();
    setRefreshing(false);
  }, [loadProfiles]);

  const handleAdd = async () => {
    if (!selectedPlatform || !handle.trim()) {
      setAddError('Please select a platform and enter a handle.');
      return;
    }
    setAdding(true);
    setAddError('');

    const { data, error, planLimitReached } = await mobileApi('/api/mobile/profiles', {
      method: 'POST',
      body: { platform: selectedPlatform, handle: handle.trim() },
    });

    setAdding(false);

    if (planLimitReached) {
      setShowAddModal(false);
      setSelectedPlatform(null);
      setHandle('');
      Alert.alert(
        'Upgrade Required',
        'You\'ve reached the profile limit on your current plan. Manage your subscription on the web to unlock more.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Website', onPress: () => Linking.openURL('https://govirall.app/dashboard/settings?tab=billing') },
        ],
      );
      return;
    }

    if (error) {
      setAddError(error);
      return;
    }

    // Success — close modal and refresh
    setShowAddModal(false);
    setSelectedPlatform(null);
    setHandle('');
    await loadProfiles();
  };

  const handleSync = async (profileId: string) => {
    setSyncingId(profileId);
    const { error } = await mobileApi('/api/mobile/profiles', {
      method: 'PUT',
      body: { profileId },
    });
    setSyncingId(null);
    if (error) {
      Alert.alert('Sync Failed', error);
      return;
    }
    await loadProfiles();
  };

  const handleDisconnect = (profileId: string, displayName: string) => {
    Alert.alert(
      'Disconnect Account',
      `Remove ${displayName}? This will delete all associated analytics data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            const { error } = await mobileApi('/api/mobile/profiles', {
              method: 'DELETE',
              body: { profileId },
            });
            if (error) {
              Alert.alert('Error', error);
              return;
            }
            await loadProfiles();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Connected Accounts</Text>
          <Pressable
            onPress={() => { setShowAddModal(true); setAddError(''); }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        {profiles.length === 0 && (
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No accounts connected yet. Tap "+ Add" to connect your first social media account.
            </Text>
          </Card>
        )}

        {profiles.map((p) => (
          <Card key={p.id} style={styles.profileCard}>
            <View style={styles.profileRow}>
              <PlatformIcon platform={p.platform as PlatformName} size={40} />
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {p.display_name || p.handle}
                </Text>
                <Text style={[styles.profileHandle, { color: colors.textSecondary }]}>
                  @{p.handle} · {PlatformLabels[p.platform] || p.platform}
                </Text>
                <View style={styles.statsRow}>
                  <Text style={[styles.stat, { color: colors.textMuted }]}>
                    {formatNumber(p.followers_count || 0)} followers
                  </Text>
                  {p.engagement_rate != null && (
                    <Text style={[styles.stat, { color: colors.textMuted }]}>
                      · {p.engagement_rate.toFixed(1)}% eng.
                    </Text>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => handleSync(p.id)}
                disabled={syncingId === p.id}
                style={[styles.actionBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
              >
                {syncingId === p.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Sync</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => handleDisconnect(p.id, p.display_name || p.handle)}
                style={[styles.actionBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
              >
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Disconnect</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Social Account</Text>
              <Pressable onPress={() => { setShowAddModal(false); setSelectedPlatform(null); setHandle(''); setAddError(''); }}>
                <Text style={[styles.closeText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>

            {!selectedPlatform ? (
              <>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Choose a platform
                </Text>
                <View style={styles.platformGrid}>
                  {PLATFORMS.map((p) => (
                    <Pressable
                      key={p.key}
                      onPress={() => setSelectedPlatform(p.key)}
                      style={[styles.platformItem, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
                    >
                      <PlatformIcon platform={p.key as PlatformName} size={36} />
                      <Text style={[styles.platformLabel, { color: colors.text }]}>{p.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Pressable onPress={() => { setSelectedPlatform(null); setHandle(''); setAddError(''); }}>
                  <Text style={[styles.backLink, { color: colors.accent }]}>{'< Change platform'}</Text>
                </Pressable>

                <View style={styles.selectedPlatformRow}>
                  <PlatformIcon platform={selectedPlatform as PlatformName} size={32} />
                  <Text style={[styles.selectedPlatformText, { color: colors.text }]}>
                    {PlatformLabels[selectedPlatform] || selectedPlatform}
                  </Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Enter your username or profile URL
                </Text>
                <RNTextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
                  placeholder="@username or profile URL"
                  placeholderTextColor={colors.textMuted}
                  value={handle}
                  onChangeText={setHandle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!adding}
                />

                {addError ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>{addError}</Text>
                ) : null}

                <Pressable
                  onPress={handleAdd}
                  disabled={adding || !handle.trim()}
                  style={[
                    styles.submitBtn,
                    { backgroundColor: colors.primary, opacity: adding || !handle.trim() ? 0.5 : 1 },
                  ]}
                >
                  {adding ? (
                    <View style={styles.addingRow}>
                      <ActivityIndicator size="small" color="#0C0A14" />
                      <Text style={styles.submitBtnText}>Connecting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitBtnText}>Connect Account</Text>
                  )}
                </Pressable>

                {adding && (
                  <Text style={[styles.hint, { color: colors.textMuted }]}>
                    Scraping profile data... this may take a few seconds.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  addBtn: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  addBtnText: {
    color: '#0C0A14',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  profileCard: {
    gap: Spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  profileHandle: {
    fontSize: FontSize.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  stat: {
    fontSize: FontSize.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  closeText: {
    fontSize: FontSize.md,
  },
  modalSubtitle: {
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  platformItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  platformLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  backLink: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  selectedPlatformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  selectedPlatformText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    minHeight: 48,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  submitBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitBtnText: {
    color: '#0C0A14',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  addingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
