import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, Modal,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getBrandDeals } from '../../lib/dal';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

const TABS = ['Pipeline', 'List'];
const STAGES = [
  'lead', 'outreach', 'negotiating', 'contracted',
  'in_progress', 'delivered', 'invoiced', 'paid', 'completed',
];
const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead',
  outreach: 'Outreach',
  negotiating: 'Negotiating',
  contracted: 'Contracted',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  invoiced: 'Invoiced',
  paid: 'Paid',
  completed: 'Completed',
};

function formatCurrency(v: number) {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function BrandDealsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);

  useEffect(() => { trackEvent('page_view', 'brand_deals'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const data = await getBrandDeals(organization.id);
    setDeals(data);
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

  // Stats
  const totalDeals = deals.length;
  const activeDeals = deals.filter(d =>
    ['contracted', 'in_progress', 'delivered'].includes(d.pipeline_stage || ''),
  ).length;
  const pipelineValue = deals
    .filter(d => !['completed', 'paid'].includes(d.pipeline_stage || ''))
    .reduce((sum, d) => sum + (d.total_value || 0), 0);

  const getDeliverableProgress = (deal: any) => {
    const deliverables = deal.deal_deliverables ?? [];
    if (deliverables.length === 0) return null;
    const completed = deliverables.filter(
      (d: any) => d.status === 'completed' || d.status === 'approved',
    ).length;
    return { completed, total: deliverables.length };
  };

  const renderPipeline = () => {
    const grouped = new Map<string, any[]>();
    STAGES.forEach(s => grouped.set(s, []));
    deals.forEach(d => {
      const stage = d.pipeline_stage || 'lead';
      const arr = grouped.get(stage) ?? [];
      arr.push(d);
      grouped.set(stage, arr);
    });

    const hasAny = deals.length > 0;
    if (!hasAny) {
      return (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No deals in your pipeline yet.
        </Text>
      );
    }

    return (
      <View style={{ gap: Spacing.lg }}>
        {STAGES.map(stage => {
          const stageDeals = grouped.get(stage) ?? [];
          if (stageDeals.length === 0) return null;
          return (
            <View key={stage}>
              <Text style={[styles.stageLabel, { color: colors.textSecondary }]}>
                {STAGE_LABELS[stage]} ({stageDeals.length})
              </Text>
              {stageDeals.map(deal => {
                const progress = getDeliverableProgress(deal);
                return (
                  <Pressable key={deal.id} onPress={() => setSelectedDeal(deal)}>
                    <Card>
                      <Text style={[styles.dealName, { color: colors.text }]}>{deal.brand_name}</Text>
                      <View style={styles.dealRow}>
                        <Text style={[styles.dealValue, { color: colors.primary }]}>
                          {formatCurrency(deal.total_value || 0)}
                        </Text>
                        <StatusBadge status={deal.pipeline_stage || 'lead'} />
                      </View>
                      {deal.paid_amount > 0 && (
                        <Text style={[styles.paidText, { color: colors.textSecondary }]}>
                          Paid: {formatCurrency(deal.paid_amount)}
                        </Text>
                      )}
                      {progress && (
                        <View style={styles.progressRow}>
                          <View style={[styles.progressBar, { backgroundColor: colors.surfaceLight }]}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  backgroundColor: colors.primary,
                                  width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.progressText, { color: colors.textMuted }]}>
                            {progress.completed}/{progress.total}
                          </Text>
                        </View>
                      )}
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  const renderList = () => {
    const sorted = [...deals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    if (sorted.length === 0) {
      return (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No deals yet.
        </Text>
      );
    }

    return (
      <View style={{ gap: Spacing.sm }}>
        {sorted.map(deal => {
          const progress = getDeliverableProgress(deal);
          return (
            <Pressable key={deal.id} onPress={() => setSelectedDeal(deal)}>
              <Card>
                <View style={styles.dealRow}>
                  <Text style={[styles.dealName, { color: colors.text }]} numberOfLines={1}>
                    {deal.brand_name}
                  </Text>
                  <StatusBadge status={deal.pipeline_stage || 'lead'} />
                </View>
                <View style={styles.dealRow}>
                  <Text style={[styles.dealValue, { color: colors.primary }]}>
                    {formatCurrency(deal.total_value || 0)}
                  </Text>
                  <Text style={[styles.dealDate, { color: colors.textMuted }]}>
                    {new Date(deal.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {progress && (
                  <View style={styles.progressRow}>
                    <View style={[styles.progressBar, { backgroundColor: colors.surfaceLight }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textMuted }]}>
                      {progress.completed}/{progress.total}
                    </Text>
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalDeals}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Deals</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{activeDeals}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(pipelineValue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pipeline</Text>
          </Card>
        </View>

        <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />

        {activeTab === 0 ? renderPipeline() : renderList()}
      </ScrollView>

      {/* Deal Detail Modal */}
      <Modal visible={!!selectedDeal} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setSelectedDeal(null)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {selectedDeal && (
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {selectedDeal.brand_name}
              </Text>

              <View style={styles.detailRow}>
                <Text style={{ color: colors.textSecondary }}>Value</Text>
                <Text style={[styles.dealValue, { color: colors.primary }]}>
                  {formatCurrency(selectedDeal.total_value || 0)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={{ color: colors.textSecondary }}>Paid</Text>
                <Text style={{ color: colors.text }}>
                  {formatCurrency(selectedDeal.paid_amount || 0)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={{ color: colors.textSecondary }}>Stage</Text>
                <StatusBadge status={selectedDeal.pipeline_stage || 'lead'} size="md" />
              </View>
              <View style={styles.detailRow}>
                <Text style={{ color: colors.textSecondary }}>Created</Text>
                <Text style={{ color: colors.text }}>
                  {new Date(selectedDeal.created_at).toLocaleDateString()}
                </Text>
              </View>

              {selectedDeal.notes && (
                <Text style={{ color: colors.textSecondary, marginTop: Spacing.xs }}>
                  {selectedDeal.notes}
                </Text>
              )}

              <SectionTitle>Deliverables</SectionTitle>
              {(selectedDeal.deal_deliverables ?? []).length === 0 ? (
                <Text style={{ color: colors.textMuted }}>No deliverables</Text>
              ) : (
                (selectedDeal.deal_deliverables ?? []).map((d: any) => (
                  <Card key={d.id}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{d.title}</Text>
                    <View style={styles.dealRow}>
                      <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>
                        {d.platform || 'Any'}
                      </Text>
                      <StatusBadge status={d.status || 'pending'} />
                    </View>
                    {d.deadline && (
                      <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                        Due: {new Date(d.deadline).toLocaleDateString()}
                      </Text>
                    )}
                  </Card>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', padding: Spacing.md },
  statValue: { fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { fontSize: FontSize.xs, marginTop: 2 },
  stageLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.xs, textTransform: 'uppercase' },
  dealName: { fontSize: FontSize.md, fontWeight: '600' },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  dealValue: { fontSize: FontSize.md, fontWeight: '700' },
  dealDate: { fontSize: FontSize.sm },
  paidText: { fontSize: FontSize.sm, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: FontSize.xs, fontWeight: '600' },
  emptyText: { textAlign: 'center', marginTop: Spacing.xl, fontSize: FontSize.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
