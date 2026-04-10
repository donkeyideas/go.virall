import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, TextInput, Modal, Alert,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getDeals, getDealDeliverables } from '../../lib/dal';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius, neuShadowSm, neuInset } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

const TABS = ['Pipeline', 'List'];
const STAGES = ['lead', 'outreach', 'negotiating', 'contracted', 'in_progress', 'delivered', 'invoiced', 'paid', 'completed'];
const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', outreach: 'Outreach', negotiating: 'Negotiating', contracted: 'Contracted',
  in_progress: 'In Progress', delivered: 'Delivered', invoiced: 'Invoiced', paid: 'Paid', completed: 'Completed',
};

export default function DealsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ brand_name: '', total_value: '', notes: '' });

  useEffect(() => { trackEvent('page_view', 'deals'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const data = await getDeals(organization.id);
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

  const handleSelectDeal = async (deal: any) => {
    setSelectedDeal(deal);
    const dels = await getDealDeliverables(deal.id);
    setDeliverables(dels);
  };

  const handleCreate = async () => {
    if (!form.brand_name.trim()) return;
    setCreating(true);
    const { error } = await mobileApi('/api/mobile/deals', {
      method: 'POST',
      body: {
        brand_name: form.brand_name.trim(),
        total_value: parseFloat(form.total_value) || 0,
        notes: form.notes.trim() || null,
      },
    });
    setCreating(false);
    if (error) { Alert.alert('Error', error); return; }
    setShowCreate(false);
    setForm({ brand_name: '', total_value: '', notes: '' });
    await loadData();
  };

  const handleStageUpdate = async (dealId: string, stage: string) => {
    const { error } = await mobileApi('/api/mobile/deals', {
      method: 'PUT',
      body: { dealId, pipeline_stage: stage },
    });
    if (error) { Alert.alert('Error', error); return; }
    setSelectedDeal(null);
    await loadData();
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Stats
  const pipelineValue = deals.filter(d => ['inquiry', 'negotiation', 'active'].includes(d.status)).reduce((s, d) => s + (d.total_value || 0), 0);
  const activeCount = deals.filter(d => d.status === 'active').length;
  const completedCount = deals.filter(d => d.status === 'completed').length;

  const renderPipeline = () => {
    const grouped = new Map<string, any[]>();
    STAGES.forEach(s => grouped.set(s, []));
    deals.forEach(d => {
      const stage = d.pipeline_stage || 'lead';
      const arr = grouped.get(stage) ?? [];
      arr.push(d);
      grouped.set(stage, arr);
    });

    return (
      <View style={{ gap: Spacing.lg }}>
        {STAGES.map(stage => {
          const stagDeals = grouped.get(stage) ?? [];
          if (stagDeals.length === 0) return null;
          return (
            <View key={stage}>
              <Text style={[styles.stageLabel, { color: colors.textSecondary }]}>
                {STAGE_LABELS[stage]} ({stagDeals.length})
              </Text>
              {stagDeals.map(deal => (
                <Pressable key={deal.id} onPress={() => handleSelectDeal(deal)}>
                  <Card>
                    <Text style={[styles.dealName, { color: colors.text }]}>{deal.brand_name}</Text>
                    <View style={styles.dealRow}>
                      <Text style={[styles.dealValue, { color: colors.primary }]}>
                        ${(deal.total_value || 0).toLocaleString()}
                      </Text>
                      <StatusBadge status={deal.status} />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          );
        })}
      </View>
    );
  };

  const renderList = () => (
    <View style={{ gap: Spacing.sm }}>
      {deals.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No deals yet. Create your first deal!</Text>
      ) : (
        deals.map(deal => (
          <Pressable key={deal.id} onPress={() => handleSelectDeal(deal)}>
            <Card>
              <View style={styles.dealRow}>
                <Text style={[styles.dealName, { color: colors.text }]} numberOfLines={1}>{deal.brand_name}</Text>
                <StatusBadge status={deal.pipeline_stage || 'lead'} />
              </View>
              <View style={styles.dealRow}>
                <Text style={[styles.dealValue, { color: colors.primary }]}>
                  ${(deal.total_value || 0).toLocaleString()}
                </Text>
                <Text style={[styles.dealDate, { color: colors.textMuted }]}>
                  {new Date(deal.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );

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
            <Text style={[styles.statValue, { color: colors.primary }]}>${pipelineValue.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pipeline</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{activeCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{completedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Won</Text>
          </Card>
        </View>

        <View style={styles.tabRow}>
          <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />
          <Pressable onPress={() => setShowCreate(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        {activeTab === 0 ? renderPipeline() : renderList()}
      </ScrollView>

      {/* Deal Detail Bottom Sheet */}
      <Modal visible={!!selectedDeal} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setSelectedDeal(null)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {selectedDeal && (
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{selectedDeal.brand_name}</Text>
              <View style={styles.dealRow}>
                <Text style={{ color: colors.textSecondary }}>Value</Text>
                <Text style={[styles.dealValue, { color: colors.primary }]}>${(selectedDeal.total_value || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.dealRow}>
                <Text style={{ color: colors.textSecondary }}>Paid</Text>
                <Text style={{ color: colors.text }}>${(selectedDeal.paid_amount || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.dealRow}>
                <Text style={{ color: colors.textSecondary }}>Stage</Text>
                <StatusBadge status={selectedDeal.pipeline_stage || 'lead'} size="md" />
              </View>
              {selectedDeal.notes && (
                <Text style={{ color: colors.textSecondary }}>{selectedDeal.notes}</Text>
              )}

              <SectionTitle title="Deliverables" />
              {deliverables.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>No deliverables</Text>
              ) : (
                deliverables.map((d: any) => (
                  <Card key={d.id}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{d.title}</Text>
                    <View style={styles.dealRow}>
                      <Text style={{ color: colors.textSecondary }}>{d.platform || 'Any'}</Text>
                      <StatusBadge status={d.status || 'pending'} />
                    </View>
                  </Card>
                ))
              )}

              <SectionTitle title="Move Stage" />
              <View style={styles.stageGrid}>
                {STAGES.map(stage => (
                  <Pressable
                    key={stage}
                    onPress={() => handleStageUpdate(selectedDeal.id, stage)}
                    style={[
                      styles.stageBtn,
                      { backgroundColor: colors.surface },
                      neuShadowSm(colors),
                      selectedDeal.pipeline_stage === stage && { backgroundColor: colors.primary + '20' },
                    ]}
                  >
                    <Text style={[styles.stageBtnText, { color: selectedDeal.pipeline_stage === stage ? colors.primary : colors.text }]}>
                      {STAGE_LABELS[stage]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Create Deal Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setShowCreate(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>New Deal</Text>
            <TextInput
              placeholder="Brand Name *"
              placeholderTextColor={colors.textMuted}
              value={form.brand_name}
              onChangeText={v => setForm(p => ({ ...p, brand_name: v }))}
              style={[styles.input, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
            />
            <TextInput
              placeholder="Deal Value ($)"
              placeholderTextColor={colors.textMuted}
              value={form.total_value}
              onChangeText={v => setForm(p => ({ ...p, total_value: v }))}
              keyboardType="numeric"
              style={[styles.input, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
            />
            <TextInput
              placeholder="Notes"
              placeholderTextColor={colors.textMuted}
              value={form.notes}
              onChangeText={v => setForm(p => ({ ...p, notes: v }))}
              multiline
              style={[styles.input, styles.inputMulti, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
            />
            <Pressable
              onPress={handleCreate}
              disabled={creating}
              style={[styles.createBtn, { backgroundColor: colors.primary, opacity: creating ? 0.6 : 1 }]}
            >
              <Text style={styles.createBtnText}>{creating ? 'Creating...' : 'Create Deal'}</Text>
            </Pressable>
          </View>
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
  tabRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.sm },
  stageLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.xs, textTransform: 'uppercase' },
  dealName: { fontSize: FontSize.md, fontWeight: '600' },
  dealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  dealValue: { fontSize: FontSize.md, fontWeight: '700' },
  dealDate: { fontSize: FontSize.sm },
  emptyText: { textAlign: 'center', marginTop: Spacing.xl, fontSize: FontSize.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stageBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  stageBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  input: { borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  createBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
});
