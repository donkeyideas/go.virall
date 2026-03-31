import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { Card } from '../../components/ui/Card';
import { Toggle } from '../../components/ui/Toggle';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Divider } from '../../components/ui/Divider';
import { PlatformIcon } from '../../components/ui/PlatformIcon';
import { type PlatformName } from '../../constants/platforms';
import { FontSize, Spacing } from '../../constants/theme';
import { getUserPreferences, updateUserPreferences, getSocialProfiles } from '../../lib/dal';

export default function SettingsScreen() {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, organization } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id || !organization?.id) return;
    const [prefs, profiles] = await Promise.all([
      getUserPreferences(user.id),
      getSocialProfiles(organization.id),
    ]);
    if (prefs) {
      setEmailNotifs(prefs.email_notifications ?? true);
      setWeeklyReport(prefs.weekly_report ?? false);
    }
    setConnectedAccounts(profiles);
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

      <SectionTitle>Notifications</SectionTitle>
      <Card>
        <ToggleRow label="Push Notifications" value={pushNotifs} onValueChange={(v) => setPushNotifs(v)} />
        <ToggleRow label="Email Notifications" value={emailNotifs} onValueChange={(v) => handleTogglePref('email_notifications', v)} />
        <ToggleRow label="Weekly Report" value={weeklyReport} onValueChange={(v) => handleTogglePref('weekly_report', v)} />
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <Card>
        <ToggleRow label="Dark Mode" value={mode === 'dark'} onValueChange={toggleTheme} />
      </Card>

      <SectionTitle>Connected Accounts</SectionTitle>
      <Card>
        {connectedAccounts.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No social accounts connected. Add them from the web dashboard.
          </Text>
        )}
        {connectedAccounts.map((acc: any) => (
          <View key={acc.id} style={styles.accountRow}>
            <PlatformIcon platform={acc.platform as PlatformName} size={28} />
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: colors.text }]}>@{acc.handle}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusLabel, { color: colors.success }]}>Connected</Text>
          </View>
        ))}
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
    </ScrollView>
  );
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={toggleStyles.row}>
      <Text style={[toggleStyles.label, { color: colors.text }]}>{label}</Text>
      <Toggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: FontSize.sm,
  },
  linkRow: {
    paddingVertical: Spacing.md,
  },
  linkText: {
    fontSize: FontSize.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
