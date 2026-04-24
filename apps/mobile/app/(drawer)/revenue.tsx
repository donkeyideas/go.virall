import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';

// ── Types ─────────────────────────────────────────────────────────────
type DealStage = 'lead' | 'pitched' | 'negotiating' | 'contract' | 'delivering' | 'paid' | 'done' | 'lost';
type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue';

interface Deal {
  id: string;
  brand_name: string;
  contact_name: string | null;
  stage: DealStage;
  amount_cents: number;
  due_date: string | null;
  notes: string | null;
  updated_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  brand_name: string;
  amount_cents: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

interface DealsResponse {
  items: Deal[];
  cursor: string | null;
}

interface InvoicesResponse {
  items: Invoice[];
  cursor: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────
const ACTIVE_STAGES: DealStage[] = ['lead', 'pitched', 'negotiating', 'contract', 'delivering'];
const COMPLETED_STAGES: DealStage[] = ['paid', 'done', 'lost'];

function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(1)}K`;
  return `$${dollars.toFixed(0)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Stage / Status Colors ─────────────────────────────────────────────
function useStageColor(stage: DealStage) {
  const t = useTokens();
  const map: Record<DealStage, string> = {
    lead: isGlass(t) ? '#6be3ff' : isEditorial(t) ? '#1c4bff' : '#5a78d0',
    pitched: isGlass(t) ? t.violet : isEditorial(t) ? '#c7a9ff' : '#8098db',
    negotiating: isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn,
    contract: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    delivering: isGlass(t) ? '#6be3ff' : isEditorial(t) ? '#1c4bff' : '#5a78d0',
    paid: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    done: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    lost: isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad,
  };
  return map[stage];
}

function useInvoiceStatusColor(status: InvoiceStatus) {
  const t = useTokens();
  const map: Record<InvoiceStatus, string> = {
    draft: isGlass(t) ? t.muted : isEditorial(t) ? t.muted : t.muted,
    sent: isGlass(t) ? '#6be3ff' : isEditorial(t) ? '#1c4bff' : '#5a78d0',
    viewed: isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn,
    paid: isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good,
    overdue: isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad,
  };
  return map[status];
}

// ── Tab Type ──────────────────────────────────────────────────────────
type Tab = 'deals' | 'invoices';

// ── Main Component ────────────────────────────────────────────────────
export default function RevenueScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<Tab>('deals');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Data Fetching ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [dealsRes, invoicesRes] = await Promise.all([
        api.get<DealsResponse>('/deals?limit=50'),
        api.get<InvoicesResponse>('/invoices?limit=50'),
      ]);
      setDeals(dealsRes.items ?? []);
      setInvoices(invoicesRes.items ?? []);
    } catch (err) {
      // Silently handle — show empty state
      console.warn('[revenue] fetch error:', err);
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

  // ── KPI calculations ─────────────────────────────────────────
  const totalEarned = useMemo(
    () => deals.filter((d) => d.stage === 'paid' || d.stage === 'done').reduce((s, d) => s + d.amount_cents, 0),
    [deals],
  );

  const pipeline = useMemo(
    () => deals.filter((d) => ACTIVE_STAGES.includes(d.stage)).reduce((s, d) => s + d.amount_cents, 0),
    [deals],
  );

  const outstandingInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'paid' && i.status !== 'draft').length,
    [invoices],
  );

  // ── Grouped deals ────────────────────────────────────────────
  const activeDeals = useMemo(
    () => deals.filter((d) => ACTIVE_STAGES.includes(d.stage)),
    [deals],
  );
  const completedDeals = useMemo(
    () => deals.filter((d) => COMPLETED_STAGES.includes(d.stage)),
    [deals],
  );

  // ── Sorted invoices ──────────────────────────────────────────
  const sortedInvoices = useMemo(
    () => [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [invoices],
  );

  // ── Theme-aware colors ────────────────────────────────────────
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accentColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* ── Page Title ────────────────────────────────── */}
        <View style={{ paddingLeft: 56, paddingTop: 14, paddingBottom: 16 }}>
          <Text
            style={{
              color: isGlass(t) ? t.fg : t.ink,
              fontSize: isGlass(t) ? 34 : isEditorial(t) ? 36 : 32,
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
              lineHeight: isGlass(t) ? 38 : isEditorial(t) ? 40 : 36,
              letterSpacing: -0.5,
            }}
          >
            {'Revenue '}
            <Text style={{
              fontFamily: t.fontDisplayItalic,
              color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
            }}>
              Hub
            </Text>
          </Text>
          <Text
            style={{
              color: muted,
              fontSize: isGlass(t) ? 10 : isEditorial(t) ? 10 : 11,
              fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            Deals & invoices
          </Text>
        </View>

        {/* ── KPI Row ───────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
          style={{ marginBottom: 20 }}
        >
          <KpiCard label="Total Earned" value={formatCents(totalEarned)} variant="good" />
          <KpiCard label="Pipeline" value={formatCents(pipeline)} variant="accent" />
          <KpiCard label="Outstanding" value={`${outstandingInvoices}`} variant="warn" />
        </ScrollView>

        {/* ── Tab Pills ─────────────────────────────────── */}
        <TabPills activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── Tab Content ───────────────────────────────── */}
        <View style={{ marginTop: 16 }}>
          {activeTab === 'deals' ? (
            <DealsTab activeDeals={activeDeals} completedDeals={completedDeals} />
          ) : (
            <InvoicesTab invoices={sortedInvoices} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────
function KpiCard({ label, value, variant }: { label: string; value: string; variant: 'good' | 'accent' | 'warn' }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;

  const valueColor =
    variant === 'good'
      ? (isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good)
      : variant === 'accent'
        ? (isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent)
        : (isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn);

  return (
    <ThemedCard padding={16} elevation="sm">
      <View style={{ minWidth: 110 }}>
        <Text style={{
          fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: t.muted,
          marginBottom: 6,
        }}>
          {label}
        </Text>
        <Text style={{
          fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayBold : t.fontDisplayBold,
          fontSize: 32,
          color: valueColor,
          letterSpacing: -1,
        }}>
          {value}
        </Text>
      </View>
    </ThemedCard>
  );
}

// ── Tab Pills ─────────────────────────────────────────────────────────
function TabPills({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const t = useTokens();
  const tabs: { key: Tab; label: string }[] = [
    { key: 'deals', label: 'Deals' },
    { key: 'invoices', label: 'Invoices' },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {tabs.map(({ key, label }) => {
        const selected = activeTab === key;
        return (
          <Pressable key={key} onPress={() => onTabChange(key)}>
            <View style={getTabPillStyle(t, selected)}>
              <Text style={getTabPillTextStyle(t, selected)}>
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function getTabPillStyle(t: ReturnType<typeof useTokens>, selected: boolean) {
  if (isGlass(t)) {
    return {
      backgroundColor: selected ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: selected ? t.violet : 'rgba(255,255,255,0.12)',
      borderRadius: t.radiusMd,
      paddingHorizontal: 16,
      paddingVertical: 8,
    };
  }
  if (isEditorial(t)) {
    return {
      backgroundColor: selected ? t.ink : t.surface,
      borderWidth: t.border.width,
      borderColor: t.border.color,
      borderRadius: 0,
      paddingHorizontal: 16,
      paddingVertical: 8,
      ...(selected ? t.shadowButton : {}),
    };
  }
  // Neumorphic
  const nt = t as NeumorphicTheme;
  const neuStyle = Platform.OS === 'ios'
    ? (selected
      ? { shadowColor: nt.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4 }
      : nt.shadowOutSm.outer)
    : (selected
      ? { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.4)', borderLeftColor: 'rgba(167,173,184,0.4)', borderBottomColor: 'rgba(255,255,255,0.6)', borderRightColor: 'rgba(255,255,255,0.6)' }
      : neumorphicRaisedStyle(nt, 'sm'));
  return {
    backgroundColor: nt.surface,
    borderRadius: nt.radiusMd,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...neuStyle,
  };
}

function getTabPillTextStyle(t: ReturnType<typeof useTokens>, selected: boolean) {
  if (isGlass(t)) {
    return {
      fontFamily: t.fontBodySemibold,
      fontSize: 13,
      color: selected ? t.violet : t.muted,
    };
  }
  if (isEditorial(t)) {
    return {
      fontFamily: t.fontBodySemibold,
      fontSize: 13,
      color: selected ? t.bg : t.ink,
    };
  }
  // Neumorphic
  return {
    fontFamily: t.fontBodySemibold,
    fontSize: 13,
    color: selected ? t.accent : t.muted,
  };
}

// ── Deals Tab ─────────────────────────────────────────────────────────
function DealsTab({ activeDeals, completedDeals }: { activeDeals: Deal[]; completedDeals: Deal[] }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;

  if (activeDeals.length === 0 && completedDeals.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{
          fontFamily: t.fontDisplay,
          fontSize: 18,
          color: fg,
          textAlign: 'center',
          marginBottom: 6,
        }}>
          No deals yet
        </Text>
        <Text style={{
          fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
          fontSize: 13,
          color: t.muted,
          textAlign: 'center',
        }}>
          When brands reach out or you land deals, they will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {activeDeals.length > 0 && (
        <View>
          <Text style={{
            fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: t.muted,
            marginBottom: 10,
          }}>
            Active
          </Text>
          <View style={{ gap: 10 }}>
            {activeDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </View>
        </View>
      )}

      {completedDeals.length > 0 && (
        <View>
          <Text style={{
            fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: t.muted,
            marginBottom: 10,
          }}>
            Completed
          </Text>
          <View style={{ gap: 10 }}>
            {completedDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Deal Card ─────────────────────────────────────────────────────────
function DealCard({ deal }: { deal: Deal }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const stageColor = useStageColor(deal.stage);

  return (
    <ThemedCard padding={14} elevation="sm">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text
            style={{
              fontFamily: isGlass(t) ? t.fontBodySemibold : isEditorial(t) ? t.fontBodySemibold : t.fontBodySemibold,
              fontSize: 15,
              color: fg,
            }}
            numberOfLines={1}
          >
            {deal.brand_name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
            <StageBadge stage={deal.stage} color={stageColor} />
            {deal.due_date && (
              <Text style={{
                fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBody,
                fontSize: 11,
                color: t.muted,
              }}>
                Due {formatDate(deal.due_date)}
              </Text>
            )}
          </View>
        </View>
        <Text style={{
          fontFamily: isGlass(t) ? t.fontBodyBold : isEditorial(t) ? t.fontDisplayBold : t.fontBodyBold,
          fontSize: 16,
          color: fg,
          letterSpacing: -0.3,
        }}>
          {formatCents(deal.amount_cents)}
        </Text>
      </View>
    </ThemedCard>
  );
}

// ── Stage Badge ───────────────────────────────────────────────────────
function StageBadge({ stage, color }: { stage: string; color: string }) {
  const t = useTokens();

  const bgColor = isGlass(t)
    ? `${color}22`
    : isEditorial(t)
      ? color
      : `${color}20`;

  const textColor = isGlass(t)
    ? color
    : isEditorial(t)
      ? (color === t.lime || color === t.mustard ? t.ink : t.bg)
      : color;

  return (
    <View style={{
      backgroundColor: bgColor,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: isEditorial(t) ? 0 : t.radiusSm,
      ...(isEditorial(t) ? { borderWidth: t.border.width, borderColor: t.border.color } : {}),
    }}>
      <Text style={{
        fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: textColor,
      }}>
        {stage}
      </Text>
    </View>
  );
}

// ── Invoices Tab ──────────────────────────────────────────────────────
function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;

  if (invoices.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <Text style={{
          fontFamily: t.fontDisplay,
          fontSize: 18,
          color: fg,
          textAlign: 'center',
          marginBottom: 6,
        }}>
          No invoices yet
        </Text>
        <Text style={{
          fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
          fontSize: 13,
          color: t.muted,
          textAlign: 'center',
        }}>
          Invoices from your deals will appear here once created.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {invoices.map((inv) => (
        <InvoiceCard key={inv.id} invoice={inv} />
      ))}
    </View>
  );
}

// ── Invoice Card ──────────────────────────────────────────────────────
function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const statusColor = useInvoiceStatusColor(invoice.status);

  return (
    <ThemedCard padding={14} elevation="sm">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
              fontSize: 12,
              color: t.muted,
            }}>
              {invoice.invoice_number}
            </Text>
            <StatusBadge status={invoice.status} color={statusColor} />
          </View>
          <Text
            style={{
              fontFamily: isGlass(t) ? t.fontBodySemibold : isEditorial(t) ? t.fontBodySemibold : t.fontBodySemibold,
              fontSize: 15,
              color: fg,
              marginTop: 4,
            }}
            numberOfLines={1}
          >
            {invoice.brand_name}
          </Text>
          {invoice.due_date && (
            <Text style={{
              fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
              fontSize: 11,
              color: t.muted,
              marginTop: 4,
            }}>
              Due {formatDate(invoice.due_date)}
            </Text>
          )}
        </View>
        <Text style={{
          fontFamily: isGlass(t) ? t.fontBodyBold : isEditorial(t) ? t.fontDisplayBold : t.fontBodyBold,
          fontSize: 16,
          color: fg,
          letterSpacing: -0.3,
        }}>
          {formatCents(invoice.amount_cents)}
        </Text>
      </View>
    </ThemedCard>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────
function StatusBadge({ status, color }: { status: string; color: string }) {
  const t = useTokens();

  const bgColor = isGlass(t)
    ? `${color}22`
    : isEditorial(t)
      ? color
      : `${color}20`;

  const textColor = isGlass(t)
    ? color
    : isEditorial(t)
      ? (color === t.lime || color === t.mustard ? t.ink : t.bg)
      : color;

  return (
    <View style={{
      backgroundColor: bgColor,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: isEditorial(t) ? 0 : t.radiusSm,
      ...(isEditorial(t) ? { borderWidth: t.border.width, borderColor: t.border.color } : {}),
    }}>
      <Text style={{
        fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
        fontSize: 10,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: textColor,
      }}>
        {status}
      </Text>
    </View>
  );
}
