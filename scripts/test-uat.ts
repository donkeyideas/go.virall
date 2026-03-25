/**
 * UAT verification for platform-specific changes.
 * Run: npx tsx scripts/test-uat.ts
 */

// Use relative paths since @ alias may not resolve with tsx
import { PLATFORM_ALGORITHMS, getAlgorithmContext, getFullAlgorithmBlock } from "../src/lib/ai/platform-algorithms";
import { PLATFORM_STATS, resolveStatsForProfile } from "../src/lib/platform-stats";
import type { SocialProfile, SocialPlatform } from "../src/types/index";

// ─── Test 1: Platform algorithms config ───
console.log("═══ TEST 1: Platform Algorithms Config ═══");
const platforms = Object.keys(PLATFORM_ALGORITHMS) as SocialPlatform[];
console.log(`Platforms defined: ${platforms.length} (expected: 8)`);
console.log(`Names: ${platforms.join(", ")}`);

for (const p of platforms) {
  const algo = PLATFORM_ALGORITHMS[p];
  console.log(`  ${p}: "${algo.algoName}" — ${algo.contentFormats.length} formats, ${algo.keyTactics.length} tactics`);
}
console.log(platforms.length === 8 ? "✓ PASS" : "✗ FAIL");

// ─── Test 2: Algorithm context rendering ───
console.log("\n═══ TEST 2: Algorithm Context Rendering ═══");
for (const p of ["instagram", "tiktok", "youtube", "linkedin", "twitch"] as SocialPlatform[]) {
  const ctx = getAlgorithmContext(p);
  const hasAlgoName = ctx.includes(PLATFORM_ALGORITHMS[p].algoName);
  const hasPrimarySignal = ctx.includes("Primary Signal");
  console.log(`  ${p}: algoName=${hasAlgoName ? "✓" : "✗"}, primarySignal=${hasPrimarySignal ? "✓" : "✗"}, length=${ctx.length}`);
}

// ─── Test 3: Platform stats config ───
console.log("\n═══ TEST 3: Platform Stats Config ═══");
for (const p of platforms) {
  const stats = PLATFORM_STATS[p];
  const labels = stats.map(s => s.label);
  console.log(`  ${p}: ${labels.join(" | ")}`);
}

// ─── Test 4: resolveStatsForProfile for each platform ───
console.log("\n═══ TEST 4: Stats Resolution ═══");
const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

// Mock profiles matching the DB data
const mockProfiles: Partial<SocialProfile>[] = [
  {
    platform: "instagram",
    followers_count: 4444775,
    following_count: 739,
    posts_count: 12773,
    engagement_rate: 2.3,
    platform_data: null,
  },
  {
    platform: "tiktok",
    followers_count: 5700000,
    following_count: 162,
    posts_count: 7736,
    engagement_rate: 1.5,
    platform_data: { hearts: 850000000 },
  },
  {
    platform: "youtube",
    followers_count: 2970000,
    following_count: 0,
    posts_count: 237166,
    engagement_rate: null,
    platform_data: { totalViews: 1500000000, channelId: "UC123" },
  },
  {
    platform: "twitch",
    followers_count: 50000,
    following_count: 100,
    posts_count: 0,
    engagement_rate: null,
    platform_data: { isLive: true, totalViews: 2500000 },
  },
  {
    platform: "linkedin",
    followers_count: 85773,
    following_count: 0,
    posts_count: 0,
    engagement_rate: null,
    platform_data: { profileType: "company", jobTitle: null },
  },
];

for (const mock of mockProfiles) {
  const resolved = resolveStatsForProfile(mock as SocialProfile, formatCompact);
  console.log(`  ${mock.platform}:`);
  for (const s of resolved) {
    console.log(`    ${s.label}: ${s.value}`);
  }
}

// ─── Test 5: TikTok without platform_data (current DB state) ───
console.log("\n═══ TEST 5: TikTok WITHOUT platform_data (current DB state) ═══");
const tiktokNoData: Partial<SocialProfile> = {
  platform: "tiktok",
  followers_count: 5700000,
  following_count: 162,
  posts_count: 7736,
  engagement_rate: null,
  platform_data: null,
};
const resolved = resolveStatsForProfile(tiktokNoData as SocialProfile, formatCompact);
for (const s of resolved) {
  console.log(`  ${s.label}: ${s.value}`);
}
const likesVal = resolved.find(s => s.label === "Likes");
console.log(likesVal?.value === "---" ? "✓ PASS — Shows '---' when hearts not available" : "✗ FAIL");

// ─── Test 6: Full algorithm block for recommendations ───
console.log("\n═══ TEST 6: Recommendations Full Block ═══");
const fullBlock = getFullAlgorithmBlock("instagram");
console.log(`  Length: ${fullBlock.length} chars`);
console.log(`  Contains 2026: ${fullBlock.includes("2026") ? "✓" : "✗"}`);
console.log(`  Contains DM shares: ${fullBlock.includes("DM shares") ? "✓" : "✗"}`);
console.log(`  Contains slide retention: ${fullBlock.includes("slide retention") ? "✓" : "✗"}`);

console.log("\n═══ ALL TESTS COMPLETE ═══");
