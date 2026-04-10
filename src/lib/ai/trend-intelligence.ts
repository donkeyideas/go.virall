/**
 * Go Virall — Hashtag & Trend Intelligence Engine
 * AI-powered trend scanning, topic discovery, and hashtag recommendations.
 */

import { aiChat } from "./provider";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrendingTopic } from "@/types";

/* ─── Types ─── */

export interface HashtagRecommendation {
  hashtags: string[];
  reasoning: string;
  predicted_reach_boost: number;
}

interface TrendScanResult {
  topics: Array<{
    topic: string;
    hashtags: string[];
    trend_score: number;
    volume: number;
    growth_rate: number;
    ai_analysis: string;
  }>;
}

/* ─── scanTrends ─── */

export async function scanTrends(
  platform: string,
  niche: string,
): Promise<TrendingTopic[]> {
  const prompt = `You are a social media trend intelligence analyst for the ${platform} platform, specializing in the "${niche}" niche.

Analyze the current trending landscape and generate 8-12 realistic trending topics that would be active right now on ${platform} in the ${niche} niche.

For each trending topic, provide:
- topic: A concise trending topic name (2-5 words)
- hashtags: Array of 4-8 relevant hashtags (include the # symbol)
- trend_score: A score from 1-100 indicating how hot this trend is (100 = viral/peak, 50 = growing, 25 = emerging)
- volume: Estimated number of posts using these hashtags in the last 7 days (realistic range: 500-500000)
- growth_rate: Percentage growth in the last 7 days (range: -20 to +300, positive = growing)
- ai_analysis: A 2-3 sentence analysis of why this trend is happening, its lifecycle stage, and a tip on how creators in the ${niche} niche can leverage it

Consider these factors:
1. Seasonal relevance (current month: ${new Date().toLocaleString("default", { month: "long", year: "numeric" })})
2. Platform-specific trends (${platform} algorithm preferences, content formats)
3. Niche-specific angles (what's unique about ${niche} trends)
4. Mix of trend stages: include some viral/peak, some growing, some emerging
5. Include both broad and niche-specific hashtags

Respond with ONLY valid JSON in this exact format:
{
  "topics": [
    {
      "topic": "Topic Name",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4"],
      "trend_score": 85,
      "volume": 125000,
      "growth_rate": 45.5,
      "ai_analysis": "Analysis text here."
    }
  ]
}`;

  const response = await aiChat(prompt, {
    temperature: 0.8,
    maxTokens: 4096,
    timeout: 90000,
    jsonMode: true,
  });

  if (!response?.text) {
    return [];
  }

  let parsed: TrendScanResult;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    // Try extracting JSON from the response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }

  if (!parsed?.topics || !Array.isArray(parsed.topics)) {
    return [];
  }

  // Store in DB
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  const rows = parsed.topics.map((t) => ({
    platform,
    niche,
    topic: t.topic,
    hashtags: t.hashtags,
    trend_score: Math.max(0, Math.min(100, Math.round(t.trend_score))),
    volume: Math.max(0, Math.round(t.volume)),
    growth_rate: parseFloat(t.growth_rate.toFixed(1)),
    ai_analysis: t.ai_analysis,
    expires_at: expiresAt,
  }));

  const { data: inserted, error } = await admin
    .from("trending_topics")
    .insert(rows)
    .select("*");

  if (error) {
    console.error("[scanTrends] DB insert error:", error.message);
    // Return synthetic objects with temp IDs so the UI still works
    return rows.map((r, i) => ({
      id: `temp-${Date.now()}-${i}`,
      ...r,
      created_at: new Date().toISOString(),
    }));
  }

  return (inserted ?? []) as TrendingTopic[];
}

/* ─── getTrendingTopics ─── */

export async function getTrendingTopics(
  platform?: string,
  niche?: string,
  limit = 50,
): Promise<TrendingTopic[]> {
  const admin = createAdminClient();

  let query = admin
    .from("trending_topics")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("trend_score", { ascending: false })
    .limit(limit);

  if (platform && platform !== "all") {
    query = query.eq("platform", platform);
  }
  if (niche && niche !== "all") {
    query = query.eq("niche", niche);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getTrendingTopics] DB error:", error.message);
    return [];
  }

  return (data ?? []) as TrendingTopic[];
}

/* ─── getHashtagRecommendations ─── */

export async function getHashtagRecommendations(
  content: string,
  platform: string,
  niche: string,
): Promise<HashtagRecommendation | null> {
  const prompt = `You are a social media hashtag optimization expert for ${platform}.

A creator in the "${niche}" niche wants to optimize their post with the best hashtags. Here is their content:

"""
${content.slice(0, 2000)}
"""

Analyze this content and recommend the optimal hashtag set. Consider:

1. Content relevance — hashtags must match the content topic
2. Mix strategy — combine high-volume discovery hashtags, medium-volume niche hashtags, and low-volume specific hashtags
3. Platform best practices for ${platform}:
   - Instagram: 15-25 hashtags, mix of sizes
   - TikTok: 3-5 targeted hashtags
   - YouTube: 8-15 tags for discoverability
   - Twitter: 2-4 focused hashtags
4. Niche relevance — include ${niche}-specific hashtags
5. Trend awareness — include currently trending hashtags if relevant
6. Avoid banned/shadowbanned hashtags

Respond with ONLY valid JSON in this exact format:
{
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "reasoning": "A 2-3 sentence explanation of why these hashtags were chosen, the strategy behind the mix, and expected impact.",
  "predicted_reach_boost": 35
}

The predicted_reach_boost is a percentage (0-200) estimating how much these hashtags could boost reach compared to posting without hashtags.`;

  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 60000,
    jsonMode: true,
  });

  if (!response?.text) return null;

  try {
    const parsed = JSON.parse(response.text);
    return {
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      reasoning: parsed.reasoning || "No reasoning provided.",
      predicted_reach_boost: Math.max(
        0,
        Math.min(200, Math.round(parsed.predicted_reach_boost ?? 0)),
      ),
    };
  } catch {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        reasoning: parsed.reasoning || "No reasoning provided.",
        predicted_reach_boost: Math.max(
          0,
          Math.min(200, Math.round(parsed.predicted_reach_boost ?? 0)),
        ),
      };
    } catch {
      return null;
    }
  }
}
