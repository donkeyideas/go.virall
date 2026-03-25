"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ContentType } from "@/lib/ai/content-generator";

export async function generateContentAction(
  profileId: string,
  contentType: ContentType,
  topic: string,
  tone: string,
  count: number,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const admin = createAdminClient();

  // Get the social profile
  const { data: socialProfile } = await admin
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (!socialProfile) {
    return { error: "Social profile not found." };
  }

  // Get latest metrics
  const { data: metrics } = await admin
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("date", { ascending: false })
    .limit(10);

  let resultData: Record<string, unknown>;
  let provider: string;

  try {
    const { generateContentAI } = await import("@/lib/ai/content-generator");

    const result = await generateContentAI({
      profile: socialProfile,
      metrics: metrics ?? [],
      contentType,
      topic,
      tone,
      count,
    });

    resultData = { contentType, topic, tone, ...result.data } as Record<string, unknown>;
    provider = result.provider;
    console.log("[ContentAction v2] resultData keys:", Object.keys(resultData));
    console.log("[ContentAction v2] has raw?:", "raw" in resultData);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Content generation failed.";
    return { error: message };
  }

  // Save to DB — never block the response
  try {
    await admin
      .from("social_analyses")
      .insert({
        social_profile_id: profileId,
        analysis_type: "content_generator",
        result: resultData,
        ai_provider: provider,
        tokens_used: 0,
        cost_cents: 0,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
  } catch {
    // Ignore DB errors — results still returned
  }

  revalidatePath("/dashboard");
  return { success: true, data: resultData };
}
