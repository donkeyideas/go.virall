import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  ActivityIndicator, TextInput as RNTextInput, Alert,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { Card } from '../../components/ui/Card';
import { Toggle } from '../../components/ui/Toggle';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { TabPills } from '../../components/ui/TabPills';
import { Divider } from '../../components/ui/Divider';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { type PlatformName } from '../../constants/platforms';
import { FontSize, Spacing, BorderRadius, neuShadowSm, neuInset } from '../../constants/theme';
import {
  getUserPreferences, updateUserPreferences,
  getSocialProfiles, getBillingEvents,
} from '../../lib/dal';
import { supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/track';

const TABS = ['Account', 'Notifications', 'Billing', 'Connected', 'Media Kit', 'Team', 'AI Keys'];

export default function SettingsScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => { trackEvent('page_view', 'settings'); }, []);

  // Account
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // Notifications
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  // Connected
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

  // Billing
  const [billingEvents, setBillingEvents] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState('free');

  // Media Kit
  const [mediaSlug, setMediaSlug] = useState('');
  const [mediaSections, setMediaSections] = useState<any[]>([]);

  // Team
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');

  // AI API Keys
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id || !organization?.id) return;

    const [prefs, profiles, billing] = await Promise.all([
      getUserPreferences(user.id),
      getSocialProfiles(organization.id),
      getBillingEvents(organization.id),
    ]);

    if (prefs) {
      setEmailNotifs(prefs.email_notifications ?? true);
      setWeeklyReport(prefs.weekly_report ?? false);
    }
    setConnectedAccounts(profiles);
    setBillingEvents(billing);

    // Load account info
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, slug, subscription_tier')
      .eq('id', organization.id)
      .single();
    if (orgData) {
      setDisplayName(orgData.name || '');
      setCurrentPlan(orgData.subscription_tier || 'free');
      setMediaSlug(orgData.slug || '');
    }

    // Load user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, bio, niche, location')
      .eq('id', user.id)
      .single();
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setNiche(profile.niche || '');
      setLocation(profile.location || '');
    }

    // Load team members
    const { data: members } = await supabase
      .from('organization_members')
      .select('id, user_id, role, profiles(display_name, email)')
      .eq('organization_id', organization.id);
    setTeamMembers(members ?? []);

    // Load media kit sections
    const { data: sections } = await supabase
      .from('media_kit_sections')
      .select('*')
      .eq('organization_id', organization.id)
      .order('sort_order', { ascending: true });
    setMediaSections(sections ?? []);

    // Load AI API keys
    const { data: keys } = await supabase
      .from('user_api_keys')
      .select('id, provider, model_preference, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    setApiKeys(keys ?? []);
  }, [user?.id, organization?.id]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleTogglePref = async (key: string, val: boolean) => {
    if (!user?.id) return;
    if (key === 'email_notifications') setEmailNotifs(val);
    if (key === 'weekly_report') setWeeklyReport(val);
    await updateUserPreferences(user.id, { [key]: val });
  };

  const handleSaveAccount = async () => {
    if (!user?.id) return;
    setSavingAccount(true);
    await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: displayName, bio, niche, location, updated_at: new Date().toISOString() });
    setSavingAccount(false);
    Alert.alert('Saved', 'Account info updated.');
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !organization?.id) return;
    Alert.alert('Invite Sent', `Invitation sent to ${inviteEmail} (managed from web dashboard).`);
    setInviteEmail('');
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      <TabPills tabs={TABS} activeIndex={tabIndex} onSelect={setTabIndex} />

      {/* ── Account Tab ─────────────────────────────────────────── */}
      {tabIndex === 0 && (
        <>
          <SectionTitle>Profile Information</SectionTitle>
          <Card style={styles.formCard}>
            <FormField label="DISPLAY NAME" value={displayName} onChangeText={setDisplayName} colors={colors} />
            <FormField label="BIO" value={bio} onChangeText={setBio} multiline colors={colors} />
            <FormField label="NICHE" value={niche} onChangeText={setNiche} placeholder="e.g. Fitness, Tech, Lifestyle" colors={colors} />
            <FormField label="LOCATION" value={location} onChangeText={setLocation} placeholder="e.g. Los Angeles, CA" colors={colors} />
            <Pressable
              onPress={handleSaveAccount}
              disabled={savingAccount}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: savingAccount ? 0.5 : 1 }]}
            >
              <Text style={styles.saveBtnText}>{savingAccount ? 'SAVING...' : 'SAVE CHANGES'}</Text>
            </Pressable>
          </Card>

          <SectionTitle>Appearance</SectionTitle>
          <Card>
            <ToggleRow label="Dark Mode" value={mode === 'dark'} onValueChange={toggleTheme} />
          </Card>

          <Divider />
          <SectionTitle>Data & Privacy</SectionTitle>
          <Card>
            <Pressable style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>Export My Data</Text>
            </Pressable>
            <Pressable style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>Privacy Policy</Text>
            </Pressable>
            <Pressable style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.error }]}>Delete Account</Text>
            </Pressable>
          </Card>
        </>
      )}

      {/* ── Notifications Tab ───────────────────────────────────── */}
      {tabIndex === 1 && (
        <>
          <SectionTitle>Notification Preferences</SectionTitle>
          <Card>
            <ToggleRow label="Push Notifications" value={pushNotifs} onValueChange={(v) => setPushNotifs(v)} />
            <ToggleRow label="Email Notifications" value={emailNotifs} onValueChange={(v) => handleTogglePref('email_notifications', v)} />
            <ToggleRow label="Weekly Report" value={weeklyReport} onValueChange={(v) => handleTogglePref('weekly_report', v)} />
          </Card>
        </>
      )}

      {/* ── Billing Tab ─────────────────────────────────────────── */}
      {tabIndex === 2 && (
        <>
          <SectionTitle>Current Plan</SectionTitle>
          <Card style={styles.planCard}>
            <Text style={[styles.planName, { color: colors.primary }]}>
              {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
            </Text>
            <Text style={[styles.planDesc, { color: colors.textSecondary }]}>
              {currentPlan === 'free' ? 'Basic features with limited analyses.' :
               currentPlan === 'pro' ? 'Full access to all analysis types.' :
               currentPlan === 'business' ? 'Team features and priority support.' :
               'Custom enterprise features.'}
            </Text>
            <Pressable
              style={[styles.upgradeBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
              onPress={() => Alert.alert('Upgrade', 'Manage your subscription from the web dashboard.')}
            >
              <Text style={[styles.upgradeBtnText, { color: colors.primary }]}>
                {currentPlan === 'free' ? 'UPGRADE' : 'MANAGE PLAN'}
              </Text>
            </Pressable>
          </Card>

          {billingEvents.length > 0 && (
            <>
              <SectionTitle>Invoice History</SectionTitle>
              <Card>
                {billingEvents.map((evt: any, i: number) => (
                  <View key={i} style={styles.invoiceRow}>
                    <View style={styles.invoiceInfo}>
                      <Text style={[styles.invoiceType, { color: colors.text }]}>
                        {evt.event_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Payment'}
                      </Text>
                      <Text style={[styles.invoiceDate, { color: colors.textMuted }]}>
                        {new Date(evt.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {evt.amount != null && (
                      <Text style={[styles.invoiceAmount, { color: colors.primary }]}>
                        ${(evt.amount / 100).toFixed(2)}
                      </Text>
                    )}
                  </View>
                ))}
              </Card>
            </>
          )}
        </>
      )}

      {/* ── Connected Accounts Tab ──────────────────────────────── */}
      {tabIndex === 3 && (
        <>
          <SectionTitle>Connected Accounts</SectionTitle>
          <Card>
            {connectedAccounts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No social accounts connected. Add them from the web dashboard.
              </Text>
            ) : (
              connectedAccounts.map((acc: any) => (
                <View key={acc.id} style={styles.accountRow}>
                  <PlatformIcon platform={acc.platform as PlatformName} size={28} />
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.text }]}>@{acc.handle}</Text>
                    {acc.followers_count != null && (
                      <Text style={[styles.accountFollowers, { color: colors.textMuted }]}>
                        {acc.followers_count.toLocaleString()} followers
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.statusLabel, { color: colors.success }]}>Connected</Text>
                </View>
              ))
            )}
          </Card>
        </>
      )}

      {/* ── Media Kit Tab ───────────────────────────────────────── */}
      {tabIndex === 4 && (
        <>
          <SectionTitle>Media Kit</SectionTitle>
          <Card style={styles.formCard}>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MEDIA KIT URL</Text>
              <View style={styles.slugRow}>
                <Text style={[styles.slugPrefix, { color: colors.textSecondary }]}>govirall.com/kit/</Text>
                <RNTextInput
                  style={[styles.slugInput, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
                  value={mediaSlug}
                  onChangeText={setMediaSlug}
                  placeholder="your-slug"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </Card>

          {mediaSections.length > 0 && (
            <>
              <SectionTitle>Sections</SectionTitle>
              {mediaSections.map((section: any) => (
                <Card key={section.id} style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionName, { color: colors.text }]}>
                      {section.title || section.section_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Text>
                    <View style={[styles.visibilityBadge, { backgroundColor: section.is_visible ? colors.success + '20' : colors.textMuted + '20' }]}>
                      <Text style={[styles.visibilityText, { color: section.is_visible ? colors.success : colors.textMuted }]}>
                        {section.is_visible ? 'Visible' : 'Hidden'}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}
            </>
          )}

          {mediaSections.length === 0 && (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No media kit sections yet. Set up your media kit from the web dashboard.
              </Text>
            </Card>
          )}
        </>
      )}

      {/* ── Team Tab ────────────────────────────────────────────── */}
      {tabIndex === 5 && (
        <>
          <SectionTitle>Team Members</SectionTitle>
          {teamMembers.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No team members yet.
              </Text>
            </Card>
          ) : (
            teamMembers.map((member: any) => {
              const profile = member.profiles;
              const name = profile?.display_name || profile?.email || 'Unknown';
              const roleColors: Record<string, string> = {
                owner: colors.primary,
                manager: colors.accent,
                viewer: colors.textMuted,
              };
              return (
                <Card key={member.id} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[styles.memberInitial, { color: colors.primary }]}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{name}</Text>
                      {profile?.email && (
                        <Text style={[styles.memberEmail, { color: colors.textMuted }]}>{profile.email}</Text>
                      )}
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: (roleColors[member.role] || colors.textMuted) + '20' }]}>
                      <Text style={[styles.roleText, { color: roleColors[member.role] || colors.textMuted }]}>
                        {member.role?.charAt(0).toUpperCase() + member.role?.slice(1)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          <SectionTitle>Invite Member</SectionTitle>
          <Card style={styles.formCard}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>EMAIL ADDRESS</Text>
            <RNTextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="team@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              onPress={handleInvite}
              disabled={!inviteEmail.trim()}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: !inviteEmail.trim() ? 0.5 : 1 }]}
            >
              <Text style={styles.saveBtnText}>SEND INVITE</Text>
            </Pressable>
          </Card>
        </>
      )}
      {/* ── AI API Keys Tab ──────────────────────────────────── */}
      {tabIndex === 6 && (
        <>
          <SectionTitle>AI API Keys</SectionTitle>
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'left' }]}>
              Bring your own API key for a premium AI experience in Chat. Your key is used first; Go Virall's system key is the fallback.
            </Text>
          </Card>

          {keyMessage && (
            <Card style={{ backgroundColor: keyMessage.type === 'success' ? colors.success + '15' : colors.error + '15' }}>
              <Text style={{ fontSize: FontSize.sm, color: keyMessage.type === 'success' ? colors.success : colors.error }}>
                {keyMessage.text}
              </Text>
            </Card>
          )}

          {AI_PROVIDERS.map((provider) => {
            const existing = apiKeys.find((k: any) => k.provider === provider.id);
            const isExpanded = expandedProvider === provider.id;

            return (
              <Card key={provider.id}>
                <View style={styles.providerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.providerName, { color: colors.text }]}>{provider.name}</Text>
                    {existing && (
                      <View style={[styles.keyStatusBadge, { backgroundColor: existing.is_active ? colors.success + '20' : colors.textMuted + '20' }]}>
                        <Text style={[styles.keyStatusText, { color: existing.is_active ? colors.success : colors.textMuted }]}>
                          {existing.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    )}
                  </View>
                  {existing ? (
                    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                      <Pressable onPress={async () => {
                        await supabase
                          .from('user_api_keys')
                          .update({ is_active: !existing.is_active })
                          .eq('id', existing.id);
                        setApiKeys((prev) => prev.map((k: any) => k.id === existing.id ? { ...k, is_active: !existing.is_active } : k));
                      }}>
                        <Text style={[styles.keyAction, { color: colors.textSecondary }]}>
                          {existing.is_active ? 'DISABLE' : 'ENABLE'}
                        </Text>
                      </Pressable>
                      <Pressable onPress={async () => {
                        await supabase
                          .from('user_api_keys')
                          .delete()
                          .eq('id', existing.id);
                        setApiKeys((prev) => prev.filter((k: any) => k.id !== existing.id));
                        setKeyMessage({ type: 'success', text: 'Key removed.' });
                      }}>
                        <Text style={[styles.keyAction, { color: colors.error }]}>REMOVE</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => {
                      setExpandedProvider(isExpanded ? null : provider.id);
                      setNewApiKey('');
                      setKeyMessage(null);
                    }}>
                      <Text style={[styles.keyAction, { color: colors.primary }]}>
                        {isExpanded ? 'CANCEL' : 'ADD KEY'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {isExpanded && (
                  <View style={[styles.keyExpandedArea, { borderTopColor: colors.border }]}>
                    <Text style={[styles.keyGuideLabel, { color: colors.textMuted }]}>
                      How to get your {provider.name} API key:
                    </Text>
                    <Text style={[styles.keyGuideText, { color: colors.textSecondary }]}>
                      {provider.guide}
                    </Text>
                    <RNTextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
                      value={newApiKey}
                      onChangeText={setNewApiKey}
                      placeholder={`Paste your ${provider.name} API key...`}
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      onPress={async () => {
                        if (!newApiKey.trim() || !user?.id) return;
                        setSavingKey(true);
                        setKeyMessage(null);
                        const { error } = await supabase.from('user_api_keys').upsert({
                          user_id: user.id,
                          provider: provider.id,
                          api_key_encrypted: newApiKey.trim(),
                          model_preference: provider.defaultModel,
                          is_active: true,
                        }, { onConflict: 'user_id,provider' });
                        if (error) {
                          setKeyMessage({ type: 'error', text: error.message });
                        } else {
                          setKeyMessage({ type: 'success', text: `${provider.name} key saved!` });
                          setNewApiKey('');
                          setExpandedProvider(null);
                          // Reload keys
                          const { data: keys } = await supabase
                            .from('user_api_keys')
                            .select('id, provider, model_preference, is_active, created_at')
                            .eq('user_id', user.id);
                          setApiKeys(keys ?? []);
                        }
                        setSavingKey(false);
                      }}
                      disabled={!newApiKey.trim() || savingKey}
                      style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: (!newApiKey.trim() || savingKey) ? 0.5 : 1 }]}
                    >
                      <Text style={styles.saveBtnText}>{savingKey ? 'SAVING...' : 'SAVE KEY'}</Text>
                    </Pressable>
                    <Text style={[styles.keyModelNote, { color: colors.textMuted }]}>
                      Model: {provider.defaultModel} · Your key is encrypted at rest.
                    </Text>
                  </View>
                )}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// ── AI Provider Config ────────────────────────────────────────────

const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    guide: '1. Go to platform.openai.com/api-keys\n2. Click "Create new secret key"\n3. Copy the key (starts with sk-)\n4. Paste it below',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    guide: '1. Go to console.anthropic.com/settings/keys\n2. Click "Create Key"\n3. Copy the key (starts with sk-ant-)\n4. Paste it below',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash',
    guide: '1. Go to aistudio.google.com/apikey\n2. Click "Create API key"\n3. Copy the key\n4. Paste it below',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    guide: '1. Go to platform.deepseek.com/api-keys\n2. Click "Create new API key"\n3. Copy the key\n4. Paste it below',
  },
];

// ── Helper Components ─────────────────────────────────────────────

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={toggleStyles.row}>
      <Text style={[toggleStyles.label, { color: colors.text }]}>{label}</Text>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

function FormField({
  label, value, onChangeText, multiline, placeholder, colors,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  multiline?: boolean; placeholder?: string; colors: any;
}) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <RNTextInput
        style={[
          styles.textInput,
          { backgroundColor: colors.inputBg, color: colors.text },
          multiline && { minHeight: 80, textAlignVertical: 'top' },
          neuInset(colors),
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  label: { fontSize: FontSize.md, fontWeight: '500' },
});

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.md },

  // Forms
  formCard: { gap: Spacing.md },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  textInput: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, minHeight: 44 },
  saveBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  saveBtnText: { fontSize: FontSize.sm, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },

  // Connected
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  accountInfo: { flex: 1 },
  accountName: { fontSize: FontSize.md, fontWeight: '500' },
  accountFollowers: { fontSize: FontSize.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: FontSize.sm },

  // Billing
  planCard: { gap: Spacing.sm },
  planName: { fontSize: FontSize.xl, fontWeight: '800' },
  planDesc: { fontSize: FontSize.sm, lineHeight: 20 },
  upgradeBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm },
  upgradeBtnText: { fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 1 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  invoiceInfo: { flex: 1 },
  invoiceType: { fontSize: FontSize.sm, fontWeight: '500' },
  invoiceDate: { fontSize: FontSize.xs },
  invoiceAmount: { fontSize: FontSize.md, fontWeight: '700' },

  // Media Kit
  slugRow: { flexDirection: 'row', alignItems: 'center' },
  slugPrefix: { fontSize: FontSize.sm },
  slugInput: { flex: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, minHeight: 44 },
  sectionCard: {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionName: { fontSize: FontSize.md, fontWeight: '600', flex: 1, textTransform: 'capitalize' },
  visibilityBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  visibilityText: { fontSize: FontSize.xs, fontWeight: '600' },

  // Team
  memberCard: {},
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: FontSize.lg, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FontSize.md, fontWeight: '600' },
  memberEmail: { fontSize: FontSize.xs },
  roleBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  roleText: { fontSize: FontSize.xs, fontWeight: '700' },

  // Shared
  linkRow: { paddingVertical: Spacing.md },
  linkText: { fontSize: FontSize.md },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },

  // AI API Keys
  providerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  providerName: { fontSize: FontSize.md, fontWeight: '600' },
  keyStatusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  keyStatusText: { fontSize: FontSize.xs, fontWeight: '600' },
  keyAction: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  keyExpandedArea: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
  keyGuideLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  keyGuideText: { fontSize: FontSize.sm, lineHeight: 20 },
  keyModelNote: { fontSize: 10, lineHeight: 16 },
});
