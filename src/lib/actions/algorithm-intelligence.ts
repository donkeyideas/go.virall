"use server";

import { PLATFORM_ALGORITHMS } from "@/lib/ai/platform-algorithms";
import type { SocialPlatform } from "@/types";

export async function generateAlgorithmDeepDive(
  platform: SocialPlatform,
  topic: string,
) {
  const algo = PLATFORM_ALGORITHMS[platform];
  if (!algo) return { success: false as const, error: "Unknown platform" };

  const label = platform.charAt(0).toUpperCase() + platform.slice(1);

  const prompt = `You are a social media algorithm expert specializing in ${label}. Provide a detailed, actionable analysis.

## ${label}'s 2026 Algorithm: "${algo.algoName}"
- Primary Signal: ${algo.primarySignal}
- Ranking Factors: ${algo.rankingFactors.join("; ")}
- Content Formats: ${algo.contentFormats.join(", ")}
- Posting Cadence: ${algo.postingCadence}
- Key Tactics: ${algo.keyTactics.join(" | ")}
- Avoidances: ${algo.avoidances.join(" | ")}

## Topic
${topic}

Provide a detailed, tactical analysis in 400-600 words. Use clear sections with headers. Be specific — include numbers, percentages, and concrete examples. Write for social media managers and creators who want to optimize their strategy.`;

  try {
    const { aiChat } = await import("@/lib/ai/provider");
    const response = await aiChat(prompt, {
      temperature: 0.4,
      maxTokens: 2000,
    });

    if (!response?.text) {
      return { success: false as const, error: "AI returned empty response" };
    }

    return {
      success: true as const,
      text: response.text,
      provider: response.provider,
    };
  } catch {
    return { success: false as const, error: "AI analysis failed" };
  }
}
