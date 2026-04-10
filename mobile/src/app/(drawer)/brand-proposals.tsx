import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, Modal, Alert,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getBrandProposals } from '../../lib/dal';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius, neuShadowSm } from '../../constants/theme';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { trackEvent } from '../../lib/track';

const TABS = ['Sent', 'Received'];

export default function BrandProposalsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [proposals, setProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { trackEvent('page_view', 'brand_proposals'); }, []);

  const filter = activeTab === 0 ? 'sent' : 'received';

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const data = await getBrandProposals(user.id);
    if (data) {
      // Filter based on active tab: sent = proposals where current user is sender
      const filtered = data.filter((p: any) =>
        filter === 'sent' ? p.sender_id === user.id : p.receiver_id === user.id
      );
      setProposals(filtered);
    }
  }, [user?.id, filter]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSelectProposal = (proposal: any) => {
    setSelectedProposal(proposal);
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

  const handleCancelProposal = async () => {
    if (!selectedProposal) return;
    Alert.alert(
      'Cancel Proposal',
      'Are you sure you want to cancel this proposal?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await handleStatusUpdate('cancelled');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getOtherName = (p: any) => {
    if (activeTab === 0) {
      // Sent tab: show receiver (creator) name
      return p.receiver?.full_name || p.receiver?.company_name || 'Unknown Creator';
    }
    // Received tab: show sender name
    return p.sender?.full_name || p.sender?.company_name || 'Unknown';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
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
              {activeTab === 0
                ? "You haven't sent any proposals to creators yet."
                : "You haven't received any proposals yet."}
            </Text>
          </View>
        ) : (
          proposals.map((p: any) => (
            <Pressable key={p.id} onPress={() => handleSelectProposal(p)}>
              <Card>
                <View style={styles.proposalHeader}>
                  <Text style={[styles.proposalTitle, { color: colors.text }]} numberOfLines={1}>
                    {p.title || 'Untitled Proposal'}
                  </Text>
                  <StatusBadge status={p.status} />
                </View>
                <Text style={[styles.proposalFrom, { color: colors.textSecondary }]}>
                  {activeTab === 0 ? 'To' : 'From'}: {getOtherName(p)}
                </Text>
                <View style={styles.proposalRow}>
                  <Text style={[styles.proposalAmount, { color: colors.primary }]}>
                    ${(p.total_amount || 0).toLocaleString()} {p.currency || 'USD'}
                  </Text>
                  <Text style={[styles.proposalDate, { color: colors.textMuted }]}>
                    {formatDate(p.created_at)}
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
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {selectedProposal.title || 'Untitled Proposal'}
              </Text>
              <StatusBadge status={selectedProposal.status} size="md" />

              {selectedProposal.description ? (
                <Text style={{ color: colors.textSecondary, fontSize: FontSize.md, lineHeight: 22 }}>
                  {selectedProposal.description}
                </Text>
              ) : null}

              {/* Amount */}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.proposalAmount, { color: colors.primary }]}>
                  ${(selectedProposal.total_amount || 0).toLocaleString()} {selectedProposal.currency || 'USD'}
                </Text>
              </View>

              {/* Payment type */}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payment Type</Text>
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>
                  {selectedProposal.payment_type
                    ? selectedProposal.payment_type.charAt(0).toUpperCase() + selectedProposal.payment_type.slice(1)
                    : 'Fixed'}
                </Text>
              </View>

              {/* Creator / Brand name */}
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                  {activeTab === 0 ? 'Creator' : 'From'}
                </Text>
                <Text style={{ color: colors.text, fontSize: FontSize.md }}>
                  {getOtherName(selectedProposal)}
                </Text>
              </View>

              {/* Start / End dates */}
              {selectedProposal.start_date && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Start Date</Text>
                  <Text style={{ color: colors.text, fontSize: FontSize.md }}>
                    {formatDate(selectedProposal.start_date)}
                  </Text>
                </View>
              )}
              {selectedProposal.end_date && (
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>End Date</Text>
                  <Text style={{ color: colors.text, fontSize: FontSize.md }}>
                    {formatDate(selectedProposal.end_date)}
                  </Text>
                </View>
              )}

              {/* Deliverables */}
              {(selectedProposal.deliverables ?? []).length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>Deliverables</Text>
                  {selectedProposal.deliverables.map((d: any, i: number) => (
                    <Card key={i}>
                      <View style={styles.deliverableRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontWeight: '600', fontSize: FontSize.md }}>
                            {d.content_type || 'Content'}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>
                            {d.platform || 'Any Platform'}
                          </Text>
                          {d.description ? (
                            <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                              {d.description}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.proposalAmount, { color: colors.primary }]}>
                          ${(d.amount || 0).toLocaleString()}
                        </Text>
                      </View>
                      {d.quantity && d.quantity > 1 && (
                        <Text style={{ color: colors.textMuted, fontSize: FontSize.xs, marginTop: 4 }}>
                          Qty: {d.quantity}
                        </Text>
                      )}
                    </Card>
                  ))}
                </>
              )}

              {/* Action buttons for received proposals */}
              {selectedProposal.status === 'pending' && activeTab === 1 && (
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => handleStatusUpdate('accepted')}
                    disabled={actionLoading}
                    style={[styles.actionBtn, { backgroundColor: '#059669', opacity: actionLoading ? 0.6 : 1 }]}
                  >
                    <Text style={styles.actionBtnText}>
                      {actionLoading ? 'Updating...' : 'Accept'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleStatusUpdate('declined')}
                    disabled={actionLoading}
                    style={[styles.actionBtn, { backgroundColor: '#DC2626', opacity: actionLoading ? 0.6 : 1 }]}
                  >
                    <Text style={styles.actionBtnText}>Decline</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleStatusUpdate('negotiating')}
                    disabled={actionLoading}
                    style={[styles.actionBtn, { backgroundColor: '#D97706', opacity: actionLoading ? 0.6 : 1 }]}
                  >
                    <Text style={styles.actionBtnText}>Counter</Text>
                  </Pressable>
                </View>
              )}

              {/* Convert to deal if accepted */}
              {selectedProposal.status === 'accepted' && !selectedProposal.deal_id && (
                <Pressable
                  onPress={handleConvertToDeal}
                  disabled={actionLoading}
                  style={[styles.convertBtn, { backgroundColor: colors.primary, opacity: actionLoading ? 0.6 : 1 }]}
                >
                  <Text style={styles.actionBtnText}>
                    {actionLoading ? 'Converting...' : 'Convert to Deal'}
                  </Text>
                </Pressable>
              )}

              {/* Cancel button for sent proposals that are still pending */}
              {selectedProposal.status === 'pending' && activeTab === 0 && (
                <Pressable
                  onPress={handleCancelProposal}
                  disabled={actionLoading}
                  style={[styles.cancelBtn, { backgroundColor: colors.surface, opacity: actionLoading ? 0.6 : 1 }, neuShadowSm(colors)]}
                >
                  <Text style={[styles.cancelBtnText, { color: '#DC2626' }]}>
                    {actionLoading ? 'Cancelling...' : 'Cancel Proposal'}
                  </Text>
                </Pressable>
              )}

              {/* Already converted indicator */}
              {selectedProposal.deal_id && (
                <View style={[styles.infoBanner, { backgroundColor: colors.surfaceLight }]}>
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: FontSize.md }}>
                    Linked to Deal
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: FontSize.sm }}>
                    This proposal has been converted to a deal.
                  </Text>
                </View>
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
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.lg },
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
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: FontSize.sm },
  deliverableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
  convertBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm },
  cancelBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.sm },
  cancelBtnText: { fontWeight: '700', fontSize: FontSize.md },
  infoBanner: { padding: Spacing.md, borderRadius: BorderRadius.md, gap: 4, marginTop: Spacing.sm },
});
