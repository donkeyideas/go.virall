"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/provider";
import { profileSummary, metricsSummary } from "@/lib/ai/social-analysis";

export async function saveGoal(formData: FormData) {
  const profileId = formData.get("profileId") as string;
  const primaryObjective = formData.get("primaryObjective") as string;
  const targetValue = parseInt(formData.get("targetValue") as string) || null;
  const targetDays = parseInt(formData.get("targetDays") as string) || null;
  const contentNiche = formData.get("contentNiche") as string;
  const monetizationGoal = formData.get("monetizationGoal") as string;
  const postingCommitment = formData.get("postingCommitment") as string;
  const targetAudience = formData.get("targetAudience") as string;
  const competitiveAspiration = formData.get("competitiveAspiration") as string;

  if (!profileId) return { error: "Profile ID is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Deactivate existing goals for this profile
  await supabase
    .from("social_goals")
    .update({ is_active: false })
    .eq("social_profile_id", profileId);

  // Insert new goal
  const { error } = await supabase.from("social_goals").insert({
    social_profile_id: profileId,
    primary_objective: primaryObjective || null,
    target_value: targetValue,
    target_days: targetDays,
    content_niche: contentNiche || null,
    monetization_goal: monetizationGoal || null,
    posting_commitment: postingCommitment || null,
    target_audience: targetAudience || null,
    competitive_aspiration: competitiveAspiration || null,
    is_active: true,
  });

  if (error) return { error: "Failed to save goal." };

  revalidatePath("/dashboard");
  return { success: true };
}

export interface AIGoalSuggestion {
  primaryObjective: string;
  targetValue: number;
  targetDays: number;
  contentNiche: string;
  monetizationGoal: string;
  postingCommitment: string;
  targetAudience: string;
  competitiveAspiration: string;
  reasoning: string;
}

export async function generateAIGoals(profileId: string): Promise<{
  error?: string;
  data?: AIGoalSuggestion;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!profile) return { error: "Profile not found." };

  const { data: metrics } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: false })
    .limit(14);

  const prompt = `You are an expert social media strategist. Based on this creator's profile and metrics, generate realistic, achievable goals.

PROFILE:
${profileSummary(profile as Record<string, unknown>)}

RECENT METRICS:
${metricsSummary((metrics ?? []) as Record<string, unknown>[])}

Generate smart, realistic goals for this creator. Analyze their current follower count, engagement rate, platform, and niche to set achievable targets.

Return this exact JSON:
{
  "primaryObjective": one of "grow_followers" | "increase_engagement" | "monetize" | "build_brand" | "drive_traffic",
  "targetValue": realistic numeric target (e.g. follower growth target, engagement rate target as whole number, etc.),
  "targetDays": number of days to achieve (30, 60, 90, or 180),
  "contentNiche": their content niche (1-3 keywords, lowercase comma-separated),
  "monetizationGoal": one of "" | "brand_deals" | "affiliate" | "digital_products" | "coaching" | "ad_revenue" | "subscriptions",
  "postingCommitment": one of "daily" | "3-5_per_week" | "1-2_per_week" | "weekly",
  "targetAudience": specific audience description (age range + interests, e.g. "18-35 year old fitness enthusiasts"),
  "competitiveAspiration": a realistic competitor handle with brief note (e.g. "@similar_creator - match their engagement consistency"),
  "reasoning": 2-3 sentence explanation of why these goals make sense for this creator
}

Rules:
- If followers < 1,000: focus on growth, set modest targets (500-2,000 new followers in 90 days)
- If followers 1K-10K: balance growth and engagement, target 2x-3x growth in 90 days
- If followers 10K-100K: focus on monetization and engagement quality
- If followers 100K+: focus on brand deals, revenue optimization
- Match the posting commitment to what's realistic for the platform:
  TikTok → "daily" (1-3/day optimal), YouTube → "1-2_per_week" (consistency > frequency),
  LinkedIn → "3-5_per_week" (weekdays only), Pinterest → "daily" (2-5 fresh pins/day),
  Twitch → "3-5_per_week" (consistent stream schedule), Instagram → "daily" (3-5 Reels/week + daily Stories)
- Use the platform algorithm intelligence from the PROFILE section to inform your recommendations
- The competitive aspiration should reference a realistic (but not necessarily real) creator in their niche

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation outside JSON.`;

  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 1024,
    timeout: 60000,
    jsonMode: true,
  });

  if (!response) {
    return { error: "AI providers unavailable. Please try again." };
  }

  try {
    let parsed: AIGoalSuggestion;
    try {
      parsed = JSON.parse(response.text.trim());
    } catch {
      const match = response.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON found");
      parsed = JSON.parse(match[0]);
    }
    return { data: parsed };
  } catch {
    return { error: "Failed to parse AI response. Please try again." };
  }
}
