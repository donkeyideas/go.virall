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
import { ScoreRing } from '../../components/ui/ScoreRing';
import { HorizontalBar } from '../../components/ui/HorizontalBar';
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

export default function SmoScoreScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [smoData, setSmoData] = useState<any>(null);
  const [bestProfileId, setBestProfileId] = useState<string | null>(null);

  useEffect(() => { trackEvent('page_view', 'smo-score'); }, []);
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
      .eq('analysis_type', 'smo_score')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const parsed = parseResult(data.result);
      setSmoData(parsed);
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

  const smo = smoData?.smo || smoData;
  const factors: any[] = smo?.factors || [];

  // Calculate overall weighted score
  let overallScore = 0;
  if (factors.length > 0) {
    const totalWeight = factors.reduce((s: number, f: any) => s + (f.weight || 1), 0);
    const weightedSum = factors.reduce(
      (s: number, f: any) => s + (f.score || 0) * (f.weight || 1),
      0,
    );
    overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  } else if (smo?.overall_score) {
    overallScore = Math.round(smo.overall_score);
  }

  const grade: string = smo?.grade || '';

  const handleRunAnalysis = useCallback(() => {
    if (!bestProfileId) {
      Alert.alert('No Profile', 'Connect a social profile first.');
      return;
    }
    setShowModal(true);
  }, [bestProfileId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'SMO Score',
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

  if (!smo || (factors.length === 0 && overallScore === 0)) {
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
      <View style={styles.ringContainer}>
        <ScoreRing score={overallScore} size={160} strokeWidth={14} label={grade || 'Overall'} />
      </View>

      {factors.length > 0 && (
        <>
          <SectionTitle>Score Breakdown</SectionTitle>
          {factors.map((factor: any, i: number) => {
            const name: string = factor.name || factor.factor || factor.label || `Factor ${i + 1}`;
            const score: number = factor.score || 0;
            const subtitle: string = factor.subtitle || factor.description || '';
            const recommendation: string =
              factor.recommendation || factor.tip || factor.suggestion || '';

            return (
              <Card key={i} style={styles.factorCard}>
                <Text style={[styles.factorName, { color: colors.text }]}>{name}</Text>
                <HorizontalBar
                  label=""
                  value={score}
                  maxValue={100}
                  color={colors.primary}
                />
                {subtitle ? (
                  <Text style={[styles.factorSubtitle, { color: colors.textSecondary }]}>
                    {subtitle}
                  </Text>
                ) : null}
                {recommendation ? (
                  <Text style={[styles.factorRec, { color: colors.textMuted }]}>
                    {recommendation}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
    {bestProfileId && (
      <AnalysisModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onComplete={loadData}
        profileId={bestProfileId}
        profileLabel={profileLabel}
        analysisType="smo_score"
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
  ringContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  factorCard: {
    marginBottom: Spacing.sm,
  },
  factorName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  factorSubtitle: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  factorRec: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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
