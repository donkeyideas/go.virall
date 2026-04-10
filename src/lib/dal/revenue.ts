"use server";

import { createClient } from "@/lib/supabase/server";
import type { Deal, PlatformPayment } from "@/types";

// ── Derived types for revenue data ──

export interface RevenueStats {
  totalEarnings: number;
  pendingPayments: number;
  thisMonth: number;
  lastMonth: number;
  thisMonthChange: number; // percentage change vs last month
  pipelineValue: number;
}

export interface RevenueBySource {
  source: string;
  amount: number;
  count: number;
  color: string;
}

export interface MonthlyRevenue {
  month: string; // "Jan", "Feb", etc.
  year: number;
  earnings: number;
  payments: number;
  deals: number;
}

export interface DealRevenueRow {
  id: string;
  brandName: string;
  totalValue: number;
  paidAmount: number;
  status: Deal["status"];
  pipelineStage: Deal["pipeline_stage"];
  createdAt: string;
}

export interface PaymentHistoryRow {
  id: string;
  amount: number;
  currency: string;
  platformFee: number;
  netAmount: number;
  status: PlatformPayment["status"];
  description: string | null;
  paidAt: string | null;
  createdAt: string;
  dealId: string | null;
  brandName: string | null;
}

export interface RevenueForecast {
  contractedRevenue: number;
  inProgressRevenue: number;
  projectedTotal: number;
  dealCount: number;
  avgDealValue: number;
}

// ── Single auth helper — avoids redundant createClient() + getUser() calls ──

async function getAuthContext(): Promise<{
  userId: string;
  orgId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    orgId: profile?.organization_id ?? null,
    supabase,
  };
}

// ── Revenue Stats ──

export async function getRevenueStats(): Promise<RevenueStats> {
  const ctx = await getAuthContext();
  if (!ctx?.orgId) {
    return {
      totalEarnings: 0,
      pendingPayments: 0,
      thisMonth: 0,
      lastMonth: 0,
      thisMonthChange: 0,
      pipelineValue: 0,
    };
  }

  const { userId, orgId, supabase } = ctx;

  // Get all deals for this org
  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", orgId);

  const allDeals = (deals ?? []) as Deal[];

  // Get all payments where user is payee
  const { data: payments } = await supabase
    .from("platform_payments")
    .select("*")
    .eq("payee_id", userId);

  const allPayments = (payments ?? []) as PlatformPayment[];

  // Calculate total earnings from completed payments
  const completedPayments = allPayments.filter((p) => p.status === "completed");
  const totalEarnings = completedPayments.reduce(
    (sum, p) => sum + (p.amount - p.platform_fee),
    0
  );

  // Add paid amounts from deals
  const dealPaidTotal = allDeals.reduce((sum, d) => sum + d.paid_amount, 0);
  const combinedEarnings = totalEarnings + dealPaidTotal;

  // Pending payments
  const pendingPayments = allPayments
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  // This month vs last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthEarnings = completedPayments
    .filter((p) => p.paid_at && new Date(p.paid_at) >= thisMonthStart)
    .reduce((sum, p) => sum + (p.amount - p.platform_fee), 0);

  // Add deal payments created this month
  const thisMonthDeals = allDeals.filter(
    (d) => new Date(d.created_at) >= thisMonthStart && d.paid_amount > 0
  );
  const thisMonth =
    thisMonthEarnings +
    thisMonthDeals.reduce((sum, d) => sum + d.paid_amount, 0);

  const lastMonthEarnings = completedPayments
    .filter(
      (p) =>
        p.paid_at &&
        new Date(p.paid_at) >= lastMonthStart &&
        new Date(p.paid_at) < thisMonthStart
    )
    .reduce((sum, p) => sum + (p.amount - p.platform_fee), 0);

  const lastMonthDeals = allDeals.filter(
    (d) =>
      new Date(d.created_at) >= lastMonthStart &&
      new Date(d.created_at) < thisMonthStart &&
      d.paid_amount > 0
  );
  const lastMonth =
    lastMonthEarnings +
    lastMonthDeals.reduce((sum, d) => sum + d.paid_amount, 0);

  const thisMonthChange =
    lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

  // Pipeline value: active + negotiation deals
  const pipelineDeals = allDeals.filter(
    (d) =>
      d.status === "active" ||
      d.status === "negotiation" ||
      d.status === "inquiry"
  );
  const pipelineValue = pipelineDeals.reduce(
    (sum, d) => sum + (d.total_value ?? 0),
    0
  );

  return {
    totalEarnings: combinedEarnings,
    pendingPayments,
    thisMonth,
    lastMonth,
    thisMonthChange,
    pipelineValue,
  };
}

