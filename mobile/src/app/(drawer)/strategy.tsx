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
import { Spacing, FontSize, BorderRadius, neuShadowSm } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
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

const TABS = ['Growth', 'Content Strategy', '30-Day Plan', 'Hashtags'];
const ANALYSIS_TYPES = ['growth', 'content_strategy', 'thirty_day_plan', 'hashtags'];

export default function StrategyScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [analyses, setAnalyses] = useState<Record<string, any>>({});

  useEffect(() => { trackEvent('page_view', 'strategy'); }, []);
  const [bestProfileId, setBestProfileId] = useState<string | null>(null);
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

  const onProfileSelect = useCallback((id: string | null) => {
    if (profiles.length === 0) return;
    const prof = id ? profiles.find(p => p.id === id) : profiles[0];
    if (prof) {
      setBestProfileId(prof.id);
      setProfileLabel(`@${prof.username} (${prof.platform.charAt(0).toUpperCase() + prof.platform.slice(1)})`);
    }
  }, [profiles]);

  const currentType = ANALYSIS_TYPES[activeTab];
  const data = analyses[currentType];

  const handleRunAnalysis = useCallback(() => {
    if (!bestProfileId) {
      Alert.alert('No Profile', 'Connect a social profile first.');
      return;
    }
    setShowModal(true);
  }, [bestProfileId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Strategy',
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

  const renderEmpty = () => (
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
                style={[styles.hashtagPill, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
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
      <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />
      {renderContent()}
    </ScrollView>
    {bestProfileId && (
      <AnalysisModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onComplete={loadData}
        profileId={bestProfileId}
        profileLabel={profileLabel}
        analysisType={currentType}
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
  },
  hashtagText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
