export type PlanKey = "free" | "pro" | "business" | "enterprise";

export interface PlanLimits {
  max_social_profiles: number;
  ai_insights_per_month: number;
  max_deals: number;
  data_sync_hours: number;
  max_competitors: number;
  ai_content_per_month: number;
  max_conversations: number;
}

/** -1 = unlimited, 0 = real-time/disabled */
export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    max_social_profiles: 1,
    ai_insights_per_month: 3,
    max_deals: 2,
    data_sync_hours: 24,
    max_competitors: 0,
    ai_content_per_month: 0,
    max_conversations: 0,
  },
  pro: {
    max_social_profiles: 3,
    ai_insights_per_month: -1,
    max_deals: 10,
    data_sync_hours: 6,
    max_competitors: 5,
    ai_content_per_month: 50,
    max_conversations: 10,
  },
  business: {
    max_social_profiles: 10,
    ai_insights_per_month: -1,
    max_deals: -1,
    data_sync_hours: 2,
    max_competitors: 15,
    ai_content_per_month: -1,
    max_conversations: -1,
  },
  enterprise: {
    max_social_profiles: -1,
    ai_insights_per_month: -1,
    max_deals: -1,
    data_sync_hours: 0,
    max_competitors: -1,
    ai_content_per_month: -1,
    max_conversations: -1,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanKey] ?? PLAN_LIMITS.free;
}

export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true;
  return current < limit;
}
