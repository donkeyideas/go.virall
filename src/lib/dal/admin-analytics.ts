"use server";

import { createAdminClient } from "@/lib/supabase/admin";

// ============================================================
// Tier 1 — Business Intelligence (What's Happening)
// ============================================================

/**
 * Cohort analysis: group users by signup week, track retention at week 1, 2, 4, 8.
 */
export interface CohortRow {
  cohort: string; // e.g. "2026-W12"
  signupCount: number;
  week1: number;
  week2: number;
  week4: number;
  week8: number;
}

export async function getCohortAnalysis(weeks = 12): Promise<CohortRow[]> {
  const admin = createAdminClient();

  // Get all users with created_at
  const since = new Date(Date.now() - weeks * 7 * 86400000).toISOString();
  const { data: users } = await admin
    .from("profiles")
    .select("id, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (!users?.length) return [];

  // Get all events for these users
  const userIds = users.map((u) => u.id);
  const { data: events } = await admin
    .from("user_events")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: true });

  const eventsByUser: Record<string, Date[]> = {};
  for (const e of events ?? []) {
    if (!eventsByUser[e.user_id]) eventsByUser[e.user_id] = [];
    eventsByUser[e.user_id].push(new Date(e.created_at));
  }

  // Group users by ISO week
  const cohorts: Record<string, { signupDate: Date; userId: string }[]> = {};
  for (const u of users) {
    const d = new Date(u.created_at);
    const weekKey = getISOWeek(d);
    if (!cohorts[weekKey]) cohorts[weekKey] = [];
    cohorts[weekKey].push({ signupDate: d, userId: u.id });
  }

  const result: CohortRow[] = [];
  for (const [cohort, members] of Object.entries(cohorts)) {
    const signupCount = members.length;
    let week1 = 0, week2 = 0, week4 = 0, week8 = 0;

    for (const m of members) {
      const ue = eventsByUser[m.userId] ?? [];
      const signupMs = m.signupDate.getTime();
      const hasEventAfter = (days: number) =>
        ue.some((e) => e.getTime() - signupMs >= days * 86400000);

      if (hasEventAfter(7)) week1++;
      if (hasEventAfter(14)) week2++;
      if (hasEventAfter(28)) week4++;
      if (hasEventAfter(56)) week8++;
    }

    result.push({
      cohort,
      signupCount,
      week1: signupCount > 0 ? Math.round((week1 / signupCount) * 100) : 0,
      week2: signupCount > 0 ? Math.round((week2 / signupCount) * 100) : 0,
      week4: signupCount > 0 ? Math.round((week4 / signupCount) * 100) : 0,
      week8: signupCount > 0 ? Math.round((week8 / signupCount) * 100) : 0,
    });
  }

  return result;
}

/**
 * Conversion funnel: Signup → Profile Connected → First Analysis → Return Visit → Paid
 */
export interface FunnelStep {
  label: string;
  count: number;
  pct: number;
  creatorCount: number;
  brandCount: number;
}

