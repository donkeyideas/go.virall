/**
 * Go Virall — Weekly Report Cron Endpoint.
 *
 * Sends weekly performance reports to all eligible users.
 * Protected by CRON_SECRET bearer token.
 *
 * Schedule: Every Monday at 9:00 AM UTC (configure in Vercel Cron or external scheduler)
 * GET /api/cron/weekly-report
 * Authorization: Bearer {CRON_SECRET}
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/plan-limits";
import { generateWeeklyReport } from "@/lib/email/weekly-report";
import { sendReportEmail } from "@/lib/email/resend";

// Batch size to avoid overwhelming Resend rate limits
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // ── Auth check ──
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startTime = Date.now();
  const results: { userId: string; email: string; status: "sent" | "skipped" | "error"; error?: string }[] = [];

  try {
    const admin = createAdminClient();

    // 1. Get all users who opted into weekly reports
    const { data: prefs, error: prefsError } = await admin
      .from("user_preferences")
      .select("id")
      .eq("weekly_report", true);

    if (prefsError) {
      console.error("[weekly-report cron] Failed to query user_preferences:", prefsError.message);
      return Response.json(
        { error: "Failed to query user preferences", details: prefsError.message },
        { status: 500 },
      );
    }

    if (!prefs || prefs.length === 0) {
      return Response.json({
        message: "No users opted into weekly reports",
        sent: 0,
        skipped: 0,
        errors: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`[weekly-report cron] Found ${prefs.length} users with weekly_report enabled`);

    // 2. Filter by plan eligibility — gather org plans for each user
    const eligibleUserIds: string[] = [];

    for (const pref of prefs) {
      const { data: profile } = await admin
        .from("profiles")
        .select("organization_id")
        .eq("id", pref.id)
        .single();

      if (!profile?.organization_id) {
        results.push({ userId: pref.id, email: "", status: "skipped", error: "No organization" });
        continue;
      }

      const { data: org } = await admin
        .from("organizations")
        .select("plan")
        .eq("id", profile.organization_id)
        .single();

      const plan = org?.plan || "free";
      const limits = getPlanLimits(plan);

      if (!limits.email_reports) {
        results.push({
          userId: pref.id,
          email: "",
          status: "skipped",
          error: `Plan "${plan}" does not include email reports`,
        });
        continue;
      }

      eligibleUserIds.push(pref.id);
    }

    console.log(`[weekly-report cron] ${eligibleUserIds.length} eligible users after plan filter`);

    // 3. Process in batches of BATCH_SIZE
    for (let i = 0; i < eligibleUserIds.length; i += BATCH_SIZE) {
      const batch = eligibleUserIds.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (userId) => {
        try {
          // Generate the report
          const report = await generateWeeklyReport(userId);

          if (!report || !report.email) {
            results.push({
              userId,
              email: "",
              status: "skipped",
              error: "No email or no social profiles",
            });
            return;
          }

          // Send the email
          const sendResult = await sendReportEmail({
            to: report.email,
            subject: `Your Weekly Performance Report — Go Virall`,
            html: report.html,
          });

          if ("error" in sendResult) {
            results.push({
              userId,
              email: report.email,
              status: "error",
              error: sendResult.error,
            });
            console.error(`[weekly-report cron] Failed to send to ${report.email}: ${sendResult.error}`);
          } else {
            results.push({
              userId,
              email: report.email,
              status: "sent",
            });
            console.log(`[weekly-report cron] Sent to ${report.email} (${report.userName})`);
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          results.push({
            userId,
            email: "",
            status: "error",
            error: errMsg,
          });
          console.error(`[weekly-report cron] Error for user ${userId}: ${errMsg}`);
        }
      });

      await Promise.all(batchPromises);

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < eligibleUserIds.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;
    const durationMs = Date.now() - startTime;

    console.log(
      `[weekly-report cron] Complete: ${sent} sent, ${skipped} skipped, ${errors} errors in ${durationMs}ms`,
    );

    return Response.json({
      message: "Weekly report cron completed",
      sent,
      skipped,
      errors,
      duration_ms: durationMs,
      details: results,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[weekly-report cron] Fatal error:", errMsg);
    return Response.json(
      {
        error: "Cron job failed",
        details: errMsg,
        duration_ms: Date.now() - startTime,
        results,
      },
      { status: 500 },
    );
  }
}
