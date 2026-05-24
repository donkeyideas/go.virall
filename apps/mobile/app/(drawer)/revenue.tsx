import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Button } from '@/components/ui/Button';
import { Kicker } from '@/components/ui/Kicker';

// ── Types ─────────────────────────────────────────────────────────────
type DealStage = 'lead' | 'outreach' | 'negotiation' | 'contract' | 'production' | 'review' | 'live' | 'done' | 'lost';
type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

interface Deal {
  id: string;
  brand_name: string;
  title: string;
  brand_contact_email: string | null;
  stage: DealStage;
  amount_cents: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  brand_name: string;
  brand_email: string;
  amount_cents: number;
  status: InvoiceStatus;
  due_date: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

interface DealsResponse { items: Deal[]; cursor: string | null; }
interface InvoicesResponse { items: Invoice[]; cursor: string | null; }

// ── Stage Config ──────────────────────────────────────────────────────
const STAGE_ORDER: DealStage[] = ['lead', 'outreach', 'negotiation', 'contract', 'production', 'review', 'live', 'done'];
const ACTIVE_STAGES: DealStage[] = ['lead', 'outreach', 'negotiation', 'contract', 'production', 'review', 'live'];
const STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead', outreach: 'Outreach', negotiation: 'Negotiation', contract: 'Contract',
  production: 'Production', review: 'Review', live: 'Live', done: 'Done', lost: 'Lost',
};

function nextStage(current: DealStage): DealStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

// ── Helpers ───────────────────────────────────────────────────────────
function extractApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'body' in err) {
    const body = (err as any).body;
    if (body?.error?.details?.length) {
      return body.error.details.map((d: any) => `${d.path}: ${d.message}`).join('\n');
    }
    if (body?.error?.issues?.length) return body.error.issues.map((i: any) => i.message).join(', ');
    if (body?.error?.message && body.error.message !== 'Invalid request data') return body.error.message;
    if (typeof body?.error === 'string') return body.error;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Stage / Status Colors ─────────────────────────────────────────────
function stageColor(stage: DealStage, t: ReturnType<typeof useTokens>): string {
  const map: Record<DealStage, string> = {
    lead: isGlass(t) ? '#6be3ff' : isEditorial(t) ? '#1c4bff' : '#5a78d0',
    outreach: isGlass(t) ? t.violet : isEditorial(t) ? '#c7a9ff' : '#8098db',
    negotiation: isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn,
    contract: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    production: isGlass(t) ? '#6be3ff' : isEditorial(t) ? '#1c4bff' : '#5a78d0',
    review: isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn,
    live: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    done: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    lost: isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad,
  };
  return map[stage];
}

function invoiceStatusColor(status: InvoiceStatus, t: ReturnType<typeof useTokens>): string {
  const map: Record<InvoiceStatus, string> = {
    draft: isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn,
    sent: isGlass(t) ? '#6be3ff' : isEditorial(t) ? '#1c4bff' : '#5a78d0',
    viewed: isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn,
    paid: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    overdue: isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad,
    cancelled: t.muted,
  };
  return map[status];
}

// ── Alert types ──────────────────────────────────────────────────────
interface AlertAction { label: string; style?: 'default' | 'destructive' | 'cancel'; onPress?: () => void; }
interface AlertState { title: string; message: string; actions: AlertAction[]; }

// ── Tab Type ──────────────────────────────────────────────────────────
type Tab = 'deals' | 'invoices';
const ALL_STAGES: DealStage[] = [...STAGE_ORDER, 'lost'];
const ALL_INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];
const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled',
};

