/**
 * Go Virall Social Analysis Engine
 * 11 analysis types powered by multi-provider AI.
 */

import { aiChat } from "./provider";
import { getAlgorithmContext } from "./platform-algorithms";
import type { AnalysisType, PrimaryGoal, SocialPlatform } from "@/types";

interface AnalysisInput {
  profile: Record<string, unknown>;
  metrics: Record<string, unknown>[];
  competitors: unknown[];
  goals: Record<string, unknown> | null;
  /** User-level ambition fallback when no per-profile goal exists */
  primaryGoal?: PrimaryGoal | null;
  analysisType: AnalysisType;
  userId: string;
}

/** Human-readable label for each PrimaryGoal value */
const PRIMARY_GOAL_LABELS: Record<PrimaryGoal, string> = {
  grow_audience: "Grow audience (increase followers & reach)",
  make_money: "Make money (monetize audience, brand deals, revenue)",
  build_brand: "Build brand (establish authority & identity)",
  drive_traffic: "Drive traffic / conversions (funnel to sales, signups)",
};

interface AnalysisResult {
  data: Record<string, unknown>;
  provider: string;
  tokensUsed?: number;
  costCents?: number;
}

export function profileSummary(profile: Record<string, unknown>): string {
  const base = `Platform: ${profile.platform}
Handle: @${profile.handle}
Display Name: ${profile.display_name || "N/A"}
Followers: ${profile.followers_count || 0}
Following: ${profile.following_count || 0}
Posts: ${profile.posts_count || 0}
Engagement Rate: ${profile.engagement_rate || "N/A"}%
Niche: ${profile.niche || "Not specified"}
Bio: ${profile.bio || "N/A"}`;

  // Platform-specific context from platform_data JSONB
  const pd = profile.platform_data as Record<string, unknown> | null;
  const extras: string[] = [];

  if (profile.platform === "tiktok" && pd?.hearts)
    extras.push(`Total Likes (Hearts): ${pd.hearts}`);
  if (profile.platform === "youtube" && pd?.totalViews)
    extras.push(`Total Channel Views: ${pd.totalViews}`);
  if (profile.platform === "twitch") {
    if (pd?.totalViews) extras.push(`Total Views: ${pd.totalViews}`);
    if (pd?.isLive !== undefined) extras.push(`Currently Live: ${pd.isLive}`);
  }
  if (profile.platform === "linkedin" && pd?.jobTitle)
    extras.push(`Job Title: ${pd.jobTitle}`);

  const result = extras.length ? base + "\n" + extras.join("\n") : base;

  // Append platform algorithm intelligence (2026) — propagates to all 17+ prompts
  const algoContext = getAlgorithmContext(
    profile.platform as SocialPlatform,
  );
  return algoContext ? result + "\n" + algoContext : result;
}

export function metricsSummary(metrics: Record<string, unknown>[]): string {
  if (!metrics.length) return "No historical metrics available.";
  return metrics
    .slice(0, 10)
    .map(
      (m) =>
        `${m.date}: followers=${m.followers}, engagement=${m.engagement_rate}%, avg_likes=${m.avg_likes}, avg_comments=${m.avg_comments}, avg_views=${m.avg_views}`,
    )
    .join("\n");
}

function goalsSummary(
  goals: Record<string, unknown> | null,
  primaryGoal?: PrimaryGoal | null,
): string {
  if (goals) {
    return `Primary Objective: ${goals.primary_objective || "N/A"}
Target: ${goals.target_value || "N/A"} in ${goals.target_days || "N/A"} days
Content Niche: ${goals.content_niche || "N/A"}
Monetization Goal: ${goals.monetization_goal || "N/A"}
Posting Commitment: ${goals.posting_commitment || "N/A"}
Target Audience: ${goals.target_audience || "N/A"}`;
  }
  if (primaryGoal) {
    return `Primary Objective (user-level ambition, no per-profile goal yet): ${PRIMARY_GOAL_LABELS[primaryGoal]}
IMPORTANT: Weight every recommendation, tip, and insight toward this objective. If the user has not yet set a detailed per-profile goal, infer reasonable defaults from the profile data and align recommendations with the primary ambition above.`;
  }
  return "No goals set.";
}

function competitorsSummary(competitors: unknown[]): string {
  if (!competitors.length) return "No competitors tracked.";
  return (competitors as Record<string, unknown>[])
    .map(
      (c) =>
        `@${c.handle} (${c.platform}): ${c.followers_count} followers, ${c.engagement_rate}% engagement`,
    )
    .join("\n");
}

