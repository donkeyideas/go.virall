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
import { Card } from '../../components/ui/Card';
import { ProfileSelector } from '../../components/ui/ProfileSelector';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Pill } from '../../components/ui/Pill';
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

export default function RecommendationsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [bestProfileId, setBestProfileId] = useState<string | null>(null);

  useEffect(() => { trackEvent('page_view', 'recommendations'); }, []);
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
      .from('social_analyses')
      .select('*')
      .in('social_profile_id', profileIds)
      .eq('analysis_type', 'insights')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const parsed = parseResult(data.result);
      const items = parsed?.insights || parsed?.recommendations || [];
      setInsights(Array.isArray(items) ? items : []);
    }
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
      title: 'Recommendations',
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

  if (insights.length === 0) {
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
            No data available. Tap the button below to generate.
          </Text>
          <Pressable
            onPress={handleRunAnalysis}
            style={[styles.runBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.runBtnText}>RUN ANALYSIS</Text>
          </Pressable>
        </Card>
      </ScrollView>
    );
  }

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
      <SectionTitle>Recommendations</SectionTitle>
      {insights.map((item: any, i: number) => {
        const title: string = item.title || item.headline || `Insight ${i + 1}`;
        const insightText: string = item.insight || item.description || item.summary || '';
        const priority: string = item.priority || item.level || '';
        const actionItem: string =
          item.actionItem || item.action_item || item.action || item.next_step || '';

        return (
          <Card key={i} style={styles.insightCard}>
            <Text style={[styles.insightTitle, { color: colors.primary }]}>{title}</Text>

            {insightText ? (
              <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                {insightText}
              </Text>
            ) : null}

            {priority ? (
              <View style={styles.pillRow}>
                <Pill label={priority.charAt(0).toUpperCase() + priority.slice(1)} active />
              </View>
            ) : null}

            {actionItem ? (
              <Text style={[styles.actionText, { color: colors.textMuted }]}>{actionItem}</Text>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
    {bestProfileId && (
      <AnalysisModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onComplete={loadData}
        profileId={bestProfileId}
        profileLabel={profileLabel}
        analysisType="insights"
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
  insightCard: {
    marginBottom: Spacing.sm,
  },
  insightTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  insightText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    fontStyle: 'italic',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
