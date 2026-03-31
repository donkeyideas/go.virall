import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { HorizontalBar } from '../../components/ui/HorizontalBar';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [smoData, setSmoData] = useState<any>(null);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    const { data: profs } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!profs || profs.length === 0) return;

    const profileId = profs[0].id;

    const { data } = await supabase
      .from('social_analyses')
      .select('*')
      .eq('social_profile_id', profileId)
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

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
            No data available. Run this analysis from the web dashboard.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
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
                  color={colors.accent}
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
});
