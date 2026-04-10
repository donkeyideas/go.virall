import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  return { user };
}

async function getOrgId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  return data?.organization_id ?? null;
}

/** GET — All revenue data in one payload */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const userId = auth.user.id;
  const orgId = await getOrgId(userId);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Fetch raw data in parallel
  const [{ data: deals }, { data: payments }] = await Promise.all([
    supabaseAdmin.from("deals").select("*").eq("organization_id", orgId),
    supabaseAdmin.from("platform_payments").select("*").eq("payee_id", userId),
  ]);

  const allDeals = deals ?? [];
  const allPayments = payments ?? [];

  // ── Stats ──
  const completedPayments = allPayments.filter((p: any) => p.status === "completed");
  const paymentEarnings = completedPayments.reduce((s: number, p: any) => s + ((p.amount || 0) - (p.platform_fee || 0)), 0);
  const dealEarnings = allDeals.reduce((s: number, d: any) => s + (d.paid_amount || 0), 0);
  const totalEarnings = paymentEarnings + dealEarnings;

  const pendingPayments = allPayments
    .filter((p: any) => ["pending", "processing"].includes(p.status))
    .reduce((s: number, p: any) => s + (p.amount || 0), 0);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthPayments = completedPayments
    .filter((p: any) => new Date(p.paid_at) >= thisMonthStart)
    .reduce((s: number, p: any) => s + ((p.amount || 0) - (p.platform_fee || 0)), 0);
  const thisMonthDeals = allDeals
    .filter((d: any) => new Date(d.created_at) >= thisMonthStart && d.paid_amount > 0)
    .reduce((s: number, d: any) => s + (d.paid_amount || 0), 0);
  const thisMonth = thisMonthPayments + thisMonthDeals;

  const lastMonthPayments = completedPayments
    .filter((p: any) => new Date(p.paid_at) >= lastMonthStart && new Date(p.paid_at) < thisMonthStart)
    .reduce((s: number, p: any) => s + ((p.amount || 0) - (p.platform_fee || 0)), 0);
  const lastMonthDeals = allDeals
    .filter((d: any) => new Date(d.created_at) >= lastMonthStart && new Date(d.created_at) < thisMonthStart && d.paid_amount > 0)
    .reduce((s: number, d: any) => s + (d.paid_amount || 0), 0);
  const lastMonth = lastMonthPayments + lastMonthDeals;

  const thisMonthChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
  const pipelineValue = allDeals
    .filter((d: any) => ["active", "negotiation", "inquiry"].includes(d.status))
    .reduce((s: number, d: any) => s + (d.total_value || 0), 0);

  const stats = { totalEarnings, pendingPayments, thisMonth, lastMonth, thisMonthChange, pipelineValue };

  // ── Revenue by Source ──
  const paymentDealIds = new Set(allPayments.filter((p: any) => p.deal_id).map((p: any) => p.deal_id));
  const platformDeals = completedPayments.filter((p: any) => p.deal_id);
  const directPayments = completedPayments.filter((p: any) => !p.deal_id);
  const externalDeals = allDeals.filter((d: any) => d.paid_amount > 0 && !paymentDealIds.has(d.id));

  const sources = [
    { source: "Platform Deals", amount: platformDeals.reduce((s: number, p: any) => s + ((p.amount || 0) - (p.platform_fee || 0)), 0), count: platformDeals.length, color: "#4B9CD3" },
    { source: "Direct Payments", amount: directPayments.reduce((s: number, p: any) => s + ((p.amount || 0) - (p.platform_fee || 0)), 0), count: directPayments.length, color: "#06B6D4" },
    { source: "External Deals", amount: externalDeals.reduce((s: number, d: any) => s + (d.paid_amount || 0), 0), count: externalDeals.length, color: "#F59E0B" },
  ];

  // ── Monthly Revenue (12 months) ──
  const months = 12;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const monthlyData = [];
  for (let i = months - 1; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const mPayments = completedPayments
      .filter((p: any) => new Date(p.paid_at) >= mStart && new Date(p.paid_at) < mEnd)
      .reduce((s: number, p: any) => s + ((p.amount || 0) - (p.platform_fee || 0)), 0);
    const mDeals = allDeals
      .filter((d: any) => new Date(d.created_at) >= mStart && new Date(d.created_at) < mEnd)
      .reduce((s: number, d: any) => s + (d.paid_amount || 0), 0);
    monthlyData.push({
      month: mStart.toLocaleString("default", { month: "short" }),
      year: mStart.getFullYear(),
      earnings: mPayments + mDeals,
      payments: mPayments,
      deals: mDeals,
    });
  }

  // ── Deal Revenue ──
  const dealRevenue = allDeals.map((d: any) => ({
    id: d.id,
    brandName: d.brand_name,
    totalValue: d.total_value,
    paidAmount: d.paid_amount,
    status: d.status,
    pipelineStage: d.pipeline_stage,
    createdAt: d.created_at,
  }));

  // ── Payment History ──
  const dealMap = new Map(allDeals.map((d: any) => [d.id, d.brand_name]));
  const paymentHistory = allPayments.map((p: any) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    platformFee: p.platform_fee,
    netAmount: (p.amount || 0) - (p.platform_fee || 0),
    status: p.status,
    description: p.description,
    paidAt: p.paid_at,
    createdAt: p.created_at,
    dealId: p.deal_id,
    brandName: p.deal_id ? dealMap.get(p.deal_id) || null : null,
  }));

  // ── Forecast ──
  const activeDeals = allDeals.filter((d: any) => ["active", "negotiation", "inquiry"].includes(d.status));
  const contractedStages = ["contracted", "in_progress", "delivered", "invoiced"];
  const pipelineStages = ["lead", "outreach", "negotiating"];

  const contractedRevenue = activeDeals
    .filter((d: any) => contractedStages.includes(d.pipeline_stage))
    .reduce((s: number, d: any) => s + ((d.total_value || 0) - (d.paid_amount || 0)), 0);
  const inProgressRevenue = activeDeals
    .filter((d: any) => pipelineStages.includes(d.pipeline_stage))
    .reduce((s: number, d: any) => s + (d.total_value || 0) * 0.4, 0);

  const forecast = {
    contractedRevenue,
    inProgressRevenue,
    projectedTotal: contractedRevenue + inProgressRevenue,
    dealCount: activeDeals.length,
    avgDealValue: activeDeals.length > 0
      ? activeDeals.reduce((s: number, d: any) => s + (d.total_value || 0), 0) / activeDeals.length
      : 0,
  };

  return NextResponse.json({
    stats,
    sources,
    monthly: monthlyData,
    dealRevenue,
    paymentHistory,
    forecast,
  });
}
