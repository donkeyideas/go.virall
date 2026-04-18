/**
 * Platform Algorithm Intelligence (2026)
 *
 * Central config defining how each social platform's algorithm works,
 * what it rewards, and how creators should optimize for it.
 *
 * Consumed by:
 *   - profileSummary() → injected into 17 AI prompts automatically
 *   - recommendations.ts → detailed block for master recommendation engine
 *   - content-generator.ts → platform-appropriate format suggestions
 *   - AnalysisResultRenderer → platform-specific content format labels
 */

import type { SocialPlatform } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformAlgorithm {
  /** Human-readable algorithm name, e.g. "Retention & Shares" */
  algoName: string;
  /** The single most important ranking signal */
  primarySignal: string;
  /** 3-5 key ranking factors in priority order */
  rankingFactors: string[];
  /** Platform-native content formats in priority order */
  contentFormats: string[];
  /** Optimal posting cadence */
  postingCadence: string;
  /** 2-3 concise tactical tips */
  keyTactics: string[];
  /** What the algorithm penalizes */
  avoidances: string[];
}

// ---------------------------------------------------------------------------
// 2026 Algorithm Intelligence
// ---------------------------------------------------------------------------

export const PLATFORM_ALGORITHMS: Record<SocialPlatform, PlatformAlgorithm> = {
  instagram: {
    algoName: "Retention & Shares",
    primarySignal:
      "Sends-per-Reach — DM shares are weighted 3-5x higher than likes",
    rankingFactors: [
      "DM shares and saves",
      "Watch time and completion rate on Reels",
      "Slide retention on Carousels (7-10 slides optimal)",
      "Caption keyword SEO (hashtags deprioritized in 2026)",
      "First 30-minute engagement velocity",
    ],
    contentFormats: [
      "Reels",
      "Carousels",
      "Stories",
      "Single Posts",
      "Live",
    ],
    postingCadence: "3-5 Reels/week + daily Stories + 2 Carousels/week",
    keyTactics: [
      "Optimize for shares — create 'send this to someone who...' hooks",
      "Use keywords in captions and on-screen text for SEO (not hashtags)",
      "Design Carousels with 7-10 slides to maximize slide retention",
    ],
    avoidances: [
      "Hashtag-stuffing (30 hashtags no longer helps discovery)",
      "Posting low-retention Reels that kill average watch time",
    ],
  },

  tiktok: {
    algoName: "Interest Cluster",
    primarySignal:
      "First-Hour Velocity — video is stress-tested in 60 minutes; 3-second hook determines survival",
    rankingFactors: [
      "3-second hook retention rate",
      "First-hour engagement velocity",
      "Completion rate and rewatch rate",
      "Predictive Search keywords in first caption sentence",
      "Long-form content push (60s-3min boosted in 2026)",
    ],
    contentFormats: [
      "Short-form Video",
      "Long-form Video (60s-3min)",
      "Duets",
      "Stitches",
      "Photo Carousels",
    ],
    postingCadence:
      "1-3 posts/day — consistency matters more than production value",
    keyTactics: [
      "Hook viewers in first 3 seconds (70% of performance decided here)",
      "Use 60s-3min format for the 2026 long-form algorithm boost",
      "Place Predictive Search keywords in first sentence of caption",
    ],
    avoidances: [
      "Slow intros that lose viewers before 3-second mark",
      "Ignoring trending sounds (40%+ discovery boost lost)",
    ],
  },

  youtube: {
    algoName: "Satisfaction",
    primarySignal:
      "Return Viewers — algorithm prioritizes showing new video to people who finished your last video",
    rankingFactors: [
      "Return viewer rate",
      "Click-through rate (CTR) on thumbnails",
      "Average view duration (AVD)",
      "Shorts Carousels (image carousels in Shorts for dwell time)",
      "Community Tab engagement between uploads",
    ],
    contentFormats: [
      "Long-form Video",
      "Shorts",
      "Shorts Carousels",
      "Community Posts",
      "Live",
    ],
    postingCadence:
      "1-2 long-form/week + 3-5 Shorts/week + Community Tab polls between uploads",
    keyTactics: [
      "Maximize return viewers by ending videos with hooks for the next one",
      "Use Shorts Carousels (image carousels) for increased dwell time",
      "Post Community Tab polls to keep signal active between uploads",
    ],
    avoidances: [
      "Inconsistent upload schedule (kills return viewer signal)",
      "Clickbait thumbnails that tank AVD when content doesn't match",
    ],
  },

  twitter: {
    algoName: "Conversation & Engagement",
    primarySignal:
      "Replies and quote tweets weighted highest — conversations drive distribution",
    rankingFactors: [
      "Reply depth and conversation threads",
      "Quote tweets with commentary",
      "Bookmark rate",
      "Multimedia (images/video) +35% engagement",
      "Posting frequency (3-5x/day optimal)",
    ],
    contentFormats: [
      "Threads",
      "Quote Tweets",
      "Image Posts",
      "Video Posts",
      "Polls",
    ],
    postingCadence: "3-5 tweets/day + 1-2 threads/week",
    keyTactics: [
      "Write threads (3-5x engagement vs single tweets)",
      "Add images or video to tweets (+35% engagement)",
      "Reply to relevant conversations in your niche daily",
    ],
    avoidances: [
      "External links in tweets (algorithm suppresses reach)",
      "Tweeting without follow-up engagement",
    ],
  },

  linkedin: {
    algoName: "Expertise",
    primarySignal:
      "Social Proof of Expertise — maintain single topical authority lane",
    rankingFactors: [
      "Dwell time on posts",
      "Document/PDF posts (~200% more engagement than video)",
      "Meaningful comments (not just reactions)",
      "Personal profile reach (5-10x vs Company Pages)",
      "Single Topical Authority lane consistency",
    ],
    contentFormats: [
      "Document/PDF Posts",
      "Text Posts",
      "Image Posts",
      "Articles",
      "Polls",
      "Video",
    ],
    postingCadence: "3-5 posts/week, avoid weekends",
    keyTactics: [
      "Publish Document (PDF carousel) posts for maximum engagement",
      "Maintain a single topical authority lane — don't scatter across topics",
      "Use personal profile over company page (5-10x more reach)",
    ],
    avoidances: [
      "Posting from Company Page instead of personal profile",
      "Scattering across multiple unrelated topics (throttles both)",
    ],
  },

  threads: {
    algoName: "Conversation Depth",
    primarySignal:
      "Reply Depth — the more people reply to your reply, the more your profile is boosted",
    rankingFactors: [
      "Reply depth (nested replies, not just first-level)",
      "Conversation starter quality",
      "Visual content (22% more engagement than text-only)",
      "Reply-First strategy (engaging with larger accounts)",
      "Authentic voice and personal takes",
    ],
    contentFormats: [
      "Text Posts",
      "Image Posts",
      "Quote Posts",
      "Carousel Posts",
    ],
    postingCadence:
      "1-3 posts/day + 30 minutes/day replying to big accounts in your niche",
    keyTactics: [
      "Spend 30 min/day replying to large accounts in your niche with value",
      "Encourage reply chains (replies-to-replies boost profile score)",
      "Add visuals — images get 22% more engagement than text-only posts",
    ],
    avoidances: [
      "Text-only posting without conversation engagement",
      "Ignoring reply threads after posting (kills reply depth signal)",
    ],
  },

  pinterest: {
    algoName: "Freshness & Domain",
    primarySignal:
      "Outbound Clicks + Domain Quality — Pinterest rewards high-quality domains where users stay",
    rankingFactors: [
      "Outbound click-through rate",
      "Domain quality and authority score",
      "Fresh Pin creation (2-5 daily, repinning penalized)",
      "Keyword SEO in Pin titles and descriptions",
      "Video Pin save rate (highest of all formats)",
    ],
    contentFormats: [
      "Standard Pins",
      "Video Pins",
      "Idea Pins",
      "Product Pins",
    ],
    postingCadence: "2-5 fresh Pins daily (repinning same images is penalized)",
    keyTactics: [
      "Create 2-5 fresh Pins daily — repinning existing content is penalized",
      "Optimize Pin titles and descriptions with search keywords",
      "Use Video Pins for highest Save rate on the platform",
    ],
    avoidances: [
      "Repinning existing content (penalized in 2026 algorithm)",
      "Ignoring SEO in Pin titles and descriptions",
    ],
  },

  twitch: {
    algoName: "Discovery Feed",
    primarySignal:
      "Featured Clips — Twitch's AI picks clips for the mobile discovery feed; unclipped streams stay invisible",
    rankingFactors: [
      "Featured Clips quality (AI-selected for mobile feed)",
      "Category ranking (pick mid-sized categories to rank top 10)",
      "Multi-platform clip distribution (TikTok/Reels)",
      "Stream consistency and schedule adherence",
      "Chat engagement and interaction rate",
    ],
    contentFormats: ["Live Streams", "Clips", "VODs", "Highlights"],
    postingCadence:
      "3-5 streams/week with consistent schedule + daily clips to TikTok/Reels",
    keyTactics: [
      "Create highlight clips for Twitch's AI-curated mobile discovery feed",
      "Pick mid-sized categories where you can rank top 10 (not oversaturated ones)",
      "Post clips to TikTok/Reels — 40% of new Twitch followers come from off-platform",
    ],
    avoidances: [
      "Streaming in oversaturated categories where you can't rank",
      "Not clipping highlights for the mobile discovery feed and cross-platform",
    ],
  },
};