export async function getConversionFunnel(): Promise<FunnelStep[]> {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: profileConnected },
    { count: firstAnalysis },
    { count: paidOrgs },
    { count: creatorUsers },
    { count: brandUsers },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("social_profiles").select("organization_id", { count: "exact", head: true }),
    admin.from("social_analyses").select("id", { count: "exact", head: true }),
    admin.from("organizations").select("id", { count: "exact", head: true }).neq("plan", "free"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "creator"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_type", "brand"),
  ]);

  // Return visits: users with > 1 event on different days
  let returnVisitors = 0;
  try {
    const { data: returnData } = await admin.rpc("count_return_visitors").single();
    returnVisitors = (returnData as unknown as number) ?? 0;
  } catch {
    // RPC may not exist yet — fallback to 0
  }

  // Get org account type map for paid org split
  const orgProfiles = await admin.from("profiles").select("organization_id, account_type").not("organization_id", "is", null);
  const orgTypeMap = new Map<string, "creator" | "brand">();
  for (const row of orgProfiles.data ?? []) {
    if (row.organization_id && !orgTypeMap.has(row.organization_id)) {
      orgTypeMap.set(row.organization_id, (row.account_type as "creator" | "brand") ?? "creator");
    }
  }
  const { data: paidOrgsList } = await admin.from("organizations").select("id").neq("plan", "free");
  let creatorPaid = 0, brandPaid = 0;
  for (const o of paidOrgsList ?? []) {
    if (orgTypeMap.get(o.id) === "brand") brandPaid++; else creatorPaid++;
  }

  const total = totalUsers ?? 0;
  const cUsers = creatorUsers ?? 0;
  const bUsers = brandUsers ?? 0;

  const steps: FunnelStep[] = [
    { label: "Signed Up", count: total, pct: 100, creatorCount: cUsers, brandCount: bUsers },
    {
      label: "Profile Connected",
      count: profileConnected ?? 0,
      pct: total > 0 ? Math.round(((profileConnected ?? 0) / total) * 100) : 0,
      creatorCount: 0, brandCount: 0, // can't split connected profiles easily
    },
    {
      label: "First Analysis Run",
      count: firstAnalysis ?? 0,
      pct: total > 0 ? Math.round(((firstAnalysis ?? 0) / total) * 100) : 0,
      creatorCount: 0, brandCount: 0,
    },
    {
      label: "Return Visit",
      count: returnVisitors,
      pct: total > 0 ? Math.round((returnVisitors / total) * 100) : 0,
      creatorCount: 0, brandCount: 0,
    },
    {
      label: "Paid Conversion",
      count: paidOrgs ?? 0,
      pct: total > 0 ? Math.round(((paidOrgs ?? 0) / total) * 100) : 0,
      creatorCount: creatorPaid, brandCount: brandPaid,
    },
  ];

  return steps;
}

/**
 * Feature adoption: which features are used most vs ignored.
 */
export interface FeatureAdoption {
  feature: string;
  users: number;
  totalEvents: number;
}

export async function getFeatureAdoption(): Promise<FeatureAdoption[]> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("user_events")
    .select("event_type, user_id");

  if (!data?.length) return [];

  const map: Record<string, Set<string>> = {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    const key = row.event_type;
    if (!map[key]) map[key] = new Set();
    map[key].add(row.user_id);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.entries(map)
    .map(([feature, userSet]) => ({
      feature,
      users: userSet.size,
      totalEvents: counts[feature] ?? 0,
    }))
    .sort((a, b) => b.users - a.users);
}

/**
 * Revenue waterfall: New MRR + Expansion - Contraction - Churn = Net New MRR
 */
export interface RevenueWaterfall {
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnMRR: number;
  netNewMRR: number;
}

export async function getRevenueWaterfall(): Promise<RevenueWaterfall> {
  const admin = createAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Fetch DB-based pricing + new orgs + billing events in parallel
  const [{ data: plans }, { data: newOrgs }, { data: billingEvents }] = await Promise.all([
    admin.from("pricing_plans").select("id, name, price_monthly, account_type"),
    admin.from("organizations").select("plan").gte("created_at", thirtyDaysAgo).neq("plan", "free"),
    admin.from("billing_events").select("event_type, metadata").gte("created_at", thirtyDaysAgo),
  ]);

  // Build price lookup: lowercase plan name → dollars
  const planPrices = new Map<string, number>();
  for (const p of plans ?? []) {
    if (p.name) planPrices.set(p.name.toLowerCase(), (p.price_monthly ?? 0) / 100);
  }

  const newMRR = (newOrgs ?? []).reduce(
    (sum, o) => sum + (planPrices.get(o.plan) ?? 0),
    0,
  );

  let expansionMRR = 0;
  let contractionMRR = 0;
  let churnMRR = 0;

  for (const event of billingEvents ?? []) {
    const meta = (event.metadata ?? {}) as Record<string, string>;
    const from = planPrices.get(meta.from_plan) ?? 0;
    const to = planPrices.get(meta.to_plan) ?? 0;

    if (event.event_type === "upgrade") {
      expansionMRR += to - from;
    } else if (event.event_type === "downgrade") {
      contractionMRR += from - to;
    } else if (
      event.event_type === "cancellation" ||
      event.event_type === "churn"
    ) {
      churnMRR += from;
    }
  }

  return {
    newMRR,
    expansionMRR,
    contractionMRR,
    churnMRR,
    netNewMRR: newMRR + expansionMRR - contractionMRR - churnMRR,
  };
}