// ── Revenue by Sources ──

export async function getRevenueBySources(): Promise<RevenueBySource[]> {
  const ctx = await getAuthContext();
  if (!ctx?.orgId) return [];

  const { userId, orgId, supabase } = ctx;

  // Platform payments
  const { data: payments } = await supabase
    .from("platform_payments")
    .select("*")
    .eq("payee_id", userId)
    .eq("status", "completed");

  const allPayments = (payments ?? []) as PlatformPayment[];

  // Deals
  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", orgId);

  const allDeals = (deals ?? []) as Deal[];

  // Split payments: ones tied to deals vs standalone
  const platformDealPayments = allPayments.filter((p) => p.deal_id);
  const standalonePayments = allPayments.filter((p) => !p.deal_id);

  // External deals (no platform payment, but has paid_amount)
  const dealIdsWithPayments = new Set(
    platformDealPayments.map((p) => p.deal_id)
  );
  const externalDeals = allDeals.filter(
    (d) => d.paid_amount > 0 && !dealIdsWithPayments.has(d.id)
  );

  const platformPaymentTotal = platformDealPayments.reduce(
    (sum, p) => sum + (p.amount - p.platform_fee),
    0
  );
  const standaloneTotal = standalonePayments.reduce(
    (sum, p) => sum + (p.amount - p.platform_fee),
    0
  );
  const externalDealTotal = externalDeals.reduce(
    (sum, d) => sum + d.paid_amount,
    0
  );

  const sources: RevenueBySource[] = [];

  if (platformPaymentTotal > 0) {
    sources.push({
      source: "Platform Deals",
      amount: platformPaymentTotal,
      count: platformDealPayments.length,
      color: "var(--color-editorial-blue)",
    });
  }

  if (standaloneTotal > 0) {
    sources.push({
      source: "Direct Payments",
      amount: standaloneTotal,
      count: standalonePayments.length,
      color: "var(--color-editorial-green)",
    });
  }

  if (externalDealTotal > 0) {
    sources.push({
      source: "External Deals",
      amount: externalDealTotal,
      count: externalDeals.length,
      color: "var(--color-editorial-red)",
    });
  }

  // If all empty, return a default showing 0
  if (sources.length === 0) {
    sources.push(
      {
        source: "Platform Deals",
        amount: 0,
        count: 0,
        color: "var(--color-editorial-blue)",
      },
      {
        source: "Direct Payments",
        amount: 0,
        count: 0,
        color: "var(--color-editorial-green)",
      },
      {
        source: "External Deals",
        amount: 0,
        count: 0,
        color: "var(--color-editorial-red)",
      }
    );
  }

  return sources;
}

// ── Monthly Revenue ──

export async function getMonthlyRevenue(months = 12): Promise<MonthlyRevenue[]> {
  const ctx = await getAuthContext();
  if (!ctx?.orgId) return [];

  const { userId, orgId, supabase } = ctx;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  // Payments
  const { data: payments } = await supabase
    .from("platform_payments")
    .select("*")
    .eq("payee_id", userId)
    .eq("status", "completed")
    .gte("paid_at", cutoff.toISOString());

  const allPayments = (payments ?? []) as PlatformPayment[];

  // Deals
  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", orgId)
    .gte("created_at", cutoff.toISOString());

  const allDeals = (deals ?? []) as Deal[];

  // Build monthly buckets
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const result: MonthlyRevenue[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const monthPayments = allPayments.filter(
      (p) =>
        p.paid_at &&
        new Date(p.paid_at) >= monthStart &&
        new Date(p.paid_at) < monthEnd
    );

    const monthDeals = allDeals.filter(
      (deal) =>
        new Date(deal.created_at) >= monthStart &&
        new Date(deal.created_at) < monthEnd
    );

    const paymentTotal = monthPayments.reduce(
      (sum, p) => sum + (p.amount - p.platform_fee),
      0
    );
    const dealTotal = monthDeals.reduce((sum, deal) => sum + deal.paid_amount, 0);

    result.push({
      month: monthNames[d.getMonth()],
      year: d.getFullYear(),
      earnings: paymentTotal + dealTotal,
      payments: paymentTotal,
      deals: dealTotal,
    });
  }

  return result;
}

