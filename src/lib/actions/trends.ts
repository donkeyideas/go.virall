"use server";

import { createClient } from "@/lib/supabase/server";
import {
  scanTrends,
  getTrendingTopics,
  getHashtagRecommendations,
} from "@/lib/ai/trend-intelligence";
import type { TrendingTopic } from "@/types";
import type { HashtagRecommendation } from "@/lib/ai/trend-intelligence";

export async function actionScanTrends(
  platform: string,
  niche: string,
): Promise<{
  success?: boolean;
  topics?: TrendingTopic[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  try {
    const topics = await scanTrends(platform, niche);
    return { success: true, topics };
  } catch (err) {
    console.error("[actionScanTrends]", err);
    return { error: "Failed to scan trends. Please try again." };
  }
}

export async function actionGetTrendingTopics(
  platform?: string,
  niche?: string,
  limit?: number,
): Promise<TrendingTopic[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  try {
    return await getTrendingTopics(platform, niche, limit);
  } catch {
    return [];
  }
}

export async function actionGetHashtagRecommendations(
  content: string,
  platform: string,
  niche: string,
): Promise<{
  success?: boolean;
  data?: HashtagRecommendation;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  if (!content.trim()) {
    return { error: "Please provide some content to analyze." };
  }

  try {
    const result = await getHashtagRecommendations(content, platform, niche);
    if (!result) {
      return { error: "No AI provider available. Add an API key in Settings or set DEEPSEEK_API_KEY / OPENAI_API_KEY in your environment." };
    }
    return { success: true, data: result };
  } catch (err) {
    console.error("[actionGetHashtagRecommendations]", err);
    return { error: "Failed to analyze content. Please try again." };
  }
}