// ============================================================
// Tier 2 — User Behavior Intelligence (Why It's Happening)
// ============================================================

/**
 * Engagement scoring per user (0-100).
 */
export interface UserEngagement {
  userId: string;
  email: string;
  name: string;
  plan: string;
  accountType: "creator" | "brand";
  score: number;
  lastActive: string | null;
  eventCount: number;
}

export async function getUserEngagementScores(
  limit = 50,
): Promise<UserEngagement[]> {
  const admin = createAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Get events per user in last 30 days
  const { data: events } = await admin
    .from("user_events")
    .select("user_id, created_at, event_type")
    .gte("created_at", thirtyDaysAgo);

  if (!events?.length) return [];

  const userStats: Record<
    string,
    { count: number; lastActive: string; types: Set<string>; days: Set<string> }
  > = {};
  for (const e of events) {
    if (!userStats[e.user_id]) {
      userStats[e.user_id] = {
        count: 0,
        lastActive: e.created_at,
        types: new Set(),
        days: new Set(),
      };
    }
    const s = userStats[e.user_id];
    s.count++;
    s.types.add(e.event_type);
    s.days.add(e.created_at.split("T")[0]);
    if (e.created_at > s.lastActive) s.lastActive = e.created_at;
  }

  // Score: frequency (40%) + depth/feature variety (30%) + recency (30%)
  const now = Date.now();
  const scored: Array<{ userId: string; score: number; count: number; lastActive: string }> = [];
  for (const [userId, stats] of Object.entries(userStats)) {
    const freqScore = Math.min(stats.days.size / 20, 1) * 40;
    const depthScore = Math.min(stats.types.size / 8, 1) * 30;
    const daysSinceLast = (now - new Date(stats.lastActive).getTime()) / 86400000;
    const recencyScore = Math.max(1 - daysSinceLast / 30, 0) * 30;
    scored.push({
      userId,
      score: Math.round(freqScore + depthScore + recencyScore),
      count: stats.count,
      lastActive: stats.lastActive,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  // Fetch user details
  const userIds = top.map((s) => s.userId);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, organization_id, account_type")
    .in("id", userIds);

  // Get emails from auth (profiles table doesn't store emails)
  let emailMap = new Map<string, string>();
  try {
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  } catch { /* auth admin may not be available */ }

  const orgIds = [...new Set((profiles ?? []).map((p) => p.organization_id).filter(Boolean))];
  const { data: orgs } = orgIds.length
    ? await admin.from("organizations").select("id, plan").in("id", orgIds as string[])
    : { data: [] };

  const orgPlan: Record<string, string> = {};
  for (const o of orgs ?? []) orgPlan[o.id] = o.plan;

  const profileMap: Record<string, { name: string; orgId: string | null; accountType: "creator" | "brand" }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = {
      name: p.full_name ?? "",
      orgId: p.organization_id,
      accountType: (p.account_type as "creator" | "brand") ?? "creator",
    };
  }

  return top.map((s) => ({
    userId: s.userId,
    email: emailMap.get(s.userId) ?? "",
    name: profileMap[s.userId]?.name ?? "",
    plan: profileMap[s.userId]?.orgId ? (orgPlan[profileMap[s.userId].orgId!] ?? "free") : "free",
    accountType: profileMap[s.userId]?.accountType ?? "creator",
    score: s.score,
    lastActive: s.lastActive,
    eventCount: s.count,
  }));
}

/**
 * Churn risk: users who haven't been active recently with declining usage.
 */
export interface ChurnRisk {
  userId: string;
  email: string;
  name: string;
  plan: string;
  accountType: "creator" | "brand";
  daysSinceLastActive: number;
  previousMonthEvents: number;
  currentMonthEvents: number;
  riskLevel: "high" | "medium" | "low";
}

export async function getChurnRiskUsers(limit = 30): Promise<ChurnRisk[]> {
  const admin = createAdminClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();

  // Get paid + recently cancelled organizations (both are churn-relevant)
  const { data: relevantOrgs } = await admin
    .from("organizations")
    .select("id, plan, subscription_status")
    .or("plan.neq.free,subscription_status.eq.canceled");

  if (!relevantOrgs?.length) return [];

  const orgIds = relevantOrgs.map((o) => o.id);
  const orgPlan: Record<string, string> = {};
  for (const o of relevantOrgs) orgPlan[o.id] = o.plan;

  // Get user profiles directly (org membership is via profiles.organization_id)
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, organization_id, account_type")
    .in("organization_id", orgIds);

  if (!profiles?.length) return [];

  const userIds = profiles.map((p) => p.id);
  const profileMap: Record<string, { name: string; orgId: string; accountType: "creator" | "brand" }> = {};
  for (const p of profiles) {
    profileMap[p.id] = {
      name: p.full_name ?? "",
      orgId: p.organization_id,
      accountType: (p.account_type as "creator" | "brand") ?? "creator",
    };
  }

  // Get emails from auth
  let emailMap = new Map<string, string>();
  try {
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    emailMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  } catch { /* auth admin may not be available */ }

  // Events in last 60 days
  const { data: events } = await admin
    .from("user_events")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .gte("created_at", sixtyDaysAgo);

  const userActivity: Record<
    string,
    { lastActive: string; prev: number; curr: number }
  > = {};
  for (const uid of userIds) {
    userActivity[uid] = { lastActive: sixtyDaysAgo, prev: 0, curr: 0 };
  }

  for (const e of events ?? []) {
    const u = userActivity[e.user_id];
    if (!u) continue;
    if (e.created_at > u.lastActive) u.lastActive = e.created_at;
    if (e.created_at >= thirtyDaysAgo) {
      u.curr++;
    } else {
      u.prev++;
    }
  }

  const risks: ChurnRisk[] = [];
  for (const [uid, act] of Object.entries(userActivity)) {
    const daysSince = Math.round(
      (now.getTime() - new Date(act.lastActive).getTime()) / 86400000,
    );
    const declining = act.curr < act.prev;
    const inactive = daysSince >= 7;
    const orgId = profileMap[uid]?.orgId;
    const isCancelled = orgId ? (relevantOrgs.find((o) => o.id === orgId)?.subscription_status === "canceled") : false;

    let riskLevel: "high" | "medium" | "low" = "low";
    if (isCancelled) riskLevel = "high";
    else if (daysSince >= 14 || (inactive && declining && act.curr === 0))
      riskLevel = "high";
    else if (inactive || declining) riskLevel = "medium";

    if (riskLevel !== "low") {
      risks.push({
        userId: uid,
        email: emailMap.get(uid) ?? "",
        name: profileMap[uid]?.name ?? "",
        plan: orgPlan[profileMap[uid]?.orgId] ?? "free",
        accountType: profileMap[uid]?.accountType ?? "creator",
        daysSinceLastActive: daysSince,
        previousMonthEvents: act.prev,
        currentMonthEvents: act.curr,
        riskLevel,
      });
    }
  }

  risks.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.riskLevel] - order[b.riskLevel] || b.daysSinceLastActive - a.daysSinceLastActive;
  });

  return risks.slice(0, limit);
}

