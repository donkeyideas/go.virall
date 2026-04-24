/**
 * SMO Score Computation
 *
 * Computes a Social Media Optimization score (0-100) based on 6 factors:
 *   Profile, Content, Consistency, Engagement, Growth, Monetization
 *
 * Each factor is 0-100 and the overall score is a weighted average.
 */

export type SmoInput = {
  // Profile completeness
  hasDisplayName: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
  hasMission: boolean;
  platformCount: number;

  // Content
  postCount: number;
  draftCount: number;
  scheduledCount: number;

  // Engagement (from scraped data)
  totalFollowers: number;
  totalFollowing: number;
  avgEngagementRate: number; // 0-1

  // Revenue / Deals
  dealCount: number;
  wonDealCount: number;
  totalRevenueCents: number;
  hasMediaKit: boolean;
  invoiceCount: number;

  // Timing
  daysSinceLastPost: number | null;
  accountAgeDays: number;
};

export type SmoOutput = {
  score: number;
  factor_profile: number;
  factor_content: number;
  factor_consistency: number;
  factor_engagement: number;
  factor_growth: number;
  factor_monetization: number;
};

const WEIGHTS = {
  profile: 0.15,
  content: 0.20,
  consistency: 0.20,
  engagement: 0.20,
  growth: 0.10,
  monetization: 0.15,
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.round(Math.max(min, Math.min(max, v)));
}

function computeProfile(input: SmoInput): number {
  let score = 0;
  if (input.hasDisplayName) score += 20;
  if (input.hasBio) score += 20;
  if (input.hasAvatar) score += 20;
  if (input.hasMission) score += 15;
  // Multi-platform bonus
  score += Math.min(25, input.platformCount * 10);
  return clamp(score);
}

function computeContent(input: SmoInput): number {
  if (input.postCount === 0) return 10; // base score for having an account
  let score = 0;
  // Volume score
  if (input.postCount >= 100) score += 40;
  else if (input.postCount >= 50) score += 30;
  else if (input.postCount >= 20) score += 20;
  else if (input.postCount >= 5) score += 15;
  else score += 5;

  // Drafts = working on content
  if (input.draftCount > 0) score += 15;
  // Scheduled = planning ahead
  if (input.scheduledCount > 0) score += 20;
  // Base score for having any content
  score += 15;
  // Using the platform at all
  score += 10;
  return clamp(score);
}

function computeConsistency(input: SmoInput): number {
  if (input.daysSinceLastPost === null) return 10;
  // Recently posted = consistent
  if (input.daysSinceLastPost <= 1) return 95;
  if (input.daysSinceLastPost <= 3) return 80;
  if (input.daysSinceLastPost <= 7) return 65;
  if (input.daysSinceLastPost <= 14) return 45;
  if (input.daysSinceLastPost <= 30) return 25;
  return 10;
}

function computeEngagement(input: SmoInput): number {
  if (input.totalFollowers === 0) return 10;
  let score = 10;

  // Follower milestones
  if (input.totalFollowers >= 100000) score += 35;
  else if (input.totalFollowers >= 10000) score += 30;
  else if (input.totalFollowers >= 1000) score += 20;
  else if (input.totalFollowers >= 100) score += 10;

  // Engagement rate
  if (input.avgEngagementRate >= 0.06) score += 40;
  else if (input.avgEngagementRate >= 0.03) score += 30;
  else if (input.avgEngagementRate >= 0.01) score += 15;
  else score += 5;

  // Follower/following ratio
  const ratio = input.totalFollowing > 0
    ? input.totalFollowers / input.totalFollowing
    : input.totalFollowers > 0 ? 10 : 0;
  if (ratio >= 5) score += 15;
  else if (ratio >= 2) score += 10;
  else if (ratio >= 1) score += 5;

  return clamp(score);
}

function computeGrowth(input: SmoInput): number {
  let score = 20; // base

  // Multi-platform presence = growth potential
  score += Math.min(30, input.platformCount * 12);

  // Follower milestones
  if (input.totalFollowers >= 10000) score += 30;
  else if (input.totalFollowers >= 1000) score += 20;
  else if (input.totalFollowers >= 100) score += 10;

  // Account age factor
  if (input.accountAgeDays > 365) score += 10;
  else if (input.accountAgeDays > 90) score += 5;

  return clamp(score);
}

function computeMonetization(input: SmoInput): number {
  let score = 0;

  // Has media kit
  if (input.hasMediaKit) score += 25;

  // Deals
  if (input.wonDealCount >= 5) score += 30;
  else if (input.wonDealCount >= 1) score += 20;
  else if (input.dealCount >= 1) score += 10;

  // Revenue
  if (input.totalRevenueCents >= 100000) score += 25; // $1000+
  else if (input.totalRevenueCents >= 10000) score += 15; // $100+
  else if (input.totalRevenueCents > 0) score += 5;

  // Invoices
  if (input.invoiceCount >= 1) score += 10;

  // Base score for being on the platform
  score += 10;

  return clamp(score);
}

export function computeSmoScore(input: SmoInput): SmoOutput {
  const fp = computeProfile(input);
  const fc = computeContent(input);
  const fcons = computeConsistency(input);
  const fe = computeEngagement(input);
  const fg = computeGrowth(input);
  const fm = computeMonetization(input);

  const score = clamp(
    fp * WEIGHTS.profile +
    fc * WEIGHTS.content +
    fcons * WEIGHTS.consistency +
    fe * WEIGHTS.engagement +
    fg * WEIGHTS.growth +
    fm * WEIGHTS.monetization,
  );

  return {
    score,
    factor_profile: fp,
    factor_content: fc,
    factor_consistency: fcons,
    factor_engagement: fe,
    factor_growth: fg,
    factor_monetization: fm,
  };
}
