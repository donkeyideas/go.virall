import { requireAdmin } from "@/lib/dal/admin";
import {
  getPlatformHealthStats,
  getAlgorithmEvents,
  getAlgorithmAdjustments,
  getEngagementTrends,
} from "@/lib/dal/algorithm-monitor";
import { AlgorithmIntelligenceClient } from "./algorithm-intelligence-client";

export default async function AdminAlgorithmIntelligencePage() {
  await requireAdmin();

  const [health, events, adjustments, trends] = await Promise.all([
    getPlatformHealthStats(),
    getAlgorithmEvents({ limit: 50 }),
    getAlgorithmAdjustments({ limit: 30 }),
    getEngagementTrends(30),
  ]);

  return (
    <AlgorithmIntelligenceClient
      health={health}
      events={events}
      adjustments={adjustments}
      trends={trends}
    />
  );
}
