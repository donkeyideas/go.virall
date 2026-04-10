import {
  requireAdmin,
  backfillBillingEvents,
  getBillingOverview,
  getRevenueAnalytics,
} from "@/lib/dal/admin";
import { BillingClient } from "./billing-client";

export default async function AdminBillingPage() {
  await requireAdmin();
  // Seed billing_events from existing subscriptions/payments if table is empty
  await backfillBillingEvents();
  const [overview, revenue] = await Promise.all([
    getBillingOverview(),
    getRevenueAnalytics(),
  ]);
  return <BillingClient overview={overview} revenue={revenue} />;
}
