/**
 * Go Virall Recommendations Engine — Synthesizes all analyses into
 * platform-aware, prioritized, actionable recommendations.
 */

import { aiChat } from "./provider";
import { profileSummary, metricsSummary } from "./social-analysis";
import { getFullAlgorithmBlock } from "./platform-algorithms";
import type { AnalysisType, SocialAnalysis, SocialPlatform } from "@/types";

/** Analysis types that feed into recommendations (exclude content_generator + recommendations) */
const INPUT_TYPES: AnalysisType[] = [
  "growth",
  "content_strategy",
  "hashtags",
  "competitors",
  "insights",
  "earnings_forecast",
  "thirty_day_plan",
  "smo_score",
  "audience",
  "network",
  "campaign_ideas",
];

const TYPE_LABELS: Record<string, string> = {
  growth: "Growth Tips",
  content_strategy: "Content Strategy",
  hashtags: "Hashtags",
  competitors: "Competitors",
  insights: "AI Insights",
  earnings_forecast: "Earnings Forecast",
  thirty_day_plan: "30-Day Plan",
  smo_score: "SMO Score",
  audience: "Audience",
  network: "Network",
  campaign_ideas: "Campaign Ideas",
};

export interface RecommendationsInput {
  profile: Record<string, unknown>;
  metrics: Record<string, unknown>[];
  goals: Record<string, unknown> | null;
  analyses: Record<AnalysisType, SocialAnalysis | null>;
}

interface RecommendationsResult {
  data: Record<string, unknown>;
  provider: string;
}

