"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type {
  AdminStats,
  AdminNotification,
  UserRow,
  OrgRow,
  AuditLog,
  BillingEvent,
  ContactSubmission,
  SiteContent,
  Post,
  ChangelogEntry,
  RoadmapItem,
  JobListing,
  EmailTemplate,
  SocialPost,
  AIInteraction,
  PlatformInsight,
  PricingPlan,
  PlatformApiConfig,
  APICallLog,
} from "@/types";

// ============================================================
// Auth Guard
// ============================================================

export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "superadmin"].includes(profile.system_role)) {
    redirect("/dashboard");
  }
  return user.id;
}

// ============================================================
// Shared helper — org → account type map
// ============================================================

async function getOrgAccountTypeMap(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, "creator" | "brand">> {
  const { data } = await admin
    .from("profiles")
    .select("organization_id, account_type")
    .not("organization_id", "is", null);

  const map = new Map<string, "creator" | "brand">();
  for (const row of data ?? []) {
    if (row.organization_id && !map.has(row.organization_id)) {
      map.set(row.organization_id, (row.account_type as "creator" | "brand") ?? "creator");
    }
  }
  return map;
}

// ============================================================
// 4.1 — Overview & Stats
// ============================================================

export async function getAdminStats(): Promise<AdminStats> {
  const admin = createAdminClient();

  const [users, orgs, profiles, analyses, deals, creatorUsers, brandUsers] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin.from("social_profiles").select("id", { count: "exact", head: true }),
    admin.from("social_analyses").select("id", { count: "exact", head: true }),
    admin
      .from("deals")
      .select("id", { count: "exact", head: true })
      .in("status", ["inquiry", "negotiation"]),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "creator"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "brand"),
  ]);

  const orgTypeMap = await getOrgAccountTypeMap(admin);
  let creatorOrgs = 0;
  let brandOrgs = 0;
  for (const type of orgTypeMap.values()) {
    if (type === "brand") brandOrgs++;
    else creatorOrgs++;
  }

  return {
    totalUsers: users.count ?? 0,
    totalOrgs: orgs.count ?? 0,
    totalProfiles: profiles.count ?? 0,
    totalAnalyses: analyses.count ?? 0,
    pendingDeals: deals.count ?? 0,
    creatorUsers: creatorUsers.count ?? 0,
    brandUsers: brandUsers.count ?? 0,
    creatorOrgs,
    brandOrgs,
  };
}

export async function getRecentSignups(limit = 10): Promise<
  Array<{
    id: string;
    full_name: string | null;
    email: string | null;
    org_name: string | null;
    org_plan: string | null;
    account_type: "creator" | "brand";
    created_at: string;
  }>
> {
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, organization_id, account_type, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!profiles?.length) return [];

  // Get org names
  const orgIds = [
    ...new Set(profiles.map((p) => p.organization_id).filter(Boolean)),
  ];
  const { data: orgs } = orgIds.length
    ? await admin
        .from("organizations")
        .select("id, name, plan")
        .in("id", orgIds as string[])
    : { data: [] };

  const orgMap = new Map(
    (orgs ?? []).map((o) => [o.id, { name: o.name, plan: o.plan }]),
  );

  // Get emails from auth
  let emailMap = new Map<string, string>();
  try {
    const { data: authUsers } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    emailMap = new Map(
      (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]),
    );
  } catch {
    /* auth admin may not be available */
  }

  return profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: emailMap.get(p.id) ?? null,
    org_name: p.organization_id ? (orgMap.get(p.organization_id)?.name ?? null) : null,
    org_plan: p.organization_id ? (orgMap.get(p.organization_id)?.plan ?? null) : null,
    account_type: (p.account_type as "creator" | "brand") ?? "creator",
    created_at: p.created_at,
  }));
}

export async function getRecentAuditLog(limit = 20): Promise<AuditLog[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditLog[];
}

// ============================================================
// 4.2 — Users
// ============================================================

