/**
 * Goal seeding — auto-creates a `social_goals` row from a user's
 * `primary_goal` when they connect a new social profile.
 *
 * Maps the 4 user-level PrimaryGoal values to the corresponding
 * per-profile `social_goals.primary_objective` values + realistic
 * target defaults based on follower tier.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { PrimaryGoal } from "@/types";

/** Map user-level primary_goal → social_goals.primary_objective */
const GOAL_TO_OBJECTIVE: Record<PrimaryGoal, string> = {
  grow_audience: "grow_followers",
  make_money: "monetize",
  build_brand: "build_brand",
  drive_traffic: "drive_traffic",
};

/** Reasonable default target for grow_audience based on follower tier */
function defaultGrowthTarget(followers: number): number {
  if (followers < 1000) return Math.max(500, followers * 2);
  if (followers < 10_000) return Math.floor(followers * 2);
  if (followers < 100_000) return Math.floor(followers * 1.5);
  return Math.floor(followers * 1.25);
}

/**
 * Seed an active `social_goals` row for a newly-connected profile based
 * on the user's `profiles.primary_goal`. No-op if:
 *   - the user has no primary_goal set
 *   - the profile already has any goal (so we never overwrite user edits)
 */
export async function seedGoalFromPrimary(
  userId: string,
  socialProfileId: string,
  followers: number,
): Promise<void> {
  const admin = createAdminClient();

  // Fetch the user's primary_goal
  const { data: profile } = await admin
    .from("profiles")
    .select("primary_goal")
    .eq("id", userId)
    .single();

  const primaryGoal = profile?.primary_goal as PrimaryGoal | null | undefined;
  if (!primaryGoal) return;

  // Don't overwrite if a goal already exists for this profile
  const { count } = await admin
    .from("social_goals")
    .select("id", { count: "exact", head: true })
    .eq("social_profile_id", socialProfileId);

  if ((count ?? 0) > 0) return;

  const objective = GOAL_TO_OBJECTIVE[primaryGoal];
  const targetDays = 90;
  const targetValue =
    primaryGoal === "grow_audience" ? defaultGrowthTarget(followers) : null;

  await admin.from("social_goals").insert({
    social_profile_id: socialProfileId,
    primary_objective: objective,
    target_value: targetValue,
    target_days: targetDays,
    is_active: true,
  });
}
