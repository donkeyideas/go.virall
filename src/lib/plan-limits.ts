export type PlanKey = "free" | "pro" | "business" | "enterprise";

export interface PlanLimits {
  max_social_profiles: number;
  ai_insights_per_month: number;
  max_deals: number;
  data_sync_hours: number;
  max_competitors: number;
  ai_content_per_month: number;
  max_conversations: number;
  chat_messages_per_day: number;
  analytics_days: number;
  max_proposals_per_month: number;
  max_messages_per_day: number;
  content_optimizations_per_month: number;
  marketplace_listed: boolean;
  competitor_insights: boolean;
  email_reports: boolean;
  brand_discovery_results: number;
  trending_topics: boolean;
  cross_platform_publishing: boolean;
}

/** -1 = unlimited, 0 = real-time/disabled */
export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    max_social_profiles: 2,
    ai_insights_per_month: 10,
    max_deals: 2,
    data_sync_hours: 24,
    max_competitors: 0,
    ai_content_per_month: 5,
    max_conversations: 3,
    chat_messages_per_day: 5,
    analytics_days: 7,
    max_proposals_per_month: 3,
    max_messages_per_day: 10,
    content_optimizations_per_month: 3,
    marketplace_listed: false,
    competitor_insights: false,
    email_reports: false,
    brand_discovery_results: 10,
    trending_topics: false,
    cross_platform_publishing: false,
  },
  pro: {
    max_social_profiles: 3,
    ai_insights_per_month: -1,
    max_deals: 10,
    data_sync_hours: 6,
    max_competitors: 5,
    ai_content_per_month: 50,
    max_conversations: -1,
    chat_messages_per_day: -1,
    analytics_days: 30,
    max_proposals_per_month: 20,
    max_messages_per_day: -1,
    content_optimizations_per_month: 30,
    marketplace_listed: true,
    competitor_insights: true,
    email_reports: true,
    brand_discovery_results: 50,
    trending_topics: true,
    cross_platform_publishing: false,
  },
  business: {
    max_social_profiles: 10,
    ai_insights_per_month: -1,
    max_deals: -1,
    data_sync_hours: 2,
    max_competitors: 15,
    ai_content_per_month: -1,
    max_conversations: -1,
    chat_messages_per_day: -1,
    analytics_days: 90,
    max_proposals_per_month: -1,
    max_messages_per_day: -1,
    content_optimizations_per_month: -1,
    marketplace_listed: true,
    competitor_insights: true,
    email_reports: true,
    brand_discovery_results: -1,
    trending_topics: true,
    cross_platform_publishing: true,
  },
  enterprise: {
    max_social_profiles: -1,
    ai_insights_per_month: -1,
    max_deals: -1,
    data_sync_hours: 0,
    max_competitors: -1,
    ai_content_per_month: -1,
    max_conversations: -1,
    chat_messages_per_day: -1,
    analytics_days: -1,
    max_proposals_per_month: -1,
    max_messages_per_day: -1,
    content_optimizations_per_month: -1,
    marketplace_listed: true,
    competitor_insights: true,
    email_reports: true,
    brand_discovery_results: -1,
    trending_topics: true,
    cross_platform_publishing: true,
  },
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanKey] ?? PLAN_LIMITS.free;
}

export function isWithinLimit(current: number, limit: number): boolean {
  if (limit === -1) return true;
  return current < limit;
}
