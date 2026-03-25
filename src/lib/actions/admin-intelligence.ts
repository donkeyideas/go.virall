"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import {
  getAdminStats,
  getInvestorMetrics,
  getAPIUsageStats,
  getAIUsageByFeature,
} from "@/lib/dal/admin";
import { aiChat } from "@/lib/ai/provider";
import { revalidatePath } from "next/cache";

export async function generatePlatformInsights() {
  await requireAdmin();

  try {
    const [stats, metrics, apiUsage, aiUsage] = await Promise.all([
      getAdminStats(),
      getInvestorMetrics(),
      getAPIUsageStats(30),
      getAIUsageByFeature(30),
    ]);

    const prompt = `You are an analytics AI for Go Virall, a social media influencer management platform. Analyze the following platform data and generate actionable insights.

PLATFORM DATA:
- Total Users: ${stats.totalUsers}
- Total Organizations: ${stats.totalOrgs}
- Total Social Profiles: ${stats.totalProfiles}
- Total Analyses Run: ${stats.totalAnalyses}
- Pending Deals: ${stats.pendingDeals}

REVENUE:
- MRR: $${metrics.mrr}
- ARR: $${metrics.arr}
- ARPU: $${metrics.arpu.toFixed(2)}
- Paid Orgs: ${metrics.paidOrgs}
- Free Orgs: ${metrics.freeOrgs}
- Churn Rate: ${(metrics.churnRate * 100).toFixed(1)}%

API USAGE (Last 30 days):
- Total API Calls: ${apiUsage.totalCalls}
- Total Cost: $${apiUsage.totalCost.toFixed(2)}
- Success Rate: ${(apiUsage.successRate * 100).toFixed(1)}%

AI USAGE BY FEATURE:
${Object.entries(aiUsage)
  .map(([f, d]) => `- ${f}: ${d.calls} calls, $${d.cost.toFixed(2)} cost, ${(d.success_rate * 100).toFixed(0)}% success`)
  .join("\n")}

Generate 5-8 insights as a JSON array. Each insight must have:
{
  "insight_type": "health_score" | "anomaly" | "trend" | "recommendation" | "prediction" | "summary",
  "category": "revenue" | "engagement" | "growth" | "churn" | "feature_adoption" | "system" | "ai_usage" | "overall",
  "title": "Short title",
  "description": "Detailed description",
  "severity": "critical" | "warning" | "info" | "positive",
  "confidence": 0.50-0.99,
  "recommendations": [{"action": "What to do", "impact": "high|medium|low", "effort": "high|medium|low"}]
}

Return ONLY the JSON array, no other text.`;

    const response = await aiChat(prompt, {
      temperature: 0.4,
      maxTokens: 4096,
      jsonMode: true,
    });

    if (!response?.text) {
      return { error: "AI provider returned no response." };
    }

    // Parse the JSON response
    let insights: Array<Record<string, unknown>>;
    try {
      const parsed = JSON.parse(response.text);
      insights = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.insights)
          ? parsed.insights
          : [];
    } catch {
      return { error: "Failed to parse AI response as JSON." };
    }

    if (!insights.length) {
      return { error: "AI returned no insights." };
    }

    // Validate enum values
    const validTypes = ["health_score", "anomaly", "trend", "recommendation", "prediction", "summary"];
    const validCategories = ["revenue", "engagement", "growth", "churn", "feature_adoption", "system", "ai_usage", "overall"];
    const validSeverities = ["critical", "warning", "info", "positive"];

    const admin = createAdminClient();

    // Deactivate old insights
    await admin
      .from("platform_insights")
      .update({ is_active: false })
      .eq("is_active", true);

    // Insert new insights
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    for (const insight of insights) {
      const insightType = validTypes.includes(insight.insight_type as string)
        ? insight.insight_type
        : "recommendation";
      const category = validCategories.includes(insight.category as string)
        ? insight.category
        : "overall";
      const severity = validSeverities.includes(insight.severity as string)
        ? insight.severity
        : "info";

      const { error: insertError } = await admin
        .from("platform_insights")
        .insert({
          insight_type: insightType,
          category,
          title: insight.title ?? "Untitled Insight",
          description: insight.description ?? "",
          severity,
          confidence: Math.min(0.99, Math.max(0.5, Number(insight.confidence) || 0.8)),
          recommendations: Array.isArray(insight.recommendations)
            ? insight.recommendations
            : [],
          data_snapshot: { stats, metrics },
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Failed to insert insight:", insertError.message);
      }
    }

    revalidatePath("/admin/data-intelligence");
    return { success: true, count: insights.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { error: msg };
  }
}

export async function dismissInsightAction(id: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_insights")
    .update({ is_dismissed: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/data-intelligence");
  return { success: true };
}
