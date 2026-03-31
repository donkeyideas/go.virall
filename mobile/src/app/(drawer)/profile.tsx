import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Divider } from '../../components/ui/Divider';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { profile, organization, user, signOut } = useAuth();
  const router = useRouter();

  const planLabel = (organization?.plan || 'free').charAt(0).toUpperCase() + (organization?.plan || 'free').slice(1);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar name={profile?.full_name || 'User'} size={72} />
        <Text style={[styles.name, { color: colors.text }]}>{profile?.full_name || 'User'}</Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
        <View style={[styles.planBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.planText, { color: colors.primary }]}>{planLabel} Plan</Text>
        </View>
      </View>

      <Card>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Account Info</Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Role</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{profile?.system_role || 'user'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Organization</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{organization?.name || 'None'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Subscription</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{organization?.subscription_status || 'N/A'}</Text>
        </View>
      </Card>

      <Divider />

      <Pressable
        style={[styles.menuItem, { borderColor: colors.border }]}
        onPress={() => router.push('/(drawer)/settings')}
      >
        <Text style={[styles.menuText, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
      </Pressable>

      <Pressable
        style={[styles.menuItem, { borderColor: colors.border }]}
        onPress={() => router.push('/(drawer)/monetization')}
      >
        <Text style={[styles.menuText, { color: colors.text }]}>Monetize</Text>
        <Text style={[styles.chevron, { color: colors.textMuted }]}>{'>'}</Text>
      </Pressable>

      <Pressable
        style={[styles.menuItem, { borderColor: colors.border }]}
        onPress={handleSignOut}
      >
        <Text style={[styles.menuText, { color: colors.error }]}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginTop: Spacing.md,
  },
  email: {
    fontSize: FontSize.md,
  },
  planBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  planText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSize.sm,
  },
  infoValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  menuText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  chevron: {
    fontSize: FontSize.lg,
  },
});
