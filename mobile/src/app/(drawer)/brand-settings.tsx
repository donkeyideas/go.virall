import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Pressable, TextInput, Alert,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius, neuShadow, neuShadowSm, neuInset } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { trackEvent } from '../../lib/track';

// ── constants ────────────────────────────────────────────────────────

const TABS = ['Profile', 'Team', 'Billing'];

const INDUSTRIES = [
  'Technology',
  'Fashion & Beauty',
  'Health & Fitness',
  'Food & Beverage',
  'Travel & Hospitality',
  'Finance',
  'Education',
  'Entertainment',
  'Sports',
  'Automotive',
  'Real Estate',
  'E-commerce',
  'SaaS',
  'Gaming',
  'Other',
];

// ── component ────────────────────────────────────────────────────────

export default function BrandSettingsScreen() {
  const { colors } = useTheme();
  const { user, profile, organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => { trackEvent('page_view', 'brand_settings'); }, []);

  // ── Profile state ────────────────────────────────────────────────

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);

  // ── Team state ───────────────────────────────────────────────────

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // ── Billing state ────────────────────────────────────────────────

  const [billingInfo, setBillingInfo] = useState<any>(null);

  // ── data loading ─────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    // Populate profile fields from auth context
    if (profile) {
      setCompanyName(profile.company_name || '');
      setIndustry(profile.industry || '');
    }

    // Fetch additional profile data
    if (user?.id) {
      const { data: profileData } = await mobileApi<any>('/api/mobile/profiles');
      if (profileData) {
        if (profileData.company_name) setCompanyName(profileData.company_name);
        if (profileData.website) setWebsite(profileData.website);
        if (profileData.industry) setIndustry(profileData.industry);
        if (profileData.description || profileData.bio) {
          setDescription(profileData.description || profileData.bio || '');
        }
      }
    }

    // Fetch team members
    if (organization?.id) {
      const { data: teamData } = await mobileApi<any>(`/api/mobile/profiles?type=team&orgId=${organization.id}`);
      if (teamData && Array.isArray(teamData.members)) {
        setTeamMembers(teamData.members);
      } else if (teamData && Array.isArray(teamData)) {
        setTeamMembers(teamData);
      }
    }

    // Fetch billing info
    if (organization?.id) {
      const { data: billing } = await mobileApi<any>('/api/mobile/profiles?type=billing');
      if (billing) {
        setBillingInfo(billing);
      }
    }
  }, [user?.id, profile, organization?.id]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // ── handlers ─────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!companyName.trim()) {
      Alert.alert('Required', 'Company name is required.');
      return;
    }
    setSaving(true);
    const { error } = await mobileApi('/api/mobile/profiles', {
      method: 'PUT',
      body: {
        company_name: companyName.trim(),
        website: website.trim() || null,
        industry: industry || null,
        description: description.trim() || null,
      },
    });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Saved', 'Profile updated successfully.');
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { error } = await mobileApi('/api/mobile/profiles', {
      method: 'POST',
      body: {
        action: 'invite_team_member',
        email: inviteEmail.trim(),
      },
    });
    setInviting(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Invite Sent', `Invitation sent to ${inviteEmail.trim()}.`);
      setInviteEmail('');
      // Reload team data
      await loadData();
    }
  };

  // ── loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── render ───────────────────────────────────────────────────────

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Brand Settings</Text>
      <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />

      {/* ═══════════════════════════════════════ */}
      {/* PROFILE TAB                            */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 0 && (
        <>
          <SectionTitle>Company Profile</SectionTitle>
          <Card style={styles.formCard}>
            {/* Company Name */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>COMPANY NAME *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Your company name"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Website */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>WEBSITE</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
                value={website}
                onChangeText={setWebsite}
                placeholder="https://example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            {/* Industry */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>INDUSTRY</Text>
              <Pressable
                onPress={() => setShowIndustryPicker(!showIndustryPicker)}
                style={[styles.input, styles.pickerBtn, { backgroundColor: colors.inputBg }, neuInset(colors)]}
              >
                <Text style={[styles.pickerText, { color: industry ? colors.text : colors.textMuted }]}>
                  {industry || 'Select industry...'}
                </Text>
                <Text style={[styles.pickerArrow, { color: colors.textMuted }]}>
                  {showIndustryPicker ? '^' : 'v'}
                </Text>
              </Pressable>
              {showIndustryPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: colors.surface }, neuShadow(colors)]}>
                  {INDUSTRIES.map((ind) => (
                    <Pressable
                      key={ind}
                      onPress={() => {
                        setIndustry(ind);
                        setShowIndustryPicker(false);
                      }}
                      style={[
                        styles.pickerOption,
                        industry === ind && { backgroundColor: colors.primary + '15' },
                      ]}
                    >
                      <Text style={[
                        styles.pickerOptionText,
                        { color: industry === ind ? colors.primary : colors.text },
                      ]}>
                        {ind}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Description */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your company..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveProfile}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.5 : 1 }]}
            >
              <Text style={styles.saveBtnText}>{saving ? 'SAVING...' : 'SAVE CHANGES'}</Text>
            </Pressable>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TEAM TAB                               */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 1 && (
        <>
          <SectionTitle>Team Members</SectionTitle>
          {teamMembers.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No team members yet. Invite your team to collaborate.
              </Text>
            </Card>
          ) : (
            teamMembers.map((member: any, i: number) => {
              const name = member.display_name || member.full_name || member.email || 'Unknown';
              const role = member.role || 'member';
              const roleColors: Record<string, string> = {
                owner: colors.primary,
                admin: colors.accent,
                manager: colors.accent,
                member: colors.textSecondary,
                viewer: colors.textMuted,
              };
              return (
                <Card key={member.id || i} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: colors.surfaceLight }]}>
                      <Text style={[styles.memberInitial, { color: colors.primary }]}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]}>{name}</Text>
                      {member.email && (
                        <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                          {member.email}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: (roleColors[role] || colors.textMuted) + '20' }]}>
                      <Text style={[styles.roleText, { color: roleColors[role] || colors.textMuted }]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}

          <SectionTitle>Invite Team Member</SectionTitle>
          <Card style={styles.formCard}>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="team@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <Pressable
              onPress={handleInvite}
              disabled={!inviteEmail.trim() || inviting}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: (!inviteEmail.trim() || inviting) ? 0.5 : 1,
                },
              ]}
            >
              <Text style={styles.saveBtnText}>
                {inviting ? 'SENDING...' : 'SEND INVITE'}
              </Text>
            </Pressable>
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* BILLING TAB                            */}
      {/* ═══════════════════════════════════════ */}
      {activeTab === 2 && (
        <>
          <SectionTitle>Current Plan</SectionTitle>
          <Card style={styles.planCard}>
            <Text style={[styles.planName, { color: colors.primary }]}>
              {(organization?.plan || 'free').charAt(0).toUpperCase() +
                (organization?.plan || 'free').slice(1)}{' '}
              Plan
            </Text>
            <Text style={[styles.planDesc, { color: colors.textSecondary }]}>
              {getPlanDescription(organization?.plan || 'free')}
            </Text>
          </Card>

          <SectionTitle>Subscription Status</SectionTitle>
          <Card>
            <View style={styles.billingRow}>
              <Text style={[styles.billingLabel, { color: colors.textSecondary }]}>Status</Text>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: organization?.subscription_status === 'active'
                    ? '#D1FAE5'
                    : '#FEF3C7',
                },
              ]}>
                <Text style={[
                  styles.statusText,
                  {
                    color: organization?.subscription_status === 'active'
                      ? '#065F46'
                      : '#92400E',
                  },
                ]}>
                  {(organization?.subscription_status || 'free').charAt(0).toUpperCase() +
                    (organization?.subscription_status || 'free').slice(1)}
                </Text>
              </View>
            </View>
            {billingInfo?.next_billing_date && (
              <View style={styles.billingRow}>
                <Text style={[styles.billingLabel, { color: colors.textSecondary }]}>
                  Next Billing
                </Text>
                <Text style={[styles.billingValue, { color: colors.text }]}>
                  {new Date(billingInfo.next_billing_date).toLocaleDateString()}
                </Text>
              </View>
            )}
            {billingInfo?.amount && (
              <View style={styles.billingRow}>
                <Text style={[styles.billingLabel, { color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.billingValue, { color: colors.primary }]}>
                  ${(billingInfo.amount / 100).toFixed(2)}/mo
                </Text>
              </View>
            )}
          </Card>

          <Card style={styles.manageBillingCard}>
            <Pressable
              style={[styles.manageBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
              onPress={() =>
                Alert.alert(
                  'Manage Billing',
                  'Billing management is available on the web dashboard for full access to invoices, payment methods, and plan changes.',
                )
              }
            >
              <Text style={[styles.manageBtnText, { color: colors.primary }]}>
                MANAGE ON WEB DASHBOARD
              </Text>
            </Pressable>
          </Card>

          {/* Plan Features */}
          <SectionTitle>Plan Features</SectionTitle>
          <Card>
            {getPlanFeatures(organization?.plan || 'free').map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.featureCheck, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.featureCheckText, { color: colors.primary }]}>
                    {'\u2713'}
                  </Text>
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

// ── helper functions ──────────────────────────────────────────────────

function getPlanDescription(plan: string): string {
  switch (plan) {
    case 'free':
      return 'Basic features with limited deal management.';
    case 'pro':
      return 'Advanced analytics, unlimited deals, and priority support.';
    case 'business':
      return 'Team collaboration, custom branding, and dedicated support.';
    case 'enterprise':
      return 'Custom enterprise features with SLA guarantees.';
    default:
      return 'Standard plan features.';
  }
}

function getPlanFeatures(plan: string): string[] {
  const base = [
    'Deal pipeline management',
    'Basic analytics',
    'Creator search',
  ];
  if (plan === 'free') return base;

  const pro = [
    ...base,
    'Unlimited deals',
    'Advanced analytics',
    'Trust score tracking',
    'Priority support',
  ];
  if (plan === 'pro') return pro;

  const business = [
    ...pro,
    'Team collaboration',
    'Custom branding',
    'API access',
    'Dedicated account manager',
  ];
  if (plan === 'business') return business;

  return [
    ...business,
    'Custom integrations',
    'SLA guarantees',
    'White-label options',
  ];
}

// ── styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },

  // Forms
  formCard: { gap: Spacing.md },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },

  // Industry Picker
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: { fontSize: FontSize.md },
  pickerArrow: { fontSize: FontSize.sm, fontWeight: '700' },
  pickerDropdown: {
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
    maxHeight: 250,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pickerOptionText: { fontSize: FontSize.md },

  // Team Members
  memberCard: { marginBottom: Spacing.xs },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: { fontSize: FontSize.lg, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FontSize.md, fontWeight: '600' },
  memberEmail: { fontSize: FontSize.xs },
  roleBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  roleText: { fontSize: FontSize.xs, fontWeight: '700' },

  // Billing
  planCard: { gap: Spacing.sm },
  planName: { fontSize: FontSize.xl, fontWeight: '800' },
  planDesc: { fontSize: FontSize.sm, lineHeight: 20 },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  billingLabel: { fontSize: FontSize.sm },
  billingValue: { fontSize: FontSize.sm, fontWeight: '600' },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },
  manageBillingCard: { alignItems: 'center' },
  manageBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  manageBtnText: { fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 1 },

  // Features
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckText: { fontSize: 12, fontWeight: '800' },
  featureText: { fontSize: FontSize.sm, flex: 1 },
});
