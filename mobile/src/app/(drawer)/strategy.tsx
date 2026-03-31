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

const TABS = ['Growth', 'Content Strategy', '30-Day Plan', 'Hashtags'];
const ANALYSIS_TYPES = ['growth', 'content_strategy', 'thirty_day_plan', 'hashtags'];

export default function StrategyScreen() {
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

  const renderGrowth = () => {
    if (!data) return renderEmpty();
    const tips: any[] = data.tips || data.recommendations || [];
    if (tips.length === 0) return renderEmpty();

    return (
      <>
        <SectionTitle>Growth Tips</SectionTitle>
        {tips.map((tip: any, i: number) => (
          <Card key={i} style={styles.itemCard}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>
              {tip.title || tip.headline || `Tip ${i + 1}`}
            </Text>
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
              {tip.description || tip.summary || tip.insight || ''}
            </Text>
          </Card>
        ))}
      </>
    );
  };

  const renderContentStrategy = () => {
    if (!data) return renderEmpty();
    const strategy = data.strategy || data;
    const proTips: any[] = strategy.proTips || strategy.pro_tips || strategy.tips || [];
    if (proTips.length === 0 && !strategy.overview) return renderEmpty();

    return (
      <>
        <SectionTitle>Content Strategy</SectionTitle>
        {strategy.overview && (
          <Card style={styles.itemCard}>
            <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
              {strategy.overview}
            </Text>
          </Card>
        )}
        {proTips.length > 0 && (
          <Card style={styles.itemCard}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>Pro Tips</Text>
            {proTips.map((tip: any, i: number) => {
              const text = typeof tip === 'string' ? tip : tip.tip || tip.text || tip.description || '';
              return (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bullet, { color: colors.primary }]}>{'\u2022'}</Text>
                  <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{text}</Text>
                </View>
              );
            })}
          </Card>
        )}
      </>
    );
  };

  const renderThirtyDayPlan = () => {
    if (!data) return renderEmpty();
    const plan = data.plan || data;
    const weeks: any[] = plan.weeks || [];
    if (weeks.length === 0) return renderEmpty();

    return (
      <>
        <SectionTitle>30-Day Plan</SectionTitle>
        {weeks.map((week: any, wi: number) => {
          const days: any[] = week.days || week.tasks || [];
          return (
            <View key={wi} style={styles.weekBlock}>
              <Text style={[styles.weekTitle, { color: colors.primary }]}>
                {week.title || week.label || `Week ${wi + 1}`}
              </Text>
              {days.map((day: any, di: number) => (
                <Card key={di} style={styles.dayCard}>
                  <Text style={[styles.dayLabel, { color: colors.text }]}>
                    {day.day || day.label || `Day ${di + 1}`}
                  </Text>
                  <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>
                    {day.task || day.description || day.activity || ''}
                  </Text>
                </Card>
              ))}
            </View>
          );
        })}
      </>
    );
  };

  const renderHashtags = () => {
    if (!data) return renderEmpty();
    const hashtags: any[] = data.hashtags || data.tags || [];
    if (hashtags.length === 0) return renderEmpty();

    return (
      <>
        <SectionTitle>Hashtags</SectionTitle>
        <View style={styles.hashtagGrid}>
          {hashtags.map((tag: any, i: number) => {
            const label = typeof tag === 'string' ? tag : tag.tag || tag.hashtag || tag.name || '';
            return (
              <View
                key={i}
                style={[styles.hashtagPill, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
              >
                <Text style={[styles.hashtagText, { color: colors.accent }]}>
                  {label.startsWith('#') ? label : `#${label}`}
                </Text>
              </View>
            );
          })}
        </View>
      </>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 0: return renderGrowth();
      case 1: return renderContentStrategy();
      case 2: return renderThirtyDayPlan();
      case 3: return renderHashtags();
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
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  bullet: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  weekBlock: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  weekTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  dayCard: {
    marginBottom: Spacing.xs,
  },
  dayLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  hashtagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  hashtagPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  hashtagText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
