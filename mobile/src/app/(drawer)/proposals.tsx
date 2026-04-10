import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, Alert, Modal, TextInput,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

const TABS = ['Received', 'Sent'];

export default function ProposalsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { trackEvent('page_view', 'proposals'); }, []);

  const filter = activeTab === 0 ? 'received' : 'sent';

  const loadData = useCallback(async () => {
    const { data, error } = await mobileApi<{ data: any[] }>(`/api/mobile/proposals?filter=${filter}`);
    if (!error && data?.data) setProposals(data.data);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSelectProposal = async (proposal: any) => {
    const { data, error } = await mobileApi<{ data: any }>(`/api/mobile/proposals?id=${proposal.id}`);
    if (!error && data?.data) setSelectedProposal(data.data);
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedProposal) return;
    setActionLoading(true);
    const { error } = await mobileApi('/api/mobile/proposals', {
      method: 'PUT',
      body: { proposalId: selectedProposal.id, status },
    });
    setActionLoading(false);
    if (error) { Alert.alert('Error', error); return; }
    setSelectedProposal(null);
    await loadData();
  };

  const handleConvertToDeal = async () => {
    if (!selectedProposal) return;
    setActionLoading(true);
    const { error } = await mobileApi('/api/mobile/proposals', {
      method: 'PATCH',
      body: { proposalId: selectedProposal.id },
    });
    setActionLoading(false);
    if (error) { Alert.alert('Error', error); return; }
    Alert.alert('Success', 'Proposal converted to deal');
    setSelectedProposal(null);
    await loadData();
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getOtherName = (p: any) => {
    if (activeTab === 0) return p.sender?.full_name || p.sender?.company_name || 'Unknown';
    return p.receiver?.full_name || p.receiver?.company_name || 'Unknown';
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <TabPills tabs={TABS} activeIndex={activeTab} onSelect={setActiveTab} />

        {proposals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Proposals</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 0 ? "You haven't received any proposals yet." : "You haven't sent any proposals yet."}
            </Text>
          </View>
        ) : (
          proposals.map(p => (
            <Pressable key={p.id} onPress={() => handleSelectProposal(p)}>
              <Card>
                <View style={styles.proposalHeader}>
                  <Text style={[styles.proposalTitle, { color: colors.text }]} numberOfLines={1}>{p.title}</Text>
                  <StatusBadge status={p.status} />
                </View>
                <Text style={[styles.proposalFrom, { color: colors.textSecondary }]}>
                  {activeTab === 0 ? 'From' : 'To'}: {getOtherName(p)}
                </Text>
                <View style={styles.proposalRow}>
                  <Text style={[styles.proposalAmount, { color: colors.primary }]}>
                    ${(p.total_amount || 0).toLocaleString()} {p.currency || 'USD'}
                  </Text>
                  <Text style={[styles.proposalDate, { color: colors.textMuted }]}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Proposal Detail Modal */}
      <Modal visible={!!selectedProposal} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setSelectedProposal(null)} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {selectedProposal && (
            <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{selectedProposal.title}</Text>
              <StatusBadge status={selectedProposal.status} size="md" />

              {selectedProposal.description && (
                <Text style={{ color: colors.textSecondary }}>{selectedProposal.description}</Text>
              )}

              <View style={styles.proposalRow}>
                <Text style={{ color: colors.textSecondary }}>Amount</Text>
                <Text style={[styles.proposalAmount, { color: colors.primary }]}>
                  ${(selectedProposal.total_amount || 0).toLocaleString()}
                </Text>
              </View>

              <View style={styles.proposalRow}>
                <Text style={{ color: colors.textSecondary }}>Payment</Text>
                <Text style={{ color: colors.text }}>{selectedProposal.payment_type || 'Fixed'}</Text>
              </View>

              {selectedProposal.start_date && (
                <View style={styles.proposalRow}>
                  <Text style={{ color: colors.textSecondary }}>Period</Text>
                  <Text style={{ color: colors.text }}>
                    {new Date(selectedProposal.start_date).toLocaleDateString()}
                    {selectedProposal.end_date ? ` — ${new Date(selectedProposal.end_date).toLocaleDateString()}` : ''}
                  </Text>
                </View>
              )}

              {/* Deliverables */}
              {(selectedProposal.deliverables ?? []).length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Deliverables</Text>
                  {selectedProposal.deliverables.map((d: any, i: number) => (
                    <Card key={i}>
                      <Text style={{ color: colors.text, fontWeight: '600' }}>
                        {d.content_type || 'Content'} on {d.platform || 'Platform'}
                      </Text>
                      <Text style={{ color: colors.primary }}>${(d.amount || 0).toLocaleString()}</Text>
                    </Card>
                  ))}
                </>
              )}

              {/* Events timeline */}
              {(selectedProposal.events ?? []).length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Activity</Text>
                  {selectedProposal.events.map((e: any) => (
                    <View key={e.id} style={styles.eventRow}>
                      <View style={[styles.eventDot, { backgroundColor: colors.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{e.event_type.replace(/_/g, ' ')}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                          {new Date(e.created_at).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Action buttons */}
              {selectedProposal.status === 'pending' && activeTab === 0 && (
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => handleStatusUpdate('accepted')}
                    disabled={actionLoading}
                    style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                  >
                    <Text style={styles.actionBtnText}>Accept</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleStatusUpdate('declined')}
                    disabled={actionLoading}
                    style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
                  >
                    <Text style={styles.actionBtnText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleStatusUpdate('negotiating')}
                    disabled={actionLoading}
                    style={[styles.actionBtn, { backgroundColor: '#D97706' }]}
                  >
                    <Text style={styles.actionBtnText}>Counter</Text>
                  </Pressable>
                </View>
              )}

              {selectedProposal.status === 'accepted' && !selectedProposal.deal_id && (
                <Pressable
                  onPress={handleConvertToDeal}
                  disabled={actionLoading}
                  style={[styles.convertBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.actionBtnText}>
                    {actionLoading ? 'Converting...' : 'Convert to Deal'}
                  </Text>
                </Pressable>
              )}

              {selectedProposal.status === 'pending' && activeTab === 1 && (
                <Pressable
                  onPress={() => handleStatusUpdate('cancelled')}
                  disabled={actionLoading}
                  style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}
                >
                  <Text style={styles.actionBtnText}>Cancel Proposal</Text>
                </Pressable>
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
  empty: { alignItems: 'center', marginTop: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  proposalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proposalTitle: { fontSize: FontSize.md, fontWeight: '600', flex: 1, marginRight: Spacing.sm },
  proposalFrom: { fontSize: FontSize.sm, marginTop: 2 },
  proposalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  proposalAmount: { fontSize: FontSize.md, fontWeight: '700' },
  proposalDate: { fontSize: FontSize.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  sectionLabel: { fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.sm },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
  convertBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
});
