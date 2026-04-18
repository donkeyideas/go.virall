"use server";

import { createAdminClient } from "@/lib/supabase/admin";

const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "linkedin",
  "threads",
  "pinterest",
  "twitch",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export interface PlatformHealth {
  platform: string;
  totalProfiles: number;
  syncedLast24h: number;
  failedLast24h: number;
  successRate: number;
  avgEngagement: number | null;
  lastSuccessfulSync: string | null;
}

export interface EngagementTrend {
  date: string;
  platform: string;
  avgEngagement: number;
  profileCount: number;
}

export interface AlgorithmEvent {
  id: string;
  platform: string;
  event_type: string;
  severity: string;
  title: string;
  description: string | null;
  metrics_snapshot: Record<string, unknown>;
  ai_analysis: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export interface AlgorithmAdjustment {
  id: string;
  event_id: string | null;
  platform: string;
  adjustment_type: string;
  current_value: Record<string, unknown>;
  suggested_value: Record<string, unknown>;
  ai_reasoning: string | null;
  status: string;
  created_at: string;
  applied_at: string | null;
}

export async function getPlatformHealthStats(): Promise<PlatformHealth[]> {
  const admin = createAdminClient();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const results: PlatformHealth[] = [];

  for (const platform of PLATFORMS) {
    // Total profiles for this platform
    const { count: totalProfiles } = await admin
      .from("social_profiles")
      .select("id", { count: "exact", head: true })
      .eq("platform", platform);

    // Synced in last 24h
    const { count: syncedLast24h } = await admin
      .from("social_profiles")
      .select("id", { count: "exact", head: true })
      .eq("platform", platform)
      .gte("last_synced_at", yesterday);

    // Failed = profiles that exist but haven't been synced in 48h (potential failure)
    const twoDaysAgo = new Date(
      now.getTime() - 48 * 60 * 60 * 1000,
    ).toISOString();
    const { count: failedLast24h } = await admin
      .from("social_profiles")
      .select("id", { count: "exact", head: true })
      .eq("platform", platform)
      .lt("last_synced_at", twoDaysAgo);

    // Avg engagement from profiles on this platform
    const { data: platformProfiles } = await admin
      .from("social_profiles")
      .select("engagement_rate")
      .eq("platform", platform)
      .not("engagement_rate", "is", null);

    const engRates = (platformProfiles ?? [])
      .map((p) => p.engagement_rate)
      .filter((r): r is number => r !== null && r > 0);
    const avgEngagement =
      engRates.length > 0
        ? Math.round(
            (engRates.reduce((s, r) => s + r, 0) / engRates.length) * 100,
          ) / 100
        : null;

    // Last successful sync
    const { data: lastSync } = await admin
      .from("social_profiles")
      .select("last_synced_at")
      .eq("platform", platform)
      .not("last_synced_at", "is", null)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const total = totalProfiles ?? 0;
    const synced = syncedLast24h ?? 0;

    results.push({
      platform,
      totalProfiles: total,
      syncedLast24h: synced,
      failedLast24h: failedLast24h ?? 0,
      successRate: total > 0 ? Math.round((synced / total) * 100) : 100,
      avgEngagement,
      lastSuccessfulSync: lastSync?.last_synced_at ?? null,
    });
  }

  return results;
}

export async function getAlgorithmEvents({
  limit = 50,
}: {
  limit?: number;
}): Promise<AlgorithmEvent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("algorithm_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AlgorithmEvent[]) ?? [];
}

export async function getAlgorithmAdjustments({
  limit = 30,
}: {
  limit?: number;
}): Promise<AlgorithmAdjustment[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("algorithm_adjustments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AlgorithmAdjustment[]) ?? [];
}

export async function getEngagementTrends(
  days: number,
): Promise<EngagementTrend[]> {
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString().split("T")[0];

  // Get daily engagement averages grouped by platform
  const { data: metrics } = await admin
    .from("social_metrics")
    .select("date, engagement_rate, social_profile_id")
    .gte("date", since)
    .not("engagement_rate", "is", null)
    .order("date", { ascending: true });

  if (!metrics?.length) return [];

  // Need to join with social_profiles to get platform
  const profileIds = [...new Set(metrics.map((m) => m.social_profile_id))];
  const { data: profilesData } = await admin
    .from("social_profiles")
    .select("id, platform")
    .in("id", profileIds);

  const platformMap: Record<string, string> = {};
  for (const p of profilesData ?? []) {
    platformMap[p.id] = p.platform;
  }

  // Group by date + platform
  const grouped: Record<
    string,
    { total: number; count: number }
  > = {};

  for (const m of metrics) {
    const platform = platformMap[m.social_profile_id];
    if (!platform) continue;
    const key = `${m.date}|${platform}`;
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
    grouped[key].total += m.engagement_rate;
    grouped[key].count += 1;
  }

  return Object.entries(grouped).map(([key, val]) => {
    const [date, platform] = key.split("|");
    return {
      date,
      platform,
      avgEngagement: Math.round((val.total / val.count) * 100) / 100,
      profileCount: val.count,
    };
  });
}

export async function getAppliedAdjustments(
  platform?: string,
): Promise<AlgorithmAdjustment[]> {
  const admin = createAdminClient();
  let query = admin
    .from("algorithm_adjustments")
    .select("*")
    .eq("status", "applied")
    .order("applied_at", { ascending: false });
  if (platform) query = query.eq("platform", platform);
  const { data } = await query;
  return (data as AlgorithmAdjustment[]) ?? [];
}

export async function getSyncRunLogs(limit = 20) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("sync_run_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