export async function getAllUsers(opts?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<UserRow[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 25;
  const offset = opts?.offset ?? 0;

  let query = admin
    .from("profiles")
    .select("id, full_name, avatar_url, role, system_role, organization_id, account_type, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.search) {
    query = query.ilike("full_name", `%${opts.search}%`);
  }

  const { data: profiles } = await query;
  if (!profiles?.length) return [];

  // Get org info
  const orgIds = [
    ...new Set(profiles.map((p) => p.organization_id).filter(Boolean)),
  ];
  const { data: orgs } = orgIds.length
    ? await admin
        .from("organizations")
        .select("id, name, plan")
        .in("id", orgIds as string[])
    : { data: [] };

  const orgMap = new Map(
    (orgs ?? []).map((o) => [o.id, { name: o.name, plan: o.plan }]),
  );

  // Get emails + providers from auth
  let authMap = new Map<string, { email: string; provider: string }>();
  try {
    const { data: authUsers } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    authMap = new Map(
      (authUsers?.users ?? []).map((u) => [
        u.id,
        {
          email: u.email ?? "",
          provider: u.app_metadata?.provider ?? "email",
        },
      ]),
    );
  } catch {
    /* fallback */
  }

  return profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: authMap.get(p.id)?.email ?? null,
    avatar_url: p.avatar_url,
    role: p.role,
    system_role: p.system_role,
    org_name: p.organization_id ? (orgMap.get(p.organization_id)?.name ?? null) : null,
    org_plan: p.organization_id ? (orgMap.get(p.organization_id)?.plan ?? null) : null,
    account_type: (p.account_type as "creator" | "brand") ?? "creator",
    provider: authMap.get(p.id)?.provider ?? null,
    created_at: p.created_at,
  }));
}

// ============================================================
// 4.3 — Organizations
// ============================================================

export async function getAllOrgs(opts?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<OrgRow[]> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 25;
  const offset = opts?.offset ?? 0;

  let query = admin
    .from("organizations")
    .select("id, name, slug, plan, subscription_status, stripe_customer_id, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.search) {
    query = query.ilike("name", `%${opts.search}%`);
  }

  const { data: orgs } = await query;
  if (!orgs?.length) return [];

  const orgIds = orgs.map((o) => o.id);

  // Count members, profiles, deals per org
  const [members, profiles, deals] = await Promise.all([
    admin
      .from("profiles")
      .select("organization_id")
      .in("organization_id", orgIds),
    admin
      .from("social_profiles")
      .select("organization_id")
      .in("organization_id", orgIds),
    admin
      .from("deals")
      .select("organization_id")
      .in("organization_id", orgIds),
  ]);

  const countBy = (
    data: Array<{ organization_id: string }> | null,
  ): Map<string, number> => {
    const map = new Map<string, number>();
    for (const row of data ?? []) {
      map.set(row.organization_id, (map.get(row.organization_id) ?? 0) + 1);
    }
    return map;
  };

  const memberCounts = countBy(members.data);
  const profileCounts = countBy(profiles.data);
  const dealCounts = countBy(deals.data);
  const orgTypeMap = await getOrgAccountTypeMap(admin);

  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    plan: o.plan,
    subscription_status: o.subscription_status,
    member_count: memberCounts.get(o.id) ?? 0,
    profile_count: profileCounts.get(o.id) ?? 0,
    deal_count: dealCounts.get(o.id) ?? 0,
    stripe_customer_id: o.stripe_customer_id,
    account_type: orgTypeMap.get(o.id) ?? "creator",
    created_at: o.created_at,
  }));
}

// ============================================================
// 4.4 — Billing & Revenue
// ============================================================

/**
 * One-time backfill: seeds billing_events from existing active subscriptions
 * and completed platform payments. Skips if events already exist.
 */
