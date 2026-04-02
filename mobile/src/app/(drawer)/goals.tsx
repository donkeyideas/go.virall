import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { ProfileSelector } from '../../components/ui/ProfileSelector';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { AnalysisModal } from '../../components/ui/AnalysisModal';
import { trackEvent } from '../../lib/track';

function parseResult(result: any): any {
  if (!result) return null;
  if (typeof result === 'string') {
    try { return JSON.parse(result.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try { return JSON.parse(result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  return result;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export default function GoalsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goal, setGoal] = useState<any>(null);
  const [bestProfileId, setBestProfileId] = useState<string | null>(null);

  useEffect(() => { trackEvent('page_view', 'goals'); }, []);
  const [showModal, setShowModal] = useState(false);
  const [profileLabel, setProfileLabel] = useState('');
  const [profiles, setProfiles] = useState<{id: string; platform: string; username: string}[]>([]);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    const { data: profs } = await supabase
      .from('social_profiles')
      .select('id, platform, handle')
      .eq('organization_id', organization.id)
      .order('followers_count', { ascending: false });

    if (!profs || profs.length === 0) return;

    setBestProfileId(profs[0].id);
    setProfileLabel(`@${profs[0].handle || 'unknown'} (${profs[0].platform.charAt(0).toUpperCase() + profs[0].platform.slice(1)})`);
    setProfiles(profs.map((p: any) => ({ id: p.id, platform: p.platform, username: p.handle || 'unknown' })));
    const profileIds = profs.map((p: any) => p.id);

    const { data } = await supabase
      .from('social_goals')
      .select('*')
      .in('social_profile_id', profileIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    setGoal(data);
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [loadData, organization?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const onProfileSelect = useCallback((id: string | null) => {
    if (profiles.length === 0) return;
    const prof = id ? profiles.find(p => p.id === id) : profiles[0];
    if (prof) {
      setBestProfileId(prof.id);
      setProfileLabel(`@${prof.username} (${prof.platform.charAt(0).toUpperCase() + prof.platform.slice(1)})`);
    }
  }, [profiles]);

  const handleRunAnalysis = useCallback(() => {
    if (!bestProfileId) {
      Alert.alert('No Profile', 'Connect a social profile first.');
      return;
    }
    setShowModal(true);
  }, [bestProfileId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Goals',
      headerRight: () => (
        <Pressable
          onPress={handleRunAnalysis}
          style={[styles.runBtnSmall, { backgroundColor: colors.primary, marginRight: 16 }]}
        >
          <Text style={styles.runBtnSmallText} numberOfLines={1}>RUN</Text>
        </Pressable>
      ),
    });
  }, [navigation, handleRunAnalysis, colors.primary]);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No active goals. Set goals from the web dashboard.
          </Text>
          <Pressable
            onPress={handleRunAnalysis}
            style={[styles.runBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.runBtnText}>RUN GROWTH ANALYSIS</Text>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

  const goalTitle: string =
    goal.title || goal.goal_type || goal.type || goal.name || 'Active Goal';
  const targetValue: number = goal.target_value ?? goal.targetValue ?? 0;
  const currentValue: number = goal.current_value ?? goal.currentValue ?? 0;
  const deadline: string = goal.deadline || goal.target_date || goal.end_date || '';

  const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {profiles.length > 1 && (
        <ProfileSelector profiles={profiles} selectedId={bestProfileId} onSelect={onProfileSelect} />
      )}
      <SectionTitle>Active Goal</SectionTitle>

      <Text style={[styles.goalTitle, { color: colors.text }]}>{goalTitle}</Text>

      <View style={styles.kpiRow}>
        <KpiCard
          label="Current"
          value={currentValue.toLocaleString()}
          change={0}
        />
        <KpiCard
          label="Target"
          value={targetValue.toLocaleString()}
          change={0}
        />
      </View>

      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Progress</Text>
          <Text style={[styles.progressPct, { color: colors.primary }]}>
            {Math.round(progress)}%
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceLight }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      </Card>

      {deadline ? (
        <Card style={styles.deadlineCard}>
          <Text style={[styles.deadlineLabel, { color: colors.textSecondary }]}>Deadline</Text>
          <Text style={[styles.deadlineValue, { color: colors.text }]}>{formatDate(deadline)}</Text>
        </Card>
      ) : null}
    </ScrollView>
    {bestProfileId && (
      <AnalysisModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onComplete={loadData}
        profileId={bestProfileId}
        profileLabel={profileLabel}
        analysisType="growth"
      />
    )}
    </>
  );
}

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
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  goalTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  progressCard: {
    gap: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  progressPct: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  deadlineCard: {
    gap: Spacing.xs,
  },
  deadlineLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  deadlineValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  runBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    minHeight: 48,
  },
  runBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: '#1A1035',
    letterSpacing: 1.5,
  },
  runBtnSmall: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  runBtnSmallText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: '#1A1035',
    letterSpacing: 1,
  },
});
