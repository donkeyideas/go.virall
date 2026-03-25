import { getBillingOverview, getRevenueAnalytics } from "@/lib/dal/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { BillingClient } from "./billing-client";

export default async function AdminBillingPage() {
  await requireAdmin();
  const [overview, revenue] = await Promise.all([
    getBillingOverview(),
    getRevenueAnalytics(),
  ]);
  return <BillingClient overview={overview} revenue={revenue} />;
}