// ── Deal Revenue ──

export async function getDealRevenue(): Promise<DealRevenueRow[]> {
  const ctx = await getAuthContext();
  if (!ctx?.orgId) return [];

  const { orgId, supabase } = ctx;

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return ((deals ?? []) as Deal[]).map((d) => ({
    id: d.id,
    brandName: d.brand_name,
    totalValue: d.total_value ?? 0,
    paidAmount: d.paid_amount,
    status: d.status,
    pipelineStage: d.pipeline_stage,
    createdAt: d.created_at,
  }));
}

// ── Payment History ──

export async function getPaymentHistory(): Promise<PaymentHistoryRow[]> {
  const ctx = await getAuthContext();
  if (!ctx) return [];

  const { userId, supabase } = ctx;

  // Get payments where user is payee
  const { data: payments } = await supabase
    .from("platform_payments")
    .select("*")
    .eq("payee_id", userId)
    .order("created_at", { ascending: false });

  const allPayments = (payments ?? []) as PlatformPayment[];

  // Get associated deal names
  const dealIds = allPayments
    .map((p) => p.deal_id)
    .filter((id): id is string => id !== null);

  let dealMap: Record<string, string> = {};
  if (dealIds.length > 0) {
    const { data: deals } = await supabase
      .from("deals")
      .select("id, brand_name")
      .in("id", dealIds);

    dealMap = (deals ?? []).reduce(
      (acc, d) => {
        acc[d.id] = d.brand_name;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  return allPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    platformFee: p.platform_fee,
    netAmount: p.amount - p.platform_fee,
    status: p.status,
    description: p.description,
    paidAt: p.paid_at,
    createdAt: p.created_at,
    dealId: p.deal_id,
    brandName: p.deal_id ? (dealMap[p.deal_id] ?? null) : null,
  }));
}

// ── Revenue Forecast ──

export async function getRevenueForecast(): Promise<RevenueForecast> {
  const ctx = await getAuthContext();
  if (!ctx?.orgId) {
    return {
      contractedRevenue: 0,
      inProgressRevenue: 0,
      projectedTotal: 0,
      dealCount: 0,
      avgDealValue: 0,
    };
  }

  const { orgId, supabase } = ctx;

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("organization_id", orgId)
    .in("status", ["active", "negotiation", "inquiry"]);

  const allDeals = (deals ?? []) as Deal[];

  // Contracted: deals in contracted/in_progress/delivered/invoiced stages
  const contractedStages = new Set([
    "contracted",
    "in_progress",
    "delivered",
    "invoiced",
  ]);
  const contractedDeals = allDeals.filter((d) =>
    contractedStages.has(d.pipeline_stage)
  );
  const contractedRevenue = contractedDeals.reduce(
    (sum, d) => sum + ((d.total_value ?? 0) - d.paid_amount),
    0
  );

  // In progress: deals in lead/outreach/negotiating stages (weighted at 40%)
  const pipelineStages = new Set(["lead", "outreach", "negotiating"]);
  const pipelineDeals = allDeals.filter((d) =>
    pipelineStages.has(d.pipeline_stage)
  );
  const inProgressRevenue =
    pipelineDeals.reduce((sum, d) => sum + (d.total_value ?? 0), 0) * 0.4;

  const projectedTotal = contractedRevenue + inProgressRevenue;
  const dealCount = allDeals.length;
  const totalValue = allDeals.reduce(
    (sum, d) => sum + (d.total_value ?? 0),
    0
  );
  const avgDealValue = dealCount > 0 ? totalValue / dealCount : 0;

  return {
    contractedRevenue,
    inProgressRevenue,
    projectedTotal,
    dealCount,
    avgDealValue,
  };
}