export async function backfillBillingEvents(): Promise<number> {
  const admin = createAdminClient();

  // Skip if we already have events
  const { count } = await admin
    .from("billing_events")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return 0;

  const [orgsResult, plansResult, paymentsResult] = await Promise.all([
    admin
      .from("organizations")
      .select("id, plan, subscription_status, stripe_subscription_id, created_at"),
    admin.from("pricing_plans").select("id, name, price_monthly, account_type"),
    admin
      .from("platform_payments")
      .select("id, deal_id, payer_id, payee_id, amount, currency, status, paid_at, created_at")
      .eq("status", "completed"),
  ]);

  // Build price lookup
  const planPriceMap = new Map<string, number>();
  for (const p of plansResult.data ?? []) {
    if (p.name) planPriceMap.set(p.name.toLowerCase(), p.price_monthly ?? 0);
  }

  const rows: Array<{
    organization_id: string;
    event_type: string;
    amount_cents: number;
    currency: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }> = [];

  // 1. Subscription-based events for paid orgs
  for (const o of orgsResult.data ?? []) {
    const plan = o.plan ?? "free";
    if (plan === "free") continue;
    const status = o.subscription_status ?? "active";
    if (status !== "active") continue;

    const amountCents = planPriceMap.get(plan) ?? 0;
    rows.push({
      organization_id: o.id,
      event_type: "invoice.paid",
      amount_cents: amountCents,
      currency: "usd",
      metadata: {
        plan,
        backfill: true,
        subscription_id: o.stripe_subscription_id ?? null,
      },
      created_at: o.created_at,
    });
  }

  // 2. Brand payment events from completed platform_payments
  for (const p of paymentsResult.data ?? []) {
    rows.push({
      organization_id: null as unknown as string, // may not map to an org
      event_type: "brand_payment",
      amount_cents: p.amount ?? 0,
      currency: p.currency ?? "usd",
      metadata: {
        deal_id: p.deal_id,
        payment_id: p.id,
        payer_id: p.payer_id,
        payee_id: p.payee_id,
        backfill: true,
      },
      created_at: p.paid_at ?? p.created_at,
    });
  }

  if (rows.length === 0) return 0;

  const { error } = await admin.from("billing_events").insert(rows);
  if (error) {
    console.error("[backfillBillingEvents] Insert failed:", error.message);
    return 0;
  }

  return rows.length;
}

