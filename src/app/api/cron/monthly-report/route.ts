/**
 * Go Virall — Monthly Report Cron Endpoint.
 *
 * Sends comprehensive monthly performance reports to all eligible users.
 * Protected by CRON_SECRET bearer token.
 *
 * Schedule: 1st of every month at 9:00 AM UTC (configure in Vercel Cron or external scheduler)
 * GET /api/cron/monthly-report
 * Authorization: Bearer {CRON_SECRET}
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits } from "@/lib/plan-limits";
import { generateMonthlyReport } from "@/lib/email/monthly-report";
import { sendReportEmail } from "@/lib/email/resend";

// Batch size — smaller than weekly since monthly reports are more resource-intensive
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;

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

    // 1. Get all users who opted into email reports
    //    Uses weekly_report preference since the DB schema does not have a separate
    //    monthly_report column — users who opt into weekly reports also get monthly.
    const { data: prefs, error: prefsError } = await admin
      .from("user_preferences")
      .select("id")
      .eq("weekly_report", true);

    if (prefsError) {
      console.error("[monthly-report cron] Failed to query user_preferences:", prefsError.message);
      return Response.json(
        { error: "Failed to query user preferences", details: prefsError.message },
        { status: 500 },
      );
    }

    if (!prefs || prefs.length === 0) {
      return Response.json({
        message: "No users opted into reports",
        sent: 0,
        skipped: 0,
        errors: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    console.log(`[monthly-report cron] Found ${prefs.length} users with weekly_report enabled`);

    // 2. Filter by plan eligibility
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

    console.log(`[monthly-report cron] ${eligibleUserIds.length} eligible users after plan filter`);

    // 3. Process in batches — smaller batch size since monthly reports query more data
    for (let i = 0; i < eligibleUserIds.length; i += BATCH_SIZE) {
      const batch = eligibleUserIds.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (userId) => {
        try {
          // Generate the report
          const report = await generateMonthlyReport(userId);

          if (!report || !report.email) {
            results.push({
              userId,
              email: "",
              status: "skipped",
              error: "No email or no social profiles",
            });
            return;
          }

          // Determine the month name for the subject
          const now = new Date();
          const lastMonth = new Date(now);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const monthName = lastMonth.toLocaleDateString("en-US", { month: "long" });

          // Send the email
          const sendResult = await sendReportEmail({
            to: report.email,
            subject: `Your ${monthName} Monthly Report — Go Virall`,
            html: report.html,
          });

          if ("error" in sendResult) {
            results.push({
              userId,
              email: report.email,
              status: "error",
              error: sendResult.error,
            });
            console.error(`[monthly-report cron] Failed to send to ${report.email}: ${sendResult.error}`);
          } else {
            results.push({
              userId,
              email: report.email,
              status: "sent",
            });
            console.log(`[monthly-report cron] Sent to ${report.email} (${report.userName})`);
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          results.push({
            userId,
            email: "",
            status: "error",
            error: errMsg,
          });
          console.error(`[monthly-report cron] Error for user ${userId}: ${errMsg}`);
        }
      });

      await Promise.all(batchPromises);

      // Longer delay between batches for monthly reports (more AI + DB calls per user)
      if (i + BATCH_SIZE < eligibleUserIds.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;
    const durationMs = Date.now() - startTime;

    console.log(
      `[monthly-report cron] Complete: ${sent} sent, ${skipped} skipped, ${errors} errors in ${durationMs}ms`,
    );

    return Response.json({
      message: "Monthly report cron completed",
      sent,
      skipped,
      errors,
      duration_ms: durationMs,
      details: results,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[monthly-report cron] Fatal error:", errMsg);
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
