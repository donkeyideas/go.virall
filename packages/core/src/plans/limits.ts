/**
 * Plan limits — hardcoded fallback matching DB seeds.
 * Used when DB is unavailable or for quick checks without a round-trip.
 */

export type PlanTier = 'free' | 'creator' | 'pro' | 'agency';

export type PlanLimits = {
  maxPlatforms: number;   // -1 = unlimited
  maxAnalyses: number;    // per month, -1 = unlimited
  maxContentGens: number; // per month, -1 = unlimited
  maxAiMessages: number;  // per day, -1 = unlimited
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { maxPlatforms: 1, maxAnalyses: 10, maxContentGens: 5, maxAiMessages: 5 },
  creator: { maxPlatforms: 7, maxAnalyses: -1, maxContentGens: -1, maxAiMessages: -1 },
  pro: { maxPlatforms: 7, maxAnalyses: -1, maxContentGens: -1, maxAiMessages: -1 },
  agency: { maxPlatforms: -1, maxAnalyses: -1, maxContentGens: -1, maxAiMessages: -1 },
};

export type LimitResource = 'platforms' | 'analyses' | 'contentGens' | 'aiMessages';

const RESOURCE_KEY: Record<LimitResource, keyof PlanLimits> = {
  platforms: 'maxPlatforms',
  analyses: 'maxAnalyses',
  contentGens: 'maxContentGens',
  aiMessages: 'maxAiMessages',
};

/**
 * Check whether the user has room under their plan limit.
 * Returns { allowed, limit, used }.
 * A limit of -1 means unlimited → always allowed.
 */
export function checkLimit(
  tier: string,
  resource: LimitResource,
  currentCount: number,
  overrides?: Partial<PlanLimits>,
): { allowed: boolean; limit: number; used: number } {
  const planTier = (tier || 'free') as PlanTier;
  const base = PLAN_LIMITS[planTier] ?? PLAN_LIMITS.free;
  const limits = overrides ? { ...base, ...overrides } : base;
  const key = RESOURCE_KEY[resource];
  const limit = limits[key];

  if (limit === -1) return { allowed: true, limit: -1, used: currentCount };
  return { allowed: currentCount < limit, limit, used: currentCount };
}

export function formatLimit(value: number): string {
  return value === -1 ? 'Unlimited' : String(value);
}
