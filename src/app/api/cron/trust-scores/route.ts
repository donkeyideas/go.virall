/**
 * Go Virall — Trust Score Recalculation Cron.
 *
 * Recalculates trust scores for all profiles with closed deals.
 * Handles recency weighting decay.
 * Protected by CRON_SECRET bearer token.
 *
 * Schedule: Daily at 02:00 UTC
 * GET /api/cron/trust-scores
 * Authorization: Bearer {CRON_SECRET}
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateTrustScore } from "@/lib/trust-score";

const BATCH_SIZE = 10;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  let processed = 0;
  let errors = 0;

  try {
    // Get all unique profile IDs involved in platform deals with closure outcomes
    const { data: closureOutcomes } = await admin
      .from("deal_closure_outcomes")
      .select("user_id");

    const profileIds = [...new Set((closureOutcomes ?? []).map((o) => o.user_id))];

    // Process in batches
    for (let i = 0; i < profileIds.length; i += BATCH_SIZE) {
      const batch = profileIds.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (profileId) => {
          try {
            await calculateTrustScore(profileId);
            processed++;
          } catch (err) {
            console.error(`Trust score calc error for ${profileId}:`, err);
            errors++;
          }
        }),
      );

      // Small delay between batches to avoid overwhelming the DB
      if (i + BATCH_SIZE < profileIds.length) {
        await sleep(500);
      }
    }

    return Response.json({
      success: true,
      processed,
      errors,
      totalProfiles: profileIds.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trust scores cron error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