// ============================================================
// Tier 3 — Aggregate Social Intelligence (The Data Goldmine)
// ============================================================

/**
 * Cross-platform benchmarks from all user data.
 */
export interface PlatformBenchmarkRow {
  platform: string;
  followerBracket: string;
  avgEngagement: number;
  avgGrowth: number;
  avgPostsPerWeek: number;
  sampleSize: number;
}

export async function getPlatformBenchmarks(): Promise<PlatformBenchmarkRow[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id, platform, followers_count, engagement_rate, posts_count, created_at");

  if (!profiles?.length) return [];

  // Group by platform + follower bracket
  const buckets: Record<
    string,
    { engRates: number[]; growths: number[]; postCounts: number[] }
  > = {};

  for (const p of profiles) {
    const bracket = getBracket(p.followers_count);
    const key = `${p.platform}|${bracket}`;
    if (!buckets[key]) buckets[key] = { engRates: [], growths: [], postCounts: [] };
    if (p.engagement_rate != null) buckets[key].engRates.push(p.engagement_rate);
    if (p.posts_count != null) buckets[key].postCounts.push(p.posts_count);
  }

  // Get growth data from metrics
  const { data: recentMetrics } = await admin
    .from("social_metrics")
    .select("social_profile_id, followers, date")
    .order("date", { ascending: false })
    .limit(5000);

  const metricsByProfile: Record<string, Array<{ followers: number; date: string }>> = {};
  for (const m of recentMetrics ?? []) {
    if (m.followers == null) continue;
    if (!metricsByProfile[m.social_profile_id])
      metricsByProfile[m.social_profile_id] = [];
    metricsByProfile[m.social_profile_id].push({
      followers: m.followers,
      date: m.date,
    });
  }

  // Build profile lookup for growth calc
  const profileLookup: Record<string, { platform: string; followers_count: number }> = {};
  for (const p of profiles) profileLookup[p.id] = p;

  for (const [profileId, metrics] of Object.entries(metricsByProfile)) {
    const prof = profileLookup[profileId];
    if (!prof || metrics.length < 2) continue;

    const sorted = metrics.sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0].followers;
    const oldest = sorted[sorted.length - 1].followers;
    const growthPct = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;

    const bracket = getBracket(prof.followers_count);
    const key = `${prof.platform}|${bracket}`;
    if (buckets[key]) buckets[key].growths.push(growthPct);
  }

  const result: PlatformBenchmarkRow[] = [];
  for (const [key, bucket] of Object.entries(buckets)) {
    const [platform, bracket] = key.split("|");
    const sample = bucket.engRates.length || bucket.postCounts.length;
    if (sample < 1) continue;

    result.push({
      platform,
      followerBracket: bracket,
      avgEngagement:
        bucket.engRates.length > 0
          ? Math.round(
              (bucket.engRates.reduce((s, v) => s + v, 0) / bucket.engRates.length) * 100,
            ) / 100
          : 0,
      avgGrowth:
        bucket.growths.length > 0
          ? Math.round(
              (bucket.growths.reduce((s, v) => s + v, 0) / bucket.growths.length) * 10,
            ) / 10
          : 0,
      avgPostsPerWeek:
        bucket.postCounts.length > 0
          ? Math.round(
              bucket.postCounts.reduce((s, v) => s + v, 0) /
                bucket.postCounts.length /
                4,
            )
          : 0,
      sampleSize: sample,
    });
  }

  return result.sort((a, b) => b.sampleSize - a.sampleSize);
}

