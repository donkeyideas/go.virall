"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateAlgorithmCache } from "@/lib/ai/platform-algorithms";

/**
 * Run AI-powered algorithm analysis for a platform.
 * Fetches 30 days of engagement data and asks DeepSeek to detect changes.
 */
export async function runAlgorithmAnalysis(platform: string) {
  const admin = createAdminClient();

  // Get engagement data for the last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: metrics } = await admin
    .from("social_metrics")
    .select("date, engagement_rate, followers, avg_likes, social_profile_id")
    .gte("date", since)
    .not("engagement_rate", "is", null)
    .order("date", { ascending: true });

  if (!metrics?.length) {
    return {
      success: false,
      error: "No engagement data available for analysis.",
    };
  }

  // Get profile platform mappings
  const profileIds = [...new Set(metrics.map((m) => m.social_profile_id))];
  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id, platform")
    .in("id", profileIds)
    .eq("platform", platform);

  const platformProfileIds = new Set(
    (profiles ?? []).map((p) => p.id),
  );
  const platformMetrics = metrics.filter((m) =>
    platformProfileIds.has(m.social_profile_id),
  );

  if (!platformMetrics.length) {
    return {
      success: false,
      error: `No engagement data for ${platform}.`,
    };
  }

  // Group by date for daily averages
  const daily: Record<string, { engTotal: number; likesTotal: number; count: number }> = {};
  for (const m of platformMetrics) {
    if (!daily[m.date]) daily[m.date] = { engTotal: 0, likesTotal: 0, count: 0 };
    daily[m.date].engTotal += m.engagement_rate ?? 0;
    daily[m.date].likesTotal += m.avg_likes ?? 0;
    daily[m.date].count += 1;
  }

  const dailySummary = Object.entries(daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      avgEngagement: (v.engTotal / v.count).toFixed(3),
      avgLikes: Math.round(v.likesTotal / v.count),
      profiles: v.count,
    }));

  // Calculate week-over-week change
  const lastWeek = dailySummary.slice(-7);
  const prevWeek = dailySummary.slice(-14, -7);
  const lastWeekAvg =
    lastWeek.reduce((s, d) => s + parseFloat(d.avgEngagement), 0) /
    (lastWeek.length || 1);
  const prevWeekAvg =
    prevWeek.reduce((s, d) => s + parseFloat(d.avgEngagement), 0) /
    (prevWeek.length || 1);
  const weekChange = prevWeekAvg > 0
    ? ((lastWeekAvg - prevWeekAvg) / prevWeekAvg) * 100
    : 0;

  // Build AI prompt
  const prompt = `You are a social media algorithm expert. Analyze these engagement trends for ${platform} and determine if there has been an algorithm change.

## Data (last 30 days, daily averages)
${JSON.stringify(dailySummary, null, 2)}

## Week-over-week change: ${weekChange.toFixed(1)}%
## Current week avg engagement: ${lastWeekAvg.toFixed(3)}%
## Previous week avg engagement: ${prevWeekAvg.toFixed(3)}%

## Instructions
1. Determine if there's been an algorithm change (YES/NO)
2. If YES, describe the likely change and its impact
3. Suggest specific adjustments to:
   - SMO score weights (posting frequency, engagement rate, content quality, growth rate)
   - Content strategy (what types of content to prioritize)
   - Posting times (if patterns suggest timing changes)
   - Engagement benchmarks (new baseline expectations)
4. Rate the confidence of your assessment (LOW/MEDIUM/HIGH)

Respond in JSON format:
{
  "algorithmChanged": true/false,
  "confidence": "LOW|MEDIUM|HIGH",
  "summary": "Brief description of findings",
  "changes": ["list of detected changes"],
  "adjustments": [
    {
      "type": "smo_weight|content_strategy|posting_time|engagement_benchmark",
      "currentContext": "what the current state looks like",
      "suggestion": "what should change",
      "reasoning": "why"
    }
  ]
}`;

  try {
    // Use AI provider (DeepSeek / Gemini / etc. — same pattern as content generator)
    const { aiChat } = await import("@/lib/ai/provider");
    const response = await aiChat(prompt, {
      temperature: 0.3,
      maxTokens: 2000,
      jsonMode: true,
    });

    const text = response?.text?.trim() ?? "";

    // Try to parse JSON from response
    let parsed: {
      algorithmChanged?: boolean;
      confidence?: string;
      summary?: string;
      changes?: string[];
      adjustments?: {
        type: string;
        currentContext: string;
        suggestion: string;
        reasoning: string;
      }[];
    } = {};

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // If parsing fails, store raw text
    }

    const metricsSnapshot = {
      weekChange: weekChange.toFixed(1),
      lastWeekAvg: lastWeekAvg.toFixed(3),
      prevWeekAvg: prevWeekAvg.toFixed(3),
      totalProfiles: platformProfileIds.size,
      dataPoints: platformMetrics.length,
    };

    // Determine severity
    let severity = "low";
    if (parsed.algorithmChanged) {
      severity =
        parsed.confidence === "HIGH"
          ? "critical"
          : parsed.confidence === "MEDIUM"
            ? "high"
            : "medium";
    } else if (Math.abs(weekChange) > 20) {
      severity = "high";
    }

    // Insert algorithm event
    const { data: event } = await admin
      .from("algorithm_events")
      .insert({
        platform,
        event_type:
          weekChange < -20
            ? "engagement_drop"
            : weekChange > 20
              ? "engagement_spike"
              : "pattern_shift",
        severity,
        title: parsed.summary ?? `${platform} algorithm analysis`,
        description: parsed.changes?.join("; ") ?? null,
        metrics_snapshot: metricsSnapshot,
        ai_analysis: text,
        status: parsed.algorithmChanged ? "detected" : "resolved",
      })
      .select("id")
      .single();

    // Insert adjustment suggestions
    if (parsed.adjustments?.length && event?.id) {
      const rows = parsed.adjustments.map((adj) => ({
        event_id: event.id,
        platform,
        adjustment_type: adj.type || "smo_weight",
        current_value: { context: adj.currentContext },
        suggested_value: { suggestion: adj.suggestion },
        ai_reasoning: adj.reasoning,
        status: "suggested" as const,
      }));

      await admin.from("algorithm_adjustments").insert(rows);
    }

    return {
      success: true,
      algorithmChanged: parsed.algorithmChanged ?? false,
      summary: parsed.summary ?? "Analysis complete",
      adjustmentCount: parsed.adjustments?.length ?? 0,
      severity,
    };
  } catch (error) {
    console.error("Algorithm analysis error:", error);
    return { success: false, error: "AI analysis failed" };
  }
}

/** Mark an algorithm event as resolved or false positive. */
export async function resolveAlgorithmEvent(
  eventId: string,
  status: "resolved" | "false_positive",
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("algorithm_events")
    .update({ status, resolved_at: new Date().toISOString() })
    .eq("id", eventId);

  return { success: !error, error: error?.message };
}

/** Approve or reject a suggested adjustment. */
export async function updateAdjustmentStatus(
  adjustmentId: string,
  status: "approved" | "applied" | "rejected",
) {
  const admin = createAdminClient();
  const updateData: Record<string, unknown> = { status };
  if (status === "applied") {
    updateData.applied_at = new Date().toISOString();
  }

  const { error } = await admin
    .from("algorithm_adjustments")
    .update(updateData)
    .eq("id", adjustmentId);

  // Invalidate algorithm cache so applied changes propagate to user-facing AI prompts
  if (!error && (status === "applied" || status === "rejected")) {
    invalidateAlgorithmCache();
  }

  return { success: !error, error: error?.message };
}
