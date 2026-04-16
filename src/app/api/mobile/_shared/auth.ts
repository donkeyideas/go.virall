/**
 * Shared auth + plan-limit helpers for mobile API routes.
 * Mirrors the server-action pattern in src/lib/actions/*.ts but adapted
 * for Bearer-token authenticated mobile clients.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPlanLimits, isWithinLimit, type PlanLimits } from "@/lib/plan-limits";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface AuthedUser {
  id: string;
  email?: string;
}

export interface AuthContext {
  user: AuthedUser;
  orgId: string;
  plan: string;
  limits: PlanLimits;
  isSuperadmin: boolean;
}

/** Authenticate via Bearer token */
export async function authenticateRequest(
  req: NextRequest,
): Promise<{ user: AuthedUser } | { error: NextResponse }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  return { user: { id: user.id, email: user.email } };
}

/**
 * Load full auth context: user, org, plan, limits, superadmin flag.
 * Returns 404 if the user has no organization set up yet.
 */
export async function getAuthContext(
  req: NextRequest,
): Promise<{ ctx: AuthContext } | { error: NextResponse }> {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return { error: auth.error };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("organization_id, system_role")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: NextResponse.json({ error: "Organization not found." }, { status: 404 }) };
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("plan")
    .eq("id", profile.organization_id)
    .single();

  const plan = org?.plan || "free";
  const limits = getPlanLimits(plan);
  const isSuperadmin =
    profile.system_role === "superadmin" || profile.system_role === "admin";

  return {
    ctx: {
      user: auth.user,
      orgId: profile.organization_id,
      plan,
      limits,
      isSuperadmin,
    },
  };
}

/**
 * Standard plan-limit-reached response. Mobile clients detect this via
 * `planLimitReached: true` and show an upgrade prompt.
 */
export function planLimitResponse(
  limit: keyof PlanLimits,
  plan: string,
  current: number,
  max: number,
): NextResponse {
  return NextResponse.json(
    {
      error: `You've hit your ${plan} plan limit for this feature. Upgrade to continue.`,
      planLimitReached: true,
      limit,
      current,
      max,
      upgradeUrl: "/dashboard/billing",
    },
    { status: 403 },
  );
}

/**
 * Count usage in current calendar month for a feature.
 * Used for monthly limits: ai_insights, ai_content, content_optimizations, proposals.
 */
export async function getMonthlyUsage(
  orgId: string,
  eventType: string,
): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("user_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("event_type", eventType)
    .gte("created_at", monthStart.toISOString());

  return count ?? 0;
}

/** Count usage today (UTC) for daily limits like chat_messages_per_day. */
export async function getDailyUsage(
  userId: string,
  eventType: string,
): Promise<number> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { count } = await supabaseAdmin
    .from("user_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .gte("created_at", dayStart.toISOString());

  return count ?? 0;
}

/** Log an event for usage-based plan-limit counting. */
export async function logUsageEvent(
  orgId: string,
  userId: string,
  eventType: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabaseAdmin.from("user_events").insert({
    organization_id: orgId,
    user_id: userId,
    event_type: eventType,
    metadata: metadata || {},
  });
}

export { isWithinLimit };
