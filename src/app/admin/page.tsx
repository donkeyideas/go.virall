import {
  getAdminStats,
  getRecentSignups,
  getRecentAuditLog,
  getAPIUsageStats,
  getBillingOverview,
  getInvestorMetrics,
  getUsageAnalytics,
  getGrowthTimeSeries,
} from "@/lib/dal/admin";
import { OverviewClient } from "./overview-client";

export default async function AdminOverviewPage() {
  const [stats, signups, auditLog, apiUsage, billing, metrics, usage, growth] =
    await Promise.all([
      getAdminStats(),
      getRecentSignups(8),
      getRecentAuditLog(10),
      getAPIUsageStats(30),
      getBillingOverview(),
      getInvestorMetrics(),
      getUsageAnalytics(),
      getGrowthTimeSeries(),
    ]);

  return (
    <OverviewClient
      stats={stats}
      signups={signups}
      auditLog={auditLog}
      apiUsage={apiUsage}
      billing={billing}
      metrics={metrics}
      usage={usage}
      growth={growth}
    />
  );
}
