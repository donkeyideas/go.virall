import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card } from '../../components/ui/Card';
import { ProfileSelector } from '../../components/ui/ProfileSelector';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { TabPills } from '../../components/ui/TabPills';
import { HorizontalBar } from '../../components/ui/HorizontalBar';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { AnalysisModal } from '../../components/ui/AnalysisModal';
import { formatCurrency } from '../../lib/format';
import { getDeals, getLatestAnalysis } from '../../lib/dal';
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

const TABS = ['Revenue', 'Campaigns'];

export default function MonetizeScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => { trackEvent('page_view', 'monetization'); }, []);

  const [earningsData, setEarningsData] = useState<any>(null);
  const [campaignsData, setCampaignsData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [bestProfileId, setBestProfileId] = useState<string | null>(null);
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

    const currentId = bestProfileId || profs[0].id;
    if (!bestProfileId) {
      setBestProfileId(profs[0].id);
      setProfileLabel(`@${profs[0].handle || 'unknown'} (${profs[0].platform.charAt(0).toUpperCase() + profs[0].platform.slice(1)})`);
    }
    setProfiles(profs.map((p: any) => ({ id: p.id, platform: p.platform, username: p.handle || 'unknown' })));

    const [dealsData, earningsAnalysis, campaignsAnalysis] = await Promise.all([
      getDeals(organization.id),
      getLatestAnalysis(currentId, 'earnings_forecast'),
      getLatestAnalysis(currentId, 'campaign_ideas'),
    ]);

    setDeals(dealsData);
    setEarningsData(parseResult(earningsAnalysis?.result));
    setCampaignsData(parseResult(campaignsAnalysis?.result));
  }, [organization?.id, bestProfileId]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

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
      title: 'Monetization',
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

  // Revenue data
  const forecast = earningsData?.forecast || earningsData || {};
  const summary = forecast.summaryStats || forecast.summary || earningsData?.summaryStats || {};
  const estMonthly = summary.estMonthly || summary.estimatedMonthlyEarnings || summary.monthlyEstimate || 0;
  const estAnnual = summary.estAnnual || summary.estimatedAnnualEarnings || summary.annualEstimate || estMonthly * 12;
  const perPost = summary.averagePerPost || summary.perPostValue || 0;
  const scenarios = forecast.scenarios || earningsData?.scenarios || earningsData?.forecastScenarios || [];
  const revenueSources = forecast.revenueBySources || earningsData?.revenueBySources || earningsData?.revenueSources || [];
  const recommendedRates = forecast.recommendedRates || earningsData?.recommendedRates || earningsData?.rateCard || [];
  const monetizationFactors = forecast.monetizationFactors || earningsData?.monetizationFactors || earningsData?.factors || [];

  // Campaigns data
  const campaigns = campaignsData?.campaigns || campaignsData?.campaignIdeas || [];
  const performanceMatrix = campaignsData?.performanceMatrix || campaignsData?.contentPerformance || [];
  const weeklyDeliverables = campaignsData?.weeklyPlan || campaignsData?.weeklyDeliverables || campaignsData?.deliverables || [];

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: colors.success + '20', text: colors.success },
    completed: { bg: colors.primary + '20', text: colors.primary },
    negotiation: { bg: colors.warning + '20', text: colors.warning },
    inquiry: { bg: colors.accent + '20', text: colors.accent },
    cancelled: { bg: colors.error + '20', text: colors.error },
  };

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {profiles.length > 1 && (
        <ProfileSelector profiles={profiles} selectedId={bestProfileId} onSelect={onProfileSelect} />
      )}

      <TabPills tabs={TABS} activeIndex={tabIndex} onSelect={setTabIndex} />

      {tabIndex === 0 ? (
        <>
          {/* KPIs */}
          <View style={styles.kpiRow}>
            <KpiCard label="Monthly" value={formatCurrency(estMonthly)} change={0} />
            <KpiCard label="Annual" value={formatCurrency(estAnnual)} change={0} />
            <KpiCard label="Per Post" value={formatCurrency(perPost)} change={0} />
          </View>

          {/* Forecast Scenarios */}
          {scenarios.length > 0 && (
            <>
              <SectionTitle>Forecast Scenarios</SectionTitle>
              {scenarios.map((s: any, i: number) => (
                <Card key={i} style={styles.scenarioCard}>
                  <Text style={[styles.scenarioName, { color: colors.text }]}>
                    {s.scenario || s.name || `Scenario ${i + 1}`}
                  </Text>
                  <View style={styles.scenarioRow}>
                    <View style={styles.scenarioStat}>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>Monthly</Text>
                      <Text style={[styles.statValue, { color: colors.primary }]}>
                        {formatCurrency(s.monthlyEarnings || s.monthly || 0)}
                      </Text>
                    </View>
                    <View style={styles.scenarioStat}>
                      <Text style={[styles.statLabel, { color: colors.textMuted }]}>Annual</Text>
                      <Text style={[styles.statValue, { color: colors.primary }]}>
                        {formatCurrency(s.annualEarnings || s.annual || 0)}
                      </Text>
                    </View>
                  </View>
                  {s.assumptions && (
                    <Text style={[styles.scenarioAssumption, { color: colors.textSecondary }]} numberOfLines={2}>
                      {s.assumptions}
                    </Text>
                  )}
                </Card>
              ))}
            </>
          )}

          {/* Revenue by Source */}
          {revenueSources.length > 0 && (
            <>
              <SectionTitle>Revenue by Source</SectionTitle>
              <Card>
                {revenueSources.map((src: any, i: number) => (
                  <View key={i} style={styles.sourceRow}>
                    <View style={styles.sourceInfo}>
                      <Text style={[styles.sourceName, { color: colors.text }]}>{src.source || src.name}</Text>
                      <Text style={[styles.sourceAmount, { color: colors.primary }]}>
                        {formatCurrency(src.monthlyAmount || src.amount || 0)}/mo
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                      <View style={[styles.barFill, { width: `${Math.min(src.percentage || 0, 100)}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.sourcePct, { color: colors.textSecondary }]}>{src.percentage || 0}%</Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Recommended Rates */}
          {recommendedRates.length > 0 && (
            <>
              <SectionTitle>Recommended Rates</SectionTitle>
              <Card>
                {recommendedRates.map((rate: any, i: number) => (
                  <View key={i} style={styles.rateRow}>
                    <Text style={[styles.rateName, { color: colors.text }]}>{rate.contentType || rate.type || rate.name}</Text>
                    <Text style={[styles.rateValue, { color: colors.primary }]}>
                      {formatCurrency(rate.rate || rate.suggestedRate || rate.min || 0)}
                      {rate.max ? ` - ${formatCurrency(rate.max)}` : ''}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}

          {/* Deals */}
          <SectionTitle>Deals</SectionTitle>
          {deals.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No deals yet. Create deals from the web dashboard.
              </Text>
            </Card>
          ) : (
            deals.map((deal: any) => {
              const sc = statusColors[deal.status] || statusColors.inquiry;
              return (
                <Card key={deal.id} style={styles.dealCard}>
                  <View style={styles.dealHeader}>
                    <Text style={[styles.dealBrand, { color: colors.text }]}>{deal.brand_name}</Text>
                    <View style={[styles.dealStatusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.dealStatusText, { color: sc.text }]}>
                        {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {deal.notes && <Text style={[styles.dealNotes, { color: colors.textSecondary }]} numberOfLines={1}>{deal.notes}</Text>}
                  <View style={styles.dealFooter}>
                    <Text style={[styles.dealValue, { color: colors.primary }]}>{formatCurrency(deal.total_value || 0)}</Text>
                    <Text style={[styles.dealEmail, { color: colors.textMuted }]}>{deal.contact_email || ''}</Text>
                  </View>
                </Card>
              );
            })
          )}

          {/* Monetization Factors */}
          {monetizationFactors.length > 0 && (
            <>
              <SectionTitle>Monetization Factors</SectionTitle>
              <Card>
                {monetizationFactors.map((f: any, i: number) => (
                  <HorizontalBar
                    key={i}
                    label={f.factor || f.name || f.label}
                    value={f.score || f.value || 0}
                    maxValue={100}
                    color={colors.primary}
                  />
                ))}
              </Card>
            </>
          )}

          {/* Empty state for revenue */}
          {!earningsData && deals.length === 0 && (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No revenue data yet. Run an earnings analysis to get started.
              </Text>
              <Pressable onPress={handleRunAnalysis} style={[styles.runBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.runBtnText}>RUN EARNINGS ANALYSIS</Text>
              </Pressable>
            </Card>
          )}
        </>
      ) : (
        <>
          {/* Campaigns Tab */}
          {campaigns.length > 0 && (
            <>
              <SectionTitle>Campaign Ideas</SectionTitle>
              {campaigns.map((c: any, i: number) => (
                  <Card key={i} style={styles.campaignCard}>
                    <View style={styles.campaignHeader}>
                      <Text style={[styles.campaignTitle, { color: colors.text }]} numberOfLines={2}>{c.title || c.name}</Text>
                      {(c.type || c.budget) && (
                        <View style={[styles.dealStatusBadge, { backgroundColor: colors.accent + '20' }]}>
                          <Text style={[styles.dealStatusText, { color: colors.accent }]}>
                            {(c.type || '').replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    {(c.description || c.objective) && (
                      <Text style={[styles.campaignDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                        {c.description || c.objective}
                      </Text>
                    )}
                    {c.expectedOutcome && (
                      <Text style={[styles.campaignRevenue, { color: colors.primary }]}>
                        {c.expectedOutcome}
                      </Text>
                    )}
                    {(c.duration || c.timeline) && (
                      <Text style={[styles.campaignMeta, { color: colors.textMuted }]}>Duration: {c.duration || c.timeline}</Text>
                    )}
                    {c.budget && (
                      <Text style={[styles.campaignMeta, { color: colors.textMuted }]}>Budget: {c.budget}</Text>
                    )}
                  </Card>
              ))}
            </>
          )}

          {/* Performance Matrix */}
          {performanceMatrix.length > 0 && (
            <>
              <SectionTitle>Content Performance</SectionTitle>
              <Card>
                {performanceMatrix.map((item: any, i: number) => {
                  const label = item.format || item.contentType || item.type || '';
                  const platforms = ['tiktok', 'instagram', 'youtube', 'twitter'].filter(p => item[p] != null);
                  return (
                    <View key={i} style={styles.perfRow}>
                      <Text style={[styles.perfType, { color: colors.text }]}>{label}</Text>
                      <View style={styles.perfStats}>
                        {platforms.length > 0 ? platforms.map(p => (
                          <View key={p} style={styles.perfPlatform}>
                            <Text style={[styles.perfPlatformLabel, { color: colors.textMuted }]}>{p.slice(0, 2).toUpperCase()}</Text>
                            <Text style={[styles.perfStat, { color: colors.primary }]}>{item[p]}%</Text>
                          </View>
                        )) : (
                          <>
                            {item.engagementRate != null && <Text style={[styles.perfStat, { color: colors.primary }]}>{item.engagementRate}%</Text>}
                            {item.revenue != null && <Text style={[styles.perfStat, { color: colors.success }]}>{formatCurrency(item.revenue)}</Text>}
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card>
            </>
          )}

          {/* Weekly Deliverables */}
          {weeklyDeliverables.length > 0 && (
            <>
              <SectionTitle>Weekly Plan</SectionTitle>
              {weeklyDeliverables.map((d: any, i: number) => {
                const items = d.items || [];
                const flatContent = d.content || d.task || d.description;
                return (
                  <Card key={i} style={styles.deliverableCard}>
                    <Text style={[styles.deliverableDay, { color: colors.primary }]}>{d.day || d.week || `Day ${i + 1}`}</Text>
                    {items.length > 0 ? items.map((item: any, j: number) => (
                      <View key={j} style={styles.deliverableItem}>
                        <Text style={[styles.deliverableContent, { color: colors.text }]}>{item.task || item.content || item.description}</Text>
                        {item.campaign && <Text style={[styles.deliverableType, { color: colors.textMuted }]}>{item.campaign}</Text>}
                        {item.platform && <Text style={[styles.deliverablePlatform, { color: colors.textMuted }]}>{item.platform}</Text>}
                      </View>
                    )) : flatContent ? (
                      <Text style={[styles.deliverableContent, { color: colors.text }]}>{flatContent}</Text>
                    ) : null}
                  </Card>
                );
              })}
            </>
          )}

          {/* Empty state for campaigns */}
          {campaigns.length === 0 && performanceMatrix.length === 0 && weeklyDeliverables.length === 0 && (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No campaign data yet. Run an analysis to generate campaign ideas.
              </Text>
              <Pressable onPress={handleRunAnalysis} style={[styles.runBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.runBtnText}>RUN CAMPAIGN ANALYSIS</Text>
              </Pressable>
            </Card>
          )}
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
        analysisType={tabIndex === 0 ? 'earnings_forecast' : 'campaign_ideas'}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm },

  // Scenarios
  scenarioCard: { gap: Spacing.sm },
  scenarioName: { fontSize: FontSize.md, fontWeight: '700', textTransform: 'capitalize' },
  scenarioRow: { flexDirection: 'row', gap: Spacing.lg },
  scenarioStat: { flex: 1 },
  statLabel: { fontSize: FontSize.xs, fontWeight: '500' },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  scenarioAssumption: { fontSize: FontSize.xs, lineHeight: 16, fontStyle: 'italic' },

  // Revenue sources
  sourceRow: { gap: Spacing.xs, marginBottom: Spacing.md },
  sourceInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceName: { fontSize: FontSize.sm, fontWeight: '600' },
  sourceAmount: { fontSize: FontSize.sm, fontWeight: '700' },
  sourcePct: { fontSize: FontSize.xs, textAlign: 'right' },

  // Shared bar styles
  barTrack: { height: 8, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: BorderRadius.sm },

  // Rates
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(139,92,246,0.08)' },
  rateName: { fontSize: FontSize.sm, fontWeight: '500', flex: 1 },
  rateValue: { fontSize: FontSize.sm, fontWeight: '700' },

  // Deals
  dealCard: { marginBottom: Spacing.xs },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  dealBrand: { fontSize: FontSize.lg, fontWeight: '700', flex: 1 },
  dealStatusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  dealStatusText: { fontSize: FontSize.xs, fontWeight: '600' },
  dealNotes: { fontSize: FontSize.sm, marginBottom: Spacing.sm },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dealValue: { fontSize: FontSize.lg, fontWeight: '700' },
  dealEmail: { fontSize: FontSize.sm },

  // Campaigns
  campaignCard: { gap: Spacing.sm },
  campaignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  campaignTitle: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  campaignDesc: { fontSize: FontSize.sm, lineHeight: 20 },
  campaignMeta: { fontSize: FontSize.xs },
  campaignRevenue: { fontSize: FontSize.sm, fontWeight: '700' },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  progressPct: { fontSize: FontSize.xs, fontWeight: '600', width: 32 },

  // Performance
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  perfType: { fontSize: FontSize.sm, fontWeight: '500', flex: 1 },
  perfStats: { flexDirection: 'row', gap: Spacing.md },
  perfStat: { fontSize: FontSize.sm, fontWeight: '700' },
  perfPlatform: { alignItems: 'center', gap: 2 },
  perfPlatformLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 0.5 },

  // Deliverables
  deliverableCard: { gap: Spacing.sm },
  deliverableDay: { fontSize: FontSize.sm, fontWeight: '700' },
  deliverableItem: { gap: 2, marginLeft: Spacing.sm },
  deliverablePlatform: { fontSize: FontSize.xs },
  deliverableContent: { fontSize: FontSize.sm, lineHeight: 20 },
  deliverableType: { fontSize: FontSize.xs },

  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
  runBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg, minHeight: 48 },
  runBtnText: { fontSize: FontSize.sm, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },
  runBtnSmall: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  runBtnSmallText: { fontSize: FontSize.xs, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },
});