const ANALYSIS_PROMPTS: Record<
  AnalysisType,
  (input: AnalysisInput) => string
> = {
  growth: (input) => `You are a social media growth strategist. Analyze this creator's profile and provide actionable growth tips.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals, input.primaryGoal)}

COMPETITORS:
${competitorsSummary(input.competitors)}

Provide exactly 8 growth tips. For each tip, include:
- title: Short actionable title
- description: 2-3 sentence explanation
- priority: "high", "medium", or "low"
- category: "content", "engagement", "profile", "timing", "collaboration", or "strategy"
- estimatedImpact: percentage improvement estimate

Respond in valid JSON: { "tips": [...] }`,

  content_strategy: (input) => `You are a content strategy expert for social media creators. Analyze this profile and create a comprehensive content strategy.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals, input.primaryGoal)}

Create a content strategy with:
- postingFrequency: Object with { headline: string (e.g. "5-7 posts per week + daily stories"), subtitle: string (e.g. "Optimal for lifestyle/fashion niche in the 200-500K follower tier") }
- contentMix: Object with percentages for each content format (e.g. Reels, Carousels, Single Posts, Stories — must sum to 100)
- contentPillars: Array of 4-5 content themes/pillars to focus on
- weeklyCalendar: 7-day content plan with specific post ideas
- bestTimes: Array of best times to post by day of week
- proTips: Array of 4-5 actionable pro tips for maximizing content performance (strings)

Respond in valid JSON: { "strategy": { "postingFrequency": {...}, "contentMix": {...}, "contentPillars": [...], "weeklyCalendar": [...], "bestTimes": [...], "proTips": [...] } }`,

  hashtags: (input) => `You are a hashtag strategy expert. Generate optimized hashtag sets for this social media creator.

PROFILE:
${profileSummary(input.profile)}

Generate 4 categorized hashtag sets:
1. "niche" — 8 hashtags specific to their content niche
2. "growth" — 8 hashtags for maximum reach/discovery
3. "community" — 8 hashtags for community engagement
4. "trending" — 8 currently trending relevant hashtags

For each hashtag include:
- tag: the hashtag (with #)
- category: which set it belongs to
- estimatedReach: "high", "medium", or "low"

Respond in valid JSON: { "hashtags": [...] }`,

  competitors: (input) => `You are a competitive intelligence analyst for social media. Analyze the competitive landscape for this creator.

PROFILE:
${profileSummary(input.profile)}

TRACKED COMPETITORS (from user's actual data):
${competitorsSummary(input.competitors)}

Provide a competitive analysis based ONLY on the tracked competitors above. Do NOT invent or fabricate competitor profiles. If no competitors are tracked, set competitorProfiles to an empty array and focus on the SWOT analysis based on the creator's own profile data.

Return this JSON:
{
  "analysis": {
    "overview": "2-3 sentence summary of competitive position",
    "competitorProfiles": [only include competitors from TRACKED COMPETITORS above, with: { "handle": string, "displayName": string, "niche": string, "followersCount": number, "engagementRate": number }],
    "strengths": ["4 competitive advantages based on profile data"],
    "weaknesses": ["4 areas to improve based on profile data"],
    "opportunities": ["4 market gaps to exploit based on niche analysis"],
    "noCompetitorsNote": "If no competitors tracked, include a string suggesting the user add competitors to track for deeper analysis. Otherwise omit this field."
  }
}

IMPORTANT: Only include real competitor data from the TRACKED COMPETITORS section. Never fabricate competitor handles or stats. Respond ONLY with valid JSON.`,

  insights: (input) => `You are an AI social media strategist. Provide deep strategic insights for this creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals, input.primaryGoal)}

Provide 6 strategic insights. Each should include:
- title: Clear insight heading
- insight: 3-4 sentence analysis
- actionItem: Specific action to take
- priority: "critical", "important", or "nice-to-have"

Respond in valid JSON: { "insights": [...] }`,

  earnings_forecast: (input) => `You are a creator economy analyst and sponsorship rate expert. Create a comprehensive revenue & earnings report for this social media creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals, input.primaryGoal)}

Return this JSON structure:
{
  "forecast": {
    "summaryStats": {
      "estMonthly": number (estimated monthly earnings USD, use the realistic scenario value),
      "estMonthlyLabel": string (e.g. "Realistic scenario"),
      "estAnnual": number (estimated annual earnings),
      "estAnnualLabel": string (e.g. "Projected yearly"),
      "topRevenueSource": string (e.g. "Brand Sponsorships"),
      "topRevenueSourcePct": number (percentage, e.g. 65),
      "marketPosition": string (e.g. "Top 5% in niche" or "Above average"),
      "marketPositionNote": string (brief explanation)
    },
    "scenarios": [
      {
        "scenario": "Conservative" | "Realistic" | "Optimistic",
        "monthlyEarnings": number,
        "annualEarnings": number,
        "breakdown": { "sponsorships": number, "ads": number, "affiliates": number, "merchandise": number, "tips": number, "subscriptions": number }
      }
    ],
    "revenueBySources": [
      { "source": string (e.g. "Brand Sponsorships"), "percentage": number, "monthlyAmount": number }
    ],
    "recommendedRates": [
      { "contentType": string (e.g. "Instagram Post", "Instagram Story", "Instagram Reel", "TikTok Video", "YouTube Integration", "YouTube Dedicated"), "rate": number }
    ],
    "rateNote": string (e.g. "Based on 284.5K followers, 4.8% ER, Lifestyle niche"),
    "rateComparison": "above" | "at" | "below" (market average comparison),
    "monetizationFactors": [
      { "name": string, "score": number (0-100), "note": string (brief explanation) }
    ],
    "mediaKit": {
      "displayName": string,
      "handle": string,
      "niche": string (e.g. "Fashion, Lifestyle & Wellness"),
      "bio": string (1-2 sentence professional summary),
      "followers": number,
      "engagement": string (e.g. "4.8%"),
      "avgReach": number,
      "coreDemo": string (e.g. "25-34 F 68%")
    },
    "optimisticRoadmap": [
      string (5 actionable steps to reach the optimistic scenario)
    ],
    "currentEstimate": number,
    "recommendations": string[]
  }
}

Generate 3 earnings forecast scenarios (Conservative, Realistic, Optimistic). Include 5 revenue sources, 6 recommended content rates, 5 monetization factors with scores, and a media kit summary. The optimistic roadmap should have 5 specific action steps. Do NOT include activeDeals or recentDeals — those come from user-tracked data, not AI projections.

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`,

  thirty_day_plan: (input) => `You are a social media coach. Create a detailed 30-day action plan for this creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals, input.primaryGoal)}

Create a 30-day plan organized by week (4 weeks). For each week include:
- week: week number (1-4)
- theme: focus theme for the week
- days: Array of daily actions with { day (1-7), task, category, priority }

Categories: "content", "engagement", "analytics", "growth", "monetization"

Also include:
- expectedOutcome: What results to expect after 30 days
- weeklyMilestones: Array of 4 weekly goals

Respond in valid JSON: { "plan": { "weeks": [...], "expectedOutcome": "...", "weeklyMilestones": [...] } }`,

  smo_score: (input) => `You are a social media optimization expert. Calculate a comprehensive SMO (Social Media Optimization) score for this creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

Analyze 6 optimization factors with weighted scoring:
1. Bio Optimization (20%) — keyword usage, value proposition clarity, CTA presence
2. Profile Completeness (15%) — bio fields, highlights, pinned content, links, contact info
3. Content Consistency (25%) — posting frequency, schedule adherence, content mix balance
4. Engagement Quality (20%) — reply rate, comment depth, community building, DM responsiveness
5. Discovery & Reach (10%) — hashtag strategy, SEO in captions, explore page frequency, share rate
6. Link & Conversion (10%) — link-in-bio clicks, story link taps, profile-visit-to-follow ratio, conversion paths

IMPORTANT: Weight and interpret these factors through the lens of the creator's platform algorithm (see algorithm intelligence above).
For example: on TikTok, "Discovery & Reach" should prioritize hook retention and search keywords, not hashtags.
On LinkedIn, "Content Consistency" should emphasize Document/PDF posts and topical authority.
On YouTube, "Engagement Quality" should weigh return viewers and AVD, not just comments.
On Pinterest, "Discovery & Reach" should focus on Pin SEO keywords and fresh Pin creation.
Use the platform algorithm intelligence from the PROFILE section to calibrate your scores.

Return this JSON structure:
{
  "smo": {
    "overallScore": number (0-100 weighted average),
    "gradeLabel": string (e.g. "GOOD — ROOM FOR IMPROVEMENT", "EXCELLENT", "NEEDS WORK"),
    "factors": [
      {
        "factor": string (factor name),
        "weight": number (percentage weight, e.g. 20),
        "score": number (0-100),
        "maxScore": 100,
        "subtitle": string (brief description of what this measures),
        "details": string[] (array of 3 bullet point observations),
        "recommendation": string (specific actionable improvement tip)
      }
    ],
    "checklist": {
      "completed": number,
      "total": number,
      "items": [
        { "text": string, "done": boolean }
      ]
    },
    "improvementPlan": [
      {
        "week": number (1-4),
        "title": string,
        "priority": "high" | "medium" | "low",
        "actions": string[] (3-5 action items)
      }
    ]
  }
}

For the checklist, include 12 profile optimization items (e.g. "Professional profile picture", "Bio includes primary keywords", "Bio includes value proposition", "Bio includes clear CTA", "Link-in-bio is active and current", etc.).

Do NOT include a "competitors" array — competitor comparison data should only come from real tracked competitors, not AI-fabricated profiles.

For the 30-Day plan, create 4 weekly phases with specific actionable steps.

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`,

  audience: (input) => `You are an audience analytics expert. Provide a comprehensive audience intelligence report for this creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

Return this JSON structure:
{
  "audience": {
    "qualityScore": {
      "overall": number (0-100),
      "categoryNote": string (e.g. "Top 12% in Lifestyle category"),
      "factors": [
        { "name": "Authentic Followers", "score": number (0-100) },
        { "name": "Active Engagement", "score": number (0-100) },
        { "name": "Growth Quality", "score": number (0-100) },
        { "name": "Bot Detection", "score": number (0-100) }
      ]
    },
    "ageDistribution": [
      { "range": "18-24", "percentage": number },
      { "range": "25-34", "percentage": number },
      { "range": "35-44", "percentage": number },
      { "range": "45+", "percentage": number }
    ],
    "genderDistribution": { "female": number, "male": number, "other": number },
    "topCountries": [
      { "rank": 1, "name": string, "percentage": number }
    ],
    "topCities": [
      { "rank": 1, "name": string, "percentage": number }
    ],
    "interests": [
      { "name": string, "percentage": number }
    ],
    "activityHeatmap": {
      "data": [
        { "day": "MON", "hours": number[] }
      ],
      "peakTimes": string[]
    },
    "growthQuality": {
      "organic": number (percentage),
      "paid": number (percentage),
      "unfollowRate": number (percentage),
      "unfollowNote": string (e.g. "below avg"),
      "chartData": [
        { "date": "Mar 1", "organic": number, "paid": number }
      ]
    }
  }
}

IMPORTANT ACCURACY RULES:
- ALL demographic data (age, gender, location, interests, activity heatmap) is AI-ESTIMATED based on the creator's niche, content, and platform. It is NOT sourced from real platform analytics.
- For growthQuality.chartData: Use ACTUAL metrics data provided above if available. If no metrics data exists, set chartData to an empty array — do NOT fabricate daily growth numbers.
- For activityHeatmap: Estimate based on the creator's niche and platform norms. These are AI-suggested optimal times, not real audience activity data.
- For interests: Estimate based on content niche — these are inferred interests, not confirmed data.
- For topCountries and topCities: Estimate based on content language, niche, and platform demographics. Include 5 each.

For activityHeatmap.data, provide 7 days (MON-SUN). Each "hours" array has 24 values (0-100 activity level, one per hour 12am-11pm).

For interests, include 6-8 interests with estimated affinity percentages, sorted by highest first.

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`,

  network: (input) => `You are a creator networking specialist. Analyze this creator's network influence and provide strategic networking advice.

PROFILE:
${profileSummary(input.profile)}

COMPETITORS:
${competitorsSummary(input.competitors)}

Generate the following sections:

1. influenceScore: Object with:
   - overall: 0-100 overall influence score (AI-estimated based on profile metrics)
   - contentQuality: 0-100
   - audienceTrust: 0-100
   - brandSafety: 0-100
   - consistency: 0-100
   - growthVelocity: 0-100
   - percentile: top X% in their niche (number, e.g. 3 means top 3%)
   - tier: one of "ELITE CREATOR", "TOP CREATOR", "RISING STAR", "EMERGING", "NEWCOMER"
   - category: the creator's primary niche/category

2. brandCategories: Array of 3 brand CATEGORIES (not specific brands) that align with this creator's niche:
   - category: brand category name (e.g. "Athleisure & Fitness Apparel", "Health Supplements", "Tech Gadgets")
   - matchPercentage: 0-100 compatibility score
   - why: why this category aligns with the creator
   - estimatedRateRange: string (e.g. "$500-$2,000 per post") — estimated rate for this creator tier, NOT a specific deal
   - platform: which platform would work best

3. collaborationStrategy: Array of 4 collaboration TYPES to pursue (not specific people):
   - type: collaboration type (e.g. "Cross-niche collab with fitness creators", "Podcast guest appearances", "Brand ambassador programs", "UGC partnerships")
   - description: 2-3 sentence explanation of the strategy
   - idealPartnerProfile: what kind of creator to look for (e.g. "10K-50K followers in wellness niche with 5%+ engagement")

4. industryBenchmarks: Array of 4 benchmark comparisons:
   - metric: metric name (e.g. "Engagement Rate", "Story View Rate", "Growth Rate / Month")
   - yourValue: this creator's value from actual profile data (number)
   - average: estimated industry average for their tier (number)
   - unit: "%" or "$" or ""
   - delta: percentage difference vs average (number, positive = above average)

5. networkingTips: Array of 5 actionable tips for building creator relationships

Do NOT fabricate specific brand names with deal values or deadlines. Do NOT invent fictional creator handles. Focus on categories, strategies, and actionable advice.

Respond in valid JSON: { "network": { "influenceScore": {...}, "brandCategories": [...], "collaborationStrategy": [...], "industryBenchmarks": [...], "networkingTips": [...] } }`,

  campaign_ideas: (input) => `You are a campaign strategist for social media creators. Generate campaign IDEAS and blueprints this creator could execute.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals, input.primaryGoal)}

Return this JSON structure:
{
  "campaigns": [
    {
      "name": string (campaign idea name, e.g. "30-Day Fitness Challenge", "Behind-The-Scenes Series"),
      "type": "audience_growth" | "engagement_boost" | "product_launch" | "seasonal" | "community" | "brand_ready",
      "platforms": string (e.g. "Instagram", "TikTok + IG", "YouTube + Instagram"),
      "description": string (2-3 sentence description of the campaign idea),
      "expectedOutcome": string (e.g. "Estimated 15-25% follower growth over 30 days"),
      "steps": string[] (5-6 implementation steps),
      "budget": "free" | "low ($0-100)" | "medium ($100-500)" | "high ($500+)",
      "duration": string (e.g. "2 weeks", "30 days", "Ongoing")
    }
  ],
  "performanceMatrix": [
    {
      "format": string (e.g. "Photos", "Carousels", "Reels / TikToks", "Stories", "Shorts / Videos", "Long-form"),
      "instagram": number | null (estimated engagement rate percentage, e.g. 4.2),
      "tiktok": number | null,
      "youtube": number | null
    }
  ],
  "weeklyPlan": [
    {
      "day": "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun",
      "items": [
        { "campaign": string (short campaign name), "task": string (e.g. "Reel #1", "Stories", "YT Upload") }
      ]
    }
  ]
}

Generate 3 campaign IDEAS — these are suggestions the creator could execute, NOT active campaigns. Do NOT include "status", "progress", or "metrics" fields — these campaigns haven't started yet. Do NOT fabricate brand names or imply existing brand partnerships. Focus on organic growth and content strategies.

Do NOT include a "summary" object with activeCampaigns/avgROI/contentPieces/totalReach — the user has no active campaigns tracked.

For performanceMatrix, include 6 content format rows with estimated engagement rates across platforms. Use null where the format doesn't apply. Rates should be realistic (1-8%).

For weeklyPlan, provide 7 days (Mon-Sun) as a suggested content schedule if the creator adopted these campaigns. At least 1 day should be a rest day with no items.

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`,

  content_generator: () => {
    throw new Error("Content generation uses its own module — see content-generator.ts");
  },

  recommendations: () => {
    throw new Error("Recommendations use their own module — see recommendations.ts");
  },
};

function parseJSON(text: string): Record<string, unknown> {
  // Try to extract JSON from markdown code blocks or raw text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

export async function analyzeSocialProfile(
  input: AnalysisInput,
): Promise<AnalysisResult> {
  const promptFn = ANALYSIS_PROMPTS[input.analysisType];
  if (!promptFn) {
    throw new Error(`Unknown analysis type: ${input.analysisType}`);
  }

  const prompt = promptFn(input);

  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 120000, // 2 min — some prompts (smo_score, audience) are large
  });

  if (!response) {
    throw new Error(
      "All AI providers failed. Check your API keys in Settings.",
    );
  }

  try {
    const data = parseJSON(response.text);
    return {
      data,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      costCents: response.costCents,
    };
  } catch {
    // If JSON parsing fails, wrap raw text
    return {
      data: { raw: response.text },
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      costCents: response.costCents,
    };
  }
}
