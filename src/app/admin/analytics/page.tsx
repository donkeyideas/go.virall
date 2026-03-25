import { requireAdmin, getInvestorMetrics, getGrowthTimeSeries, getUsageAnalytics, getAPIUsageStats, getBillingOverview } from "@/lib/dal/admin";
import { AnalyticsClient } from "./analytics-client";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const [metrics, growth, usage, apiUsage, billing] = await Promise.all([
    getInvestorMetrics(), getGrowthTimeSeries(), getUsageAnalytics(), getAPIUsageStats(30), getBillingOverview(),
  ]);
  return <AnalyticsClient metrics={metrics} growth={growth} usage={usage} apiUsage={apiUsage} billing={billing} />;
}
