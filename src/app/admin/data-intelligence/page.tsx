import {
  requireAdmin,
  getActiveInsights,
  getAdminStats,
  getInvestorMetrics,
  getAPIUsageStats,
  getAIUsageByFeature,
} from "@/lib/dal/admin";
import { DataIntelligenceClient } from "./data-intelligence-client";

export default async function AdminDataIntelligencePage() {
  await requireAdmin();
  const [insights, stats, metrics, apiUsage, aiUsage] = await Promise.all([
    getActiveInsights(),
    getAdminStats(),
    getInvestorMetrics(),
    getAPIUsageStats(30),
    getAIUsageByFeature(30),
  ]);
  return (
    <DataIntelligenceClient
      insights={insights}
      stats={stats}
      metrics={metrics}
      apiUsage={apiUsage}
      aiUsage={aiUsage}
    />
  );
}