/**
 * Top content patterns across all users (viral detection).
 */
export interface ContentPattern {
  contentType: string;
  avgEngagement: number;
  postCount: number;
  topPlatform: string;
}

export async function getTrendingContentPatterns(): Promise<ContentPattern[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("platform, followers_count, recent_posts");

  if (!profiles?.length) return [];

  const typeStats: Record<
    string,
    { engRates: number[]; platforms: Record<string, number> }
  > = {};

  for (const p of profiles) {
    const posts = p.recent_posts as Array<{
      isVideo: boolean;
      likesCount: number;
      commentsCount: number;
    }> | null;
    if (!posts) continue;

    for (const post of posts) {
      const type = post.isVideo ? "Video/Reel" : "Image/Carousel";
      if (!typeStats[type])
        typeStats[type] = { engRates: [], platforms: {} };

      const eng =
        p.followers_count > 0
          ? ((post.likesCount + post.commentsCount) / p.followers_count) * 100
          : 0;
      typeStats[type].engRates.push(eng);
      typeStats[type].platforms[p.platform] =
        (typeStats[type].platforms[p.platform] ?? 0) + 1;
    }
  }

  return Object.entries(typeStats).map(([type, stats]) => {
    const topPlatform = Object.entries(stats.platforms).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] ?? "unknown";

    return {
      contentType: type,
      avgEngagement:
        stats.engRates.length > 0
          ? Math.round(
              (stats.engRates.reduce((s, v) => s + v, 0) / stats.engRates.length) * 100,
            ) / 100
          : 0,
      postCount: stats.engRates.length,
      topPlatform,
    };
  });
}