// ── Main Component ────────────────────────────────────────────────────
export default function RevenueScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<Tab>('deals');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [alertState, setAlertState] = useState<AlertState | null>(null);

  const showAlert = useCallback((title: string, message: string, actions?: AlertAction[]) => {
    setAlertState({ title, message, actions: actions ?? [{ label: 'OK', style: 'default' }] });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [dealsRes, invoicesRes] = await Promise.all([
        api.get<DealsResponse>('/deals?limit=50'),
        api.get<InvoicesResponse>('/invoices?limit=50'),
      ]);
      setDeals(dealsRes.items ?? []);
      setInvoices(invoicesRes.items ?? []);
    } catch {
      // show empty state
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Deal actions ──────────────────────────────────────────────
  const advanceDeal = useCallback(async (deal: Deal) => {
    const next = nextStage(deal.stage);
    if (!next) return;
    try {
      await api.patch(`/deals/${deal.id}`, { stage: next });
      setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, stage: next } : d));
      setSelectedDeal((prev) => prev?.id === deal.id ? { ...prev, stage: next } : prev);
    } catch (err) {
      showAlert('Error', extractApiError(err));
    }
  }, [showAlert]);

  const markDealLost = useCallback((deal: Deal) => {
    showAlert('Mark as Lost', `Mark "${deal.brand_name}" as lost?`, [
      { label: 'Cancel', style: 'cancel' },
      {
        label: 'Mark Lost', style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/deals/${deal.id}`, { stage: 'lost' });
            setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, stage: 'lost' as DealStage } : d));
            setSelectedDeal((prev) => prev?.id === deal.id ? { ...prev, stage: 'lost' as DealStage } : prev);
          } catch (err) { showAlert('Error', extractApiError(err)); }
        },
      },
    ]);
  }, [showAlert]);

  const deleteDeal = useCallback((deal: Deal) => {
    showAlert('Delete Deal', `Delete "${deal.brand_name}"? This cannot be undone.`, [
      { label: 'Cancel', style: 'cancel' },
      {
        label: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/deals/${deal.id}`);
            setDeals((prev) => prev.filter((d) => d.id !== deal.id));
            setSelectedDeal(null);
          } catch (err) { showAlert('Error', extractApiError(err)); }
        },
      },
    ]);
  }, [showAlert]);

  // ── Invoice actions ───────────────────────────────────────────
  const sendInvoice = useCallback(async (inv: Invoice) => {
    try {
      await api.post(`/invoices/${inv.id}?action=send`, {});
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'sent' as InvoiceStatus } : i));
      setSelectedInvoice((prev) => prev?.id === inv.id ? { ...prev, status: 'sent' as InvoiceStatus } : prev);
    } catch (err) { showAlert('Error', extractApiError(err)); }
  }, [showAlert]);

  const markInvoicePaid = useCallback(async (inv: Invoice) => {
    try {
      await api.post(`/invoices/${inv.id}?action=mark-paid`, {});
      const now = new Date().toISOString();
      setInvoices((prev) => prev.map((i) => i.id === inv.id ? { ...i, status: 'paid' as InvoiceStatus, paid_at: now } : i));
      setSelectedInvoice((prev) => prev?.id === inv.id ? { ...prev, status: 'paid' as InvoiceStatus, paid_at: now } : prev);
    } catch (err) { showAlert('Error', extractApiError(err)); }
  }, [showAlert]);

  const deleteInvoice = useCallback((inv: Invoice) => {
    if (inv.status === 'paid') { showAlert('Cannot Delete', 'Paid invoices cannot be deleted.'); return; }
    showAlert('Delete Invoice', `Delete ${inv.invoice_number}?`, [
      { label: 'Cancel', style: 'cancel' },
      {
        label: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/invoices/${inv.id}`);
            setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
            setSelectedInvoice(null);
          } catch (err) { showAlert('Error', extractApiError(err)); }
        },
      },
    ]);
  }, []);

  // ── KPIs ──────────────────────────────────────────────────────
  const totalEarned = useMemo(
    () => deals.filter((d) => d.stage === 'done').reduce((s, d) => s + d.amount_cents, 0), [deals]);
  const pipeline = useMemo(
    () => deals.filter((d) => ACTIVE_STAGES.includes(d.stage)).reduce((s, d) => s + d.amount_cents, 0), [deals]);
  const outstandingInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length, [invoices]);

  const activeDeals = useMemo(() => deals.filter((d) => ACTIVE_STAGES.includes(d.stage)), [deals]);
  const completedDeals = useMemo(() => deals.filter((d) => d.stage === 'done' || d.stage === 'lost'), [deals]);
  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [invoices]);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accentColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isGlass(t) ? 'transparent' : t.bg }}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isGlass(t) ? 'transparent' : t.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        {/* Page Title */}
        <View style={{ paddingLeft: 56, paddingTop: 14, paddingBottom: 16 }}>
          <Text style={{
            color: isGlass(t) ? t.fg : t.ink,
            fontSize: isGlass(t) ? 34 : isEditorial(t) ? 36 : 32,
            fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
            lineHeight: isGlass(t) ? 38 : isEditorial(t) ? 40 : 36,
            letterSpacing: -0.5,
          }}>
            {'Revenue '}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent }}>Hub</Text>
          </Text>
          <Text style={{ color: muted, fontSize: 10, fontFamily: t.fontBody, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 8 }}>
            Deals & invoices
          </Text>
        </View>

        {/* KPI Row */}
        <SectionHeader number="01" title="Overview" emphasisWord="Overview" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }} style={{ marginBottom: 20 }}>
          <KpiCard label="Total Earned" value={formatCents(totalEarned)} variant="good" />
          <KpiCard label="Pipeline" value={formatCents(pipeline)} variant="accent" />
          <KpiCard label="Outstanding" value={`${outstandingInvoices}`} variant="warn" />
        </ScrollView>

        {/* Tab Pills */}
        <SectionHeader number="02" title="Pipeline" emphasisWord="Pipeline" meta={`${deals.length} total`} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TabPills activeTab={activeTab} onTabChange={setActiveTab} />
          <Pressable
            onPress={() => activeTab === 'deals' ? setShowDealForm(true) : setShowInvoiceForm(true)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.2)' : isEditorial(t) ? t.ink : t.accent,
              width: 36, height: 36, borderRadius: isEditorial(t) ? 2 : 18,
              justifyContent: 'center', alignItems: 'center',
            })}
          >
            <Text style={{ color: isGlass(t) ? t.violet : '#fff', fontSize: 22, fontWeight: '300', lineHeight: 24 }}>+</Text>
          </Pressable>
        </View>

        {/* Tab Content */}
        <View style={{ marginTop: 16 }}>
          {activeTab === 'deals' ? (
            <DealsTab
              activeDeals={activeDeals}
              completedDeals={completedDeals}
              onAdvance={advanceDeal}
              onMarkLost={markDealLost}
              onDelete={deleteDeal}
              onPress={setSelectedDeal}
            />
          ) : (
            <InvoicesTab
              invoices={sortedInvoices}
              onSend={sendInvoice}
              onMarkPaid={markInvoicePaid}
              onDelete={deleteInvoice}
              onPress={setSelectedInvoice}
            />
          )}
        </View>
      </ScrollView>

      {/* Create Deal Modal */}
      <CreateDealModal
        visible={showDealForm}
        onClose={() => setShowDealForm(false)}
        onCreated={(deal) => { setDeals((prev) => [deal, ...prev]); setShowDealForm(false); }}
      />

      {/* Create Invoice Modal */}
      <CreateInvoiceModal
        visible={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        onCreated={(inv) => { setInvoices((prev) => [inv, ...prev]); setShowInvoiceForm(false); }}
      />

      {/* Deal Detail Modal */}
      <DealDetailModal
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onAdvance={advanceDeal}
        onMarkLost={markDealLost}
        onDelete={deleteDeal}
        onUpdate={(updated) => {
          setDeals((prev) => prev.map((d) => d.id === updated.id ? updated : d));
          setSelectedDeal(updated);
        }}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onSend={sendInvoice}
        onMarkPaid={markInvoicePaid}
        onDelete={deleteInvoice}
        onUpdate={(updated) => {
          setInvoices((prev) => prev.map((i) => i.id === updated.id ? updated : i));
          setSelectedInvoice(updated);
        }}
      />

      {/* Themed Alert */}
      <ThemedAlertModal alert={alertState} onDismiss={() => setAlertState(null)} />
    </View>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────
function KpiCard({ label, value, variant }: { label: string; value: string; variant: 'good' | 'accent' | 'warn' }) {
  const t = useTokens();
  const valueColor =
    variant === 'good' ? (isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good)
    : variant === 'accent' ? (isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent)
    : (isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn);

  return (
    <ThemedCard padding={16} elevation="sm">
      <View style={{ minWidth: 110 }}>
        <Text style={{ fontFamily: t.fontBody, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>{label}</Text>
        <Text style={{ fontFamily: t.fontDisplay, fontSize: 32, color: valueColor, letterSpacing: -1 }}>{value}</Text>
      </View>
    </ThemedCard>
  );
}

// ── Tab Pills ─────────────────────────────────────────────────────────
function TabPills({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const t = useTokens();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['deals', 'invoices'] as Tab[]).map((key) => {
        const selected = activeTab === key;
        return (
          <Pressable key={key} onPress={() => onTabChange(key)}>
            <View style={tabPillStyle(t, selected)}>
              <Text style={tabPillTextStyle(t, selected)}>{key === 'deals' ? 'Deals' : 'Invoices'}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function tabPillStyle(t: ReturnType<typeof useTokens>, selected: boolean) {
  if (isGlass(t)) return { backgroundColor: selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: selected ? t.violet : 'rgba(255,255,255,0.12)', borderRadius: t.radiusMd, paddingHorizontal: 16, paddingVertical: 8 };
  if (isEditorial(t)) return { backgroundColor: selected ? t.ink : t.surface, borderWidth: t.border.width, borderColor: t.border.color, borderRadius: 0, paddingHorizontal: 16, paddingVertical: 8 };
  const nt = t as NeumorphicTheme;
  return { backgroundColor: nt.surface, borderRadius: nt.radiusMd, paddingHorizontal: 16, paddingVertical: 8, ...(Platform.OS === 'ios' ? (selected ? nt.shadowOutSm.inner : nt.shadowOutSm.outer) : (selected ? { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.4)', borderLeftColor: 'rgba(167,173,184,0.4)', borderBottomColor: 'rgba(255,255,255,0.6)', borderRightColor: 'rgba(255,255,255,0.6)' } : neumorphicRaisedStyle(nt, 'sm'))) };
}

function tabPillTextStyle(t: ReturnType<typeof useTokens>, selected: boolean) {
  if (isGlass(t)) return { fontFamily: t.fontBodySemibold, fontSize: 13, color: selected ? t.violet : t.muted };
  if (isEditorial(t)) return { fontFamily: t.fontBodySemibold, fontSize: 13, color: selected ? t.bg : t.ink };
  return { fontFamily: t.fontBodySemibold, fontSize: 13, color: selected ? t.accent : t.muted };
}

// ── Badge ─────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  const t = useTokens();
  const bg = isGlass(t) ? `${color}22` : isEditorial(t) ? color : `${color}20`;
  const fg = isGlass(t) ? color : isEditorial(t) ? (color === t.lime || color === t.mustard ? t.ink : t.bg) : color;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: isEditorial(t) ? 0 : t.radiusSm, ...(isEditorial(t) ? { borderWidth: t.border.width, borderColor: t.border.color } : {}) }}>
      <Text style={{ fontFamily: t.fontBody, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', color: fg }}>{label}</Text>
    </View>
  );
}

// ── Deals Tab ─────────────────────────────────────────────────────────
function DealsTab({ activeDeals, completedDeals, onAdvance, onMarkLost, onDelete, onPress }: {
  activeDeals: Deal[]; completedDeals: Deal[];
  onAdvance: (d: Deal) => void; onMarkLost: (d: Deal) => void; onDelete: (d: Deal) => void; onPress: (d: Deal) => void;
}) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;

  if (activeDeals.length === 0 && completedDeals.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ fontFamily: t.fontDisplay, fontSize: 18, color: fg, textAlign: 'center', marginBottom: 6 }}>No deals yet</Text>
        <Text style={{ fontFamily: t.fontBody, fontSize: 13, color: t.muted, textAlign: 'center' }}>
          Tap + to create your first deal and start tracking your brand partnerships.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {activeDeals.length > 0 && (
        <View>
          <SectionHeader number="03" title="Active deals" emphasisWord="Active" meta={`${activeDeals.length}`} />
          <View style={{ gap: 10 }}>
            {activeDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onAdvance={onAdvance} onMarkLost={onMarkLost} onDelete={onDelete} onPress={onPress} />
            ))}
          </View>
        </View>
      )}
      {completedDeals.length > 0 && (
        <View>
          <SectionHeader number="04" title="Completed" emphasisWord="Completed" meta={`${completedDeals.length}`} />
          <View style={{ gap: 10 }}>
            {completedDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onAdvance={onAdvance} onMarkLost={onMarkLost} onDelete={onDelete} onPress={onPress} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Deal Card ─────────────────────────────────────────────────────────
function DealCard({ deal, onAdvance, onMarkLost, onDelete, onPress }: {
  deal: Deal; onAdvance: (d: Deal) => void; onMarkLost: (d: Deal) => void; onDelete: (d: Deal) => void; onPress: (d: Deal) => void;
}) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const sc = stageColor(deal.stage, t);
  const next = nextStage(deal.stage);
  const isTerminal = deal.stage === 'done' || deal.stage === 'lost';

  return (
    <Pressable onPress={() => onPress(deal)}>
    <ThemedCard padding={14} elevation="sm">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 15, color: fg }} numberOfLines={1}>{deal.brand_name}</Text>
          {deal.title ? <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: muted, marginTop: 2 }} numberOfLines={1}>{deal.title}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
            <Badge label={STAGE_LABELS[deal.stage]} color={sc} />
          </View>
        </View>
        <Text style={{ fontFamily: t.fontBodyBold, fontSize: 16, color: fg, letterSpacing: -0.3 }}>{formatCents(deal.amount_cents)}</Text>
      </View>

      {/* Action buttons */}
      {!isTerminal && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker }}>
          {next && (
            <Pressable
              onPress={() => onAdvance(deal)}
              style={({ pressed }) => ({
                flex: 1, paddingVertical: 8, borderRadius: isEditorial(t) ? 2 : 10, alignItems: 'center',
                backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.ink : t.accent,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 12, color: isGlass(t) ? t.violet : '#fff' }}>
                {STAGE_LABELS[next]}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => onMarkLost(deal)}
            style={({ pressed }) => ({
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: isEditorial(t) ? 2 : 10, alignItems: 'center',
              backgroundColor: isGlass(t) ? 'rgba(255,113,168,0.1)' : 'rgba(200,60,60,0.1)',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 12, color: isGlass(t) ? t.bad : '#c87878' }}>Lost</Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(deal)}
            style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 10, opacity: pressed ? 0.5 : 0.6, alignItems: 'center', justifyContent: 'center' })}
          >
            <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: muted }}>Del</Text>
          </Pressable>
        </View>
      )}
    </ThemedCard>
    </Pressable>
  );
}

// ── Invoices Tab ──────────────────────────────────────────────────────
function InvoicesTab({ invoices, onSend, onMarkPaid, onDelete, onPress }: {
  invoices: Invoice[];
  onSend: (i: Invoice) => void; onMarkPaid: (i: Invoice) => void; onDelete: (i: Invoice) => void; onPress: (i: Invoice) => void;
}) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;

  if (invoices.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{ fontFamily: t.fontDisplay, fontSize: 18, color: fg, textAlign: 'center', marginBottom: 6 }}>No invoices yet</Text>
        <Text style={{ fontFamily: t.fontBody, fontSize: 13, color: t.muted, textAlign: 'center' }}>
          Tap + to create your first invoice.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {invoices.map((inv) => (
        <InvoiceCard key={inv.id} invoice={inv} onSend={onSend} onMarkPaid={onMarkPaid} onDelete={onDelete} onPress={onPress} />
      ))}
    </View>
  );
}

// ── Invoice Card ──────────────────────────────────────────────────────
function InvoiceCard({ invoice, onSend, onMarkPaid, onDelete, onPress }: {
  invoice: Invoice;
  onSend: (i: Invoice) => void; onMarkPaid: (i: Invoice) => void; onDelete: (i: Invoice) => void; onPress: (i: Invoice) => void;
}) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const sc = invoiceStatusColor(invoice.status, t);

  const canSend = invoice.status === 'draft';
  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'overdue';
  const canDelete = invoice.status !== 'paid';

  return (
    <Pressable onPress={() => onPress(invoice)}>
    <ThemedCard padding={14} elevation="sm">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: t.fontBody, fontSize: 12, color: muted }}>{invoice.invoice_number}</Text>
            <Badge label={invoice.status} color={sc} />
          </View>
          <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 15, color: fg, marginTop: 4 }} numberOfLines={1}>{invoice.brand_name}</Text>
          {invoice.due_date && <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: muted, marginTop: 4 }}>Due {formatDate(invoice.due_date)}</Text>}
        </View>
        <Text style={{ fontFamily: t.fontBodyBold, fontSize: 16, color: fg, letterSpacing: -0.3 }}>{formatCents(invoice.amount_cents)}</Text>
      </View>

      {/* Action buttons */}
      {(canSend || canMarkPaid || canDelete) && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker }}>
          {canSend && (
            <Pressable
              onPress={() => onSend(invoice)}
              style={({ pressed }) => ({
                flex: 1, paddingVertical: 8, borderRadius: isEditorial(t) ? 2 : 10, alignItems: 'center',
                backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.ink : t.accent,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 12, color: isGlass(t) ? t.violet : '#fff' }}>Mark Sent</Text>
            </Pressable>
          )}
          {canMarkPaid && (
            <Pressable
              onPress={() => onMarkPaid(invoice)}
              style={({ pressed }) => ({
                flex: 1, paddingVertical: 8, borderRadius: isEditorial(t) ? 2 : 10, alignItems: 'center',
                backgroundColor: isGlass(t) ? 'rgba(138,255,193,0.12)' : 'rgba(34,197,94,0.15)',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 12, color: isGlass(t) ? t.good : '#22c55e' }}>Mark Paid</Text>
            </Pressable>
          )}
          {canDelete && (
            <Pressable
              onPress={() => onDelete(invoice)}
              style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 10, opacity: pressed ? 0.5 : 0.6, justifyContent: 'center' })}
            >
              <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: muted }}>Del</Text>
            </Pressable>
          )}
        </View>
      )}
    </ThemedCard>
    </Pressable>
  );
}

// ── Deal Detail Modal ────────────────────────────────────────────────
function DealDetailModal({ deal, onClose, onAdvance, onMarkLost, onDelete, onUpdate }: {
  deal: Deal | null; onClose: () => void;
  onAdvance: (d: Deal) => void; onMarkLost: (d: Deal) => void; onDelete: (d: Deal) => void;
  onUpdate: (d: Deal) => void;
}) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<DealStage>('lead');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    if (!deal) return;
    setBrandName(deal.brand_name);
    setTitle(deal.title);
    setAmount(String(deal.amount_cents / 100));
    setEmail(deal.brand_contact_email ?? '');
    setDescription(deal.description ?? '');
    setStage(deal.stage);
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!deal || !brandName.trim() || !title.trim()) { setError('Brand name and title are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch<Deal>(`/deals/${deal.id}`, {
        brand_name: brandName.trim(),
        title: title.trim(),
        brand_contact_email: email.trim() || undefined,
        amount_cents: Math.round(parseFloat(amount || '0') * 100),
        description: description.trim() || undefined,
        stage,
      });
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!deal) return null;

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const sc = stageColor(deal.stage, t);
  const next = nextStage(deal.stage);
  const isTerminal = deal.stage === 'done' || deal.stage === 'lost';
  const modalBg = isGlass(t) ? 'rgba(18,10,36,0.97)' : isEditorial(t) ? t.bg : t.bg;
  const divider = isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker;
  const inputBg = isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surface : t.surfaceLighter;
  const inputBorder = isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent';
  const inputStyle = {
    backgroundColor: inputBg,
    borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
    borderColor: inputBorder,
    borderRadius: isEditorial(t) ? 2 : 12,
    padding: 14, fontFamily: t.fontBody, fontSize: 14, color: fg,
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: modalBg }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: fg }}>
              {editing ? 'Edit Deal' : 'Deal Details'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {!editing && (
                <Pressable onPress={startEdit} hitSlop={12}>
                  <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 16, color: isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent }}>Edit</Text>
                </Pressable>
              )}
              <Pressable onPress={() => { setEditing(false); onClose(); }} hitSlop={12}>
                <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 16, color: muted }}>
                  {editing ? 'Cancel' : 'Close'}
                </Text>
              </Pressable>
            </View>
          </View>

          {editing ? (
            <View style={{ gap: 14 }}>
              <View>
                <Kicker>Brand Name *</Kicker>
                <TextInput value={brandName} onChangeText={setBrandName} style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Deal Title *</Kicker>
                <TextInput value={title} onChangeText={setTitle} style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Amount ($)</Kicker>
                <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Contact Email</Kicker>
                <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Description</Kicker>
                <TextInput value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ ...inputStyle, minHeight: 80, textAlignVertical: 'top' }} placeholderTextColor={muted} />
              </View>
              <StagePicker value={stage} onChange={setStage} />
              {error ? <Text style={{ fontFamily: t.fontBody, fontSize: 13, color: isGlass(t) ? t.bad : '#c44' }}>{error}</Text> : null}
              <Button label={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} disabled={saving} />
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 20, gap: 4 }}>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 28, color: fg, letterSpacing: -0.5 }}>{deal.brand_name}</Text>
                <Text style={{ fontFamily: t.fontBody, fontSize: 15, color: muted }}>{deal.title}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Badge label={STAGE_LABELS[deal.stage]} color={sc} />
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 26, color: fg, letterSpacing: -0.5 }}>{formatCents(deal.amount_cents)}</Text>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: divider, paddingTop: 16, gap: 14 }}>
                {deal.brand_contact_email && <DetailRow label="Contact Email" value={deal.brand_contact_email} />}
                {deal.description && <DetailRow label="Description" value={deal.description} />}
                <DetailRow label="Created" value={new Date(deal.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
                <DetailRow label="Last Updated" value={new Date(deal.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
              </View>

              <View style={{ gap: 10, marginTop: 28 }}>
                {!isTerminal && next && (
                  <Pressable
                    onPress={() => onAdvance(deal)}
                    style={({ pressed }) => ({
                      paddingVertical: 14, borderRadius: isEditorial(t) ? 2 : 12, alignItems: 'center',
                      backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.2)' : isEditorial(t) ? t.ink : t.accent,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 14, color: isGlass(t) ? t.violet : '#fff' }}>
                      Advance to {STAGE_LABELS[next]}
                    </Text>
                  </Pressable>
                )}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {!isTerminal && (
                    <Pressable
                      onPress={() => onMarkLost(deal)}
                      style={({ pressed }) => ({
                        flex: 1, paddingVertical: 12, borderRadius: isEditorial(t) ? 2 : 12, alignItems: 'center',
                        backgroundColor: isGlass(t) ? 'rgba(255,113,168,0.1)' : 'rgba(200,60,60,0.1)',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 13, color: isGlass(t) ? t.bad : '#c87878' }}>Mark Lost</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => onDelete(deal)}
                    style={({ pressed }) => ({
                      flex: 1, paddingVertical: 12, borderRadius: isEditorial(t) ? 2 : 12, alignItems: 'center',
                      backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 13, color: muted }}>Delete Deal</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Invoice Detail Modal ─────────────────────────────────────────────
function InvoiceDetailModal({ invoice, onClose, onSend, onMarkPaid, onDelete, onUpdate }: {
  invoice: Invoice | null; onClose: () => void;
  onSend: (i: Invoice) => void; onMarkPaid: (i: Invoice) => void; onDelete: (i: Invoice) => void;
  onUpdate: (i: Invoice) => void;
}) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandEmail, setBrandEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const startEdit = () => {
    if (!invoice) return;
    setBrandName(invoice.brand_name);
    setBrandEmail(invoice.brand_email);
    setNotes(invoice.notes ?? '');
    setAmount(String(invoice.amount_cents / 100));
    setDueDate(invoice.due_date ? invoice.due_date.split('T')[0] : '');
    setStatus(invoice.status);
    setError('');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!invoice || !brandName.trim() || !brandEmail.trim()) { setError('Brand name and email are required.'); return; }
    const cents = Math.round(parseFloat(amount || '0') * 100);
    if (cents < 1) { setError('Amount must be greater than zero.'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        brand_name: brandName.trim(),
        brand_email: brandEmail.trim(),
        notes: notes.trim() || undefined,
        amount_cents: cents,
        status,
      };
      if (dueDate.trim()) body.due_date = new Date(dueDate.trim()).toISOString();
      const updated = await api.patch<Invoice>(`/invoices/${invoice.id}`, body);
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!invoice) return null;

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const sc = invoiceStatusColor(invoice.status, t);
  const canSend = invoice.status === 'draft';
  const canMarkPaid = invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'overdue';
  const canDelete = invoice.status !== 'paid';
  const modalBg = isGlass(t) ? 'rgba(18,10,36,0.97)' : isEditorial(t) ? t.bg : t.bg;
  const divider = isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker;
  const inputBg = isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surface : t.surfaceLighter;
  const inputBorder = isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent';
  const inputStyle = {
    backgroundColor: inputBg,
    borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
    borderColor: inputBorder,
    borderRadius: isEditorial(t) ? 2 : 12,
    padding: 14, fontFamily: t.fontBody, fontSize: 14, color: fg,
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: modalBg }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: fg }}>
              {editing ? 'Edit Invoice' : 'Invoice Details'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {!editing && (
                <Pressable onPress={startEdit} hitSlop={12}>
                  <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 16, color: isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent }}>Edit</Text>
                </Pressable>
              )}
              <Pressable onPress={() => { setEditing(false); onClose(); }} hitSlop={12}>
                <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 16, color: muted }}>
                  {editing ? 'Cancel' : 'Close'}
                </Text>
              </Pressable>
            </View>
          </View>

          {editing ? (
            <View style={{ gap: 14 }}>
              <View>
                <Kicker>Brand Name *</Kicker>
                <TextInput value={brandName} onChangeText={setBrandName} style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Brand Email *</Kicker>
                <TextInput value={brandEmail} onChangeText={setBrandEmail} keyboardType="email-address" autoCapitalize="none" style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Amount ($) *</Kicker>
                <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Due Date (YYYY-MM-DD)</Kicker>
                <TextInput value={dueDate} onChangeText={setDueDate} placeholder="2026-06-15" style={inputStyle} placeholderTextColor={muted} />
              </View>
              <View>
                <Kicker>Notes</Kicker>
                <TextInput value={notes} onChangeText={setNotes} multiline numberOfLines={3} style={{ ...inputStyle, minHeight: 80, textAlignVertical: 'top' }} placeholderTextColor={muted} />
              </View>
              <InvoiceStatusPicker value={status} onChange={setStatus} />
              {error ? <Text style={{ fontFamily: t.fontBody, fontSize: 13, color: isGlass(t) ? t.bad : '#c44' }}>{error}</Text> : null}
              <Button label={saving ? 'Saving...' : 'Save Changes'} onPress={handleSave} disabled={saving} />
            </View>
          ) : (
            <>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: t.fontBody, fontSize: 13, color: muted, marginBottom: 4 }}>{invoice.invoice_number}</Text>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 28, color: fg, letterSpacing: -0.5 }}>{invoice.brand_name}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Badge label={invoice.status} color={sc} />
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 26, color: fg, letterSpacing: -0.5 }}>{formatCents(invoice.amount_cents)}</Text>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: divider, paddingTop: 16, gap: 14 }}>
                <DetailRow label="Brand Email" value={invoice.brand_email} />
                {invoice.due_date && <DetailRow label="Due Date" value={new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />}
                {invoice.notes && <DetailRow label="Notes" value={invoice.notes} />}
                {invoice.paid_at && <DetailRow label="Paid On" value={new Date(invoice.paid_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />}
                <DetailRow label="Created" value={new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} />
              </View>

              {(canSend || canMarkPaid || canDelete) && (
                <View style={{ gap: 10, marginTop: 28 }}>
                  {canSend && (
                    <Pressable
                      onPress={() => onSend(invoice)}
                      style={({ pressed }) => ({
                        paddingVertical: 14, borderRadius: isEditorial(t) ? 2 : 12, alignItems: 'center',
                        backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.2)' : isEditorial(t) ? t.ink : t.accent,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 14, color: isGlass(t) ? t.violet : '#fff' }}>Mark as Sent</Text>
                    </Pressable>
                  )}
                  {canMarkPaid && (
                    <Pressable
                      onPress={() => onMarkPaid(invoice)}
                      style={({ pressed }) => ({
                        paddingVertical: 14, borderRadius: isEditorial(t) ? 2 : 12, alignItems: 'center',
                        backgroundColor: isGlass(t) ? 'rgba(138,255,193,0.12)' : 'rgba(34,197,94,0.15)',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 14, color: isGlass(t) ? t.good : '#22c55e' }}>Mark as Paid</Text>
                    </Pressable>
                  )}
                  {canDelete && (
                    <Pressable
                      onPress={() => onDelete(invoice)}
                      style={({ pressed }) => ({
                        paddingVertical: 12, borderRadius: isEditorial(t) ? 2 : 12, alignItems: 'center',
                        backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 13, color: muted }}>Delete Invoice</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Detail Row ───────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  return (
    <View>
      <Text style={{ fontFamily: t.fontBody, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontFamily: t.fontBody, fontSize: 14, color: fg, lineHeight: 20 }}>{value}</Text>
    </View>
  );
}

// ── Themed Alert Modal ───────────────────────────────────────────────
function ThemedAlertModal({ alert, onDismiss }: { alert: AlertState | null; onDismiss: () => void }) {
  const t = useTokens();
  if (!alert) return null;

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const modalBg = isGlass(t) ? 'rgba(18,10,36,0.97)' : isEditorial(t) ? t.bg : t.bg;
  const cardBg = isGlass(t) ? 'rgba(40,20,80,0.95)' : isEditorial(t) ? t.surface : t.surfaceLighter;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;
  const danger = isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad;

  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{
          width: '100%', maxWidth: 340, backgroundColor: cardBg,
          borderRadius: isEditorial(t) ? 2 : 16, padding: 24,
          borderWidth: isGlass(t) ? 1 : isEditorial(t) ? 1.5 : 0,
          borderColor: isGlass(t) ? 'rgba(255,255,255,0.1)' : isEditorial(t) ? t.border.color : 'transparent',
        }}>
          <Text style={{ fontFamily: t.fontDisplay, fontSize: 20, color: fg, marginBottom: 8 }}>{alert.title}</Text>
          <Text style={{ fontFamily: t.fontBody, fontSize: 14, color: muted, lineHeight: 20, marginBottom: 24 }}>{alert.message}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
            {alert.actions.map((action, i) => {
              const isCancel = action.style === 'cancel';
              const isDestructive = action.style === 'destructive';
              return (
                <Pressable
                  key={i}
                  onPress={() => { onDismiss(); action.onPress?.(); }}
                  style={({ pressed }) => ({
                    paddingVertical: 10, paddingHorizontal: 18,
                    borderRadius: isEditorial(t) ? 2 : 10,
                    backgroundColor: isCancel ? 'transparent' : isDestructive ? (isGlass(t) ? 'rgba(255,113,168,0.15)' : 'rgba(200,60,60,0.12)') : (isGlass(t) ? 'rgba(139,92,246,0.2)' : isEditorial(t) ? t.ink : t.accent),
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    fontFamily: t.fontBodySemibold, fontSize: 14,
                    color: isCancel ? muted : isDestructive ? danger : (isGlass(t) ? accent : isEditorial(t) ? t.bg : '#fff'),
                  }}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Stage Picker ─────────────────────────────────────────────────────
function StagePicker({ value, onChange }: { value: DealStage; onChange: (s: DealStage) => void }) {
  const t = useTokens();
  const muted = t.muted;
  return (
    <View>
      <Kicker>Stage</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {ALL_STAGES.map((stage) => {
          const selected = stage === value;
          const sc = stageColor(stage, t);
          return (
            <Pressable key={stage} onPress={() => onChange(stage)}>
              <View style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: isEditorial(t) ? 0 : 8,
                backgroundColor: selected ? `${sc}30` : (isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surface : t.surfaceLighter),
                borderWidth: selected ? 1.5 : isEditorial(t) ? 1 : 0,
                borderColor: selected ? sc : isEditorial(t) ? t.border.color : 'transparent',
              }}>
                <Text style={{
                  fontFamily: t.fontBody, fontSize: 11, letterSpacing: 0.5,
                  color: selected ? sc : muted,
                }}>
                  {STAGE_LABELS[stage]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Invoice Status Picker ────────────────────────────────────────────
function InvoiceStatusPicker({ value, onChange }: { value: InvoiceStatus; onChange: (s: InvoiceStatus) => void }) {
  const t = useTokens();
  const muted = t.muted;
  return (
    <View>
      <Kicker>Status</Kicker>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {ALL_INVOICE_STATUSES.map((status) => {
          const selected = status === value;
          const sc = invoiceStatusColor(status, t);
          return (
            <Pressable key={status} onPress={() => onChange(status)}>
              <View style={{
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: isEditorial(t) ? 0 : 8,
                backgroundColor: selected ? `${sc}30` : (isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surface : t.surfaceLighter),
                borderWidth: selected ? 1.5 : isEditorial(t) ? 1 : 0,
                borderColor: selected ? sc : isEditorial(t) ? t.border.color : 'transparent',
              }}>
                <Text style={{
                  fontFamily: t.fontBody, fontSize: 11, letterSpacing: 0.5,
                  color: selected ? sc : muted,
                }}>
                  {INVOICE_STATUS_LABELS[status]}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Create Deal Modal ─────────────────────────────────────────────────
function CreateDealModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (deal: Deal) => void }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const inputBg = isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surface : t.surfaceLighter;
  const inputBorder = isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent';

  const [brandName, setBrandName] = useState('');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setBrandName(''); setTitle(''); setAmount(''); setEmail(''); setDescription(''); setError(''); };

  const handleCreate = async () => {
    if (!brandName.trim() || !title.trim()) { setError('Brand name and title are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const deal = await api.post<Deal>('/deals', {
        brand_name: brandName.trim(),
        title: title.trim(),
        brand_contact_email: email.trim() || undefined,
        amount_cents: Math.round(parseFloat(amount || '0') * 100),
        description: description.trim() || undefined,
        stage: 'lead',
      });
      reset();
      onCreated(deal);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: inputBg,
    borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
    borderColor: inputBorder,
    borderRadius: isEditorial(t) ? 2 : 14,
    color: fg,
    fontFamily: t.fontBody,
    fontSize: 14,
    padding: 12,
    marginBottom: 12,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: isGlass(t) ? '#0f0a20' : isEditorial(t) ? t.bg : t.bg,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
          maxHeight: '85%',
        }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: fg }}>New Deal</Text>
              <Pressable onPress={() => { reset(); onClose(); }} hitSlop={10}>
                <Text style={{ fontFamily: t.fontBody, fontSize: 16, color: muted }}>Cancel</Text>
              </Pressable>
            </View>

            <Kicker style={{ marginBottom: 6 }}>Brand name *</Kicker>
            <TextInput style={inputStyle} value={brandName} onChangeText={setBrandName} placeholder="Acme Inc." placeholderTextColor={muted} />

            <Kicker style={{ marginBottom: 6 }}>Deal title *</Kicker>
            <TextInput style={inputStyle} value={title} onChangeText={setTitle} placeholder="Summer campaign" placeholderTextColor={muted} />

            <Kicker style={{ marginBottom: 6 }}>Amount ($)</Kicker>
            <TextInput style={inputStyle} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={muted} keyboardType="decimal-pad" />

            <Kicker style={{ marginBottom: 6 }}>Contact email</Kicker>
            <TextInput style={inputStyle} value={email} onChangeText={setEmail} placeholder="contact@brand.com" placeholderTextColor={muted} keyboardType="email-address" autoCapitalize="none" />

            <Kicker style={{ marginBottom: 6 }}>Description</Kicker>
            <TextInput style={{ ...inputStyle, minHeight: 80, textAlignVertical: 'top' }} value={description} onChangeText={setDescription} placeholder="Deal details..." placeholderTextColor={muted} multiline />

            {error ? <Text style={{ color: isGlass(t) ? t.bad : '#c87878', fontSize: 12, fontFamily: t.fontBody, marginBottom: 12 }}>{error}</Text> : null}

            <Button label={saving ? 'Creating...' : 'Create Deal'} onPress={handleCreate} disabled={saving} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Create Invoice Modal ──────────────────────────────────────────────
function CreateInvoiceModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (inv: Invoice) => void }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const inputBg = isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surface : t.surfaceLighter;
  const inputBorder = isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent';

  const [brandName, setBrandName] = useState('');
  const [brandEmail, setBrandEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setBrandName(''); setBrandEmail(''); setAmount(''); setNotes(''); setError(''); };

  const handleCreate = async () => {
    if (!brandName.trim() || !brandEmail.trim() || !amount.trim()) { setError('Brand name, email, and amount are required.'); return; }
    const cents = Math.round(parseFloat(amount) * 100);
    if (cents <= 0) { setError('Amount must be greater than $0.'); return; }
    setSaving(true);
    setError('');
    try {
      const dueDate = new Date(Date.now() + 30 * 86400000).toISOString();
      const inv = await api.post<Invoice>('/invoices', {
        brand_name: brandName.trim(),
        brand_email: brandEmail.trim(),
        amount_cents: cents,
        due_date: dueDate,
        notes: notes.trim() || undefined,
      });
      reset();
      onCreated(inv);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    backgroundColor: inputBg,
    borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
    borderColor: inputBorder,
    borderRadius: isEditorial(t) ? 2 : 14,
    color: fg,
    fontFamily: t.fontBody,
    fontSize: 14,
    padding: 12,
    marginBottom: 12,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          backgroundColor: isGlass(t) ? '#0f0a20' : isEditorial(t) ? t.bg : t.bg,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
          maxHeight: '85%',
        }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: fg }}>New Invoice</Text>
              <Pressable onPress={() => { reset(); onClose(); }} hitSlop={10}>
                <Text style={{ fontFamily: t.fontBody, fontSize: 16, color: muted }}>Cancel</Text>
              </Pressable>
            </View>

            <Kicker style={{ marginBottom: 6 }}>Brand name *</Kicker>
            <TextInput style={inputStyle} value={brandName} onChangeText={setBrandName} placeholder="Acme Inc." placeholderTextColor={muted} />

            <Kicker style={{ marginBottom: 6 }}>Brand email *</Kicker>
            <TextInput style={inputStyle} value={brandEmail} onChangeText={setBrandEmail} placeholder="billing@brand.com" placeholderTextColor={muted} keyboardType="email-address" autoCapitalize="none" />

            <Kicker style={{ marginBottom: 6 }}>Amount ($) *</Kicker>
            <TextInput style={inputStyle} value={amount} onChangeText={setAmount} placeholder="500.00" placeholderTextColor={muted} keyboardType="decimal-pad" />

            <Kicker style={{ marginBottom: 6 }}>Notes</Kicker>
            <TextInput style={{ ...inputStyle, minHeight: 80, textAlignVertical: 'top' }} value={notes} onChangeText={setNotes} placeholder="Payment terms, deliverables..." placeholderTextColor={muted} multiline />

            <Text style={{ fontFamily: t.fontBody, fontSize: 11, color: muted, marginBottom: 16 }}>
              Due date defaults to 30 days from today. Invoice starts as draft.
            </Text>

            {error ? <Text style={{ color: isGlass(t) ? t.bad : '#c87878', fontSize: 12, fontFamily: t.fontBody, marginBottom: 12 }}>{error}</Text> : null}

            <Button label={saving ? 'Creating...' : 'Create Invoice'} onPress={handleCreate} disabled={saving} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
