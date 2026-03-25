import {
  requireAdmin,
  getAnalysisOverview,
  getAIUsageByFeature,
} from "@/lib/dal/admin";
import { SearchAIClient } from "./search-ai-client";

export default async function AdminSearchAIPage() {
  await requireAdmin();
  const [overview, aiUsage] = await Promise.all([
    getAnalysisOverview(),
    getAIUsageByFeature(30),
  ]);
  return <SearchAIClient overview={overview} aiUsage={aiUsage} />;
}
