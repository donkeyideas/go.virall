/**
 * SMO Score Computation
 *
 * Computes a Social Media Optimization score (0-100) based on 6 factors:
 *   Profile, Content, Consistency, Engagement, Growth, Monetization
 *
 * Each factor is 0-100 and the overall score is a weighted average.
 * Designed to score realistically for both small creators and mega-accounts
 * using data available from public profile scraping.
 */

export type SmoInput = {
  hasDisplayName: boolean;
  hasBio: boolean;
  hasAvatar: boolean;
  hasMission: boolean;
  platformCount: number;
  verified: boolean;

  postCount: number;
  draftCount: number;
  scheduledCount: number;

  totalFollowers: number;
  totalFollowing: number;
  avgEngagementRate: number; // 0-1

  dealCount: number;
  wonDealCount: number;
  totalRevenueCents: number;
  hasMediaKit: boolean;
  invoiceCount: number;

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

// Each tier is [lowerBound, upperBound, scoreLower, scoreUpper].
function tieredScale(value: number, tiers: [number, number, number, number][]): number {
  if (value <= 0) return 0;
  for (const [lo, hi, sLo, sHi] of tiers) {
    if (value <= hi) {
      const t = (value - lo) / (hi - lo);
      return sLo + t * (sHi - sLo);
    }
  }
  return tiers[tiers.length - 1][3];
}

const FOLLOWER_TIERS: [number, number, number, number][] = [
  [0,          1_000,         0,   8],
  [1_000,      10_000,        8,  18],
  [10_000,     100_000,      18,  28],
  [100_000,    1_000_000,    28,  38],
  [1_000_000,  10_000_000,   38,  48],
  [10_000_000, 50_000_000,   48,  55],
  [50_000_000, 100_000_000,  55,  60],
];

const POST_TIERS: [number, number, number, number][] = [
  [0,       50,      0,  15],
  [50,      500,    15,  30],
  [500,     5_000,  30,  50],
  [5_000,   50_000, 50,  65],
  [50_000,  200_000, 65, 73],
  [200_000, 500_000, 73, 75],
];

function computeProfile(input: SmoInput): number {
  let score = 0;
  if (input.hasDisplayName) score += 20;
  if (input.hasBio) score += 20;
  if (input.hasAvatar) score += 20;
  if (input.hasMission) score += 10;
  if (input.verified) score += 15;
  score += Math.min(15, input.platformCount * 6);
  return clamp(score);
}

function computeContent(input: SmoInput): number {
  if (input.postCount === 0) return 5;
  let score = 10;
  score += tieredScale(input.postCount, POST_TIERS);
  if (input.draftCount > 0) score += 8;
  if (input.scheduledCount > 0) score += 7;
  return clamp(score);
}

function computeConsistency(input: SmoInput): number {
  if (input.daysSinceLastPost !== null) {
    if (input.daysSinceLastPost <= 1) return 95;
    if (input.daysSinceLastPost <= 3) return 85;
    if (input.daysSinceLastPost <= 7) return 70;
    if (input.daysSinceLastPost <= 14) return 50;
    if (input.daysSinceLastPost <= 30) return 30;
    return 10;
  }
  // No post history in DB — infer activity level from total post count
  if (input.postCount >= 50_000) return 80;
  if (input.postCount >= 10_000) return 70;
  if (input.postCount >= 1_000) return 55;
  if (input.postCount >= 100) return 40;
  if (input.postCount > 0) return 20;
  return 5;
}

function computeEngagement(input: SmoInput): number {
  if (input.totalFollowers === 0) return 5;
  let score = 5;

  score += tieredScale(input.totalFollowers, FOLLOWER_TIERS);

  if (input.avgEngagementRate >= 0.06) score += 30;
  else if (input.avgEngagementRate >= 0.03) score += 22;
  else if (input.avgEngagementRate >= 0.01) score += 12;
  else if (input.avgEngagementRate > 0) score += 5;
  else if (input.totalFollowers >= 100_000) score += 8;

  const ratio = input.totalFollowing > 0
    ? input.totalFollowers / input.totalFollowing
    : input.totalFollowers > 0 ? 100 : 0;
  if (ratio >= 10) score += 15;
  else if (ratio >= 5) score += 12;
  else if (ratio >= 2) score += 8;
  else if (ratio >= 1) score += 4;

  if (input.verified) score += 10;

  return clamp(score);
}

function computeGrowth(input: SmoInput): number {
  let score = 15;
  score += Math.min(20, input.platformCount * 8);
  score += tieredScale(input.totalFollowers, FOLLOWER_TIERS) * (40 / 60);
  if (input.accountAgeDays > 365) score += 10;
  else if (input.accountAgeDays > 90) score += 5;
  if (input.verified) score += 10;
  return clamp(score);
}

function computeMonetization(input: SmoInput): number {
  let score = 5;

  // Audience-based monetization potential
  if (input.totalFollowers >= 10_000_000) score += 40;
  else if (input.totalFollowers >= 1_000_000) score += 32;
  else if (input.totalFollowers >= 100_000) score += 22;
  else if (input.totalFollowers >= 10_000) score += 12;
  else if (input.totalFollowers >= 1_000) score += 5;

  if (input.hasMediaKit) score += 18;

  if (input.wonDealCount >= 5) score += 18;
  else if (input.wonDealCount >= 1) score += 12;
  else if (input.dealCount >= 1) score += 6;

  if (input.totalRevenueCents >= 100_000) score += 12;
  else if (input.totalRevenueCents >= 10_000) score += 8;
  else if (input.totalRevenueCents > 0) score += 3;

  if (input.invoiceCount >= 1) score += 7;

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
