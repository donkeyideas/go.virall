"use server";

/**
 * Go Virall Content Optimizer Engine
 * Analyzes draft content and provides AI-powered optimization suggestions,
 * predicted engagement, hashtag recommendations, and tone analysis.
 */

import { aiChat } from "./provider";
import { profileSummary } from "./social-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ContentOptimization } from "@/types";

// ── Helpers ──

function parseJSON(text: string): Record<string, unknown> {
  try {
    const v = JSON.parse(text.trim());
    if (v && typeof v === "object") return v as Record<string, unknown>;
  } catch {
    /* continue */
  }

  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try {
      const v = JSON.parse(braceMatch[1].trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch {
      /* continue */
    }
  }

  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    try {
      const v = JSON.parse(codeMatch[1].trim());
      if (v && typeof v === "object") return v as Record<string, unknown>;
    } catch {
      /* continue */
    }
  }

  throw new Error("Could not parse AI response as JSON");
}

// ── optimizeContent ──

export async function optimizeContent(data: {
  socialProfileId: string;
  draftContent: string;
  targetPlatform: string;
  contentType?: string;
}): Promise<{ success: true; data: ContentOptimization } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  const admin = createAdminClient();

  // 1. Fetch the social profile
  const { data: profile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", data.socialProfileId)
    .single();

  if (!profile) {
    return { success: false, error: "Social profile not found." };
  }

  // 2. Fetch recent performance metrics
  const { data: metricsRaw } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", data.socialProfileId)
    .order("date", { ascending: false })
    .limit(14);

  const metrics = metricsRaw ?? [];
  const avgEngagement = metrics.length > 0
    ? metrics.reduce((sum: number, m: Record<string, unknown>) => sum + (Number(m.engagement_rate) || 0), 0) / metrics.length
    : Number(profile.engagement_rate) || 0;

  // 3. Build the prompt
  const contentTypeLabel = data.contentType || "post";
  const prompt = `You are a world-class social media content optimizer and copywriting expert. Analyze this draft content for ${data.targetPlatform} and provide detailed optimization suggestions.

CREATOR PROFILE:
${profileSummary(profile as Record<string, unknown>)}

RECENT PERFORMANCE:
- Average Engagement Rate: ${avgEngagement.toFixed(2)}%
- Followers: ${profile.followers_count}
- Niche: ${profile.niche || "General"}
- Content Type: ${contentTypeLabel}

DRAFT CONTENT TO OPTIMIZE:
"""
${data.draftContent}
"""

Analyze the draft and return this exact JSON structure:
{
  "predicted_engagement": number (0-100, estimated engagement rate as a percentage, considering the creator's historical performance, content quality, and platform norms),
  "optimized_content": string (improved version of the content. Keep the creator's voice but enhance hooks, CTAs, formatting, and readability. For ${data.targetPlatform}, optimize for that platform's algorithm preferences),
  "suggestions": [
    string (specific, actionable improvement suggestion)
  ] (provide 5-7 suggestions covering: hook strength, CTA effectiveness, formatting, emoji usage, content length, storytelling, and platform-specific best practices),
  "hashtag_recommendations": [
    string (hashtag including the # symbol)
  ] (provide 15-20 optimized hashtags: mix of niche-specific, growth-oriented, and trending tags for ${data.targetPlatform}),
  "best_posting_time": string (ISO 8601 datetime string for the recommended posting time based on the creator's niche and platform. Use a near-future date/time),
  "tone_analysis": {
    "primary_tone": string (e.g. "Informative", "Inspirational", "Humorous", "Conversational"),
    "secondary_tone": string (e.g. "Authoritative", "Friendly", "Energetic"),
    "professionalism_score": number (0-100),
    "authenticity_score": number (0-100),
    "emotional_appeal": number (0-100),
    "clarity_score": number (0-100),
    "virality_potential": number (0-100)
  }
}

IMPORTANT: Respond ONLY with valid, complete JSON. No markdown, no explanation.`;

  // 4. Call AI
  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 90000,
    jsonMode: true,
  });

  if (!response) {
    return { success: false, error: "All AI providers failed. Check your API keys in Settings." };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJSON(response.text);
  } catch {
    return { success: false, error: "Failed to parse AI response." };
  }

  // Normalize results
  const predictedEngagement = Math.round(Number(parsed.predicted_engagement) || 0);
  const optimizedContent = String(parsed.optimized_content || data.draftContent);
  const suggestions = Array.isArray(parsed.suggestions)
    ? (parsed.suggestions as string[]).filter((s) => typeof s === "string")
    : [];
  const hashtagRecommendations = Array.isArray(parsed.hashtag_recommendations)
    ? (parsed.hashtag_recommendations as string[]).filter((h) => typeof h === "string")
    : [];
  const bestPostingTime = typeof parsed.best_posting_time === "string"
    ? parsed.best_posting_time
    : null;
  const toneAnalysis = (parsed.tone_analysis as Record<string, unknown>) ?? null;

  // 5. Save to content_optimizations table
  const { data: inserted, error: insertError } = await admin
    .from("content_optimizations")
    .insert({
      social_profile_id: data.socialProfileId,
      user_id: user.id,
      draft_content: data.draftContent,
      target_platform: data.targetPlatform,
      content_type: data.contentType || "post",
      predicted_engagement: predictedEngagement,
      optimized_content: optimizedContent,
      suggestions,
      hashtag_recommendations: hashtagRecommendations,
      best_posting_time: bestPostingTime,
      tone_analysis: toneAnalysis,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("[optimizeContent] DB insert error:", insertError.message);
    // Return the computed data even if DB save fails
    return {
      success: true,
      data: {
        id: "temp-" + Date.now(),
        social_profile_id: data.socialProfileId,
        user_id: user.id,
        draft_content: data.draftContent,
        target_platform: data.targetPlatform,
        content_type: data.contentType || "post",
        predicted_engagement: predictedEngagement,
        optimized_content: optimizedContent,
        suggestions,
        hashtag_recommendations: hashtagRecommendations,
        best_posting_time: bestPostingTime,
        tone_analysis: toneAnalysis,
        competitor_comparison: null,
        created_at: new Date().toISOString(),
      },
    };
  }

  return { success: true, data: inserted as ContentOptimization };
}

// ── getOptimizationHistory ──

export async function getOptimizationHistory(
  socialProfileId: string,
  limit: number = 10,
): Promise<ContentOptimization[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("content_optimizations")
    .select("*")
    .eq("social_profile_id", socialProfileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as ContentOptimization[];
}
