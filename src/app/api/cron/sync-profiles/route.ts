/**
 * Go Virall — Automated Profile Sync Cron.
 *
 * Syncs social profiles based on plan priority:
 *   Enterprise (real-time) → Business (2h) → Pro (6h) → Free (24h)
 * Only syncs profiles of users active in the last 30 days.
 *
 * Schedule: Every 15 minutes
 * GET /api/cron/sync-profiles
 * Authorization: Bearer {CRON_SECRET}
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { syncProfileAdmin } from "@/lib/actions/profiles";
import { runAlgorithmAnalysis } from "@/lib/actions/algorithm-monitor";

const BATCH_SIZE = 5;
const MAX_PER_RUN = 50;
const BATCH_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Map plan name → sync interval in hours. 0 = real-time (every run). */
function syncIntervalHours(plan: string): number {
  switch (plan) {
    case "enterprise":
      return 0;
    case "business":
      return 2;
    case "pro":
      return 6;
    default:
      return 24;
  }
}

/** Lower = higher priority. */
function planPriority(plan: string): number {
  switch (plan) {
    case "enterprise":
      return 10;
    case "business":
      return 20;
    case "pro":
      return 30;
    default:
      return 50;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startTime = Date.now();
  const admin = createAdminClient();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // ── Phase 1: Find profiles due for sync ──
    // Join profiles → organizations to get the plan, and check last activity
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: profiles } = await admin
      .from("social_profiles")
      .select(
        "id, platform, last_synced_at, organization_id, organizations!inner(plan, profiles!inner(id, last_sign_in_at))",
      )
      .order("last_synced_at", { ascending: true, nullsFirst: true });

    if (!profiles || profiles.length === 0) {
      return Response.json({
        success: true,
        message: "No profiles to sync",
        timestamp: new Date().toISOString(),
      });
    }

    // Filter to profiles that are due for sync + belong to active users
    type ProfileRow = (typeof profiles)[number] & {
      organizations: {
        plan: string;
        profiles: { id: string; last_sign_in_at: string | null }[];
      };
    };

    const dueProfiles: { id: string; priority: number; platform: string }[] =
      [];

    for (const raw of profiles) {
      const p = raw as unknown as ProfileRow;
      const plan = p.organizations?.plan ?? "free";
      const intervalH = syncIntervalHours(plan);

      // Check if the org has at least one user who logged in within 30 days
      const orgProfiles = p.organizations?.profiles ?? [];
      const hasActiveUser = orgProfiles.some(
        (u) => u.last_sign_in_at && u.last_sign_in_at > thirtyDaysAgo,
      );
      if (!hasActiveUser) continue;

      // Check if this profile is due for sync
      if (p.last_synced_at) {
        const hoursSince =
          (Date.now() - new Date(p.last_synced_at).getTime()) / (1000 * 60 * 60);
        if (intervalH > 0 && hoursSince < intervalH) continue;
      }

      dueProfiles.push({
        id: p.id,
        priority: planPriority(plan),
        platform: p.platform,
      });
    }

    // Sort by priority (lowest number = highest priority), cap at MAX_PER_RUN
    dueProfiles.sort((a, b) => a.priority - b.priority);
    const toSync = dueProfiles.slice(0, MAX_PER_RUN);

    if (toSync.length === 0) {
      return Response.json({
        success: true,
        message: "All profiles up to date",
        timestamp: new Date().toISOString(),
      });
    }

    // ── Phase 2: Process in batches ──
    for (let i = 0; i < toSync.length; i += BATCH_SIZE) {
      const batch = toSync.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((p) => syncProfileAdmin(p.id)),
      );

      for (const result of results) {
        processed++;
        if (
          result.status === "fulfilled" &&
          result.value.success
        ) {
          succeeded++;
        } else {
          failed++;
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < toSync.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    // ── Log the run ──
    await admin.from("sync_run_log").insert({
      profiles_processed: processed,
      profiles_succeeded: succeeded,
      profiles_failed: failed,
      duration_ms: Date.now() - startTime,
      metadata: {
        total_due: dueProfiles.length,
        batch_size: BATCH_SIZE,
        max_per_run: MAX_PER_RUN,
      },
    });

    // ── Phase 3: Anomaly Detection (once daily) ──
    // Only runs if no anomaly check has been done in the last 24 hours.
    // Compares week-over-week engagement per platform and auto-triggers AI analysis on drops >20%.
    const anomaliesDetected: string[] = [];
    try {
      // Check if we already ran anomaly detection today
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentAnalyses } = await admin
        .from("algorithm_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneDayAgo);

      const shouldRunAnomalyCheck = (recentAnalyses ?? 0) === 0;

      if (shouldRunAnomalyCheck) {
        const PLATFORMS = ["instagram", "tiktok", "youtube", "twitter", "linkedin", "threads", "pinterest", "twitch"];
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        // Get engagement metrics for last 14 days
        const { data: recentMetrics } = await admin
          .from("social_metrics")
          .select("date, engagement_rate, social_profile_id")
          .gte("date", fourteenDaysAgo)
          .not("engagement_rate", "is", null);

        if (recentMetrics?.length) {
          // Map profile IDs to platforms
          const profileIds = [...new Set(recentMetrics.map((m) => m.social_profile_id))];
          const { data: profilesData } = await admin
            .from("social_profiles")
            .select("id, platform")
            .in("id", profileIds);

          const platformMap: Record<string, string> = {};
          for (const p of profilesData ?? []) platformMap[p.id] = p.platform;

          // Calculate WoW averages per platform
          for (const platform of PLATFORMS) {
            const platformMetrics = recentMetrics.filter(
              (m) => platformMap[m.social_profile_id] === platform,
            );
            if (platformMetrics.length < 4) continue; // need enough data

            const thisWeek = platformMetrics.filter((m) => m.date >= sevenDaysAgo);
            const lastWeek = platformMetrics.filter((m) => m.date < sevenDaysAgo);

            if (thisWeek.length === 0 || lastWeek.length === 0) continue;

            const thisAvg = thisWeek.reduce((s, m) => s + m.engagement_rate, 0) / thisWeek.length;
            const lastAvg = lastWeek.reduce((s, m) => s + m.engagement_rate, 0) / lastWeek.length;

            if (lastAvg <= 0) continue;
            const changePercent = ((thisAvg - lastAvg) / lastAvg) * 100;

            // Auto-trigger AI analysis if engagement dropped >20%
            if (changePercent < -20) {
              await runAlgorithmAnalysis(platform);
              anomaliesDetected.push(`${platform} (${changePercent.toFixed(1)}% WoW)`);
            }
          }
        }
      }
    } catch (anomalyError) {
      console.error("Anomaly detection error (non-fatal):", anomalyError);
    }

    return Response.json({
      success: true,
      processed,
      succeeded,
      failed,
      totalDue: dueProfiles.length,
      anomaliesDetected,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Sync profiles cron error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