// ---------------------------------------------------------------------------
// Dynamic Algorithm Cache — merges DB-applied adjustments on top of base data
// ---------------------------------------------------------------------------

interface AlgorithmAdjustmentRow {
  adjustment_type: string;
  platform: string;
  suggested_value: Record<string, unknown>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let effectiveCache: Map<SocialPlatform, PlatformAlgorithm> | null = null;
let cacheTimestamp = 0;
let refreshInFlight = false;

/**
 * Returns the effective algorithm for a platform — base data merged with
 * any admin-applied adjustments from the DB. Falls back to the hardcoded
 * base if cache hasn't been populated yet.
 */
export function getEffectiveAlgorithm(platform: SocialPlatform): PlatformAlgorithm {
  if (effectiveCache?.has(platform)) {
    return effectiveCache.get(platform)!;
  }
  return PLATFORM_ALGORITHMS[platform];
}

/**
 * Triggers a non-blocking cache refresh if the cache is stale or empty.
 * Safe to call from sync code — fires and forgets.
 */
export function warmAlgorithmCacheIfNeeded(): void {
  if (refreshInFlight) return;
  if (effectiveCache && Date.now() - cacheTimestamp < CACHE_TTL) return;
  refreshInFlight = true;
  refreshAlgorithmCache()
    .catch((err) => console.error("Algorithm cache refresh failed:", err))
    .finally(() => {
      refreshInFlight = false;
    });
}

/**
 * Fetches applied adjustments from DB and merges them into the base
 * PLATFORM_ALGORITHMS to produce the effective algorithm config.
 */
export async function refreshAlgorithmCache(): Promise<void> {
  try {
    const { getAppliedAdjustments } = await import(
      "@/lib/dal/algorithm-monitor"
    );
    const applied = await getAppliedAdjustments();

    const merged = new Map<SocialPlatform, PlatformAlgorithm>();

    // Start with base data for all platforms
    const platforms = Object.keys(PLATFORM_ALGORITHMS) as SocialPlatform[];
    for (const p of platforms) {
      merged.set(p, { ...PLATFORM_ALGORITHMS[p] });
    }

    // Apply adjustments on top
    for (const adj of applied) {
      const platform = adj.platform as SocialPlatform;
      if (!merged.has(platform)) continue;

      const current = merged.get(platform)!;
      merged.set(platform, mergeAdjustment(current, adj as AlgorithmAdjustmentRow));
    }

    effectiveCache = merged;
    cacheTimestamp = Date.now();
  } catch (err) {
    console.error("Failed to refresh algorithm cache:", err);
  }
}

/**
 * Clears the cache so the next read triggers a fresh DB fetch.
 * Called when an admin applies or reverts an adjustment.
 */
export function invalidateAlgorithmCache(): void {
  effectiveCache = null;
  cacheTimestamp = 0;
}

/**
 * Merges a single applied adjustment into a PlatformAlgorithm.
 * Adjustments are prefixed with [AI-adjusted] so the AI model
 * understands these are recent updates that take priority.
 */
function mergeAdjustment(
  base: PlatformAlgorithm,
  adj: AlgorithmAdjustmentRow,
): PlatformAlgorithm {
  const suggestion = (adj.suggested_value as Record<string, unknown>)
    ?.suggestion;
  if (!suggestion || typeof suggestion !== "string") return base;

  switch (adj.adjustment_type) {
    case "content_strategy":
      return {
        ...base,
        keyTactics: [...base.keyTactics, `[AI-adjusted] ${suggestion}`],
      };
    case "smo_weight":
      return {
        ...base,
        rankingFactors: [
          ...base.rankingFactors,
          `[AI-adjusted] ${suggestion}`,
        ],
      };
    case "posting_time":
      return {
        ...base,
        postingCadence: `${base.postingCadence} — AI update: ${suggestion}`,
      };
    case "engagement_benchmark":
      return {
        ...base,
        primarySignal: `${base.primarySignal} — Benchmark update: ${suggestion}`,
      };
    default:
      return base;
  }
}

// ---------------------------------------------------------------------------
// Rendering functions for AI prompts
// ---------------------------------------------------------------------------

/**
 * Compact algorithm context block (~250 tokens) for profileSummary() injection.
 * Propagates to 17 of 19 AI prompts automatically.
 * Reads from the effective cache (base + applied adjustments).
 */
export function getAlgorithmContext(platform: SocialPlatform): string {
  const algo = getEffectiveAlgorithm(platform);
  if (!algo) return "";

  return `
--- ${platform.toUpperCase()} ALGORITHM INTELLIGENCE (2026) ---
Algorithm: "${algo.algoName}"
Primary Signal: ${algo.primarySignal}
Key Ranking Factors: ${algo.rankingFactors.slice(0, 3).join("; ")}
Best Formats: ${algo.contentFormats.join(", ")}
Posting Cadence: ${algo.postingCadence}
Key Tactics: ${algo.keyTactics.join(" | ")}
Avoid: ${algo.avoidances.join(" | ")}`;
}

/**
 * Detailed algorithm block (~350 tokens) for the recommendations engine.
 * Richer than getAlgorithmContext() — used only once per recommendation generation.
 * Reads from the effective cache (base + applied adjustments).
 */
export function getFullAlgorithmBlock(platform: SocialPlatform): string {
  const algo = getEffectiveAlgorithm(platform);
  if (!algo) return "";

  const label = platform.charAt(0).toUpperCase() + platform.slice(1);
  return `**${label} (2026) — "${algo.algoName}" Algorithm:**
- Primary Signal: ${algo.primarySignal}
- Ranking Factors: ${algo.rankingFactors.join("; ")}
- Optimal Formats: ${algo.contentFormats.join(", ")}
- Posting Cadence: ${algo.postingCadence}
- Key Tactics:
${algo.keyTactics.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}
- Avoid:
${algo.avoidances.map((a) => `  - ${a}`).join("\n")}`;
}