/** Condense available analysis results into a text summary for the prompt */
function summarizeAnalyses(
  analyses: Record<AnalysisType, SocialAnalysis | null>,
): string {
  const sections: string[] = [];

  for (const type of INPUT_TYPES) {
    const analysis = analyses[type];
    if (!analysis?.result) continue;

    const json = JSON.stringify(analysis.result, null, 0);
    const truncated = json.length > 2000 ? json.slice(0, 2000) + "..." : json;
    const age = Math.round(
      (Date.now() - new Date(analysis.created_at).getTime()) / (1000 * 60 * 60),
    );
    sections.push(
      `=== ${TYPE_LABELS[type] || type.toUpperCase()} (${age}h ago) ===\n${truncated}`,
    );
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "No analyses have been run yet.";
}

/** Count available vs missing analyses */
function analysisCoverage(
  analyses: Record<AnalysisType, SocialAnalysis | null>,
): { available: string[]; missing: string[] } {
  const available: string[] = [];
  const missing: string[] = [];
  for (const type of INPUT_TYPES) {
    if (analyses[type]?.result) available.push(TYPE_LABELS[type] || type);
    else missing.push(TYPE_LABELS[type] || type);
  }
  return { available, missing };
}

function buildPrompt(input: RecommendationsInput): string {
  const platform = (input.profile.platform as string) || "instagram";
  const { available, missing } = analysisCoverage(input.analyses);

  return `You are a world-class social media strategist and algorithm expert. You synthesize data from multiple analysis sources into unified, actionable recommendations. You NEVER simply repeat what individual analyses say — you cross-reference, resolve conflicts, and prioritize by impact.

## PLATFORM ALGORITHM KNOWLEDGE (2026)

${getFullAlgorithmBlock(platform as SocialPlatform)}

## CREATOR PROFILE
${profileSummary(input.profile)}

## RECENT METRICS
${metricsSummary(input.metrics)}

## GOALS
${input.goals ? JSON.stringify(input.goals, null, 2) : "No goals set."}

## EXISTING ANALYSES DATA (${available.length} of ${INPUT_TYPES.length} available)
${summarizeAnalyses(input.analyses)}

${missing.length > 0 ? `MISSING ANALYSES (not yet generated): ${missing.join(", ")}` : "All analyses are available."}

## YOUR TASK

Synthesize ALL the data above into a comprehensive recommendations report for this ${platform} creator. Cross-reference findings across all analyses to identify the MOST impactful actions. Apply ${platform.toUpperCase()}-specific algorithm knowledge. Provide SPECIFIC expected outcomes with realistic percentage ranges and timeframes.

Generate this exact JSON structure:
{
  "recommendations": {
    "platformContext": {
      "platform": "${platform}",
      "algorithmSummary": "(2-3 sentences about what ${platform} algorithm currently rewards)",
      "creatorTier": "(e.g. Micro-Creator 1K-10K, Mid-Tier 10K-100K, etc.)",
      "competitivePosition": "(1-2 sentences about their standing)"
    },
    "healthScore": {
      "overall": (number 0-100),
      "breakdown": {
        "content": (number 0-100),
        "growth": (number 0-100),
        "engagement": (number 0-100),
        "monetization": (number 0-100),
        "optimization": (number 0-100)
      },
      "summary": "(2-3 sentence overall health assessment)"
    },
    "topPriorities": [
      {
        "rank": 1,
        "title": "(short action title)",
        "description": "(2-3 sentences)",
        "expectedResult": "(specific, e.g. +15-25% engagement within 30 days)",
        "effort": "low" | "medium" | "high",
        "impact": "high" | "critical",
        "timeframe": "(e.g. 2-4 weeks)",
        "category": "content" | "growth" | "engagement" | "monetization" | "optimization"
      }
    ],
    "detailedRecommendations": [
      {
        "category": "content" | "growth" | "engagement" | "monetization" | "optimization",
        "categoryLabel": "(e.g. Content Strategy)",
        "items": [
          {
            "title": "(action title)",
            "description": "(2-3 sentences with SPECIFIC actions)",
            "expectedResult": "(measurable outcome with ranges)",
            "effort": "low" | "medium" | "high",
            "impact": "low" | "medium" | "high",
            "timeframe": "(e.g. 1-2 weeks)",
            "algorithmTip": "(platform-specific insight for this action)",
            "steps": ["(step 1)", "(step 2)", "(step 3)"]
          }
        ]
      }
    ],
    "quickWins": [
      {
        "action": "(1 sentence action)",
        "expectedResult": "(expected outcome)",
        "timeToImplement": "(e.g. 15 minutes, 1 hour)"
      }
    ],
    "avoidList": [
      {
        "mistake": "(what NOT to do)",
        "reason": "(why it hurts)",
        "algorithmPenalty": "(what the algorithm does)"
      }
    ],
    "projections": {
      "thirtyDay": {
        "followers": "(e.g. +2,000-4,000)",
        "engagementRate": "(e.g. 4.8% to 5.5-6.2%)",
        "reach": "(e.g. +30-50% average reach)",
        "revenue": "(e.g. $500-1,200 potential)"
      },
      "ninetyDay": {
        "followers": "(range)",
        "engagementRate": "(range)",
        "reach": "(range)",
        "revenue": "(range)"
      },
      "assumptions": "(what these projections assume the user does)"
    },
    "dataGaps": ["(list missing analyses that would improve these recommendations)"]
  }
}

Generate 3 top priorities, 5 categories with 2-4 items each (10-15 total detailed recommendations), 5 quick wins, and 5 items in the avoid list.

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation, no emojis.`;
}

/** Parse the AI response with multiple fallback strategies */
function parseResponse(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _provider: string,
): Record<string, unknown> {
  // Strategy 1: direct parse
  try {
    const v = JSON.parse(text.trim());
    if (v && typeof v === "object") return v as Record<string, unknown>;
  } catch { /* continue */ }

  // Strategy 2: extract {...}
  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try {
      const v = JSON.parse(braceMatch[1].trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch { /* continue */ }
  }

  // Strategy 3: code block extraction
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    try {
      const v = JSON.parse(codeMatch[1].trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch { /* continue */ }
  }

  throw new Error("Could not parse AI recommendations response as JSON");
}

export async function generateRecommendations(
  input: RecommendationsInput,
): Promise<RecommendationsResult> {
  const prompt = buildPrompt(input);

  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 8192,
    timeout: 180000, // 3 min — large prompt with all analyses + 8K output
    jsonMode: true,
  });

  if (!response) {
    throw new Error(
      "All AI providers failed. Check your API keys in Settings.",
    );
  }

  try {
    const data = parseResponse(response.text, response.provider);
    return { data, provider: response.provider };
  } catch {
    return {
      data: { raw: response.text },
      provider: response.provider,
    };
  }
}