export async function getBillingOverview(): Promise<{
  totalOrgs: number;
  paidOrgs: number;
  freeOrgs: number;
  planDistribution: Record<string, number>;
  creatorPlanDistribution: Record<string, number>;
  brandPlanDistribution: Record<string, number>;
  creatorPaidOrgs: number;
  brandPaidOrgs: number;
  recentEvents: Array<BillingEvent & { org_name: string | null }>;
}> {
  const admin = createAdminClient();

  const [orgsResult, eventsResult] = await Promise.all([
    admin.from("organizations").select("id, plan, name"),
    admin
      .from("billing_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const orgs = orgsResult.data ?? [];
  const orgTypeMap = await getOrgAccountTypeMap(admin);

  const planDist: Record<string, number> = {};
  const creatorPlanDist: Record<string, number> = {};
  const brandPlanDist: Record<string, number> = {};
  let paid = 0, free = 0, creatorPaid = 0, brandPaid = 0;

  for (const o of orgs) {
    const plan = o.plan ?? "free";
    const acctType = orgTypeMap.get(o.id) ?? "creator";
    planDist[plan] = (planDist[plan] ?? 0) + 1;

    if (acctType === "brand") {
      brandPlanDist[plan] = (brandPlanDist[plan] ?? 0) + 1;
    } else {
      creatorPlanDist[plan] = (creatorPlanDist[plan] ?? 0) + 1;
    }

    if (plan === "free") free++;
    else {
      paid++;
      if (acctType === "brand") brandPaid++;
      else creatorPaid++;
    }
  }

  return {
    totalOrgs: orgs.length,
    paidOrgs: paid,
    freeOrgs: free,
    planDistribution: planDist,
    creatorPlanDistribution: creatorPlanDist,
    brandPlanDistribution: brandPlanDist,
    creatorPaidOrgs: creatorPaid,
    brandPaidOrgs: brandPaid,
    recentEvents: ((eventsResult.data ?? []) as BillingEvent[]).map((e) => ({
      ...e,
      org_name: e.organization_id
        ? (orgs.find((o) => o.id === e.organization_id)?.name ?? null)
        : null,
    })),
  };
}

export async function getRevenueAnalytics(): Promise<{
  mrr: number;
  arr: number;
  arpu: number;
  churnRate: number;
  creatorMrr: number;
  brandMrr: number;
  creatorArr: number;
  brandArr: number;
}> {
  const admin = createAdminClient();

  const [orgsResult, plansResult] = await Promise.all([
    admin.from("organizations").select("id, plan, subscription_status"),
    admin.from("pricing_plans").select("id, name, price_monthly, account_type"),
  ]);

  // Build price lookup: plan ID or lowercase name → price in dollars
  const planPriceMap = new Map<string, number>();
  for (const p of plansResult.data ?? []) {
    planPriceMap.set(p.id, (p.price_monthly ?? 0) / 100);
    if (p.name) planPriceMap.set(p.name.toLowerCase(), (p.price_monthly ?? 0) / 100);
  }

  const orgTypeMap = await getOrgAccountTypeMap(admin);

  let mrr = 0, creatorMrr = 0, brandMrr = 0;
  let activeCount = 0;
  let canceledCount = 0;

  for (const o of orgsResult.data ?? []) {
    const plan = o.plan ?? "free";
    const status = o.subscription_status ?? "active";
    const acctType = orgTypeMap.get(o.id) ?? "creator";
    const price = planPriceMap.get(plan) ?? 0;

    if (plan !== "free" && status === "active") {
      mrr += price;
      if (acctType === "brand") brandMrr += price;
      else creatorMrr += price;
      activeCount++;
    }
    if (status === "canceled") canceledCount++;
  }

  // Monthly churn: cancellations in last 30 days / active at start of period
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: recentCancels } = await admin
    .from("billing_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", "cancellation")
    .gte("created_at", thirtyDaysAgo);
  const churnDenominator = activeCount + (recentCancels ?? 0);
  const churnRate = churnDenominator > 0 ? (recentCancels ?? 0) / churnDenominator : 0;
  const arpu = activeCount > 0 ? mrr / activeCount : 0;

  return {
    mrr,
    arr: mrr * 12,
    arpu,
    churnRate,
    creatorMrr,
    brandMrr,
    creatorArr: creatorMrr * 12,
    brandArr: brandMrr * 12,
  };
}

// ============================================================
// 4.5 — Notifications (Admin Feed)
// ============================================================

export async function getAdminNotifications(
  limit = 50,
): Promise<AdminNotification[]> {
  const admin = createAdminClient();

  const [signups, events, audit, contacts] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("billing_events")
      .select("id, event_type, amount_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("audit_log")
      .select("id, action, resource_type, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("contact_submissions")
      .select("id, name, subject, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items: AdminNotification[] = [];

  for (const s of signups.data ?? []) {
    items.push({
      id: s.id,
      type: "signup",
      title: "New User Signup",
      description: s.full_name ?? "Unknown user",
      created_at: s.created_at,
    });
  }

  const BILLING_LABELS: Record<string, string> = {
    "invoice.paid": "Payment Received",
    "invoice.payment_failed": "Payment Failed",
    upgrade: "Plan Upgrade",
    downgrade: "Plan Downgrade",
    plan_change: "Plan Changed",
    cancellation: "Subscription Cancelled",
    brand_payment: "Brand Payment",
  };

  for (const e of events.data ?? []) {
    items.push({
      id: e.id,
      type: "billing",
      title: BILLING_LABELS[e.event_type] ?? e.event_type.replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description: e.amount_cents
        ? `$${(e.amount_cents / 100).toFixed(2)}`
        : "Billing event",
      created_at: e.created_at,
    });
  }

  const AUDIT_LABELS: Record<string, string> = {
    role_change: "Role Changed",
    plan_change: "Plan Changed",
    delete_user: "User Deleted",
    create_org: "Organization Created",
    update_settings: "Settings Updated",
  };

  for (const a of audit.data ?? []) {
    items.push({
      id: a.id,
      type: "audit",
      title: AUDIT_LABELS[a.action] ?? a.action.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      description: a.resource_type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? "",
      created_at: a.created_at,
    });
  }

  for (const c of contacts.data ?? []) {
    items.push({
      id: c.id,
      type: "contact",
      title: "New Contact",
      description: `${c.name}: ${c.subject ?? "No subject"}`,
      created_at: c.created_at,
    });
  }

  items.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return items.slice(0, limit);
}

// ============================================================
// 4.6 — Subscriptions (Pricing Plans)
// ============================================================

export async function getAllPricingPlans(): Promise<PricingPlan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pricing_plans")
    .select("*")
    .order("account_type")
    .order("sort_order")
    .order("price_monthly");
  return (data ?? []) as PricingPlan[];
}

export async function getPricingPlansByType(
  accountType: "creator" | "brand",
): Promise<PricingPlan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pricing_plans")
    .select("*")
    .eq("account_type", accountType)
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as PricingPlan[];
}

// ============================================================
// 4.7 — Content (Site CMS)
// ============================================================

export async function getAllSiteContent(): Promise<SiteContent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_content")
    .select("*")
    .order("page")
    .order("sort_order");
  return (data ?? []) as SiteContent[];
}

// ============================================================
// 4.8 — Search & AI (Analysis Overview)
// ============================================================

export async function getAnalysisOverview(): Promise<{
  totalAnalyses: number;
  byType: Record<string, number>;
  recentAnalyses: Array<{
    id: string;
    analysis_type: string;
    ai_provider: string | null;
    tokens_used: number;
    cost_cents: number;
    created_at: string;
  }>;
}> {
  const admin = createAdminClient();

  const [countResult, analyses] = await Promise.all([
    admin.from("social_analyses").select("id", { count: "exact", head: true }),
    admin
      .from("social_analyses")
      .select("id, analysis_type, ai_provider, tokens_used, cost_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const byType: Record<string, number> = {};
  for (const a of analyses.data ?? []) {
    byType[a.analysis_type] = (byType[a.analysis_type] ?? 0) + 1;
  }

  return {
    totalAnalyses: countResult.count ?? 0,
    byType,
    recentAnalyses: (analyses.data ?? []).slice(0, 20),
  };
}

// ============================================================
// 4.9 — API Management
// ============================================================

export async function getAPIConfigs(): Promise<PlatformApiConfig[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("platform_api_configs").select("*");
  return (data ?? []) as PlatformApiConfig[];
}

export async function getAPIUsageStats(days = 30): Promise<{
  totalCalls: number;
  totalCost: number;
  successRate: number;
  byProvider: Record<string, { calls: number; cost: number; successRate: number }>;
  dailyAggregates: Array<{ date: string; calls: number; cost: number }>;
}> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await admin
    .from("api_call_log")
    .select("provider, is_success, cost_usd, created_at")
    .gte("created_at", since.toISOString());

  const rows = data ?? [];
  let totalCost = 0;
  let successCount = 0;
  const byProvider: Record<string, { calls: number; cost: number; success: number }> = {};
  const dailyMap: Record<string, { calls: number; cost: number }> = {};

  for (const row of rows) {
    const cost = Number(row.cost_usd) || 0;
    totalCost += cost;
    if (row.is_success) successCount++;

    const provider = row.provider ?? "unknown";
    if (!byProvider[provider]) byProvider[provider] = { calls: 0, cost: 0, success: 0 };
    byProvider[provider].calls++;
    byProvider[provider].cost += cost;
    if (row.is_success) byProvider[provider].success++;

    const date = row.created_at?.slice(0, 10) ?? "";
    if (date) {
      if (!dailyMap[date]) dailyMap[date] = { calls: 0, cost: 0 };
      dailyMap[date].calls++;
      dailyMap[date].cost += cost;
    }
  }

  const providerResult: Record<string, { calls: number; cost: number; successRate: number }> = {};
  for (const [k, v] of Object.entries(byProvider)) {
    providerResult[k] = {
      calls: v.calls,
      cost: v.cost,
      successRate: v.calls > 0 ? v.success / v.calls : 0,
    };
  }

  const dailyAggregates = Object.entries(dailyMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCalls: rows.length,
    totalCost,
    successRate: rows.length > 0 ? successCount / rows.length : 0,
    byProvider: providerResult,
    dailyAggregates,
  };
}

export async function getAPICallLog(limit = 50): Promise<APICallLog[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_call_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as APICallLog[];
}

// ============================================================
// 4.10 — System Health
// ============================================================

export async function getSystemHealth(): Promise<{
  failedAPICalls24h: number;
  totalAPICalls24h: number;
  errorRate: number;
}> {
  const admin = createAdminClient();
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const [total, failed] = await Promise.all([
    admin
      .from("api_call_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString()),
    admin
      .from("api_call_log")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString())
      .eq("is_success", false),
  ]);

  const totalCount = total.count ?? 0;
  const failedCount = failed.count ?? 0;

  return {
    failedAPICalls24h: failedCount,
    totalAPICalls24h: totalCount,
    errorRate: totalCount > 0 ? failedCount / totalCount : 0,
  };
}

// ============================================================
// 4.11 — Analytics (Investor Metrics)
// ============================================================

export async function getInvestorMetrics(): Promise<{
  mrr: number;
  arr: number;
  arpu: number;
  totalOrgs: number;
  paidOrgs: number;
  freeOrgs: number;
  churnRate: number;
  creatorMrr: number;
  brandMrr: number;
  creatorUsers: number;
  brandUsers: number;
  creatorOrgs: number;
  brandOrgs: number;
  creatorPaidOrgs: number;
  brandPaidOrgs: number;
}> {
  const admin = createAdminClient();

  const [orgsResult, plansResult] = await Promise.all([
    admin.from("organizations").select("id, plan, subscription_status"),
    admin.from("pricing_plans").select("id, name, price_monthly, account_type"),
  ]);

  // Build price lookup from DB: plan ID or lowercase name → price in dollars
  const planPriceMap = new Map<string, number>();
  for (const p of plansResult.data ?? []) {
    planPriceMap.set(p.id, (p.price_monthly ?? 0) / 100);
    if (p.name) planPriceMap.set(p.name.toLowerCase(), (p.price_monthly ?? 0) / 100);
  }

  const orgTypeMap = await getOrgAccountTypeMap(admin);

  let mrr = 0, creatorMrr = 0, brandMrr = 0;
  let paid = 0, creatorPaid = 0, brandPaid = 0;
  let free = 0;
  let canceled = 0;

  for (const o of orgsResult.data ?? []) {
    const plan = o.plan ?? "free";
    const status = o.subscription_status ?? "active";
    const acctType = orgTypeMap.get(o.id) ?? "creator";
    const price = planPriceMap.get(plan) ?? 0;

    if (plan === "free") {
      free++;
    } else if (status === "active") {
      mrr += price;
      if (acctType === "brand") { brandMrr += price; brandPaid++; }
      else { creatorMrr += price; creatorPaid++; }
      paid++;
    }
    if (status === "canceled") canceled++;
  }

  const total = (orgsResult.data ?? []).length;
  const totalPaid = paid + canceled;

  // Count users + orgs by account type
  let creatorOrgs = 0, brandOrgs = 0;
  for (const type of orgTypeMap.values()) {
    if (type === "brand") brandOrgs++; else creatorOrgs++;
  }
  const [creatorUsersResult, brandUsersResult] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "creator"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "brand"),
  ]);

  return {
    mrr,
    arr: mrr * 12,
    arpu: paid > 0 ? mrr / paid : 0,
    totalOrgs: total,
    paidOrgs: paid,
    freeOrgs: free,
    churnRate: totalPaid > 0 ? canceled / totalPaid : 0,
    creatorMrr,
    brandMrr,
    creatorUsers: creatorUsersResult.count ?? 0,
    brandUsers: brandUsersResult.count ?? 0,
    creatorOrgs,
    brandOrgs,
    creatorPaidOrgs: creatorPaid,
    brandPaidOrgs: brandPaid,
  };
}

export async function getGrowthTimeSeries(): Promise<
  Array<{
    month: string;
    users: number; orgs: number; profiles: number; analyses: number;
    creatorUsers: number; brandUsers: number; creatorOrgs: number; brandOrgs: number;
  }>
> {
  const admin = createAdminClient();

  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const sinceStr = since.toISOString();

  const [users, orgs, profiles, analyses] = await Promise.all([
    admin.from("profiles").select("created_at, account_type").gte("created_at", sinceStr),
    admin.from("organizations").select("id, created_at").gte("created_at", sinceStr),
    admin.from("social_profiles").select("created_at").gte("created_at", sinceStr),
    admin.from("social_analyses").select("created_at").gte("created_at", sinceStr),
  ]);

  const orgTypeMap = await getOrgAccountTypeMap(admin);

  type Row = {
    users: number; orgs: number; profiles: number; analyses: number;
    creatorUsers: number; brandUsers: number; creatorOrgs: number; brandOrgs: number;
  };
  const empty = (): Row => ({ users: 0, orgs: 0, profiles: 0, analyses: 0, creatorUsers: 0, brandUsers: 0, creatorOrgs: 0, brandOrgs: 0 });
  const monthMap = new Map<string, Row>();

  for (const row of users.data ?? []) {
    const month = row.created_at?.slice(0, 7) ?? "";
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, empty());
    const m = monthMap.get(month)!;
    m.users++;
    if ((row as { account_type?: string }).account_type === "brand") m.brandUsers++;
    else m.creatorUsers++;
  }

  for (const row of orgs.data ?? []) {
    const month = row.created_at?.slice(0, 7) ?? "";
    if (!month) continue;
    if (!monthMap.has(month)) monthMap.set(month, empty());
    const m = monthMap.get(month)!;
    m.orgs++;
    if (orgTypeMap.get(row.id) === "brand") m.brandOrgs++;
    else m.creatorOrgs++;
  }

  const addSimple = (data: Array<{ created_at: string }> | null, key: "profiles" | "analyses") => {
    for (const row of data ?? []) {
      const month = row.created_at?.slice(0, 7) ?? "";
      if (!month) continue;
      if (!monthMap.has(month)) monthMap.set(month, empty());
      monthMap.get(month)![key]++;
    }
  };
  addSimple(profiles.data, "profiles");
  addSimple(analyses.data, "analyses");

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getUsageAnalytics(): Promise<{
  totalProfiles: number;
  totalAnalyses: number;
  totalCompetitors: number;
  totalDeals: number;
  totalCampaigns: number;
}> {
  const admin = createAdminClient();

  const [profiles, analyses, competitors, deals, campaigns] =
    await Promise.all([
      admin.from("social_profiles").select("id", { count: "exact", head: true }),
      admin.from("social_analyses").select("id", { count: "exact", head: true }),
      admin.from("social_competitors").select("id", { count: "exact", head: true }),
      admin.from("deals").select("id", { count: "exact", head: true }),
      admin.from("campaigns").select("id", { count: "exact", head: true }),
    ]);

  return {
    totalProfiles: profiles.count ?? 0,
    totalAnalyses: analyses.count ?? 0,
    totalCompetitors: competitors.count ?? 0,
    totalDeals: deals.count ?? 0,
    totalCampaigns: campaigns.count ?? 0,
  };
}

// ============================================================
// 4.12 — Data Intelligence
// ============================================================

export async function getActiveInsights(): Promise<PlatformInsight[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_insights")
    .select("*")
    .eq("is_active", true)
    .eq("is_dismissed", false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("generated_at", { ascending: false });
  return (data ?? []) as PlatformInsight[];
}

// ============================================================
// 4.13 — AI Intelligence
// ============================================================

export async function getAIInteractions(opts?: {
  feature?: string;
  provider?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AIInteraction[]; count: number }> {
  const admin = createAdminClient();
  const limit = opts?.limit ?? 25;
  const offset = opts?.offset ?? 0;

  let query = admin
    .from("ai_interactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.feature) query = query.eq("feature", opts.feature);
  if (opts?.provider) query = query.eq("provider", opts.provider);
  if (opts?.search) query = query.ilike("prompt_text", `%${opts.search}%`);

  const { data, count } = await query;
  return { data: (data ?? []) as AIInteraction[], count: count ?? 0 };
}

export async function getAIUsageByFeature(days = 30): Promise<
  Record<string, { calls: number; tokens: number; cost: number; avg_response_ms: number; success_rate: number }>
> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await admin
    .from("ai_interactions")
    .select("feature, total_tokens, cost_usd, response_time_ms, is_success")
    .gte("created_at", since.toISOString());

  const result: Record<string, { calls: number; tokens: number; cost: number; totalMs: number; success: number }> = {};

  for (const row of data ?? []) {
    const f = row.feature;
    if (!result[f]) result[f] = { calls: 0, tokens: 0, cost: 0, totalMs: 0, success: 0 };
    result[f].calls++;
    result[f].tokens += row.total_tokens ?? 0;
    result[f].cost += Number(row.cost_usd) || 0;
    result[f].totalMs += row.response_time_ms ?? 0;
    if (row.is_success) result[f].success++;
  }

  const output: Record<string, { calls: number; tokens: number; cost: number; avg_response_ms: number; success_rate: number }> = {};
  for (const [k, v] of Object.entries(result)) {
    output[k] = {
      calls: v.calls,
      tokens: v.tokens,
      cost: v.cost,
      avg_response_ms: v.calls > 0 ? Math.round(v.totalMs / v.calls) : 0,
      success_rate: v.calls > 0 ? v.success / v.calls : 0,
    };
  }
  return output;
}

export async function getAIProviderPerformance(days = 30): Promise<
  Record<string, { calls: number; cost: number; avg_response_ms: number; success_rate: number; errors: number }>
> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await admin
    .from("ai_interactions")
    .select("provider, cost_usd, response_time_ms, is_success")
    .gte("created_at", since.toISOString());

  const result: Record<string, { calls: number; cost: number; totalMs: number; success: number; errors: number }> = {};

  for (const row of data ?? []) {
    const p = row.provider;
    if (!result[p]) result[p] = { calls: 0, cost: 0, totalMs: 0, success: 0, errors: 0 };
    result[p].calls++;
    result[p].cost += Number(row.cost_usd) || 0;
    result[p].totalMs += row.response_time_ms ?? 0;
    if (row.is_success) result[p].success++;
    else result[p].errors++;
  }

  const output: Record<string, { calls: number; cost: number; avg_response_ms: number; success_rate: number; errors: number }> = {};
  for (const [k, v] of Object.entries(result)) {
    output[k] = {
      calls: v.calls,
      cost: v.cost,
      avg_response_ms: v.calls > 0 ? Math.round(v.totalMs / v.calls) : 0,
      success_rate: v.calls > 0 ? v.success / v.calls : 0,
      errors: v.errors,
    };
  }
  return output;
}

export async function getAICostTrend(days = 30): Promise<
  Array<{ date: string; cost: number; calls: number }>
> {
  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await admin
    .from("ai_interactions")
    .select("cost_usd, created_at")
    .gte("created_at", since.toISOString());

  const dailyMap: Record<string, { cost: number; calls: number }> = {};
  for (const row of data ?? []) {
    const date = row.created_at?.slice(0, 10) ?? "";
    if (!date) continue;
    if (!dailyMap[date]) dailyMap[date] = { cost: 0, calls: 0 };
    dailyMap[date].cost += Number(row.cost_usd) || 0;
    dailyMap[date].calls++;
  }

  return Object.entries(dailyMap)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// 4.14 — Content Management
// ============================================================

export async function getAllPosts(
  type?: string,
  limit = 50,
  offset = 0,
): Promise<Post[]> {
  const admin = createAdminClient();
  let query = admin
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);

  const { data } = await query;
  return (data ?? []) as Post[];
}

export async function getAllChangelog(): Promise<ChangelogEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("changelog_entries")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as ChangelogEntry[];
}

export async function getAllRoadmap(): Promise<RoadmapItem[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("roadmap_items")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as RoadmapItem[];
}

export async function getAllJobs(): Promise<JobListing[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_listings")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as JobListing[];
}

// ============================================================
// 4.15 — Email Templates
// ============================================================

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("email_templates").select("*");
  return (data ?? []) as EmailTemplate[];
}

// ============================================================
// 4.16 — Social Posts
// ============================================================

export async function getAllSocialPosts(): Promise<SocialPost[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as SocialPost[];
}

// ============================================================
// 4.17 — Contacts
// ============================================================

export async function getUnreadContactCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("contact_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
}

export async function getAllContacts(
  limit = 50,
  offset = 0,
): Promise<ContactSubmission[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []) as ContactSubmission[];
}
