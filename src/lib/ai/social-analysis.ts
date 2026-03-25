/**
 * Go Virall Social Analysis Engine
 * 11 analysis types powered by multi-provider AI.
 */

import { aiChat } from "./provider";
import { getAlgorithmContext } from "./platform-algorithms";
import type { AnalysisType, SocialPlatform } from "@/types";

interface AnalysisInput {
  profile: Record<string, unknown>;
  metrics: Record<string, unknown>[];
  competitors: unknown[];
  goals: Record<string, unknown> | null;
  analysisType: AnalysisType;
  userId: string;
}

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

function goalsSummary(goals: Record<string, unknown> | null): string {
  if (!goals) return "No goals set.";
  return `Primary Objective: ${goals.primary_objective || "N/A"}
Target: ${goals.target_value || "N/A"} in ${goals.target_days || "N/A"} days
Content Niche: ${goals.content_niche || "N/A"}
Monetization Goal: ${goals.monetization_goal || "N/A"}
Posting Commitment: ${goals.posting_commitment || "N/A"}
Target Audience: ${goals.target_audience || "N/A"}`;
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
${goalsSummary(input.goals)}

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
${goalsSummary(input.goals)}

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

  competitors: (input) => `You are a competitive intelligence analyst for social media. Analyze the competitive landscape and identify real competitors.

PROFILE:
${profileSummary(input.profile)}

COMPETITORS:
${competitorsSummary(input.competitors)}

Provide a comprehensive competitive analysis with:

1. overview: 2-3 sentence summary of competitive position

2. competitorProfiles: Array of 4-5 competitor accounts (real or realistic for the niche) with:
   - handle: their @handle (realistic for the niche)
   - displayName: their display name
   - niche: their content niche (1-2 words uppercase, e.g. "FASHION", "TRAVEL FASHION", "LIFESTYLE")
   - followersCount: estimated follower count (number)
   - engagementRate: estimated engagement rate (number, e.g. 4.2)

3. strengths: Array of 4 competitive advantages (strings)
4. weaknesses: Array of 4 areas where competitors outperform (strings)
5. opportunities: Array of 4 market gaps to exploit (strings)

Respond in valid JSON: { "analysis": { "overview": "...", "competitorProfiles": [{ "handle": "...", "displayName": "...", "niche": "...", "followersCount": number, "engagementRate": number }], "strengths": [...], "weaknesses": [...], "opportunities": [...] } }`,

  insights: (input) => `You are an AI social media strategist. Provide deep strategic insights for this creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals)}

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
${goalsSummary(input.goals)}

Return this JSON structure:
{
  "forecast": {
    "summaryStats": {
      "estMonthly": number (estimated monthly earnings USD, use the realistic scenario value),
      "estMonthlyLabel": string (e.g. "Realistic scenario"),
      "activeDeals": number,
      "activeDealsPipeline": string (e.g. "$25,700 pipeline"),
      "ytdRevenue": number,
      "ytdDealsCompleted": number,
      "pending": number,
      "pendingNote": string (e.g. "In negotiation")
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
    "activeDeals": [
      { "brand": string, "platform": string, "deliverables": string, "rate": number, "status": "in_progress" | "approved" | "negotiating" | "pending", "deadline": string (e.g. "Mar 28") }
    ],
    "monetizationFactors": [
      { "name": string, "score": number (0-100), "note": string (brief explanation) }
    ],
    "recentDeals": [
      { "brand": string, "platform": string, "deliverables": string, "amount": number, "rating": number (1-5), "date": string (e.g. "Mar 10") }
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

Generate 3 earnings forecast scenarios (Conservative, Realistic, Optimistic). Include 5 revenue sources, 6 recommended content rates, 4 active deals, 5 monetization factors with scores, 5 recent completed deals, and a media kit summary. The optimistic roadmap should have 5 specific action steps.

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`,

  thirty_day_plan: (input) => `You are a social media coach. Create a detailed 30-day action plan for this creator.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals)}

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
    "competitors": [
      {
        "profile": string (handle),
        "isUser": boolean,
        "smo": number,
        "bio": number,
        "complete": number,
        "consistency": number,
        "engage": number,
        "discovery": number,
        "convert": number
      }
    ],
    "competitorSummary": string (comparison vs top competitor, e.g. "vs. top competitor (@handle): -7 overall, -6 Bio, -5 Complete"),
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

For competitors, generate 4-5 estimated competitor profiles in the same niche with realistic scores. Mark the user's profile with "isUser": true.

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

For growthQuality.chartData, provide 30 daily data points for the last 30 days. "organic" = estimated organic follower growth count that day, "paid" = estimated paid/referred follower growth that day. Use realistic numbers that trend upward with natural variation. Use short date format like "Mar 1", "Mar 2", etc.

For activityHeatmap.data, provide 7 days (MON-SUN). Each "hours" array has 24 values (0-100 activity level, one per hour 12am-11pm).

For interests, include 6-8 interests with estimated affinity percentages, sorted by highest first.

For topCountries and topCities, include 5 each.

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`,

  network: (input) => `You are a creator networking specialist and brand partnership strategist. Analyze this creator's network influence and generate actionable collaboration opportunities.

PROFILE:
${profileSummary(input.profile)}

COMPETITORS:
${competitorsSummary(input.competitors)}

Generate the following sections:

1. influenceScore: Object with:
   - overall: 0-100 overall influence score
   - contentQuality: 0-100
   - audienceTrust: 0-100
   - brandSafety: 0-100
   - consistency: 0-100
   - growthVelocity: 0-100
   - percentile: top X% in their niche (number, e.g. 3 means top 3%)
   - tier: one of "ELITE CREATOR", "TOP CREATOR", "RISING STAR", "EMERGING", "NEWCOMER"
   - category: the creator's primary niche/category

2. brandOpportunities: Array of 3 brand partnership opportunities with:
   - brandName: A real brand name that matches this creator's niche
   - matchPercentage: 0-100 compatibility score
   - targetCreators: brief description of what creators they target (e.g. "Beauty/Lifestyle creators, 200K+ followers")
   - budgetMin: estimated minimum deal value in dollars
   - budgetMax: estimated maximum deal value in dollars
   - platform: which platform the campaign would be on
   - deadline: a realistic upcoming date (YYYY-MM-DD format, within next 30 days)

3. suggestedCollaborators: Array of 4 creator profiles to collaborate with:
   - handle: a realistic but fictional creator handle
   - followers: estimated follower count (number)
   - niche: their content niche
   - engagementRate: estimated ER (number, e.g. 4.5)
   - matchReason: brief reason why they're a good match (e.g. "Similar audience overlap: 34%", "Complementary niche")

4. industryBenchmarks: Array of 4 benchmark comparisons:
   - metric: metric name (e.g. "Engagement Rate", "Story View Rate", "Sponsor Rate / Post", "Growth Rate / Month")
   - yourValue: this creator's estimated value (number)
   - average: industry average for their tier (number)
   - unit: "%" or "$" or ""
   - delta: percentage difference vs average (number, positive = above average)

5. networkingTips: Array of 5 actionable tips for building creator relationships

Respond in valid JSON: { "network": { "influenceScore": { "overall": number, "contentQuality": number, "audienceTrust": number, "brandSafety": number, "consistency": number, "growthVelocity": number, "percentile": number, "tier": "string", "category": "string" }, "brandOpportunities": [...], "suggestedCollaborators": [...], "industryBenchmarks": [...], "networkingTips": [...] } }`,

  campaign_ideas: (input) => `You are a campaign performance analyst and strategist for social media creators. Generate a comprehensive campaign performance report.

PROFILE:
${profileSummary(input.profile)}

RECENT METRICS:
${metricsSummary(input.metrics)}

GOALS:
${goalsSummary(input.goals)}

Return this JSON structure:
{
  "summary": {
    "activeCampaigns": number,
    "avgROI": string (e.g. "340%"),
    "contentPieces": number,
    "totalReach": string (e.g. "2.1M")
  },
  "campaigns": [
    {
      "name": string (campaign name),
      "brand": string (brand/partner name, e.g. "Zara", "Own Brand", "Audible"),
      "platforms": string (e.g. "Instagram", "TikTok + IG", "YouTube + Instagram"),
      "dateRange": string (e.g. "Mar 1 - 31", "Ongoing", "Feb 15 - Apr 15"),
      "status": "on_track" | "outperforming" | "needs_attention",
      "progress": number (0-100 percentage),
      "type": "brand_partnership" | "audience_growth" | "product_launch" | "seasonal" | "community",
      "description": string (2-3 sentence description),
      "metrics": [
        { "label": string, "value": string }
      ],
      "steps": string[] (4-5 implementation steps),
      "budget": "free" | "low ($0-100)" | "medium ($100-500)" | "high ($500+)"
    }
  ],
  "performanceMatrix": [
    {
      "format": string (e.g. "Photos", "Carousels", "Reels / TikToks", "Stories", "Shorts / Videos", "Long-form"),
      "instagram": number | null (engagement rate percentage, e.g. 4.2),
      "tiktok": number | null,
      "youtube": number | null
    }
  ],
  "deliverables": [
    {
      "day": "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun",
      "items": [
        { "campaign": string (short campaign name), "task": string (e.g. "Reel #1", "Stories", "YT Upload") }
      ]
    }
  ]
}

Generate 3 realistic active campaigns with 4 metrics each (e.g. Reach, Engagement, Link Clicks, Conversions, Avg Views, Saves, Shares, New Followers — pick 4 most relevant per campaign).

For performanceMatrix, include 6 content format rows with engagement rates across platforms. Use null where the format doesn't apply to a platform. Rates should be realistic (1-8%).

For deliverables, provide 7 days (Mon-Sun). Each day can have 0-2 items showing which campaign tasks are scheduled. At least 1 day should have no deliverables.

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
    return { data, provider: response.provider };
  } catch {
    // If JSON parsing fails, wrap raw text
    return {
      data: { raw: response.text },
      provider: response.provider,
    };
  }
}
