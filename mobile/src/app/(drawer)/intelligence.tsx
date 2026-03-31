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
import { TabPills } from '../../components/ui/TabPills';
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

const TABS = ['Audience', 'Competitors', 'Network'];
const ANALYSIS_TYPES = ['audience', 'competitors', 'network'];

export default function IntelligenceScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [analyses, setAnalyses] = useState<Record<string, any>>({});

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
      .in('analysis_type', ANALYSIS_TYPES)
      .order('created_at', { ascending: false });

    const mapped: Record<string, any> = {};
    for (const row of data ?? []) {
      if (!mapped[row.analysis_type]) {
        mapped[row.analysis_type] = parseResult(row.result);
      }
    }
    setAnalyses(mapped);
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

  const currentType = ANALYSIS_TYPES[activeTab];
  const data = analyses[currentType];

  const renderEmpty = () => (
    <Card>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        No data available. Run this analysis from the web dashboard.
      </Text>
    </Card>
  );

  const renderAudience = () => {
    if (!data) return renderEmpty();
    const audience = data.audience || data;

    const interests: any[] = audience.interests || [];
    const topCities: any[] = audience.topCities || audience.top_cities || audience.cities || [];
    const qualityScore: number | null = audience.qualityScore ?? audience.quality_score ?? null;

    if (interests.length === 0 && topCities.length === 0 && qualityScore === null) {
      return renderEmpty();
    }

    return (
      <>
        {qualityScore !== null && (
          <>
            <SectionTitle>Audience Quality</SectionTitle>
            <Card style={styles.itemCard}>
              <Text style={[styles.scoreValue, { color: colors.primary }]}>{qualityScore}%</Text>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Quality Score</Text>
            </Card>
          </>
        )}

        {interests.length > 0 && (
          <>
            <SectionTitle>Top Interests</SectionTitle>
            {interests.map((interest: any, i: number) => {
              const name = typeof interest === 'string' ? interest : interest.name || interest.label || '';
              const pct = typeof interest === 'object' ? interest.percentage || interest.pct || null : null;
              return (
                <Card key={i} style={styles.itemCard}>
                  <View style={styles.interestRow}>
                    <Text style={[styles.interestName, { color: colors.text }]}>{name}</Text>
                    {pct !== null && (
                      <Text style={[styles.interestPct, { color: colors.accent }]}>{pct}%</Text>
                    )}
                  </View>
                  {pct !== null && (
                    <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${Math.min(pct, 100)}%`, backgroundColor: colors.accent },
                        ]}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {topCities.length > 0 && (
          <>
            <SectionTitle>Top Cities</SectionTitle>
            <Card style={styles.itemCard}>
              {topCities.map((city: any, i: number) => {
                const name = typeof city === 'string' ? city : city.name || city.city || '';
                const pct = typeof city === 'object' ? city.percentage || city.pct || null : null;
                return (
                  <View key={i} style={styles.cityRow}>
                    <Text style={[styles.cityName, { color: colors.text }]}>{name}</Text>
                    {pct !== null && (
                      <Text style={[styles.cityPct, { color: colors.textSecondary }]}>{pct}%</Text>
                    )}
                  </View>
                );
              })}
            </Card>
          </>
        )}
      </>
    );
  };

  const renderCompetitors = () => {
    if (!data) return renderEmpty();
    const analysis = data.analysis || data;
    const overview: string = analysis.overview || analysis.summary || '';
    const strengths: any[] = analysis.strengths || [];
    const weaknesses: any[] = analysis.weaknesses || [];

    if (!overview && strengths.length === 0 && weaknesses.length === 0) {
      return renderEmpty();
    }

    return (
      <>
        {overview ? (
          <>
            <SectionTitle>Competitive Overview</SectionTitle>
            <Card style={styles.itemCard}>
              <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{overview}</Text>
            </Card>
          </>
        ) : null}

        {strengths.length > 0 && (
          <>
            <SectionTitle>Strengths</SectionTitle>
            {strengths.map((item: any, i: number) => {
              const text = typeof item === 'string' ? item : item.text || item.description || item.title || '';
              return (
                <Card key={i} style={styles.itemCard}>
                  <View style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: colors.success }]}>{'\u2713'}</Text>
                    <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        {weaknesses.length > 0 && (
          <>
            <SectionTitle>Weaknesses</SectionTitle>
            {weaknesses.map((item: any, i: number) => {
              const text = typeof item === 'string' ? item : item.text || item.description || item.title || '';
              return (
                <Card key={i} style={styles.itemCard}>
                  <View style={styles.bulletRow}>
                    <Text style={[styles.bullet, { color: colors.error }]}>{'\u2717'}</Text>
                    <Text style={[styles.bulletText, { color: colors.text }]}>{text}</Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </>
    );
  };

  const renderNetwork = () => {
    if (!data) return renderEmpty();
    const network = data.network || data;
    const influenceScore = network.influenceScore || network.influence_score || null;
    const tier: string = influenceScore?.tier || network.tier || '';
    const overall: number | null = influenceScore?.overall ?? influenceScore?.score ?? network.score ?? null;
    const tips: any[] = network.networkingTips || network.networking_tips || network.tips || [];

    if (overall === null && tips.length === 0) {
      return renderEmpty();
    }

    return (
      <>
        {overall !== null && (
          <>
            <SectionTitle>Influence Score</SectionTitle>
            <Card style={styles.itemCard}>
              <Text style={[styles.scoreValue, { color: colors.primary }]}>{overall}</Text>
              {tier ? (
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>{tier}</Text>
              ) : null}
            </Card>
          </>
        )}

        {tips.length > 0 && (
          <>
            <SectionTitle>Networking Tips</SectionTitle>
            {tips.map((tip: any, i: number) => {
              const title = typeof tip === 'string' ? '' : tip.title || tip.headline || '';
              const text = typeof tip === 'string' ? tip : tip.tip || tip.description || tip.text || '';
              return (
                <Card key={i} style={styles.itemCard}>
                  {title ? (
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
                  ) : null}
                  <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{text}</Text>
                </Card>
              );
            })}
          </>
        )}
      </>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 0: return renderAudience();
      case 1: return renderCompetitors();
      case 2: return renderNetwork();
      default: return null;
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />
      {renderContent()}
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
  itemCard: {
    marginBottom: Spacing.sm,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  itemDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  scoreValue: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  interestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  interestName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  interestPct: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  cityName: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  cityPct: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  bullet: {
    fontSize: FontSize.md,
    lineHeight: 20,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