/**
 * Platform distribution across all users.
 */
export interface PlatformDistribution {
  platform: string;
  profileCount: number;
  creatorCount: number;
  brandCount: number;
  totalFollowers: number;
  avgEngagement: number;
}

export async function getPlatformDistribution(): Promise<
  PlatformDistribution[]
> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("platform, followers_count, engagement_rate, organization_id");

  if (!profiles?.length) return [];

  // Build org → account type map
  const orgIds = [...new Set(profiles.map((p) => p.organization_id).filter(Boolean))];
  const { data: orgProfiles } = orgIds.length
    ? await admin.from("profiles").select("organization_id, account_type").in("organization_id", orgIds as string[])
    : { data: [] };
  const orgTypeMap = new Map<string, "creator" | "brand">();
  for (const op of orgProfiles ?? []) {
    if (op.organization_id && !orgTypeMap.has(op.organization_id)) {
      orgTypeMap.set(op.organization_id, (op.account_type as "creator" | "brand") ?? "creator");
    }
  }

  const grouped: Record<
    string,
    { count: number; creatorCount: number; brandCount: number; followers: number; engRates: number[] }
  > = {};

  for (const p of profiles) {
    if (!grouped[p.platform])
      grouped[p.platform] = { count: 0, creatorCount: 0, brandCount: 0, followers: 0, engRates: [] };
    grouped[p.platform].count++;
    const acctType = p.organization_id ? (orgTypeMap.get(p.organization_id) ?? "creator") : "creator";
    if (acctType === "brand") grouped[p.platform].brandCount++;
    else grouped[p.platform].creatorCount++;
    grouped[p.platform].followers += p.followers_count ?? 0;
    if (p.engagement_rate != null)
      grouped[p.platform].engRates.push(p.engagement_rate);
  }

  return Object.entries(grouped)
    .map(([platform, stats]) => ({
      platform,
      profileCount: stats.count,
      creatorCount: stats.creatorCount,
      brandCount: stats.brandCount,
      totalFollowers: stats.followers,
      avgEngagement:
        stats.engRates.length > 0
          ? Math.round(
              (stats.engRates.reduce((s, v) => s + v, 0) / stats.engRates.length) * 100,
            ) / 100
          : 0,
    }))
    .sort((a, b) => b.profileCount - a.profileCount);
}

// ============================================================
// Helpers
// ============================================================

function getISOWeek(d: Date): string {
  const year = d.getFullYear();
  const jan1 = new Date(year, 0, 1);
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  const week = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getBracket(followers: number): string {
  if (followers >= 1_000_000) return "1M+";
  if (followers >= 100_000) return "100K-1M";
  if (followers >= 10_000) return "10K-100K";
  if (followers >= 1_000) return "1K-10K";
  return "0-1K";
}
