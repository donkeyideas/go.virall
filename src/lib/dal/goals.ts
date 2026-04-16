"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SocialGoal } from "@/types";

export interface GoalProgress {
  goalId: string;
  profileId: string;
  platform: string;
  handle: string;
  objective: string;
  targetValue: number;
  currentValue: number;
  percent: number;
  targetDays: number;
  daysElapsed: number;
  daysRemaining: number;
  /** Projected final value if current pace holds */
  projectedValue: number | null;
  /** "on_track" | "ahead" | "behind" | "no_target" */
  status: "on_track" | "ahead" | "behind" | "no_target";
}

export async function getActiveGoal(
  profileId: string,
): Promise<SocialGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .eq("is_active", true)
    .limit(1)
    .single();

  return data as SocialGoal | null;
}

export async function getAllGoals(
  profileId: string,
): Promise<SocialGoal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("created_at", { ascending: false });

  return (data ?? []) as SocialGoal[];
}

/**
 * Compute progress toward every active goal for the current user's org.
 * Uses follower count as the current value for any grow-followers goal.
 * Returns one GoalProgress per active goal.
 */
export async function getOrgGoalProgress(): Promise<GoalProgress[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data: userProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  const orgId = userProfile?.organization_id;
  if (!orgId) return [];

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id, platform, handle, followers_count")
    .eq("organization_id", orgId);
  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map(
    (p: { id: string }) => p.id,
  );

  const { data: goals } = await admin
    .from("social_goals")
    .select(
      "id, social_profile_id, primary_objective, target_value, target_days, created_at",
    )
    .in("social_profile_id", profileIds)
    .eq("is_active", true);

  if (!goals || goals.length === 0) return [];

  return goals.map((g: {
    id: string;
    social_profile_id: string;
    primary_objective: string | null;
    target_value: number | null;
    target_days: number | null;
    created_at: string;
  }) => {
    const profile = profiles.find(
      (p: { id: string }) => p.id === g.social_profile_id,
    ) as {
      id: string;
      platform: string;
      handle: string;
      followers_count: number;
    } | undefined;
    const currentValue = profile?.followers_count ?? 0;
    const createdAt = new Date(g.created_at);
    const daysElapsed = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const targetValue = g.target_value ?? 0;
    const targetDays = g.target_days ?? 90;
    const daysRemaining = Math.max(0, targetDays - daysElapsed);
    const percent =
      targetValue > 0
        ? Math.min(100, Math.round((currentValue / targetValue) * 100))
        : 0;

    // Projected final value if current pace holds
    let projectedValue: number | null = null;
    let status: GoalProgress["status"] = "no_target";
    if (targetValue > 0 && daysElapsed > 0) {
      projectedValue = Math.round(
        (currentValue / daysElapsed) * targetDays,
      );
      const expectedByNow = (targetValue * daysElapsed) / targetDays;
      if (currentValue >= expectedByNow * 1.05) status = "ahead";
      else if (currentValue < expectedByNow * 0.85) status = "behind";
      else status = "on_track";
    } else if (targetValue > 0) {
      status = "on_track";
    }

    return {
      goalId: g.id,
      profileId: g.social_profile_id,
      platform: profile?.platform ?? "",
      handle: profile?.handle ?? "",
      objective: g.primary_objective || "grow_followers",
      targetValue,
      currentValue,
      percent,
      targetDays,
      daysElapsed,
      daysRemaining,
      projectedValue,
      status,
    };
  });
}
