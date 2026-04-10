/**
 * Go Virall — Stale Deals Cron Endpoint.
 *
 * Auto-marks deals as stale after 30 days of inactivity.
 * Finalizes disputes past their 7-day deadline.
 * Protected by CRON_SECRET bearer token.
 *
 * Schedule: Daily at 00:00 UTC
 * GET /api/cron/stale-deals
 * Authorization: Bearer {CRON_SECRET}
 */

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  let staleCount = 0;
  let disputeCount = 0;

  try {
    // 1. Auto-stale: deals in deliverable-complete stages with no closure for 30+ days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleCandidates } = await admin
      .from("deals")
      .select("id, organization_id, brand_profile_id, brand_name")
      .eq("is_from_platform", true)
      .is("closure_status", null)
      .in("pipeline_stage", ["delivered", "invoiced", "paid"])
      .lt("updated_at", thirtyDaysAgo.toISOString());

    for (const deal of staleCandidates ?? []) {
      await admin
        .from("deals")
        .update({
          closure_status: "stale",
          final_outcome: "stale",
          closed_at: now,
          updated_at: now,
        })
        .eq("id", deal.id);

      // Notify both parties
      const orgIds: string[] = [deal.organization_id];
      if (deal.brand_profile_id) {
        const { data: bp } = await admin
          .from("profiles")
          .select("organization_id")
          .eq("id", deal.brand_profile_id)
          .single();
        if (bp?.organization_id) orgIds.push(bp.organization_id);
      }

      for (const orgId of orgIds) {
        await admin.from("notifications").insert({
          organization_id: orgId,
          title: "Deal Marked Stale",
          body: `Deal with "${deal.brand_name}" was auto-closed as stale (30 days inactive).`,
          type: "deal_stale",
          is_read: false,
        });
      }

      staleCount++;
    }

    // 2. Finalize expired disputes
    const { data: expiredDisputes } = await admin
      .from("deals")
      .select("id, organization_id, brand_profile_id, brand_name")
      .eq("closure_status", "disputed")
      .lt("dispute_deadline", now);

    for (const deal of expiredDisputes ?? []) {
      // Lock all outcomes
      await admin
        .from("deal_closure_outcomes")
        .update({ is_locked: true })
        .eq("deal_id", deal.id);

      await admin
        .from("deals")
        .update({
          final_outcome: "disputed",
          closed_at: now,
          updated_at: now,
        })
        .eq("id", deal.id);

      // Notify both parties
      const orgIds: string[] = [deal.organization_id];
      if (deal.brand_profile_id) {
        const { data: bp } = await admin
          .from("profiles")
          .select("organization_id")
          .eq("id", deal.brand_profile_id)
          .single();
        if (bp?.organization_id) orgIds.push(bp.organization_id);
      }

      for (const orgId of orgIds) {
        await admin.from("notifications").insert({
          organization_id: orgId,
          title: "Dispute Unresolved",
          body: `The dispute for "${deal.brand_name}" was not resolved and is now permanent.`,
          type: "deal_closure_expired",
          is_read: false,
        });
      }

      disputeCount++;
    }

    return Response.json({
      success: true,
      staleDeals: staleCount,
      expiredDisputes: disputeCount,
      timestamp: now,
    });
  } catch (error) {
    console.error("Stale deals cron error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
