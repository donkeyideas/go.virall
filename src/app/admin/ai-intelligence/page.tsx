import {
  requireAdmin,
  getAIInteractions,
  getAIUsageByFeature,
  getAIProviderPerformance,
  getAICostTrend,
} from "@/lib/dal/admin";
import { AIIntelligenceClient } from "./ai-intelligence-client";

export default async function AdminAIIntelligencePage() {
  await requireAdmin();
  const [interactions, byFeature, providerPerf, costTrend] = await Promise.all([
    getAIInteractions({ limit: 25 }),
    getAIUsageByFeature(30),
    getAIProviderPerformance(30),
    getAICostTrend(30),
  ]);
  return (
    <AIIntelligenceClient
      interactions={interactions}
      byFeature={byFeature}
      providerPerf={providerPerf}
      costTrend={costTrend}
    />
  );
}
