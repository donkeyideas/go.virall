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
}

export async function getConversionFunnel(): Promise<FunnelStep[]> {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: profileConnected },
    { count: firstAnalysis },
    { count: paidOrgs },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("social_profiles")
      .select("organization_id", { count: "exact", head: true }),
    admin
      .from("social_analyses")
      .select("id", { count: "exact", head: true }),
    admin
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .neq("plan", "free"),
  ]);

  // Return visits: users with > 1 event on different days
  const { data: returnData } = await admin.rpc("count_return_visitors").single();
  const returnVisitors = (returnData as unknown as number) ?? 0;

  const total = totalUsers ?? 0;
  const steps: FunnelStep[] = [
    { label: "Signed Up", count: total, pct: 100 },
    {
      label: "Profile Connected",
      count: profileConnected ?? 0,
      pct: total > 0 ? Math.round(((profileConnected ?? 0) / total) * 100) : 0,
    },
    {
      label: "First Analysis Run",
      count: firstAnalysis ?? 0,
      pct: total > 0 ? Math.round(((firstAnalysis ?? 0) / total) * 100) : 0,
    },
    {
      label: "Return Visit",
      count: returnVisitors,
      pct: total > 0 ? Math.round((returnVisitors / total) * 100) : 0,
    },
    {
      label: "Paid Conversion",
      count: paidOrgs ?? 0,
      pct: total > 0 ? Math.round(((paidOrgs ?? 0) / total) * 100) : 0,
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

  // New subscriptions in last 30 days
  const { data: newOrgs } = await admin
    .from("organizations")
    .select("plan")
    .gte("created_at", thirtyDaysAgo)
    .neq("plan", "free");

  const planPrices: Record<string, number> = {
    free: 0,
    pro: 29,
    business: 79,
    enterprise: 199,
  };

  const newMRR = (newOrgs ?? []).reduce(
    (sum, o) => sum + (planPrices[o.plan] ?? 0),
    0,
  );

  // Billing events for upgrades, downgrades, cancellations
  const { data: billingEvents } = await admin
    .from("billing_events")
    .select("event_type, metadata")
    .gte("created_at", thirtyDaysAgo);

  let expansionMRR = 0;
  let contractionMRR = 0;
  let churnMRR = 0;

  for (const event of billingEvents ?? []) {
    const meta = (event.metadata ?? {}) as Record<string, string>;
    const from = planPrices[meta.from_plan] ?? 0;
    const to = planPrices[meta.to_plan] ?? 0;

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
    .select("id, email, full_name")
    .in("id", userIds);

  const { data: members } = await admin
    .from("organization_members")
    .select("user_id, organization_id")
    .in("user_id", userIds);

  const orgIds = [...new Set((members ?? []).map((m) => m.organization_id))];
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, plan")
    .in("id", orgIds);

  const orgPlan: Record<string, string> = {};
  for (const o of orgs ?? []) orgPlan[o.id] = o.plan;

  const memberOrg: Record<string, string> = {};
  for (const m of members ?? []) memberOrg[m.user_id] = m.organization_id;

  const profileMap: Record<string, { email: string; name: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { email: p.email ?? "", name: p.full_name ?? "" };
  }

  return top.map((s) => ({
    userId: s.userId,
    email: profileMap[s.userId]?.email ?? "",
    name: profileMap[s.userId]?.name ?? "",
    plan: orgPlan[memberOrg[s.userId]] ?? "free",
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

  // Get paid organizations
  const { data: paidOrgs } = await admin
    .from("organizations")
    .select("id, plan")
    .neq("plan", "free");

  if (!paidOrgs?.length) return [];

  const orgIds = paidOrgs.map((o) => o.id);
  const orgPlan: Record<string, string> = {};
  for (const o of paidOrgs) orgPlan[o.id] = o.plan;

  const { data: members } = await admin
    .from("organization_members")
    .select("user_id, organization_id")
    .in("organization_id", orgIds);

  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id);
  const memberOrg: Record<string, string> = {};
  for (const m of members) memberOrg[m.user_id] = m.organization_id;

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

  // Profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  const profileMap: Record<string, { email: string; name: string }> = {};
  for (const p of profiles ?? []) {
    profileMap[p.id] = { email: p.email ?? "", name: p.full_name ?? "" };
  }

  const risks: ChurnRisk[] = [];
  for (const [uid, act] of Object.entries(userActivity)) {
    const daysSince = Math.round(
      (now.getTime() - new Date(act.lastActive).getTime()) / 86400000,
    );
    const declining = act.curr < act.prev;
    const inactive = daysSince >= 7;

    let riskLevel: "high" | "medium" | "low" = "low";
    if (daysSince >= 14 || (inactive && declining && act.curr === 0))
      riskLevel = "high";
    else if (inactive || declining) riskLevel = "medium";

    if (riskLevel !== "low") {
      risks.push({
        userId: uid,
        email: profileMap[uid]?.email ?? "",
        name: profileMap[uid]?.name ?? "",
        plan: orgPlan[memberOrg[uid]] ?? "free",
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
  totalFollowers: number;
  avgEngagement: number;
}

export async function getPlatformDistribution(): Promise<
  PlatformDistribution[]
> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("platform, followers_count, engagement_rate");

  if (!profiles?.length) return [];

  const grouped: Record<
    string,
    { count: number; followers: number; engRates: number[] }
  > = {};

  for (const p of profiles) {
    if (!grouped[p.platform])
      grouped[p.platform] = { count: 0, followers: 0, engRates: [] };
    grouped[p.platform].count++;
    grouped[p.platform].followers += p.followers_count ?? 0;
    if (p.engagement_rate != null)
      grouped[p.platform].engRates.push(p.engagement_rate);
  }

  return Object.entries(grouped)
    .map(([platform, stats]) => ({
      platform,
      profileCount: stats.count,
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
