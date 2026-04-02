import { requireAdmin, getInvestorMetrics, getGrowthTimeSeries, getUsageAnalytics, getAPIUsageStats, getBillingOverview } from "@/lib/dal/admin";
import {
  getCohortAnalysis,
  getConversionFunnel,
  getFeatureAdoption,
  getRevenueWaterfall,
  getUserEngagementScores,
  getChurnRiskUsers,
  getPlatformBenchmarks,
  getTrendingContentPatterns,
  getPlatformDistribution,
} from "@/lib/dal/admin-analytics";
import { AnalyticsClient } from "./analytics-client";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const [
    metrics, growth, usage, apiUsage, billing,
    cohorts, funnel, featureAdoption, waterfall,
    engagementScores, churnRisk,
    benchmarks, contentPatterns, platformDist,
  ] = await Promise.all([
    getInvestorMetrics(), getGrowthTimeSeries(), getUsageAnalytics(), getAPIUsageStats(30), getBillingOverview(),
    getCohortAnalysis(), getConversionFunnel(), getFeatureAdoption(), getRevenueWaterfall(),
    getUserEngagementScores(), getChurnRiskUsers(),
    getPlatformBenchmarks(), getTrendingContentPatterns(), getPlatformDistribution(),
  ]);
  return (
    <AnalyticsClient
      metrics={metrics} growth={growth} usage={usage} apiUsage={apiUsage} billing={billing}
      cohorts={cohorts} funnel={funnel} featureAdoption={featureAdoption} waterfall={waterfall}
      engagementScores={engagementScores} churnRisk={churnRisk}
      benchmarks={benchmarks} contentPatterns={contentPatterns} platformDist={platformDist}
    />
  );
}
